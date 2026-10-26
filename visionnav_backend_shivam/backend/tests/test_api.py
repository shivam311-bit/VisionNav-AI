from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def setup_function():
    client.post("/api/reset")


def test_health_and_map():
    assert client.get("/").json()["ok"] is True
    response = client.get("/api/map")
    assert response.status_code == 200
    assert response.json()["rows"] == 12
    assert response.json()["cols"] == 16


def test_calculate_path():
    response = client.post("/api/path", json={"start": [1, 1], "goal": [10, 14]})
    assert response.status_code == 200
    data = response.json()
    assert data["path"][0] == [1, 1]
    assert data["path"][-1] == [10, 14]
    assert data["status"] == "planned"


def test_blocked_start_rejected():
    response = client.post("/api/path", json={"start": [2, 4], "goal": [10, 14]})
    assert response.status_code == 400


def test_invalid_obstacle_request_is_atomic():
    before = client.get("/api/map").json()["grid"]
    response = client.post("/api/obstacles", json={"add": [[0, 0], [999, 999]]})
    assert response.status_code == 422
    after = client.get("/api/map").json()["grid"]
    assert after == before


def test_obstacle_on_robot_rejected():
    response = client.post("/api/obstacles", json={"add": [[1, 1]]})
    assert response.status_code == 400


def test_reset_restores_idle_state():
    client.post("/api/path", json={"start": [1, 1], "goal": [10, 14]})
    response = client.post("/api/reset")
    assert response.status_code == 200
    assert response.json()["status"] == "idle"
    assert response.json()["path"] == []
    assert response.json()["steps_taken"] == 0
    assert response.json()["replan_count"] == 0


def test_dynamic_obstacle_triggers_replan():
    # 1. Plan initial path
    path_res = client.post("/api/path", json={"start": [1, 1], "goal": [10, 14]}).json()
    initial_path = path_res["path"]
    assert len(initial_path) > 2
    
    # 2. Add obstacle on point in the path (e.g. index 2)
    obstacle_point = initial_path[2]
    obs_res = client.post("/api/obstacles", json={"add": [obstacle_point]}).json()
    assert obs_res["route_blocked"] is True
    assert obs_res["status"] == "replanned"
    assert obs_res["replan_count"] == 1
    # Check that new path does not contain the blocked point
    assert obstacle_point not in obs_res["path"]


def test_unreachable_destination_reported():
    # Trap the goal [10, 14] by placing obstacles all around it
    # Coordinates for [10, 14] are bounded by 12x16 grid:
    # (9, 14), (11, 14), (10, 13), (10, 15)
    trap = [[9, 14], [11, 14], [10, 13], [10, 15]]
    client.post("/api/obstacles", json={"add": trap})
    response = client.post("/api/path", json={"start": [1, 1], "goal": [10, 14]})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "unreachable"
    assert data["path"] == []
    assert "unreachable" in data["message"].lower()


def test_dynamic_spawn_endpoint():
    client.post("/api/path", json={"start": [1, 1], "goal": [10, 14]})
    spawn_res = client.post("/api/obstacles/dynamic-spawn")
    assert spawn_res.status_code == 200
    data = spawn_res.json()
    assert data["route_blocked"] is True
    assert data["status"] == "replanned"
    assert data["replan_count"] == 1


def test_presets_loading():
    res = client.post("/api/presets", json={"preset": "maze"})
    assert res.status_code == 200
    data = res.json()
    assert data["preset"] == "maze"
    assert data["status"] == "idle"


def test_status_update_tracks_steps():
    res = client.post("/api/status", json={"robot": [1, 2], "status": "moving"})
    assert res.status_code == 200
    assert res.json()["robot"] == [1, 2]
    assert res.json()["steps_taken"] == 1


def test_settings_and_explored_nodes():
    # Update to 8-way movement mode
    set_res = client.post("/api/settings", json={"movement_mode": "8-way"})
    assert set_res.status_code == 200
    assert set_res.json()["movement_mode"] == "8-way"

    # Calculate path with 8-way
    path_res = client.post("/api/path", json={"start": [1, 1], "goal": [10, 14]})
    assert path_res.status_code == 200
    data = path_res.json()
    assert len(data["explored_nodes"]) > 0
    assert len(data["smoothed_path"]) > 0
    assert data["movement_mode"] == "8-way"


