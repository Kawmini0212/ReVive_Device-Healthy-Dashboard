import React, { useEffect, useState } from 'react';
import { Activity, Battery, Bell, Check, ChevronRight, CircleHelp, Cpu, Gauge, HardDrive, LayoutDashboard, LifeBuoy, LockKeyhole, Menu, Monitor, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Wifi, X, Zap } from 'lucide-react';

export default function App() {
  const [simulating, setSimulating] = useState(false);
  const [startupToggle, setStartupToggle] = useState(false);
  const [cacheToggle, setCacheToggle] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewPerformance, setOverviewPerformance] = useState(null);
  
  const currentHealth = overviewPerformance?.metrics?.length
    ? Math.round(overviewPerformance.metrics.reduce((total, metric) => total + metric.score, 0) / overviewPerformance.metrics.length)
    : 0;
  const simulatedHealth = currentHealth + (startupToggle ? 12 : 0) + (cacheToggle ? 5 : 0);

  useEffect(() => {
    let mounted = true;
    const loadPerformance = () => {
      fetch('http://localhost:5000/api/performance')
        .then(response => response.ok ? response.json() : Promise.reject(new Error('Telemetry unavailable')))
        .then(data => mounted && setOverviewPerformance(data))
        .catch(() => mounted && setOverviewPerformance(null));
    };
    loadPerformance();
    const refreshTimer = window.setInterval(loadPerformance, 5000);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const runDiagnosis = () => {
    setSimulating(true);
    setNotice('Diagnosis complete. 3 optimization opportunities found.');
    window.setTimeout(() => setSimulating(false), 900);
  };

  const applyOptimizations = () => {
    setStartupToggle(true);
    setCacheToggle(true);
    setNotice('Recommended optimizations are ready to apply.');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Activity size={18} /></span><span>reVive</span></div>
        <div className="sidebar-label">Workspace</div>
        <nav className="nav-list"><NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} /><NavItem icon={<Gauge size={17} />} label="Performance" active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} /><NavItem icon={<ShieldCheck size={17} />} label="Protection" active={activeTab === 'protection'} onClick={() => setActiveTab('protection')} /><NavItem icon={<Settings2 size={17} />} label="Preferences" active={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')} /></nav>
        <div className="sidebar-spacer" />
        <div className="support-card"><LifeBuoy size={18} /><div><strong>Need a hand?</strong><span>View recovery guide</span></div><ChevronRight size={15} /></div>
        <div className="user-row"><div className="avatar">KS</div><div><strong>Kavmi's device</strong><span>Local administrator</span></div><Settings2 size={16} /></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeTab[0].toUpperCase() + activeTab.slice(1)}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><button className="help-button"><CircleHelp size={16} /> Help center</button><button className="diagnose-button" onClick={runDiagnosis}><RefreshCw size={16} className={simulating ? 'spin' : ''} /> {simulating ? 'Scanning...' : 'Run diagnosis'}</button></div></header>

        {activeTab === 'overview' ? <>
        <div className="page-heading"><div><p className="eyebrow">Monday, September 8, 2026</p><h1>Good morning, Kavmi.</h1><p className="lede">{overviewPerformance?.device ? `Live device data from ${overviewPerformance.device.name}. Values refresh every 5 seconds.` : 'Waiting for live device telemetry.'}</p></div><div className="device-select"><Monitor size={17} /><span>{overviewPerformance?.device?.name || 'Detecting device...'}</span><ChevronRight size={15} /></div></div>
        {notice && <div className="notice"><Check size={16} /> {notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}

        <section className="overview-grid"><div className="health-panel panel"><div className="panel-heading"><div><p className="eyebrow">Overall device health</p><h2>{overviewPerformance ? (currentHealth >= 75 ? 'Running well' : 'Needs attention') : 'Waiting for telemetry'}</h2></div><span className="status-pill warning">{overviewPerformance ? `${overviewPerformance.metrics.filter(metric => metric.score < 75).length} items` : 'Live'}</span></div><div className="health-content"><div className="health-ring" style={{ '--health': `${currentHealth * 3.6}deg` }}><div><strong>{currentHealth || '--'}</strong><span>/ 100</span></div></div><div className="health-copy"><p>{overviewPerformance ? 'Your device health is calculated from the same live metrics shown in Performance.' : 'The agent is connecting and will provide device-specific health shortly.'}</p><div className="mini-stat"><span className="dot amber" /> Performance age <strong>{overviewPerformance ? `${(100 - currentHealth) / 10 + 3} yrs` : '--'}</strong></div><div className="mini-stat"><span className="dot teal" /> Last checked <strong>{overviewPerformance ? new Date(overviewPerformance.device.received_at).toLocaleTimeString() : '--'}</strong></div></div></div><button className="text-button" onClick={runDiagnosis}>View full report <ChevronRight size={15} /></button></div><div className="trend-panel panel"><div className="panel-heading"><div><p className="eyebrow">Performance trend</p><h2>Live device snapshot</h2></div><button className="period-button" onClick={() => setActiveTab('performance')}>Details <ChevronRight size={14} /></button></div><div className="trend-value"><strong>{overviewPerformance ? `${currentHealth}/100` : '--'}</strong><span>current health score</span></div><div className="chart"><div className="chart-lines"><span /><span /><span /><span /></div><svg viewBox="0 0 500 145" preserveAspectRatio="none" aria-label="Performance trend chart"><path d="M0,116 C36,120 48,92 78,101 S121,73 151,91 S192,58 224,76 S260,81 288,60 S320,68 347,46 S390,73 418,50 S459,34 500,39" fill="none" stroke="#20b8a6" strokeWidth="3" strokeLinecap="round" /><path d="M0,116 C36,120 48,92 78,101 S121,73 151,91 S192,58 224,76 S260,81 288,60 S320,68 347,46 S390,73 418,50 S459,34 500,39 V145 H0 Z" fill="url(#chartFill)" opacity=".22" /><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#20b8a6" /><stop offset="1" stopColor="#20b8a6" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-labels"><span>CPU</span><span>Memory</span><span>Storage</span><span>Battery</span></div></div></div></section>

        <section className="section-block"><div className="section-heading"><div><p className="eyebrow">System snapshot</p><h2>What is happening under the hood</h2></div><button className="text-button" onClick={() => setActiveTab('performance')}>See details <ChevronRight size={15} /></button></div><div className="metrics-grid">{overviewPerformance?.metrics?.map(metric => <MetricCard key={metric.title} {...metric} icon={metric.title === 'CPU performance' ? <Cpu /> : metric.title === 'Memory pressure' ? <Activity /> : metric.title === 'Storage space' ? <HardDrive /> : <Battery />} />) || <LoadingPanel />}</div></section>

        <section className="recovery-panel panel"><div className="section-heading"><div className="title-with-icon"><span className="spark-icon"><Sparkles size={17} /></span><div><p className="eyebrow">Smart recommendations</p><h2>Recover performance</h2></div></div><span className="status-pill teal-pill">Predictive mode</span></div><div className="recovery-layout"><div className="recommendations"><ToggleRow title="Disable non-essential startup apps" description="Reduces boot latency by around 15 seconds" checked={startupToggle} onChange={() => setStartupToggle(!startupToggle)} /><ToggleRow title="Clear system and application cache" description="Frees approximately 7.5 GB of storage" checked={cacheToggle} onChange={() => setCacheToggle(!cacheToggle)} /></div><div className="impact-card"><div className="impact-heading"><span>Projected impact</span><span className="impact-badge">+{simulatedHealth - currentHealth} pts</span></div><div className="impact-scores"><div><span>Current</span><strong>{currentHealth}</strong></div><ChevronRight size={18} /><div className="projected"><span>After recovery</span><strong>{simulatedHealth}</strong></div></div><button className="primary-button" onClick={applyOptimizations}><Sparkles size={15} /> Apply recommendations</button></div></div></section>
        </> : <WorkspaceView tab={activeTab} onNotice={setNotice} />}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>{icon}<span>{label}</span>{active && <i />}</button>;
}

function WorkspaceView({ tab, onNotice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({ notifications: true, automaticDiagnostics: true, recoveryMode: 'balanced' });

  useEffect(() => {
    const endpoint = tab === 'performance' ? '/api/performance' : tab === 'protection' ? '/api/protection' : '/api/preferences';
    let mounted = true;
    const loadData = () => {
      setLoading(true);
      fetch(`http://localhost:5000${endpoint}`)
        .then(response => response.ok ? response.json() : Promise.reject(new Error('Request failed')))
        .then(result => {
          if (!mounted) return;
          setData(result);
          if (tab === 'preferences') setPreferences(result);
        })
        .catch(() => mounted && onNotice(tab === 'performance' ? 'Waiting for live device telemetry.' : 'Live service unavailable. Showing the latest local settings.'))
        .finally(() => mounted && setLoading(false));
    };
    loadData();
    const refreshTimer = tab === 'performance' ? window.setInterval(loadData, 5000) : undefined;
    return () => {
      mounted = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [tab, onNotice]);

  const updatePreference = (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    fetch('http://localhost:5000/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      .then(response => response.json())
      .then(() => onNotice('Preferences saved.'))
      .catch(() => onNotice('Preferences updated locally; backend is unavailable.'));
  };

  if (tab === 'preferences') return <PreferencesView preferences={preferences} onChange={updatePreference} loading={loading} />;
  if (tab === 'protection') return <ProtectionView data={data} loading={loading} />;
  return <PerformanceView data={data} loading={loading} />;
}

function WorkspaceHeader({ eyebrow, title, description }) {
  return <div className="workspace-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div>;
}

function PerformanceView({ data, loading }) {
  const metrics = data?.metrics || [];
  const description = data?.device ? `Live telemetry from ${data.device.name}. Metrics refresh every 5 seconds.` : 'Waiting for the device agent to send live telemetry.';
  return <><WorkspaceHeader eyebrow="Performance" title="Keep every task moving" description={description} /><div className="detail-grid">{loading && !metrics.length ? <LoadingPanel /> : metrics.map(metric => <MetricCard key={metric.title} {...metric} icon={<Zap size={17} />} />)}</div><section className="panel detail-panel"><div className="section-heading"><div><p className="eyebrow">Recovery plan</p><h2>Three changes can restore headroom</h2></div><span className="status-pill teal-pill">{data?.recommendation || 'Waiting for telemetry'}</span></div><div className="insight-list">{(data?.actions || []).map(action => <div className="insight-row" key={action.title}><span className="insight-icon"><Zap size={16} /></span><div><strong>{action.title}</strong><span>{action.description}</span></div><span className="insight-value">{action.impact}</span></div>)}</div></section></>;
}

function ProtectionView({ data, loading }) {
  return <><WorkspaceHeader eyebrow="Protection" title="Your device, watched" description="Review the safeguards that protect system stability and keep recovery options close at hand." /><section className="protection-grid"><div className="panel detail-panel protection-score"><ShieldCheck size={28} /><p className="eyebrow">Protection status</p><h2>{loading ? 'Checking...' : data?.status || 'Protected'}</h2><p>{data?.summary || 'Core safeguards are running normally.'}</p></div><div className="protection-checks">{(data?.checks || []).map(check => <div className="panel check-card" key={check.title}><span className={`check-icon ${check.ok ? 'ok' : 'warning'}`}>{check.ok ? <Check size={16} /> : <RefreshCw size={16} />}</span><div><strong>{check.title}</strong><span>{check.detail}</span></div><span className="check-state">{check.ok ? 'On' : 'Review'}</span></div>)}</div></section></>;
}

function PreferencesView({ preferences, onChange, loading }) {
  return <><WorkspaceHeader eyebrow="Preferences" title="Make reVive work your way" description="Choose how often reVive checks your device and how recovery recommendations behave." /><section className="panel preferences-panel"><div className="section-heading"><div><p className="eyebrow">Workspace settings</p><h2>Diagnostics and recovery</h2></div><SlidersHorizontal size={19} /></div><div className="preference-list"><ToggleRow title="Automatic diagnostics" description="Check device health when reVive starts" checked={preferences.automaticDiagnostics} onChange={() => onChange('automaticDiagnostics', !preferences.automaticDiagnostics)} /><ToggleRow title="Health notifications" description="Let reVive notify you when a metric needs attention" checked={preferences.notifications} onChange={() => onChange('notifications', !preferences.notifications)} /><label className="preference-select"><div><strong>Recovery mode</strong><span>Balance speed improvements with system stability</span></div><select value={preferences.recoveryMode} onChange={event => onChange('recoveryMode', event.target.value)}><option value="balanced">Balanced</option><option value="performance">Performance first</option><option value="conservative">Conservative</option></select></label></div>{loading && <p className="loading-copy">Loading saved settings...</p>}</section></>;
}

function LoadingPanel() {
  return <div className="panel loading-panel">Loading performance data...</div>;
}

function ToggleRow({ title, description, checked, onChange }) {
  return <label className="toggle-row"><div><strong>{title}</strong><span>{description}</span></div><input type="checkbox" checked={checked} onChange={onChange} /><span className="toggle-control" /></label>;
}

function MetricCard({ title, score, icon, status, tone, detail }) {
  return (
    <div className="metric-card panel"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-info"><div className="metric-top"><strong>{title}</strong><span className={`metric-score ${tone}`}>{score}</span></div><div className="metric-bottom"><span className={`status-dot ${tone}`} />{status}<span className="metric-detail">{detail}</span></div><div className="progress-track"><span className={tone} style={{ width: `${score}%` }} /></div></div>
    </div>
  );
}