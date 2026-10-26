import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot, Route, Play, Pause, RotateCcw, MapPin, MousePointer2,
  Square, CircleDot, ShieldAlert, Activity, Clock3, Grid3X3,
  CheckCircle2, AlertTriangle, LoaderCircle, Zap, Trash2,
  Navigation, RefreshCw, AlertOctagon, Flag, Compass,
  Eye, EyeOff, GitCommit, Split, Sparkles,
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8002';
const DEFAULT_START = [1, 1];
const DEFAULT_GOAL = [10, 14];
const coordKey = ([r, c]) => `${r},${c}`;

export default function App() {
  const [data, setData] = useState(null);
  const [start, setStart] = useState(DEFAULT_START);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [mode, setMode] = useState('select');
  const [busy, setBusy] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState({ kind: 'info', text: 'Connecting to VisionNav AI backend on port 8002…' });
  const [speed, setSpeed] = useState(220);
  const [selectedPreset, setSelectedPreset] = useState('default');

  // Top 4 Enhancements States
  const [showExplored, setShowExplored] = useState(true); // 1. Search Frontier Heatmap
  const [movementMode, setMovementMode] = useState('4-way'); // 2. 4-Way vs 8-Way Diagonal
  const [showSmoothed, setShowSmoothed] = useState(false); // 3. Line-of-sight path smoothing

  const timerRef = useRef(null);
  const dataRef = useRef(null);
  const simulatingRef = useRef(false);
  const speedRef = useRef(speed);

  // 4. Drag-to-draw continuous wall brush refs
  const isDraggingRef = useRef(false);
  const dragCellsRef = useRef(new Set());

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const applyData = useCallback((next) => {
    dataRef.current = next;
    setData(next);
    if (next?.goal) setGoal(next.goal);
    if (next?.robot) setStart(next.robot);
    if (next?.movement_mode) setMovementMode(next.movement_mode);
  }, []);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || body.message || `Request failed (${response.status})`);
    return body;
  }, []);

  const loadMap = useCallback(async () => {
    try {
      const result = await request('/api/map');
      applyData(result);
      setStart(result.robot);
      setGoal(result.goal);
      setNotice({ kind: 'success', text: 'Backend connected. Ready for autonomous navigation simulation.' });
    } catch (error) {
      setNotice({ kind: 'error', text: `${error.message}. Please ensure backend is running at ${API_BASE}.` });
    }
  }, [applyData, request]);

  useEffect(() => {
    loadMap();
    return () => {
      simulatingRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [loadMap]);

  // Execute a single step of the simulation loop
  const stepSimulation = useCallback(async () => {
    if (!simulatingRef.current) return;
    const current = dataRef.current;
    if (!current) {
      simulatingRef.current = false;
      setSimulating(false);
      return;
    }

    const robot = current.robot;
    const currentGoal = current.goal;
    const path = current.path || [];

    // Check if robot is already at goal
    if (coordKey(robot) === coordKey(currentGoal)) {
      simulatingRef.current = false;
      setSimulating(false);
      setNotice({ kind: 'success', text: '🎯 Destination reached successfully! All obstacles avoided.' });
      return;
    }

    if (!path.length || current.status === 'unreachable') {
      simulatingRef.current = false;
      setSimulating(false);
      setNotice({
        kind: 'error',
        text: '🚫 Destination is unreachable! Dynamic obstacle blocked the route. Robot stopped safely.',
      });
      return;
    }

    // Find current robot position in active path
    const robotIndex = path.findIndex((p) => coordKey(p) === coordKey(robot));
    let nextPoint = null;

    if (robotIndex >= 0 && robotIndex + 1 < path.length) {
      nextPoint = path[robotIndex + 1];
    } else if (robotIndex < 0 && path.length > 0) {
      nextPoint = path[0];
    } else {
      // Reached end of current path but not at goal: replan
      try {
        const replanResult = await request('/api/replan', { method: 'POST' });
        applyData(replanResult);
        if (replanResult.path && replanResult.path.length > 1) {
          nextPoint = replanResult.path[1];
        } else {
          simulatingRef.current = false;
          setSimulating(false);
          setNotice({ kind: 'error', text: 'No reachable path to destination from current position.' });
          return;
        }
      } catch (err) {
        simulatingRef.current = false;
        setSimulating(false);
        setNotice({ kind: 'error', text: `Replan error: ${err.message}` });
        return;
      }
    }

    // Check if nextPoint is blocked by an obstacle
    if (current.grid[nextPoint[0]][nextPoint[1]] === 1) {
      setNotice({ kind: 'info', text: '⚠️ Next cell is blocked! Recalculating path dynamically…' });
      try {
        const replanResult = await request('/api/replan', { method: 'POST' });
        applyData(replanResult);
        if (replanResult.status === 'unreachable' || !replanResult.path.length) {
          simulatingRef.current = false;
          setSimulating(false);
          setNotice({ kind: 'error', text: 'Destination blocked and unreachable! Navigation aborted.' });
          return;
        }
        nextPoint = replanResult.path[1] || replanResult.path[0];
      } catch (err) {
        simulatingRef.current = false;
        setSimulating(false);
        setNotice({ kind: 'error', text: `Dynamic replan failed: ${err.message}` });
        return;
      }
    }

    // Move robot to nextPoint
    const isArrived = coordKey(nextPoint) === coordKey(currentGoal);
    try {
      const result = await request('/api/status', {
        method: 'POST',
        body: JSON.stringify({
          robot: nextPoint,
          status: isArrived ? 'arrived' : 'moving',
        }),
      });
      applyData(result);

      if (isArrived) {
        simulatingRef.current = false;
        setSimulating(false);
        setNotice({ kind: 'success', text: '🎉 Mission Complete! Robot arrived safely at destination.' });
        return;
      }

      // Schedule next tick
      if (simulatingRef.current) {
        timerRef.current = setTimeout(stepSimulation, speedRef.current);
      }
    } catch (error) {
      simulatingRef.current = false;
      setSimulating(false);
      setNotice({ kind: 'error', text: `Simulation error: ${error.message}` });
    }
  }, [applyData, request]);

  const startSimulation = async () => {
    const current = dataRef.current;
    if (!current?.path?.length) {
      setNotice({ kind: 'error', text: 'Please find a route before starting the simulation.' });
      return;
    }
    if (coordKey(current.robot) === coordKey(current.goal)) {
      setNotice({ kind: 'success', text: 'Robot is already at the destination.' });
      return;
    }
    if (current.status === 'unreachable') {
      setNotice({ kind: 'error', text: 'Cannot simulate: destination is unreachable with current obstacles.' });
      return;
    }

    simulatingRef.current = true;
    setSimulating(true);
    setNotice({ kind: 'info', text: '🤖 Autonomous simulation running. Watch real-time path following & avoidance.' });
    stepSimulation();
  };

  const stopSimulation = () => {
    simulatingRef.current = false;
    setSimulating(false);
    clearTimeout(timerRef.current);
    setNotice({ kind: 'info', text: '⏸️ Simulation paused. You can inspect coordinates or place obstacles.' });
  };

  // Toggle Movement Mode (4-way vs 8-way diagonal)
  const toggleMovementMode = async () => {
    const nextMode = movementMode === '4-way' ? '8-way' : '4-way';
    setBusy(true);
    try {
      const result = await request('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ movement_mode: nextMode }),
      });
      applyData(result);
      setMovementMode(nextMode);
      setNotice({
        kind: 'info',
        text: `Switched to ${nextMode.toUpperCase()} movement (${nextMode === '8-way' ? 'Diagonal Octile' : 'Cardinal Manhattan'}).`,
      });
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  // Commit batch of obstacles (used by Drag-to-Draw)
  const commitObstacleBatch = useCallback(async (cellCoords, drawMode) => {
    if (!cellCoords.length) return;
    setBusy(true);
    try {
      const body = drawMode === 'add'
        ? { add: cellCoords, remove: [] }
        : { add: [], remove: cellCoords };

      const result = await request('/api/obstacles', { method: 'POST', body: JSON.stringify(body) });
      applyData(result);

      if (result.status === 'unreachable') {
        if (simulatingRef.current) {
          simulatingRef.current = false;
          setSimulating(false);
          clearTimeout(timerRef.current);
        }
        setNotice({ kind: 'error', text: '🚫 Dynamic obstacles placed! No alternative path exists. Robot stopped.' });
      } else if (result.route_blocked) {
        setNotice({ kind: 'success', text: `⚡ Dynamic obstacle placed! Real-time replan calculated (${result.path_length} steps).` });
      } else {
        setNotice({ kind: 'success', text: result.message });
      }
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }, [applyData, request]);

  // Drag-to-Draw Event Handlers
  const handleCellMouseDown = (r, c) => {
    if (!data || busy) return;
    const point = [r, c];
    const key = coordKey(point);

    if (mode === 'select') {
      setNotice({ kind: 'info', text: `Cell [${r}, ${c}] selected. Switch tool to Start, Goal, Add wall, or Remove.` });
      return;
    }

    if (mode === 'start') {
      if (simulating) {
        setNotice({ kind: 'error', text: 'Pause simulation before moving the start position.' });
        return;
      }
      if (data.grid[r][c] === 1) {
        setNotice({ kind: 'error', text: 'Cannot place robot start on an obstacle cell.' });
        return;
      }
      if (key === coordKey(goal)) {
        setNotice({ kind: 'error', text: 'Start position cannot be the same as destination.' });
        return;
      }
      setBusy(true);
      request('/api/status', { method: 'POST', body: JSON.stringify({ robot: point, status: 'idle' }) })
        .then((result) => {
          applyData(result);
          setStart(point);
          setNotice({ kind: 'info', text: `Start position set to [${r}, ${c}]. Click "Find Optimal Route".` });
          setMode('select');
        })
        .catch((err) => setNotice({ kind: 'error', text: err.message }))
        .finally(() => setBusy(false));
      return;
    }

    if (mode === 'goal') {
      if (simulating) {
        setNotice({ kind: 'error', text: 'Pause simulation before moving the destination.' });
        return;
      }
      if (data.grid[r][c] === 1) {
        setNotice({ kind: 'error', text: 'Cannot place destination on an obstacle cell.' });
        return;
      }
      if (key === coordKey(start)) {
        setNotice({ kind: 'error', text: 'Destination cannot overlap the start position.' });
        return;
      }
      setGoal(point);
      setNotice({ kind: 'info', text: `Destination set to [${r}, ${c}]. Click "Find Optimal Route" to update path.` });
      setMode('select');
      return;
    }

    // For Add or Remove Wall: Start drag brush!
    if (key === coordKey(data.robot) || key === coordKey(data.goal)) {
      setNotice({ kind: 'error', text: 'Cannot place an obstacle directly on top of the robot or destination.' });
      return;
    }

    isDraggingRef.current = true;
    dragCellsRef.current = new Set([key]);
    commitObstacleBatch([point], mode);
  };

  const handleCellMouseEnter = (r, c) => {
    if (!isDraggingRef.current || busy) return;
    if (mode !== 'add' && mode !== 'remove') return;

    const point = [r, c];
    const key = coordKey(point);
    if (key === coordKey(data?.robot) || key === coordKey(data?.goal)) return;

    if (!dragCellsRef.current.has(key)) {
      dragCellsRef.current.add(key);
      commitObstacleBatch([point], mode);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragCellsRef.current.clear();
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const findRoute = async () => {
    setBusy(true);
    simulatingRef.current = false;
    setSimulating(false);
    clearTimeout(timerRef.current);

    try {
      const result = await request('/api/path', {
        method: 'POST',
        body: JSON.stringify({ start, goal }),
      });
      applyData(result);
      if (result.status === 'unreachable') {
        setNotice({ kind: 'error', text: '🚫 Destination is unreachable! Obstacles block all possible paths.' });
      } else {
        setNotice({
          kind: 'success',
          text: `✅ Route calculated: ${result.path_length} steps with ${result.movement_mode.toUpperCase()} A* algorithm.`,
        });
      }
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const spawnDynamicObstacle = async () => {
    if (!data?.path?.length) {
      setNotice({ kind: 'error', text: 'Plan a route first before spawning a dynamic obstacle.' });
      return;
    }
    setBusy(true);
    try {
      const result = await request('/api/obstacles/dynamic-spawn', { method: 'POST' });
      applyData(result);
      if (result.status === 'unreachable') {
        if (simulatingRef.current) {
          simulatingRef.current = false;
          setSimulating(false);
          clearTimeout(timerRef.current);
        }
        setNotice({ kind: 'error', text: '🚫 Dynamic obstacle placed! Destination is now completely unreachable.' });
      } else {
        setNotice({ kind: 'success', text: '⚡ Dynamic obstacle dropped in robot path! System rerouted on-the-fly.' });
      }
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const loadPresetScenario = async (presetName) => {
    setBusy(true);
    simulatingRef.current = false;
    setSimulating(false);
    clearTimeout(timerRef.current);
    setSelectedPreset(presetName);

    try {
      const result = await request('/api/presets', {
        method: 'POST',
        body: JSON.stringify({ preset: presetName }),
      });
      applyData(result);
      setStart(result.robot);
      setGoal(result.goal);
      setMode('select');
      setNotice({ kind: 'info', text: `Scenario loaded: ${presetName.toUpperCase()}. Click "Find Optimal Route".` });
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const resetEnvironment = async () => {
    setBusy(true);
    simulatingRef.current = false;
    setSimulating(false);
    clearTimeout(timerRef.current);

    try {
      const result = await request('/api/reset', { method: 'POST' });
      applyData(result);
      setStart(result.robot);
      setGoal(result.goal);
      setMode('select');
      setNotice({ kind: 'success', text: '🔄 Environment reset to default state. All counters cleared.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const pathCells = new Set((data?.path || []).map(coordKey));
  const smoothedCells = new Set((data?.smoothed_path || []).map(coordKey));
  const exploredCells = new Set((data?.explored_nodes || []).map(coordKey));
  const startKey = coordKey(start);
  const goalKey = coordKey(goal);
  const robotKey = data?.robot ? coordKey(data.robot) : '';
  const statusLabel = (data?.status || 'offline').replaceAll('_', ' ');

  // Calculate progress percentage
  const totalPathSteps = data?.path ? data.path.length - 1 : 0;
  const currentStep = data?.steps_taken || 0;
  const progressPercent = totalPathSteps > 0 && data?.status !== 'idle'
    ? Math.min(100, Math.round((currentStep / (currentStep + totalPathSteps)) * 100))
    : data?.status === 'arrived' ? 100 : 0;

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Bot size={26} />
          </div>
          <div>
            <h1>VisionNav <span>AI</span></h1>
            <p>Autonomous Robot Navigation & Dynamic Obstacle Avoidance</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="preset-selector">
            <span className="preset-label">SCENARIO:</span>
            <select
              value={selectedPreset}
              onChange={(e) => loadPresetScenario(e.target.value)}
              disabled={busy || simulating}
              className="preset-dropdown"
            >
              <option value="default">Default Arena (12×16)</option>
              <option value="maze">Maze Challenge</option>
              <option value="corridor">Corridor Detour</option>
              <option value="trap">Unreachable Trap Test</option>
              <option value="clear">Clear Arena (Custom)</option>
            </select>
          </div>

          <span className={`connection ${data ? 'online' : 'offline'}`}>
            <span className="pulse-dot" />
            {data ? 'Backend Online (Port 8002)' : 'Backend Offline'}
          </span>

          <button className="icon-button" onClick={loadMap} title="Refresh backend state">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="page-content">
        {/* Hackathon Header */}
        <section className="intro-row">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              HACK IN HILLS ’26 · AI & ROBOTICS TRACK
            </div>
            <h2>Intelligent Robot <span>Navigation & Avoidance</span></h2>
            <p className="intro-copy">
              A* pathfinding with real-time dynamic obstacle detection, 4-Way & 8-Way diagonal search,
              A* exploration frontier heatmap, and automated collision-avoidance rerouting.
            </p>
          </div>
          <div className="hackathon-badge">
            <Flag size={15} />
            <span>Hack in Hills ’26 Prototype</span>
          </div>
        </section>

        {/* Live Navigation Statistics Grid */}
        <section className="stats-grid">
          <Stat
            icon={<Route size={18} />}
            label="Route Distance"
            value={data?.path_length ?? '—'}
            unit={showSmoothed && data?.smoothed_path ? `${data.smoothed_path.length - 1} smoothed pts` : 'steps remaining'}
          />
          <Stat
            icon={<Navigation size={18} />}
            label="Navigation Progress"
            value={`${data?.steps_taken || 0} steps`}
            unit={`${progressPercent}% completed`}
          />
          <Stat
            icon={<Zap size={18} />}
            label="Dynamic Replans"
            value={data?.replan_count ?? 0}
            unit="reroutes avoided"
            highlight={data?.replan_count > 0}
          />
          <Stat
            icon={<Grid3X3 size={18} />}
            label="Search Space"
            value={data?.explored_cells ?? '—'}
            unit="evaluated nodes"
          />
          <Stat
            icon={<ShieldAlert size={18} />}
            label="Active Obstacles"
            value={data?.active_obstacles ?? (data ? data.grid.flat().filter((c) => c === 1).length : '—')}
            unit="blocked grid cells"
          />
          <Stat
            icon={<Activity size={18} />}
            label="Robot State"
            value={statusLabel}
            unit="live telemetry"
            status={data?.status}
          />
        </section>

        {/* Unreachable Warning Banner if route cannot be found */}
        {data?.status === 'unreachable' && (
          <div className="unreachable-banner">
            <AlertOctagon size={24} />
            <div>
              <strong>DESTINATION UNREACHABLE</strong>
              <p>Obstacles are completely enclosing the robot or destination. Remove blocked cells to calculate an alternative route.</p>
            </div>
          </div>
        )}

        {/* Primary Interactive Workspace */}
        <section className="workspace">
          {/* Left: Navigation Grid Card */}
          <div className="map-card panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">AUTONOMOUS ENVIRONMENT</div>
                <h3>2D Grid Simulator</h3>
              </div>
              <div className="feature-badges">
                {/* 2. Movement Mode Toggle Button */}
                <button
                  className={`toggle-pill ${movementMode === '8-way' ? 'pill-active' : ''}`}
                  onClick={toggleMovementMode}
                  disabled={busy || simulating}
                  title="Toggle between 4-directional Manhattan and 8-directional Diagonal Octile search"
                >
                  <Compass size={13} />
                  <span>{movementMode === '8-way' ? '8-Way Diagonal' : '4-Way Manhattan'}</span>
                </button>

                {/* 1. Search Frontier Toggle Button */}
                <button
                  className={`toggle-pill ${showExplored ? 'pill-active' : ''}`}
                  onClick={() => setShowExplored(!showExplored)}
                  title="Toggle A* exploration frontier / evaluated nodes heatmap"
                >
                  {showExplored ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>Search Frontier</span>
                </button>

                {/* 3. Smoothed Path Toggle Button */}
                <button
                  className={`toggle-pill ${showSmoothed ? 'pill-active' : ''}`}
                  onClick={() => setShowSmoothed(!showSmoothed)}
                  title="Toggle line-of-sight shortcutting / smoothed path trajectory"
                >
                  <Sparkles size={13} />
                  <span>Smoothed Line</span>
                </button>

                <div className="map-size">
                  {data ? `${data.rows} × ${data.cols}` : '—'}
                </div>
              </div>
            </div>

            {/* Toolbar for Cell Actions & Drag-to-Draw Notice */}
            <div className="map-toolbar">
              <div className="mode-buttons">
                <ModeButton
                  active={mode === 'select'}
                  onClick={() => setMode('select')}
                  icon={<MousePointer2 size={15} />}
                  label="Inspect"
                />
                <ModeButton
                  active={mode === 'start'}
                  onClick={() => setMode('start')}
                  icon={<CircleDot size={15} />}
                  label="Set Start"
                  disabled={simulating}
                />
                <ModeButton
                  active={mode === 'goal'}
                  onClick={() => setMode('goal')}
                  icon={<MapPin size={15} />}
                  label="Set Goal"
                  disabled={simulating}
                />
                <ModeButton
                  active={mode === 'add'}
                  onClick={() => setMode('add')}
                  icon={<ShieldAlert size={15} />}
                  label="Add Wall (Brush)"
                />
                <ModeButton
                  active={mode === 'remove'}
                  onClick={() => setMode('remove')}
                  icon={<Square size={15} />}
                  label="Erase Wall"
                />
              </div>

              <div className="mode-hint">
                {mode === 'add'
                  ? '🖌️ Click and drag across cells to draw continuous walls in real-time!'
                  : mode === 'remove'
                  ? '🧹 Click and drag to erase multiple walls'
                  : mode === 'select'
                  ? '💡 Tip: Click any cell to inspect coordinates or switch mode above'
                  : `📍 Click an empty cell to set the ${mode.toUpperCase()} point`}
              </div>
            </div>

            {/* Grid Display */}
            <div className="grid-wrap">
              {data ? (
                <div className="grid-board" style={{ '--cols': data.cols }}>
                  {data.grid.map((row, r) =>
                    row.map((cell, c) => {
                      const key = `${r},${c}`;
                      const isBlocked = cell === 1;
                      const isPath = pathCells.has(key);
                      const isSmoothed = showSmoothed && smoothedCells.has(key);
                      const isExplored = showExplored && exploredCells.has(key) && !isBlocked && !isPath && key !== startKey && key !== goalKey;
                      const isStart = key === startKey;
                      const isGoal = key === goalKey;
                      const isRobot = key === robotKey;

                      const classes = ['grid-cell'];
                      if (isBlocked) classes.push('blocked');
                      if (isPath) classes.push('path-cell');
                      if (isSmoothed) classes.push('smoothed-cell');
                      if (isExplored) classes.push('explored-cell');
                      if (isStart) classes.push('start-cell');
                      if (isGoal) classes.push('goal-cell');
                      if (isRobot) classes.push('robot-cell');

                      return (
                        <button
                          key={key}
                          className={classes.join(' ')}
                          onMouseDown={() => handleCellMouseDown(r, c)}
                          onMouseEnter={() => handleCellMouseEnter(r, c)}
                          aria-label={`Cell [${r}, ${c}]`}
                          title={`[Row ${r}, Col ${c}] ${isBlocked ? '· Wall' : ''} ${isRobot ? '· Robot' : ''} ${isExplored ? '· Explored by A*' : ''}`}
                        >
                          {isRobot ? (
                            <Bot size={15} strokeWidth={2.6} className="robot-icon-pulse" />
                          ) : isStart ? (
                            <span className="marker start-marker">S</span>
                          ) : isGoal ? (
                            <MapPin size={14} className="goal-icon-bounce" />
                          ) : isBlocked ? (
                            <span className="obstacle-mark" />
                          ) : isSmoothed ? (
                            <span className="smoothed-dot" />
                          ) : isPath ? (
                            <span className="path-dot" />
                          ) : isExplored ? (
                            <span className="explored-dot" />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="map-loading">
                  <LoaderCircle className="spin" size={32} />
                  <span>Connecting to FastAPI backend…</span>
                </div>
              )}
            </div>

            {/* Grid Legend */}
            <div className="legend">
              <span><i className="legend-start">S</i> Start / Origin</span>
              <span><Bot size={15} className="legend-robot-icon" /> Robot [Live]</span>
              <span><i className="legend-goal"><MapPin size={11} /></i> Destination</span>
              <span><i className="legend-path" /> Planned Path</span>
              {showSmoothed && <span><i className="legend-smoothed" /> Smoothed Waypoint</span>}
              {showExplored && <span><i className="legend-explored" /> A* Evaluated Node</span>}
              <span><i className="legend-obstacle" /> Dynamic Wall</span>
            </div>

            <div className="map-footer">
              <span>
                <Compass size={14} /> Mode: <b>{movementMode === '8-way' ? '8-Way Octile (Diagonal)' : '4-Way Manhattan'}</b> · \(f(n) = g(n) + h(n)\)
              </span>
              <span>Drag mouse to paint continuous walls · Row, Col indices</span>
            </div>
          </div>

          {/* Right Column: Mission Control & Events */}
          <aside className="control-column">
            {/* Control Panel */}
            <div className="panel control-card">
              <div className="section-kicker">MISSION CONTROL</div>
              <h3>Navigation Command</h3>
              <p className="muted">Execute optimal route planning, live traversal, and dynamic obstacle tests.</p>

              {/* Coordinates summary */}
              <div className="coord-fields">
                <div className="coord-field">
                  <label>ROBOT POSITION</label>
                  <div>
                    <CircleDot size={15} />
                    <span>[{data?.robot ? `${data.robot[0]}, ${data.robot[1]}` : `${start[0]}, ${start[1]}`}]</span>
                  </div>
                </div>
                <div className="coord-field">
                  <label>DESTINATION</label>
                  <div>
                    <MapPin size={15} />
                    <span>[{goal[0]}, {goal[1]}]</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                className="primary-button"
                disabled={!data || busy || simulating}
                onClick={findRoute}
              >
                <Route size={17} />
                {busy ? 'Calculating Route…' : `Find Optimal Route (${movementMode === '8-way' ? '8-Way' : '4-Way'})`}
              </button>

              {!simulating ? (
                <button
                  className="secondary-button"
                  disabled={!data || !data.path?.length || data.status === 'unreachable' || busy}
                  onClick={startSimulation}
                >
                  <Play size={16} fill="currentColor" />
                  Start Movement Simulation
                </button>
              ) : (
                <button
                  className="secondary-button pause-button"
                  onClick={stopSimulation}
                >
                  <Pause size={16} fill="currentColor" />
                  Pause Simulation
                </button>
              )}

              {/* Dynamic Obstacle Spawn Button */}
              <button
                className="dynamic-obstacle-button"
                disabled={!data || !data.path?.length || data.status === 'arrived' || busy}
                onClick={spawnDynamicObstacle}
                title="Drop an obstacle directly on the planned path to test dynamic rerouting"
              >
                <Zap size={15} fill="currentColor" />
                ⚡ Drop Obstacle on Route
              </button>

              {/* Speed Slider */}
              <div className="speed-control">
                <div>
                  <label htmlFor="speed">Traversal Speed</label>
                  <span>{speed} ms / step</span>
                </div>
                <input
                  id="speed"
                  type="range"
                  min="60"
                  max="600"
                  step="20"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
                <div className="speed-ticks">
                  <span onClick={() => setSpeed(400)}>Slow</span>
                  <span onClick={() => setSpeed(220)}>Normal</span>
                  <span onClick={() => setSpeed(80)}>Fast</span>
                </div>
              </div>

              {/* Reset Controls */}
              <div className="reset-group">
                <button
                  className="reset-button"
                  disabled={!data || busy}
                  onClick={resetEnvironment}
                  title="Reset grid to default map"
                >
                  <RotateCcw size={14} /> Reset Environment
                </button>
                <button
                  className="reset-button"
                  disabled={!data || busy}
                  onClick={() => loadPresetScenario('clear')}
                  title="Clear all walls from grid"
                >
                  <Trash2 size={14} /> Clear All Walls
                </button>
              </div>
            </div>

            {/* System Event Logs */}
            <div className="panel event-card">
              <div className="event-heading">
                <div className="section-kicker">LIVE TELEMETRY</div>
                <span className="live-label">
                  <span className="pulse-dot" /> LIVE EVENT BUS
                </span>
              </div>

              <div className={`notice notice-${notice.kind}`}>
                {notice.kind === 'error' ? (
                  <AlertTriangle size={18} />
                ) : notice.kind === 'success' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Activity size={18} />
                )}
                <p>{notice.text}</p>
              </div>

              <div className="event-last">
                <span>Last Backend Event:</span>
                <strong>{data?.last_event || 'Simulation initialized.'}</strong>
              </div>
            </div>
          </aside>
        </section>

        {/* Technical Architecture & Info Grid */}
        <section className="bottom-grid">
          <div className="panel info-panel">
            <div className="info-icon">
              <Route size={20} />
            </div>
            <div>
              <h4>Dual-Mode A* Search</h4>
              <p>
                Supports both standard 4-way Manhattan distance and 8-way diagonal Octile search with
                strict diagonal corner-cutting prevention.
              </p>
            </div>
          </div>

          <div className="panel info-panel">
            <div className="info-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h4>Line-of-Sight Smoothing</h4>
              <p>
                Applies string-pulling post-processing across open spaces using Bresenham line checks,
                eliminating unnecessary grid staircases for natural robot navigation.
              </p>
            </div>
          </div>

          <div className="panel info-panel">
            <div className="info-icon">
              <Eye size={20} />
            </div>
            <div>
              <h4>A* Exploration Frontier Heatmap</h4>
              <p>
                Visualizes the closed-set search frontier on the grid, demonstrating mathematically how
                the heuristic prunes suboptimal search branches.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <span>VISIONNAV AI <b>·</b> HACK IN HILLS ’26 PROJECT SUBMISSION</span>
          <span>Engineered by Shivam (Integration/Backend) · Saksham (Algorithm) · Vaishnavi (Presentation)</span>
        </footer>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, unit, status, highlight }) {
  const statusColorClass =
    status === 'arrived'
      ? 'status-arrived'
      : status === 'moving'
      ? 'status-moving'
      : status === 'replanned'
      ? 'status-replanned'
      : status === 'unreachable'
      ? 'status-unreachable'
      : '';

  return (
    <div className={`stat-card ${highlight ? 'stat-card-highlight' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${status ? statusColorClass : ''}`}>{value}</div>
      <div className="stat-unit">{unit}</div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label, disabled }) {
  return (
    <button
      className={`mode-button ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
