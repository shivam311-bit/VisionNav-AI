from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.pathfinding_adapter import find_path

app = FastAPI(
    title="VisionNav AI Backend",
    description="Simulation-first autonomous robot navigation API with dynamic obstacle avoidance",
    version="0.3.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local demo; configure origin in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROWS, COLS = 12, 16

DEFAULT_OBSTACLES = {
    (2, 4), (3, 4), (4, 4), (5, 4),
    (6, 8), (7, 8), (8, 8),
    (3, 10), (4, 10), (5, 10),
}

PRESET_MAPS = {
    "default": DEFAULT_OBSTACLES,
    "maze": {
        (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
        (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7),
        (1, 11), (2, 11), (3, 11), (4, 11), (5, 11), (6, 11),
    },
    "corridor": {
        (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7),
        (7, 8), (7, 9), (7, 10), (7, 11), (7, 12), (7, 13),
    },
    "trap": {
        (9, 14), (11, 14), (10, 13),  # 3 sides around [10, 14]
    },
    "clear": set(),
}

ALLOWED_STATUSES = {
    "idle", "planned", "moving", "waiting", "replanning",
    "replanned", "arrived", "unreachable", "replan_required", "paused",
}


def create_grid(obstacle_set):
    grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]
    for r, c in obstacle_set:
        if 0 <= r < ROWS and 0 <= c < COLS:
            grid[r][c] = 1
    return grid


def fresh_state(preset="default"):
    obs = PRESET_MAPS.get(preset, DEFAULT_OBSTACLES)
    return {
        "grid": create_grid(obs),
        "robot": [1, 1],
        "goal": [10, 14],
        "status": "idle",
        "path": [],
        "smoothed_path": [],
        "explored_nodes": [],
        "explored_cells": 0,
        "steps_taken": 0,
        "replan_count": 0,
        "movement_mode": "4-way",
        "preset": preset,
        "last_event": "Simulation environment ready",
    }


state = fresh_state("default")


class PathRequest(BaseModel):
    start: list[int] = Field(..., min_length=2, max_length=2)
    goal: list[int] = Field(..., min_length=2, max_length=2)


class ObstacleRequest(BaseModel):
    add: list[list[int]] = Field(default_factory=list)
    remove: list[list[int]] = Field(default_factory=list)


class StatusRequest(BaseModel):
    robot: Optional[list[int]] = Field(default=None, min_length=2, max_length=2)
    status: Optional[str] = None


class PresetRequest(BaseModel):
    preset: str = Field(..., description="Preset name: default, maze, corridor, trap, clear")


class SettingsRequest(BaseModel):
    movement_mode: Optional[str] = Field(default=None, description="4-way or 8-way")


def validate_coord(coord, name="coordinate"):
    if len(coord) != 2 or any(not isinstance(v, int) or isinstance(v, bool) for v in coord):
        raise HTTPException(status_code=422, detail=f"{name} must be [row, col] using integers")
    r, c = coord
    if not (0 <= r < ROWS and 0 <= c < COLS):
        raise HTTPException(status_code=422, detail=f"{name} {coord} is outside the map")
    return r, c


def serialise_state():
    active_obstacles = sum(cell for row in state["grid"] for cell in row)
    return {
        "rows": ROWS,
        "cols": COLS,
        "grid": deepcopy(state["grid"]),
        "robot": state["robot"][:],
        "goal": state["goal"][:],
        "status": state["status"],
        "path": deepcopy(state["path"]),
        "smoothed_path": deepcopy(state.get("smoothed_path", [])),
        "explored_nodes": deepcopy(state.get("explored_nodes", [])),
        "path_length": max(0, len(state["path"]) - 1) if state["path"] else 0,
        "explored_cells": state["explored_cells"],
        "steps_taken": state.get("steps_taken", 0),
        "replan_count": state.get("replan_count", 0),
        "active_obstacles": active_obstacles,
        "movement_mode": state.get("movement_mode", "4-way"),
        "preset": state.get("preset", "default"),
        "last_event": state["last_event"],
    }


def calculate_and_store_path(start, goal, success_status="planned"):
    is_diagonal = state.get("movement_mode", "4-way") == "8-way"
    result = find_path(state["grid"], start, goal, diagonal=is_diagonal, smooth=True)
    if result is None:
        state.update({
            "path": [],
            "smoothed_path": [],
            "explored_nodes": [],
            "status": "unreachable",
            "last_event": "Destination is unreachable; no valid route exists",
            "explored_cells": 0,
        })
        return False
    path, explored = result
    state.update({
        "robot": list(start),
        "goal": list(goal),
        "path": [list(point) for point in path],
        "smoothed_path": [list(point) for point in getattr(result, "smoothed_path", path)],
        "explored_nodes": [list(point) for point in getattr(result, "explored_cells", [])],
        "explored_cells": explored,
        "status": success_status,
        "last_event": "Route calculated" if success_status == "planned" else "Alternative route calculated",
    })
    if start == goal:
        state["status"] = "arrived"
        state["last_event"] = "Robot is already at the destination"
    return True


@app.get("/")
def health():
    return {
        "ok": True,
        "project": "VisionNav AI",
        "service": "backend",
        "version": app.version,
        "algorithm": "A* Pathfinding (Manhattan Heuristic)",
    }


@app.get("/api/map")
def get_map():
    """Return the full grid plus current simulation state and statistics."""
    return serialise_state()


@app.post("/api/path")
def calculate_path(req: PathRequest):
    start = validate_coord(req.start, "start")
    goal = validate_coord(req.goal, "goal")
    if start == goal:
        state.update({
            "robot": list(start),
            "goal": list(goal),
            "path": [list(start)],
            "status": "arrived",
            "last_event": "Robot is already at the destination",
        })
        return {**serialise_state(), "message": "Robot is already at destination"}
    if state["grid"][start[0]][start[1]] == 1:
        raise HTTPException(status_code=400, detail="Start cell is blocked by an obstacle")
    if state["grid"][goal[0]][goal[1]] == 1:
        raise HTTPException(status_code=400, detail="Goal cell is blocked by an obstacle")
    reachable = calculate_and_store_path(start, goal, "planned")
    if not reachable:
        return {**serialise_state(), "message": "Destination is unreachable"}
    return {**serialise_state(), "message": "Optimal route calculated successfully"}


@app.post("/api/obstacles")
def update_obstacles(req: ObstacleRequest):
    """Atomically update obstacles and automatically replan if the robot's active route is blocked."""
    removals = [validate_coord(coord, "remove coordinate") for coord in req.remove]
    additions = [validate_coord(coord, "add coordinate") for coord in req.add]

    for r, c in additions:
        if [r, c] == state["robot"]:
            raise HTTPException(status_code=400, detail="Cannot place obstacle directly on the robot")
        if [r, c] == state["goal"]:
            raise HTTPException(status_code=400, detail="Cannot place obstacle directly on the destination")

    updated_grid = deepcopy(state["grid"])
    changed = 0
    for r, c in removals:
        if updated_grid[r][c] == 1:
            updated_grid[r][c] = 0
            changed += 1
    for r, c in additions:
        if updated_grid[r][c] == 0:
            updated_grid[r][c] = 1
            changed += 1

    state["grid"] = updated_grid

    # Determine if the remaining path from the robot to the goal is blocked
    remaining_path = []
    if state["path"]:
        try:
            robot_idx = state["path"].index(state["robot"])
            remaining_path = state["path"][robot_idx:]
        except ValueError:
            remaining_path = state["path"]

    route_blocked = bool(remaining_path) and any(
        state["grid"][r][c] == 1 for r, c in remaining_path
    )

    message = f"Obstacle map updated ({changed} change(s))"
    if route_blocked:
        state["status"] = "replanning"
        reachable = calculate_and_store_path(tuple(state["robot"]), tuple(state["goal"]), "replanned")
        if reachable:
            state["replan_count"] = state.get("replan_count", 0) + 1
            message = "Dynamic obstacle detected on route! Recalculated alternative route."
            state["last_event"] = message
        else:
            state["status"] = "unreachable"
            state["path"] = []
            state["last_event"] = "Dynamic obstacle blocked path! Destination is now unreachable."
            message = "Dynamic obstacle placed. Destination is now unreachable!"
    else:
        state["last_event"] = message

    return {**serialise_state(), "changed": changed, "route_blocked": route_blocked, "message": message}


@app.post("/api/obstacles/dynamic-spawn")
def dynamic_spawn():
    """Spawn an obstacle on the path 1 or 2 steps ahead of the robot to demonstrate real-time replanning."""
    if not state["path"] or state["status"] in ("arrived", "unreachable"):
        raise HTTPException(status_code=400, detail="No active planned route to place dynamic obstacle on")

    try:
        robot_idx = state["path"].index(state["robot"])
        remaining = state["path"][robot_idx + 1:]
    except ValueError:
        remaining = state["path"]

    # Filter out goal cell
    target_candidates = [p for p in remaining if p != state["goal"]]
    if not target_candidates:
        raise HTTPException(status_code=400, detail="Robot is already at or adjacent to destination")

    # Pick the cell 1 or 2 steps ahead
    target = target_candidates[min(1, len(target_candidates) - 1)]
    return update_obstacles(ObstacleRequest(add=[target], remove=[]))


@app.post("/api/replan")
def replan():
    """Recalculate route from the robot's current position to the destination."""
    start = validate_coord(state["robot"], "robot")
    goal = validate_coord(state["goal"], "goal")
    if state["grid"][start[0]][start[1]] == 1:
        raise HTTPException(status_code=400, detail="Robot position is blocked")
    if state["grid"][goal[0]][goal[1]] == 1:
        raise HTTPException(status_code=400, detail="Goal position is blocked")
    reachable = calculate_and_store_path(start, goal, "replanned")
    if not reachable:
        return {**serialise_state(), "message": "No alternative route exists. Destination is unreachable."}
    state["replan_count"] = state.get("replan_count", 0) + 1
    return {**serialise_state(), "message": "Alternative route calculated successfully"}


@app.post("/api/status")
def update_status(req: StatusRequest):
    if req.robot is not None:
        r, c = validate_coord(req.robot, "robot")
        if state["grid"][r][c] == 1:
            raise HTTPException(status_code=400, detail="Robot cannot move into a blocked cell")
        if state["robot"] != [r, c]:
            state["steps_taken"] = state.get("steps_taken", 0) + 1
            state["robot"] = [r, c]
    if req.status is not None:
        if req.status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=422, detail=f"status must be one of {sorted(ALLOWED_STATUSES)}")
        state["status"] = req.status
    if state["robot"] == state["goal"]:
        state["status"] = "arrived"
        state["last_event"] = "Destination reached successfully!"
    else:
        state["last_event"] = "Simulation state updated"
    return serialise_state()


@app.post("/api/presets")
def load_preset(req: PresetRequest):
    if req.preset not in PRESET_MAPS:
        raise HTTPException(status_code=422, detail=f"Unknown preset. Choose from: {list(PRESET_MAPS.keys())}")
    state.clear()
    state.update(fresh_state(req.preset))
    return {**serialise_state(), "message": f"Loaded preset scenario: {req.preset}"}


@app.post("/api/settings")
def update_settings(req: SettingsRequest):
    if req.movement_mode is not None:
        if req.movement_mode not in ("4-way", "8-way"):
            raise HTTPException(status_code=422, detail="movement_mode must be '4-way' or '8-way'")
        state["movement_mode"] = req.movement_mode
        if state["path"] and state["status"] not in ("arrived", "unreachable"):
            calculate_and_store_path(tuple(state["robot"]), tuple(state["goal"]), "planned")
    return {**serialise_state(), "message": f"Navigation mode updated to {state['movement_mode']}"}


@app.post("/api/reset")
def reset():
    preset = state.get("preset", "default")
    current_mode = state.get("movement_mode", "4-way")
    state.clear()
    state.update(fresh_state(preset))
    state["movement_mode"] = current_mode
    return serialise_state()

