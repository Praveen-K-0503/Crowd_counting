import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart
} from 'recharts';
import {
  Shield, Activity, AlertTriangle, Zap, Target,
  Eye, Layers, Radio, Cpu, Users,
  TrendingUp, Download, Crosshair, Map, BarChart2,
  Wifi, WifiOff, Play, Square, RotateCcw, Database,
  Maximize2, Upload, GitBranch, Thermometer, Move,
  ZoomIn, ZoomOut, Wind, Brain, Gauge, Sun, Moon
} from 'lucide-react';
import './index.css';

// ─── helpers ──────────────────────────────────────────────────
const nowStr  = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const uid     = () => Math.random().toString(36).slice(2, 8);
const secStr  = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
};

// ─── API Base URLs (reads from env var, falls back to localhost for dev) ──────
const rawApiBase = (import.meta.env.VITE_API_URL || '').trim();
const hasPlaceholderApiBase =
  !rawApiBase || /YOUR_(HF_USERNAME|USERNAME)|your_hf_username|your_username/i.test(rawApiBase);
const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const fallbackApiBase =
  typeof window === 'undefined'
    ? 'http://127.0.0.1:8000'
    : (isLocalHost ? 'http://127.0.0.1:8000' : '');
const API_BASE = (hasPlaceholderApiBase ? fallbackApiBase : rawApiBase).replace(/\/$/, '');
const WS_BASE  = API_BASE.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
const API_CONFIG_ERROR = 'Backend API is not configured. Set VITE_API_URL to your FastAPI server URL.';

const THREAT = {
  SAFE:     { label: 'SAFE',     cls: 'safe'     },
  MODERATE: { label: 'MODERATE', cls: 'moderate' },
  DANGER:   { label: 'DANGER',   cls: 'danger'   },
};
function getThreat(count, limit) {
  const r = limit > 0 ? count / limit : 0;
  if (r >= 1)    return THREAT.DANGER;
  if (r >= 0.75) return THREAT.MODERATE;
  return THREAT.SAFE;
}

// Density classification per 10k pixel reference area
function getDensityLabel(count, limit) {
  const r = limit > 0 ? count / limit : 0;
  if (r >= 1)    return { label: 'CRITICAL', cls: 'danger'   };
  if (r >= 0.75) return { label: 'HIGH',     cls: 'moderate' };
  if (r >= 0.40) return { label: 'MEDIUM',   cls: 'blue'     };
  return           { label: 'LOW',      cls: ''         };
}

// Simple linear regression on last N data points for predictive alerts
function predictNextFrameCount(history, n = 12) {
  const data = history.slice(-n);
  if (data.length < 3) return null;
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.count);
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const num   = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const den   = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  if (den === 0) return null;
  const slope = num / den;
  const intercept = yMean - slope * xMean;
  // predict 10 frames ahead
  return Math.max(0, Math.round(slope * (xs.length + 10) + intercept));
}

// ─── Custom Recharts Tooltip ──────────────────────────────────
function CTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{label}</div>
      <div className="custom-tooltip-value">{payload[0].value}</div>
    </div>
  );
}

// ─── Alert Item ───────────────────────────────────────────────
function AlertItem({ type, title, msg, time }) {
  const Icon = type === 'danger' ? AlertTriangle : type === 'warning' ? Zap : Radio;
  return (
    <div className={`alert-item ${type}`}>
      <div className="alert-icon"><Icon /></div>
      <div className="alert-body">
        <div className="alert-title">{title}</div>
        <div className="alert-msg">{msg}</div>
        <div className="alert-time">{time}</div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {

  // ── Theme ──
  const [theme, setTheme] = useState(() => localStorage.getItem('cp_theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cp_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── File / mode ──
  const [file,          setFile]          = useState(null);
  const [fileType,      setFileType]      = useState('image');
  const [preview,       setPreview]       = useState(null);      // image preview URL
  const [videoPreview,  setVideoPreview]  = useState(null);      // video preview URL
  const [resultImg,     setResultImg]     = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [dragActive,    setDragActive]    = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);       // 0-100

  // ── Analytics ──
  const [stats,    setStats]    = useState({ count: 0, unique: 0, latency: 0, frames: 0 });
  const [history,  setHistory]  = useState([]);
  const [peakCount, setPeak]    = useState(0);
  const [alerts,   setAlerts]   = useState([]);
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_sessions') || '[]'); }
    catch { return []; }
  });
  const sessionStartTs = useRef(null);

  // ── WebSocket ──
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // ── Settings ──
  const [settings, setSettings] = useState({
    heatmap:       false,
    clustering:    false,
    showPoints:    true,
    motionVecs:    false,
    zoning:        false,
    mode:          'Balanced',
    capacity:      150,
    magnification: 1.5,
    nmsRadius:     9.0,
    frameSkip:     3,
    overlayOpacity: 100,   // GAP 2: opacity slider
  });

  // ── Zoom / Pan (GAP 4) ──
  const [zoom, setZoom]       = useState(1);
  const [pan, setPan]         = useState({ x: 0, y: 0 });
  const isPanning             = useRef(false);
  const panStart              = useRef({ x: 0, y: 0 });
  const panOrigin             = useRef({ x: 0, y: 0 });

  // ── Zone fencing ──
  const [fencePoints, setFencePoints] = useState([]);
  const [drawingFence, setDrawingFence] = useState(false);
  const viewerRef    = useRef(null);
  const fileInputRef = useRef(null);

  // ── Derived ──
  const threat       = getThreat(stats.count, settings.capacity);
  const density      = getDensityLabel(stats.count, settings.capacity);
  const anomalyActive = alerts.some(a => a.type === 'danger' && Date.now() - a._ts < 5000);
  const predicted    = useMemo(() => predictNextFrameCount(history), [history]);
  const predictAlert = predicted !== null && predicted > settings.capacity;

  // ── Clock ──
  const [clock, setClock] = useState(nowStr());
  useEffect(() => {
    const t = setInterval(() => setClock(nowStr()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── FPS ──
  const lastHistLen = useRef(0);
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      const delta = history.length - lastHistLen.current;
      setFps(Math.max(0, Math.round(delta / Math.max(1, settings.frameSkip) * settings.frameSkip)));
      lastHistLen.current = history.length;
    }, 1000);
    return () => clearInterval(t);
  }, [history, settings.frameSkip]);

  // ── Average density from history ──
  const avgCount = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.count, 0) / history.length)
    : 0;

  // ── Alert helper ──
  const addAlert = useCallback((type, title, msg) => {
    const entry = { id: uid(), type, title, msg, time: nowStr(), _ts: Date.now() };
    setAlerts(prev => [entry, ...prev].slice(0, 60));
  }, []);

  useEffect(() => {
    if (hasPlaceholderApiBase) {
      addAlert(
        'warning',
        'API Fallback Active',
        API_BASE
          ? `Using fallback backend: ${API_BASE}. Set VITE_API_URL for deployed builds.`
          : API_CONFIG_ERROR
      );
    }
  }, [addAlert]);

  // ── Predictive alert (GAP optional-7) ──
  useEffect(() => {
    if (predictAlert && history.length % 15 === 0 && history.length > 0) {
      addAlert('warning', '🔮 Predictive Alert', `Model predicts ~${predicted} subjects in ~10 frames — limit ${settings.capacity}`);
    }
  }, [predictAlert, predicted, history.length, settings.capacity, addAlert]);

  // ── File handling ──
  const handleFile = useCallback((f) => {
    setFile(f);
    setResultImg(null);
    setHistory([]);
    setPeak(0);
    setFencePoints([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUploadProgress(0);
    setStats({ count: 0, unique: 0, latency: 0, frames: 0 });
    sessionStartTs.current = Date.now();
    // Revoke any old preview URLs to avoid memory leaks
    if (preview)      URL.revokeObjectURL(preview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (f.type.startsWith('video')) {
      setFileType('video');
      setPreview(null);
      setVideoPreview(URL.createObjectURL(f));
    } else {
      setFileType('image');
      setPreview(URL.createObjectURL(f));
      setVideoPreview(null);
    }
    addAlert('info', 'Feed Loaded', `${f.name.slice(0, 28)} (${(f.size/1024/1024).toFixed(1)} MB)`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addAlert]);

  const onDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };
  const onDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  // ── Zoom via scroll wheel (GAP 4) ──
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(1, z - e.deltaY * 0.002)));
  };

  // ── Pan via mouse drag (GAP 4) ──
  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    isPanning.current = true;
    panStart.current  = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    e.currentTarget.style.cursor = 'grabbing';
  };
  const onMouseMove = (e) => {
    if (!isPanning.current) return;
    setPan({
      x: panOrigin.current.x + (e.clientX - panStart.current.x),
      y: panOrigin.current.y + (e.clientY - panStart.current.y),
    });
  };
  const onMouseUp = (e) => {
    isPanning.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = zoom > 1 ? 'grab' : 'crosshair';
  };

  // ── Zone fencing click ──
  const onViewerClick = (e) => {
    if (!drawingFence || !viewerRef.current || isPanning.current) return;
    const r  = viewerRef.current.getBoundingClientRect();
    const xr = (e.clientX - r.left) / r.width;
    const yr = (e.clientY - r.top)  / r.height;
    setFencePoints(fp => [...fp, { x: xr, y: yr }]);
  };

  // ── Wheel listener (must be non-passive) ──
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  // ── Image scan ──
  const executeImageScan = async () => {
    if (!file) return;
    setLoading(true);
    addAlert('info', 'Scan Initiated', 'Neural engine processing frame...');

    const form = new FormData();
    form.append('file', file);
    form.append('confidence_threshold',
      settings.mode === 'Performance' ? '0.45' : settings.mode === 'Accuracy' ? '0.25' : '0.35');
    form.append('magnification',        parseFloat(settings.magnification).toFixed(2));
    form.append('nms_radius',           parseFloat(settings.nmsRadius).toFixed(2));
    form.append('use_heatmap',          String(settings.heatmap));
    form.append('use_clustering',       String(settings.clustering));
    form.append('use_motion_vectors',   String(settings.motionVecs));
    form.append('fencing_polygon',      JSON.stringify(fencePoints));
    form.append('inference_batch_size', '8');
    form.append('patch_overlap',
      settings.mode === 'Performance' ? '0.0' : settings.mode === 'Accuracy' ? '0.5' : '0.25');
    form.append('inference_strategy',   'Auto');
    form.append('max_resolution',       '3840');

    try {
      if (!API_BASE) throw new Error(API_CONFIG_ERROR);
      const res = await fetch(`${API_BASE}/api/process-image`, { method: 'POST', body: form });
      const responseText = await res.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { detail: responseText || `HTTP ${res.status}` };
      }
      if (!res.ok) throw new Error(data.detail || `Image scan failed (HTTP ${res.status})`);
      if (data.detail) throw new Error(data.detail);

      setResultImg(`data:image/jpeg;base64,${data.imageB64}`);
      const c = data.count;
      const ts = nowStr();
      setStats(s => ({ ...s, count: c, unique: c, latency: data.elapsed }));
      setPeak(p => Math.max(p, c));
      setHistory([{ label: ts, count: c }]);

      const t = getThreat(c, settings.capacity);
      if      (t === THREAT.DANGER)   addAlert('danger',  '⚠ Capacity Breach',  `${c} subjects — limit ${settings.capacity}`);
      else if (t === THREAT.MODERATE) addAlert('warning', 'Elevated Density',    `Zone at ${Math.round(c / settings.capacity * 100)}%`);
      else                            addAlert('info',    'Scan Complete',         `${c} subjects in ${data.elapsed.toFixed(2)}s`);

    } catch (err) {
      addAlert('danger', 'Scan Failed', err?.message || 'Unknown image scan error');
    } finally {
      setLoading(false);
    }
  };

  // ── Video stream ──
  const streamVideo = async () => {
    if (!file) return;
    setLoading(true);
    setHistory([]);
    setPeak(0);
    setUploadProgress(0);
    addAlert('info', 'Uploading Video', `${file.name.slice(0,28)} — ${(file.size/1024/1024).toFixed(1)} MB`);

    try {
      if (!API_BASE) throw new Error(API_CONFIG_ERROR);
      // Use XMLHttpRequest so we can track upload progress
      const file_id = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append('file', file);

        xhr.open('POST', `${API_BASE}/api/upload-video`, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data.file_id);
            } catch {
              reject(new Error('Invalid server response'));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || `Upload failed (HTTP ${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (HTTP ${xhr.status})`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });

      setUploadProgress(100);
      addAlert('info', 'Upload Complete', 'Connecting to inference engine...');

      const ws = new WebSocket(`${WS_BASE}/api/stream-video/${file_id}`);
      wsRef.current = ws;
      let lastCapacityAlertFrame = -999;

      ws.onopen = () => {
        setWsConnected(true);
        addAlert('info', 'WebSocket Live', 'Real-time telemetry stream established');
        ws.send(JSON.stringify({
          settings: {
            confidenceThresh:
              settings.mode === 'Performance' ? 0.45 : settings.mode === 'Accuracy' ? 0.25 : 0.35,
            magnification:   parseFloat(parseFloat(settings.magnification).toFixed(2)),
            nmsRadius:       parseFloat(parseFloat(settings.nmsRadius).toFixed(2)),
            useHeatmap:      Boolean(settings.heatmap),
            useClustering:   Boolean(settings.clustering),
            useMotionVecs:   Boolean(settings.motionVecs),
            frameSkip:       Math.round(settings.frameSkip),
            fencingPolygon:  fencePoints,
            capacityLimit:   Math.round(settings.capacity),
          }
        }));
      };

      ws.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        if (payload.status === 'playing') {
          setResultImg(`data:image/jpeg;base64,${payload.imageB64}`);
          const c   = payload.count;
          const ts  = nowStr();
          setStats(s => ({ ...s, count: c, unique: payload.total_unique, frames: payload.frame }));
          setPeak(p => Math.max(p, c));
          setHistory(h => [...h, { label: ts, count: c }]);

          if (payload.anomalyEvent)
            addAlert('danger', '⚠ CHAOS DETECTED', `Rapid movement at frame ${payload.frame}`);

          const t = getThreat(c, settings.capacity);
          if (t === THREAT.DANGER && payload.frame - lastCapacityAlertFrame > 30) {
            lastCapacityAlertFrame = payload.frame;
            addAlert('danger', 'Zone Overcrowding', `${c} subjects — ${Math.round(c / settings.capacity * 100)}%`);
          }
        } else if (payload.status === 'done') {
          ws.close();
          addAlert('info', 'Stream Complete', `${payload.total_unique ?? '?'} unique subjects archived`);
          saveSession(file.name);
        } else if (payload.status === 'error') {
          ws.close();
          addAlert('danger', 'Engine Error', payload.message || 'Unknown stream error');
        }
      };

      ws.onerror = () => addAlert('danger', 'Stream Error', 'WebSocket connection failed');
      ws.onclose = () => {
        setWsConnected(false);
        setLoading(false);
        wsRef.current = null;
      };

    } catch (err) {
      addAlert('danger', 'Upload Failed', err.message);
      setLoading(false);
    }
  };

  const terminateStream = () => {
    wsRef.current?.close();
    setLoading(false);
    addAlert('warning', 'Stream Terminated', 'Operator manually terminated');
  };

  // ── Session save ──
  const saveSession = (name) => {
    const elapsed = sessionStartTs.current ? secStr(Date.now() - sessionStartTs.current) : '—';
    const session = {
      id: uid(), name, peak: peakCount,
      avg: avgCount, alerts: alerts.length,
      elapsed, time: new Date().toLocaleString(),
      history: history.slice(-300),
    };
    setSessions(prev => {
      const next = [session, ...prev].slice(0, 20);
      localStorage.setItem('cp_sessions', JSON.stringify(next));
      return next;
    });
  };

  // ── Export ──
  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      file: file?.name, peakCount, avgCount,
      alertCount: alerts.length, settings, history,
      alerts: alerts.map(a => ({ time: a.time, type: a.type, title: a.title, msg: a.msg })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `civic_pulse_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    addAlert('info', 'Report Exported', 'Analytics report downloaded');
  };

  // ── Fence SVG ──
  const fenceSvg = viewerRef.current && fencePoints.length > 0 ? (() => {
    const { offsetWidth: w, offsetHeight: h } = viewerRef.current;
    return { pts: fencePoints.map(p => `${p.x * w},${p.y * h}`).join(' '), w, h };
  })() : null;

  const handleExecute  = () => fileType === 'video' ? streamVideo() : executeImageScan();
  const toggleSetting  = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));
  const setSetting     = (key, val) => setSettings(s => ({ ...s, [key]: val }));
  const countClass     = threat === THREAT.DANGER ? 'danger' : threat === THREAT.MODERATE ? 'moderate' : '';

  // ──────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* ════════ TOP NAVBAR ════════ */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo"><Shield /></div>
          <div>
            <div className="navbar-title">CIVIC PULSE</div>
            <div className="navbar-subtitle">Tactical Crowd Intelligence</div>
          </div>
        </div>

        <div className="navbar-center">
          <div className={`threat-level ${threat.cls}`}>
            <span className="threat-dot" />
            THREAT: {threat.label}
          </div>
          {predictAlert && (
            <div className="threat-level moderate" style={{ fontSize: '0.6rem' }}>
              <Brain size={10} />
              PREDICT: ~{predicted} SOON
            </div>
          )}
          <div className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {wsConnected ? 'STREAM LIVE' : 'STANDBY'}
          </div>
        </div>

        <div className="navbar-stats">
          <div className="nav-stat"><span className="nav-stat-label">FPS</span><span className="nav-stat-value">{fps}</span></div>
          <div className="nav-stat"><span className="nav-stat-label">PEAK</span><span className="nav-stat-value">{peakCount}</span></div>
          <div className="nav-stat"><span className="nav-stat-label">AVG</span><span className="nav-stat-value">{avgCount}</span></div>
          <div className="nav-stat">
            <span className="nav-stat-label">ALERTS</span>
            <span className="nav-stat-value" style={{ color: alerts[0]?.type === 'danger' ? 'var(--danger)' : undefined }}>{alerts.length}</span>
          </div>
          <div className="nav-stat"><span className="nav-stat-label">TIME</span><span className="nav-stat-value">{clock}</span></div>

          {/* ── Theme Toggle ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginLeft: 8 }}>
            <span className="theme-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            <div
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              <div className="theme-toggle-thumb">
                {theme === 'dark' ? <Moon size={10} style={{ color: '#94a3b8' }} /> : <Sun size={10} style={{ color: '#fff' }} />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ════════ LEFT PANEL ════════ */}
      <aside className="left-panel panel">

        {/* Upload */}
        <div className="panel-section">
          <div className="section-header">
            <Upload size={16} className="section-icon" />
            <span className="section-title">Ingest Data</span>
          </div>
          <div
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Explicit MIME types — critical for Windows file dialog */}
            <input ref={fileInputRef} type="file"
              accept="image/jpeg,image/png,image/gif,image/bmp,image/webp,image/tiff,video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm,video/x-msvideo,video/*,image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            {/* Video preview thumbnail */}
            {videoPreview ? (
              <div style={{ width: '100%', marginBottom: 8 }}>
                <video
                  src={videoPreview}
                  style={{ width: '100%', maxHeight: 80, borderRadius: 6, objectFit: 'cover', display: 'block' }}
                  muted preload="metadata"
                />
                {/* Upload progress bar */}
                {loading && uploadProgress < 100 && (
                  <div style={{ marginTop: 6, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden', height: 4 }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: 'linear-gradient(90deg, var(--primary), var(--blue))',
                      width: `${uploadProgress}%`,
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 6px var(--primary-glow)'
                    }} />
                  </div>
                )}
              </div>
            ) : (
              <span className="upload-icon">🛰️</span>
            )}
            <div className="upload-title">
              {file
                ? file.name.slice(0, 22)
                : 'Load Aerial Feed'}
            </div>
            <div className="upload-sub">
              {file
                ? `${(file.size/1024/1024).toFixed(1)} MB · ${fileType}${
                    loading && uploadProgress > 0 && uploadProgress < 100
                      ? ` · uploading ${uploadProgress}%` : ''}`
                : 'Image or Video (drag & drop)'}
            </div>
          </div>
        </div>

        {/* Overlay Toggles */}
        <div className="panel-section">
          <div className="section-header">
            <Layers size={16} className="section-icon" />
            <span className="section-title">Overlay Layers</span>
          </div>
          {[
            { key: 'heatmap',    label: 'Heatmap Density', Icon: Thermometer },
            { key: 'clustering', label: 'AI Pod Clustering', Icon: GitBranch },
            { key: 'showPoints', label: 'Head Points',       Icon: Crosshair },
            { key: 'motionVecs', label: 'Motion Vectors',    Icon: Wind },      // GAP 5
          ].map(({ key, label, Icon }) => (
            <div key={key} className="toggle-row" onClick={() => toggleSetting(key)}>
              <span className="toggle-label"><Icon size={13} />{label}</span>
              <div className={`toggle-switch ${settings[key] ? 'on' : ''}`} />
            </div>
          ))}

          {/* GAP 2: Overlay Opacity Slider */}
          <div className="slider-group" style={{ marginTop: 10 }}>
            <div className="slider-header">
              <span>Overlay Opacity</span>
              <span className="slider-value">{settings.overlayOpacity}%</span>
            </div>
            <input type="range" min={20} max={100} step={5}
              value={settings.overlayOpacity}
              onChange={e => setSetting('overlayOpacity', +e.target.value)} />
          </div>
        </div>

        {/* Engine Mode */}
        <div className="panel-section">
          <div className="section-header">
            <Cpu size={16} className="section-icon" />
            <span className="section-title">Engine Mode</span>
          </div>
          <select className="mode-select" value={settings.mode}
            onChange={e => setSetting('mode', e.target.value)}>
            <option value="Performance">Performance (Fast)</option>
            <option value="Balanced">Balanced</option>
            <option value="Accuracy">Accuracy (Slow)</option>
          </select>
        </div>

        {/* Parameters */}
        <div className="panel-section">
          <div className="section-header">
            <BarChart2 size={16} className="section-icon" />
            <span className="section-title">Parameters</span>
          </div>
          {[
            { key: 'capacity',      label: 'Capacity Limit',  suffix: '',   min: 10,  max: 1000, step: 5,   isInt: true  },
            { key: 'magnification', label: 'Magnification',   suffix: '×',  min: 1.0, max: 3.0,  step: 0.1, isInt: false },
            { key: 'nmsRadius',     label: 'NMS Radius',      suffix: 'px', min: 3.0, max: 20.0, step: 0.5, isInt: false },
            { key: 'frameSkip',     label: 'Frame Skip',      suffix: '',   min: 1,   max: 15,   step: 1,   isInt: true  },
          ].map(({ key, label, suffix, min, max, step, isInt }) => (
            <div className="slider-group" key={key} style={{ marginTop: 10 }}>
              <div className="slider-header">
                <span>{label}</span>
                <span className="slider-value">
                  {isInt
                    ? Math.round(settings[key])
                    : parseFloat(settings[key]).toFixed(1)}{suffix}
                </span>
              </div>
              <input type="range" min={min} max={max} step={step}
                value={settings[key]}
                onChange={e => setSetting(key, isInt ? Math.round(+e.target.value) : parseFloat((+e.target.value).toFixed(2)))} />
            </div>
          ))}
        </div>

        {/* Zone Fencing */}
        <div className="panel-section">
          <div className="section-header">
            <Map size={16} className="section-icon" />
            <span className="section-title">Zone Fencing</span>
          </div>
          <div className="toggle-row" onClick={() => setDrawingFence(d => !d)}>
            <span className="toggle-label"><Target size={13} />Draw Zone Polygon</span>
            <div className={`toggle-switch ${drawingFence ? 'on' : ''}`} />
          </div>
          <div className="fencing-controls">
            {fencePoints.length > 0
              ? <div className="fencing-info">{fencePoints.length} anchor point{fencePoints.length !== 1 ? 's' : ''} — AI counts only inside zone.</div>
              : drawingFence && <div className="fencing-info">Click on the feed to drop anchor points.</div>
            }
            {fencePoints.length > 0 && (
              <button className="btn-clear-fence" onClick={() => setFencePoints([])}>Clear Zone Fence</button>
            )}
          </div>
        </div>

        {/* Zoom / Pan Controls (GAP 4) */}
        <div className="panel-section">
          <div className="section-header">
            <Move size={16} className="section-icon" />
            <span className="section-title">Viewport ({zoom.toFixed(1)}×)</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-secondary" style={{ flex: 1 }}
              onClick={() => setZoom(z => Math.min(5, +(z + 0.5).toFixed(1)))}>
              <ZoomIn size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Zoom In
            </button>
            <button className="btn-secondary" style={{ flex: 1 }}
              onClick={() => { setZoom(z => Math.max(1, +(z - 0.5).toFixed(1))); setPan({ x: 0, y: 0 }); }}>
              <ZoomOut size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Zoom Out
            </button>
          </div>
          {zoom > 1 && (
            <button className="btn-secondary" style={{ marginTop: 6 }}
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <RotateCcw size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Reset View
            </button>
          )}
        </div>

        {/* Execute & Export */}
        <div className="panel-section" style={{ marginTop: 'auto' }}>
          {!loading ? (
            <>
              <button className="btn-execute" onClick={handleExecute} disabled={!file}>
                <Play size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {fileType === 'video' ? 'Initialize Stream' : 'Execute Scan'}
              </button>
              <button className="btn-secondary" onClick={exportReport} disabled={history.length === 0}>
                <Download size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Export Report
              </button>
            </>
          ) : (
            <button className="btn-execute terminate" onClick={terminateStream}>
              <Square size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Terminate Stream
            </button>
          )}
        </div>
      </aside>

      {/* ════════ CENTER PANEL ════════ */}
      <main
        className="center-panel"
        ref={viewerRef}
        onClick={onViewerClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: zoom > 1 ? (isPanning.current ? 'grabbing' : 'grab') : drawingFence ? 'crosshair' : 'default' }}
      >
        <div className="scan-lines" />

        {/* Topbar */}
        <div className="panel-topbar">
          <div className="panel-topbar-title">
            <Eye size={14} />
            AERIAL FEED
            {(loading || wsConnected) && <span className="live-badge">LIVE</span>}
            {zoom > 1 && <span style={{ fontSize: '0.6rem', color: 'var(--blue)', marginLeft: 6 }}>{zoom.toFixed(1)}×</span>}
          </div>
          <div className="video-overlay-controls">
            {[
              { key: 'heatmap',    Icon: Thermometer, title: 'Heatmap'    },
              { key: 'clustering', Icon: GitBranch,   title: 'Clustering' },
              { key: 'motionVecs', Icon: Wind,         title: 'Motion Vecs'},
              { key: 'drawFence',  Icon: Target,       title: 'Draw Zone'  },
            ].map(({ key, Icon, title }) => (
              <div key={key}
                className={`overlay-btn ${(key === 'drawFence' ? drawingFence : settings[key]) ? 'active' : ''}`}
                title={title}
                onClick={e => {
                  e.stopPropagation();
                  if (key === 'drawFence') setDrawingFence(d => !d);
                  else toggleSetting(key);
                }}>
                <Icon size={13} />
              </div>
            ))}
            <div className="overlay-btn" title="Zoom In"
              onClick={e => { e.stopPropagation(); setZoom(z => Math.min(5, +(z + 0.5).toFixed(1))); }}>
              <ZoomIn size={13} />
            </div>
            <div className="overlay-btn" title="Fullscreen"
              onClick={e => { e.stopPropagation(); viewerRef.current?.requestFullscreen?.(); }}>
              <Maximize2 size={13} />
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && !resultImg && (
          <div className="loader-overlay">
            <div className="spinner" />
            <div className="loader-text">
              {fileType === 'video' ? 'Initializing Telemetry...' : 'Neural Engine Processing...'}
            </div>
          </div>
        )}

        {/* Image / video feed with zoom+pan+opacity (GAP 2, 4) */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
          transition: isPanning.current ? 'none' : 'transform 0.15s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {resultImg && (
            <img src={resultImg} className="main-feed fade-up" alt="Analysis feed"
              style={{ opacity: settings.overlayOpacity / 100 }}
            />
          )}
          {!resultImg && preview && !loading && (
            <img src={preview} className="main-feed" alt="Preview"
              style={{ opacity: (settings.overlayOpacity / 100) * 0.6, filter: 'grayscale(20%)' }} />
          )}
        </div>

        {/* Empty state */}
        {!resultImg && !preview && !loading && (
          <div className="empty-feed">
            <div className="empty-feed-icon"><Radio size={36} /></div>
            <div className="empty-feed-text">No Feed Detected</div>
            <div className="empty-feed-sub">Upload aerial imagery or video to begin analysis</div>
          </div>
        )}

        {/* Fencing SVG */}
        {drawingFence && viewerRef.current && (
          <svg className="fencing-svg-overlay"
            width={viewerRef.current.offsetWidth}
            height={viewerRef.current.offsetHeight}>
            {fenceSvg && (
              <>
                <polygon
                  points={fenceSvg.pts}
                  fill="rgba(56,189,248,0.12)"
                  stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="6,4"
                />
                {fencePoints.map((p, i) => (
                  <circle key={i}
                    cx={p.x * fenceSvg.w} cy={p.y * fenceSvg.h}
                    r={5} fill="var(--teal)"
                    stroke="rgba(0,230,184,0.4)" strokeWidth={2}
                  />
                ))}
              </>
            )}
          </svg>
        )}

        {/* Count overlay */}
        {(resultImg || stats.count > 0) && (
          <div className="count-overlay">
            <div className="count-overlay-label">Zone Population</div>
            <div className={`count-overlay-value ${countClass}`}>{stats.count}</div>
          </div>
        )}

        {/* Anomaly banner */}
        {anomalyActive && (
          <div className="anomaly-banner">
            <AlertTriangle size={18} />
            ANOMALY DETECTED — CHAOS / COUNTERFLOW
          </div>
        )}

        {/* Predictive warning overlay */}
        {predictAlert && !anomalyActive && (
          <div className="anomaly-banner" style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1.5px solid var(--moderate)',
            color: 'var(--moderate)',
            boxShadow: '0 0 30px var(--moderate-glow)',
          }}>
            <Brain size={18} />
            PREDICTIVE ALERT — CAPACITY BREACH IMMINENT (~{predicted} subjects)
          </div>
        )}
      </main>

      {/* ════════ RIGHT INTELLIGENCE PANEL ════════ */}
      <aside className="right-panel panel">
        {/* Alert Feed */}
        <div className="right-panel-section" style={{ flex: '3 1 0' }}>
          <div className="panel-header">
            <div className="panel-header-title">
              <AlertTriangle size={13} />Alert Feed
            </div>
            {alerts.length > 0 && <div className="panel-header-count">{alerts.length}</div>}
          </div>
          <div className="alert-feed">
            {alerts.length === 0
              ? <div className="alert-empty"><Shield size={28} /><p>All systems nominal</p></div>
              : alerts.map(a => <AlertItem key={a.id} type={a.type} title={a.title} msg={a.msg} time={a.time} />)
            }
          </div>
        </div>

        {/* Session History */}
        <div className="right-panel-section" style={{ flex: '2 1 0' }}>
          <div className="panel-header">
            <div className="panel-header-title"><Database size={13} />Session History</div>
            {sessions.length > 0 && (
              <button className="btn-export" style={{ fontSize: '0.6rem', padding: '2px 8px' }}
                onClick={() => { setSessions([]); localStorage.removeItem('cp_sessions'); }}>
                Clear
              </button>
            )}
          </div>
          <div className="session-list">
            {sessions.length === 0
              ? <div className="session-empty"><Database size={24} /><span>No sessions recorded</span></div>
              : sessions.map(s => (
                <div key={s.id} className="session-item"
                  onClick={() => s.history?.length && setHistory(s.history)}>
                  <div className="session-name">{s.name.slice(0, 28)}</div>
                  <div className="session-meta">
                    <span><TrendingUp size={10} />{s.peak}</span>
                    <span><Gauge size={10} />{s.avg}</span>
                    <span><AlertTriangle size={10} />{s.alerts}</span>
                    <span style={{ marginLeft: 'auto' }}>{s.elapsed}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </aside>

      {/* ════════ BOTTOM ANALYTICS PANEL ════════ */}
      <section className="bottom-panel panel">

        {/* Metric: Zone Population */}
        <div className="metric-card">
          <div className="metric-label"><Users size={11} />Zone Pop.</div>
          <div>
            <div className={`metric-value ${countClass}`}>{stats.count}</div>
            <div className="metric-sub">Current frame</div>
          </div>
        </div>

        {/* Metric: Unique Subjects */}
        <div className="metric-card">
          <div className="metric-label"><Crosshair size={11} />Unique</div>
          <div>
            <div className="metric-value blue">{stats.unique}</div>
            <div className="metric-sub">Tracked subjects</div>
          </div>
        </div>

        {/* Metric: Avg Density (GAP 3) */}
        <div className="metric-card">
          <div className="metric-label"><Gauge size={11} />Density</div>
          <div>
            <div className={`metric-value ${density.cls}`} style={{ fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
              {density.label}
            </div>
            <div className="metric-sub">Avg {avgCount} · Peak {peakCount}</div>
          </div>
        </div>

        {/* Metric: Latency / Frames */}
        <div className="metric-card">
          <div className="metric-label"><Activity size={11} />Latency</div>
          <div>
            <div className="metric-value" style={{ fontSize: '1.6rem' }}>
              {fileType === 'video'
                ? (stats.frames || 0)
                : (stats.latency > 0 ? stats.latency.toFixed(2) : '—')}
            </div>
            <div className="metric-sub">{fileType === 'video' ? 'frames processed' : 'seconds'}</div>
          </div>
        </div>

        {/* Chart (GAP 1: time-formatted X-axis) */}
        <div className="chart-area">
          <div className="chart-header">
            <div className="chart-title">Population Dynamics Timeline</div>
            <div className="export-actions">
              <button className="btn-export" onClick={exportReport} disabled={history.length === 0}>
                <Download size={11} />Report
              </button>
              <button className="btn-export"
                style={{ borderColor: 'rgba(167,139,250,0.3)', color: 'var(--purple)', background: 'rgba(167,139,250,0.06)' }}
                onClick={() => setHistory([])} disabled={history.length === 0}>
                <RotateCcw size={11} />Reset
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--teal)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--teal)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                  {/* GAP 1: X-axis shows HH:MM:SS time label */}
                  <XAxis dataKey="label"
                    stroke="rgba(255,255,255,0.12)"
                    tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'Orbitron' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="rgba(255,255,255,0.12)"
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<CTooltip />} />
                  {settings.capacity > 0 && (
                    <ReferenceLine y={settings.capacity}
                      stroke="var(--danger)" strokeDasharray="4 4" strokeOpacity={0.5}
                      label={{ value: 'LIMIT', fill: 'var(--danger)', fontSize: 9, fontFamily: 'Orbitron' }}
                    />
                  )}
                  <Area type="monotone" dataKey="count"
                    stroke="var(--teal)" strokeWidth={2.5}
                    fill="url(#tealGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--bg-base)', stroke: 'var(--teal)', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">Run an image scan or video stream to populate analytics.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
