"""VisionNav AI Pathfinding Adapter
Implements A* graph search with:
- 4-directional (Manhattan) & 8-directional (Octile) movement modes
- Corner-cutting prevention on diagonal steps
- Complete exploration logging (closed set for heatmap visualization)
- Line-of-sight shortcutting / path smoothing (String Pulling algorithm)
"""
from heapq import heappop, heappush
from math import sqrt


class PathResult(tuple):
    """2-tuple (path, explored_count) for backward compatibility, with rich properties."""
    def __new__(cls, path, explored, explored_cells=None, smoothed_path=None):
        inst = super().__new__(cls, (path, explored))
        inst.explored_cells = explored_cells if explored_cells is not None else []
        inst.smoothed_path = smoothed_path if smoothed_path is not None else (path or [])
        return inst


def has_line_of_sight(grid, p1, p2):
    """Bresenham line-of-sight check across grid cells."""
    r0, c0 = p1
    r1, c1 = p2
    dr = abs(r1 - r0)
    dc = abs(c1 - c0)
    sr = 1 if r1 > r0 else -1
    sc = 1 if c1 > c0 else -1
    err = dr - dc

    r, c = r0, c0
    while True:
        if grid[r][c] == 1:
            return False
        if (r, c) == (r1, c1):
            break
        e2 = 2 * err
        if e2 > -dc:
            err -= dc
            r += sr
        if e2 < dr:
            err += dr
            c += sc
    return True


def smooth_path(grid, path):
    """Shortcut intermediate zig-zags using line-of-sight (string-pulling algorithm)."""
    if not path or len(path) <= 2:
        return path
    smoothed = [path[0]]
    curr = 0
    n = len(path)
    while curr < n - 1:
        farthest = n - 1
        while farthest > curr + 1:
            if has_line_of_sight(grid, path[curr], path[farthest]):
                break
            farthest -= 1
        smoothed.append(path[farthest])
        curr = farthest
    return smoothed


def find_path(grid, start, goal, diagonal=False, smooth=True):
    """Return PathResult(path, explored_count), or None if no route exists.

    grid: list[list[int]], where 0 is walkable and 1 is blocked.
    start/goal: (row, col) coordinates.
    diagonal: bool. If True, enables 8-directional movement with Octile distance.
    smooth: bool. If True, calculates a line-of-sight smoothed path.
    """
    if not grid or not grid[0]:
        return None
    rows, cols = len(grid), len(grid[0])
    if any(len(row) != cols for row in grid):
        raise ValueError("Grid must be rectangular")

    start = (int(start[0]), int(start[1]))
    goal = (int(goal[0]), int(goal[1]))

    for point in (start, goal):
        r, c = point
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] == 1:
            return None

    if start == goal:
        return PathResult([start], 1, explored_cells=[start], smoothed_path=[start])

    # Heuristic functions
    sqrt2 = sqrt(2)

    def heuristic(a, b):
        dr = abs(a[0] - b[0])
        dc = abs(a[1] - b[1])
        if diagonal:
            # Octile distance
            return max(dr, dc) + (sqrt2 - 1.0) * min(dr, dc)
        # Manhattan distance
        return dr + dc

    # Movement configuration
    cardinal_moves = ((1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0))
    diagonal_moves = (
        (1, 1, sqrt2), (1, -1, sqrt2), (-1, 1, sqrt2), (-1, -1, sqrt2)
    )
    moves = cardinal_moves + diagonal_moves if diagonal else cardinal_moves

    queue = []
    counter = 0
    # Add a tiny tie-breaker factor to prioritize paths closer to the goal
    h_start = heuristic(start, goal)
    heappush(queue, (h_start * 1.001, 0.0, counter, start))
    came_from = {}
    g_score = {start: 0.0}
    closed = set()
    explored_cells = []

    while queue:
        _, current_g, _, current = heappop(queue)
        if current in closed:
            continue
        closed.add(current)
        explored_cells.append(current)

        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()

            smoothed = smooth_path(grid, path) if smooth else path
            return PathResult(path, len(closed), explored_cells=explored_cells, smoothed_path=smoothed)

        r, c = current
        for dr, dc, cost in moves:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue
            if grid[nr][nc] == 1:
                continue

            # Corner-cutting check for diagonal moves:
            # Don't allow squeezing diagonally between two adjacent blocked walls
            if dr != 0 and dc != 0:
                if grid[r + dr][c] == 1 and grid[r][c + dc] == 1:
                    continue

            nxt = (nr, nc)
            if nxt in closed:
                continue

            tentative_g = current_g + cost
            if tentative_g < g_score.get(nxt, float("inf")):
                came_from[nxt] = current
                g_score[nxt] = tentative_g
                counter += 1
                f_score = tentative_g + heuristic(nxt, goal) * 1.001
                heappush(queue, (f_score, tentative_g, counter, nxt))

    return None
