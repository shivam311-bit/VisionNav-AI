from backend.pathfinding_adapter import find_path


def test_path_exists_on_empty_grid():
    grid = [[0 for _ in range(5)] for _ in range(5)]
    result = find_path(grid, (0, 0), (4, 4))
    assert result is not None
    path, explored = result
    assert path[0] == (0, 0)
    assert path[-1] == (4, 4)
    assert len(path) - 1 == 8
    assert explored > 0
    assert all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(path, path[1:]))


def test_no_path_when_wall_blocks_grid():
    grid = [[0 for _ in range(5)] for _ in range(5)]
    for r in range(5):
        grid[r][2] = 1
    assert find_path(grid, (2, 0), (2, 4)) is None


def test_start_equals_goal():
    result = find_path([[0]], (0, 0), (0, 0))
    assert result == ([(0, 0)], 1)


def test_diagonal_movement_shorter_steps():
    grid = [[0 for _ in range(5)] for _ in range(5)]
    # Diagonal from (0, 0) to (4, 4) in 8-way is 4 diagonal steps (5 coordinates)
    result = find_path(grid, (0, 0), (4, 4), diagonal=True)
    assert result is not None
    path, explored = result
    assert len(path) == 5
    assert len(result.explored_cells) > 0
    # Smoothed path across open space should be direct [start, goal]
    assert result.smoothed_path == [(0, 0), (4, 4)]


def test_diagonal_corner_cutting_prevented():
    # Grid where (0,1) and (1,0) are blocked
    # Moving diagonally from (0,0) to (1,1) should be prevented
    grid = [
        [0, 1],
        [1, 0]
    ]
    result = find_path(grid, (0, 0), (1, 1), diagonal=True)
    assert result is None

