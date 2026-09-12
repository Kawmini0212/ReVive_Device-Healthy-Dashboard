import React, { useEffect, useState } from 'react';
import {
  Activity, Battery, Bell, Check, ChevronRight, Cpu, Gauge, HardDrive,
  LayoutDashboard, LifeBuoy, Menu, MessageCircle, Monitor, RefreshCw, Settings2,
  ShieldCheck, Sparkles, Thermometer, X
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000/api`;
const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'protection', label: 'Protection', icon: ShieldCheck },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
  { id: 'assistant', label: 'Ask ReVive', icon: MessageCircle }
];

const fallback = {
  device: { device_name: 'Dell Latitude 5490', os_name: 'Windows', total_ram_gb: 16, total_storage_gb: 256, metrics: { cpu_usage_pct: 19, ram_usage_pct: 69, storage_usage_pct: 91, boot_time_sec: 72, battery_health_pct: 83, battery_charging: true, cpu_temp_c: 58, startup_apps_count: 8, background_processes_count: 64, cache_size_gb: 7.5 }, received_at: new Date().toISOString() },
  scores: { overall: 61, performance: 81, memory: 69, storage: 62, battery: 83, thermal: 73 }, physical_age: 4.2, performance_age: 6.1,
  recommendations: [{ id: 'startup', title: 'Disable non-essential startup apps', description: 'Reduce boot latency and background work.', impact: '+12 health', difficulty: 'Easy', enabled: true }, { id: 'storage', title: 'Recover storage headroom', description: 'Free approximately 15 GB without removing personal files.', impact: '+8 health', difficulty: 'Easy', enabled: true }, { id: 'cache', title: 'Clear system and application cache', description: 'Remove temporary files that are safe to regenerate.', impact: '+5 health', difficulty: 'Easy', enabled: true }, { id: 'background', title: 'Review background processes', description: 'Reduce memory pressure from idle apps.', impact: '+6 health', difficulty: 'Medium', enabled: true }]
};

async function getJson(path, options) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export default function App() {
  const [view, setView] = useState('overview');
  const [dashboard, setDashboard] = useState(fallback);
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedActions, setSelectedActions] = useState(['startup', 'storage', 'cache']);
  const [rescue, setRescue] = useState(null);
  const [question, setQuestion] = useState('Why is my laptop slow?');
  const [answer, setAnswer] = useState(null);
  const [protection, setProtection] = useState(null);
  const [preferences, setPreferences] = useState({ notifications: true, automaticDiagnostics: true, recoveryMode: 'balanced' });

  const loadDashboard = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const [nextDashboard, nextHistory] = await Promise.all([getJson('/dashboard'), getJson('/history')]);
      setDashboard(nextDashboard);
      setHistory(nextHistory.history || []);
    } catch {
      setNotice('Demo data is active. Start the API to sync live telemetry.');
    } finally { if (showLoading) setLoading(false); }
  };

  const loadWorkspaceData = async () => {
    try {
      const [nextProtection, nextPreferences] = await Promise.all([getJson('/protection'), getJson('/preferences')]);
      setProtection(nextProtection);
      setPreferences(nextPreferences);
    } catch {
      setNotice('Workspace settings are using local defaults until the API is available.');
    }
  };

  useEffect(() => {
    loadDashboard();
    loadWorkspaceData();
    const telemetryRefresh = window.setInterval(() => loadDashboard({ showLoading: false }), 5000);
    return () => window.clearInterval(telemetryRefresh);
  }, []);

  const runDiagnosis = async () => {
    setLoading(true);
    await new Promise(resolve => window.setTimeout(resolve, 550));
    await loadDashboard();
    setNotice('Diagnosis complete. Your device rescue plan is ready.');
  };

  const toggleAction = id => setSelectedActions(actions => actions.includes(id) ? actions.filter(action => action !== id) : [...actions, id]);
  const runRescue = async () => {
    try { setRescue(await getJson('/rescue', { method: 'POST', body: JSON.stringify({ actions: selectedActions }) })); setNotice('Recovery impact projected from your selected actions.'); }
    catch { setNotice('Recovery simulation is unavailable right now.'); }
  };
  const askAssistant = async event => {
    event.preventDefault();
    try { setAnswer(await getJson('/assistant', { method: 'POST', body: JSON.stringify({ question }) })); }
    catch { setAnswer({ answer: 'Connect the ReVive API to ask the device intelligence assistant.', actions: [] }); }
  };

  const updatePreference = async (name, value) => {
    const nextPreferences = { ...preferences, [name]: value };
    setPreferences(nextPreferences);
    try {
      await getJson('/preferences', { method: 'PUT', body: JSON.stringify(nextPreferences) });
      setNotice(`${name === 'automaticDiagnostics' ? 'Automatic diagnostics' : 'Predictive alerts'} preference updated.`);
    } catch {
      setNotice('Preference saved locally. Connect the API to sync it.');
    }
  };

  const closeNav = () => setMobileNav(false);
  const metrics = dashboard.device?.metrics || fallback.device.metrics;
  const currentDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const pageTitle = navItems.find(item => item.id === view)?.label || 'Overview';
  const pageCopy = {
    performance: ['Performance intelligence', 'See what is changing before it becomes a problem.', 'Historical signals and root causes · Live telemetry'],
    protection: ['Protection center', 'Keep every recovery action safe, visible, and reversible.', 'Recovery safeguards · No automatic file deletion'],
    preferences: ['Workspace settings', 'Choose how ReVive watches over your device.', 'Personalized for this device'],
    assistant: ['Ask ReVive', 'Get a plain-language answer about your device health.', 'Grounded in the latest telemetry']
  }[view];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Activity size={18} /></span><span>reVive</span></div>
      <div className="sidebar-label">Workspace</div>
      <nav className="nav-list">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); closeNav(); }}><Icon size={17} /><span>{label}</span>{view === id && <i />}</button>)}</nav>
      <div className="sidebar-spacer" />
      <button className="support-card" onClick={() => setView('protection')}><LifeBuoy size={18} /><div><strong>Need a hand?</strong><span>View recovery guide</span></div><ChevronRight size={15} /></button>
      <button className="user-row" onClick={() => setView('preferences')}><div className="avatar">KS</div><div><strong>Kavmi's device</strong><span>Local administrator</span></div><Settings2 size={16} /></button>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications" onClick={() => setNotice('No new device alerts.') }><Bell size={18} /><i /></button><button className="diagnose-button" onClick={runDiagnosis}><RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Scanning...' : 'Run diagnosis'}</button></div></header>
      <div className={`page-heading ${pageCopy ? 'workspace-heading' : ''}`}><div>{pageCopy ? <><p className="eyebrow">{pageCopy[2]}</p><h1>{pageCopy[0]}</h1><p className="lede">{pageCopy[1]}</p></> : <><p className="eyebrow">{currentDate} · {dashboard.mode === 'live' ? 'Live telemetry' : 'Demo mode'}</p><h1>Good morning, Kavmi.</h1><p className="lede">ReVive explains what is slowing your device down and which actions will extend its useful life.</p></>}</div><button className="device-select" onClick={() => setNotice('This workspace is connected to your local device.') }><Monitor size={17} /><span>{dashboard.device?.device_name || 'Your device'}</span><ChevronRight size={15} /></button></div>
      {notice && <div className="notice"><Check size={16} /> {notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
      {view === 'overview' && <Overview dashboard={dashboard} history={history} metrics={metrics} actions={selectedActions} onToggle={toggleAction} rescue={rescue} onRescue={runRescue} onAssistant={() => setView('assistant')} />}
      {view === 'performance' && <Performance dashboard={dashboard} history={history} metrics={metrics} />}
      {view === 'protection' && <Protection protection={protection} />}
      {view === 'preferences' && <Preferences preferences={preferences} onChange={updatePreference} />}
      {view === 'assistant' && <Assistant question={question} setQuestion={setQuestion} answer={answer} metrics={metrics} onSubmit={askAssistant} />}
    </main>
  </div>;
}

function Overview({ dashboard, history, metrics, actions, onToggle, rescue, onRescue, onAssistant }) {
  const { scores, recommendations = [] } = dashboard;
  const healthLabel = scores.overall >= 75 ? 'Good condition' : scores.overall >= 50 ? 'Needs attention' : 'Critical';
  return <>
    <section className="overview-grid"><div className="health-panel panel"><div className="panel-heading"><div><p className="eyebrow">Device health</p><h2>{healthLabel}</h2></div><span className="status-pill warning">{recommendations.filter(item => item.enabled).length} actions</span></div><div className="health-content"><div className="health-ring" style={{ '--health': `${scores.overall * 3.6}deg` }}><div><strong>{scores.overall}</strong><span>/ 100</span></div></div><div className="health-copy"><p>{scores.overall < 75 ? 'Your device is reliable, but storage and memory pressure are holding performance back.' : 'Your device is operating within a healthy range.'}</p><div className="mini-stat"><span className="dot amber" /> Performance age <strong>{dashboard.performance_age} yrs</strong></div><div className="mini-stat"><span className="dot teal" /> Physical age <strong>{dashboard.physical_age} yrs</strong></div></div></div><button className="text-button" onClick={onAssistant}>Ask why <ChevronRight size={15} /></button></div><div className="trend-panel panel"><div className="panel-heading"><div><p className="eyebrow">Useful life signal</p><h2>Performance is declining</h2></div><span className="period-button">6 months</span></div><div className="trend-value"><strong>-17%</strong><span>without intervention</span></div><MiniChart history={history} /></div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">System snapshot</p><h2>What is happening under the hood</h2></div><span className="live-badge"><span /> {dashboard.mode === 'live' ? 'Live' : 'Demo'}</span></div><div className="metrics-grid"><MetricCard title="CPU performance" score={scores.performance} icon={<Cpu />} status={metrics.cpu_usage_pct > 70 ? 'High load' : 'Stable'} tone="blue" detail={`${metrics.cpu_usage_pct.toFixed(0)}% active`} /><MetricCard title="Memory pressure" score={scores.memory} icon={<Activity />} status={metrics.ram_usage_pct > 75 ? 'High peak' : 'Watch'} tone="amber" detail={`${metrics.ram_usage_pct.toFixed(0)}% used`} /><MetricCard title="Storage space" score={scores.storage} icon={<HardDrive />} status={`${metrics.storage_usage_pct.toFixed(0)}% full`} tone="coral" detail={`${Math.max(1, Math.round((dashboard.device.total_storage_gb || 256) * (1 - metrics.storage_usage_pct / 100)))} GB free`} /><MetricCard title="Battery condition" score={scores.battery} icon={<Battery />} status={metrics.battery_health_pct < 80 ? 'Degrading' : 'Good'} tone="teal" detail={metrics.battery_charging ? 'Charging' : 'On battery'} /></div></section>
    <section className="recovery-panel panel"><div className="section-heading"><div className="title-with-icon"><span className="spark-icon"><Sparkles size={17} /></span><div><p className="eyebrow">Device rescue plan</p><h2>Recover performance before replacing the device</h2></div></div><span className="status-pill teal-pill">Predictive mode</span></div><div className="recovery-layout"><div className="recommendations">{recommendations.map(item => <ToggleRow key={item.id} {...item} checked={actions.includes(item.id)} onChange={() => onToggle(item.id)} />)}</div><div className="impact-card"><div className="impact-heading"><span>Projected impact</span><span className="impact-badge">{rescue ? `+${rescue.projected_health - rescue.current_health} pts` : 'Ready to simulate'}</span></div>{rescue ? <div className="impact-scores"><div><span>Health now</span><strong>{rescue.current_health}</strong></div><ChevronRight size={18} /><div className="projected"><span>After rescue</span><strong>{rescue.projected_health}</strong></div></div> : <div className="rescue-copy">Select actions to see how much health and boot time ReVive could recover.</div>}<button className="primary-button" onClick={onRescue}><Sparkles size={15} /> Simulate recovery</button>{rescue && <p className="impact-note">Boot time {rescue.current_boot_time}s → {rescue.projected_boot_time}s · estimated life extension +{rescue.estimated_life_extension_months} months</p>}</div></div></section>
  </>;
}

function Performance({ dashboard, history, metrics }) { return <section className="workspace-view"><div className="workspace-kpis"><div><span>Current health</span><strong>{dashboard.scores.overall}<small>/100</small></strong></div><div><span>Performance age</span><strong>{dashboard.performance_age}<small> yrs</small></strong></div><div><span>Trend</span><strong className="kpi-warning">-17<small>%</small></strong></div></div><div className="insight-grid"><div className="insight-panel panel"><div className="panel-heading"><div><p className="eyebrow">Performance trend</p><h2>Health over time</h2></div><span className="status-pill warning">-17%</span></div><MiniChart history={history} large /></div><RootCausePanel metrics={metrics} /></div><PredictionCard dashboard={dashboard} metrics={metrics} /></section>; }

function PredictionCard({ dashboard, metrics }) { return <section className="prediction-card panel"><div className="prediction-icon"><Thermometer size={21} /></div><div className="prediction-copy"><div className="prediction-title"><p className="eyebrow">Future risk signal</p><span className="prediction-status"><span /> Needs attention</span></div><h2>Performance degradation likely in 4–6 weeks</h2><p>ReVive sees rising pressure before it becomes a visible slowdown. Addressing the leading causes now can keep this device in its useful-life window.</p><div className="prediction-factors"><span><strong>{metrics.ram_usage_pct.toFixed(0)}%</strong> memory utilized</span><span><strong>{metrics.storage_usage_pct.toFixed(0)}%</strong> storage full</span><span><strong>6 months</strong> trend window</span></div></div><div className="forecast-score"><span>Forecast health</span><strong>{dashboard.scores.overall}</strong><small>/ 100 now</small><div className="forecast-track"><span style={{ width: `${dashboard.scores.overall}%` }} /></div><em>Intervene early</em></div></section>; }
function RootCausePanel({ metrics }) {
  const causes = [
    { label: 'Storage pressure', value: 34, tone: 'coral', evidence: `${metrics.storage_usage_pct.toFixed(0)}% of storage is full`, action: 'Recover storage headroom' },
    { label: 'Background processes', value: 27, tone: 'amber', evidence: `${metrics.background_processes_count} processes active`, action: 'Review background activity' },
    { label: 'Memory pressure', value: 21, tone: 'blue', evidence: `${metrics.ram_usage_pct.toFixed(0)}% memory utilization`, action: 'Reduce memory-heavy apps' },
    { label: 'Startup load', value: 11, tone: 'teal', evidence: `${metrics.startup_apps_count} apps launch at startup`, action: 'Disable non-essential startup apps' },
    { label: 'Other signals', value: 7, tone: 'muted', evidence: 'Thermal and software signals', action: 'Keep monitoring' }
  ];
  return <div className="root-cause-panel panel"><div className="root-cause-header"><div><p className="eyebrow">Root cause analysis</p><h2>Why your device feels slow</h2></div><span className="analysis-badge"><span /> Explained</span></div><div className="root-cause-summary"><span className="cause-emblem coral">!</span><div><strong>Storage pressure is the leading factor</strong><span>It accounts for 34% of the measured performance drag.</span></div></div><div className="cause-list">{causes.map(cause => <Cause key={cause.label} {...cause} />)}</div><div className="first-action"><div><span className="eyebrow">Recommended first action</span><strong>{causes[0].action}</strong><span>{causes[0].evidence}. Freeing headroom can improve responsiveness without replacing the device.</span></div><ChevronRight size={17} /></div></div>;
}
function Protection({ protection }) { const checks = protection?.checks || [['Recovery points', 'Last checkpoint created today at 09:42', true], ['System integrity', 'No unexpected changes detected', true], ['Storage reserve', 'Free space is below the recommended 15%', false], ['Battery safeguards', 'Charging and thermal limits are normal', true]].map(([title, detail, ok]) => ({ title, detail, ok })); const healthyChecks = checks.filter(check => check.ok).length; const protectionScore = Math.round((healthyChecks / checks.length) * 100); return <section className="workspace-view protection-view"><div className="protection-intro"><div><p className="eyebrow">Protection center · Recovery safeguards</p><h2>Keep recovery safe and reversible</h2><p>ReVive recommends actions for approval. It never deletes personal files automatically.</p></div><div className="protection-status"><span className="protection-status-dot" /><span>Protection status</span><strong>{protection?.status || 'Protected'}</strong></div></div><div className="protection-summary panel"><div className="protection-summary-icon"><ShieldCheck size={23} /></div><div className="protection-summary-copy"><p className="eyebrow">Recovery readiness</p><h3>{healthyChecks === checks.length ? 'Everything is ready' : 'One item needs attention'}</h3><p>{protection?.summary || 'Core recovery safeguards are active.'}</p></div><div className="protection-score"><span>{healthyChecks} of {checks.length} checks passed</span><strong>{protectionScore}%</strong><div className="protection-track"><span style={{ width: `${protectionScore}%` }} /></div></div></div><div className="protection-layout"><div className="protection-checks panel"><div className="protection-section-heading"><div><p className="eyebrow">Safeguard checklist</p><h3>System protection overview</h3></div><span className="check-count">{healthyChecks}/{checks.length} clear</span></div><div className="check-list">{checks.map(({ title, detail, ok }) => <div className="check-row" key={title}><span className={`check-icon ${ok ? 'ok' : 'warn'}`}>{ok ? <Check size={14} /> : <X size={14} />}</span><div><strong>{title}</strong><span>{detail}</span></div><span className={`check-state ${ok ? 'ok' : 'warn'}`}>{ok ? 'Clear' : 'Review'}</span></div>)}</div></div><div className="protection-note panel"><span className="note-icon"><ShieldCheck size={19} /></span><p className="eyebrow">ReVive promise</p><h3>Your files stay yours</h3><p>Recovery actions are shown for approval before they run. ReVive never removes personal files automatically.</p><div className="note-rule" /><div className="note-item"><Check size={14} /> Reversible recommendations</div><div className="note-item"><Check size={14} /> Local device monitoring</div></div></div></section>; }
function Preferences({ preferences, onChange }) { return <section className="workspace-view preferences-view"><div className="settings-intro"><div><p className="eyebrow">Workspace settings</p><h2>Choose how ReVive watches over your device</h2><p>Keep monitoring useful, quiet, and under your control. Changes apply to this device immediately.</p></div><div className="settings-status"><span className="settings-status-dot" /><span>Settings synced</span><strong>Local device</strong></div></div><div className="settings-summary"><div><span className="summary-icon teal"><Activity size={16} /></span><span>Telemetry source</span><strong>Local agent</strong></div><div><span className="summary-icon amber"><Gauge size={16} /></span><span>Recovery mode</span><strong>{preferences.recoveryMode === 'balanced' ? 'Balanced' : 'Conservative'}</strong></div><div><span className="summary-icon blue"><ShieldCheck size={16} /></span><span>Personal files</span><strong>Always protected</strong></div></div><div className="settings-grid"><div className="settings-panel panel"><div className="settings-panel-header"><div><p className="eyebrow">Monitoring & alerts</p><h3>Stay ahead of slowdowns</h3></div><span className="settings-count">3 controls</span></div><div className="settings-list"><Setting icon={<Activity size={17} />} title="Automatic diagnostics" description="Run a health check whenever fresh telemetry arrives." checked={preferences.automaticDiagnostics} onChange={event => onChange('automaticDiagnostics', event.target.checked)} /><Setting icon={<Sparkles size={17} />} title="Recovery recommendations" description="Show reversible actions before applying any change." checked={preferences.recoveryMode === 'balanced'} onChange={event => onChange('recoveryMode', event.target.checked ? 'balanced' : 'conservative')} /><Setting icon={<Bell size={17} />} title="Predictive alerts" description="Notify me when a metric is trending toward a bottleneck." checked={preferences.notifications} onChange={event => onChange('notifications', event.target.checked)} /></div></div><div className="settings-guide panel"><span className="guide-icon"><ShieldCheck size={21} /></span><p className="eyebrow">Your control center</p><h3>Designed to be reversible</h3><p>ReVive explains every recommendation before anything changes. Personal files are never removed automatically.</p><div className="guide-rule" /><div className="guide-item"><Check size={14} /> Review actions before they run</div><div className="guide-item"><Check size={14} /> Keep telemetry on this device</div></div></div></section>; }
function Assistant({ question, setQuestion, answer, metrics, onSubmit }) { const prompts = ['Why is my laptop slow?', 'What should I fix first?', 'Is it time to replace my device?']; return <section className="workspace-view assistant-view"><div className="assistant-intro"><div><p className="eyebrow">Ask ReVive · Device intelligence</p><h2>A clearer answer for every metric</h2><p>Ask about performance, storage, battery life, or the best next step. Answers are grounded in this device's latest telemetry.</p></div><div className="assistant-context"><span className="context-dot" /> Live context<strong>{metrics.storage_usage_pct.toFixed(0)}% storage used</strong></div></div><div className="assistant-layout"><div className="assistant-panel panel"><div className="assistant-panel-header"><span className="assistant-avatar"><Sparkles size={18} /></span><div><strong>ReVive intelligence</strong><span>Ready to explain what is happening</span></div><span className="assistant-live"><i /> Online</span></div><div className="assistant-welcome"><span className="eyebrow">Start with a question</span><h3>What would you like to understand?</h3><p>Choose a prompt or write your own question. ReVive will connect the answer to your device health.</p></div><div className="prompt-list">{prompts.map(prompt => <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}<ChevronRight size={14} /></button>)}</div>{answer && <div className="answer"><div className="answer-header"><span className="answer-mark"><Check size={13} /></span><div><span className="eyebrow">ReVive's assessment</span><strong>Based on your current telemetry</strong></div></div><p>{answer.answer}</p>{answer.actions.length > 0 && <div className="answer-actions">{answer.actions.map(action => <div className="answer-action" key={action}><Check size={14} /> {action}</div>)}</div>}</div>}</div><form className="question-panel panel" onSubmit={onSubmit}><div className="composer-heading"><div><span className="eyebrow">Ask a question</span><h3>Tell me what is on your mind</h3></div><MessageCircle size={19} /></div><label htmlFor="question">Your question</label><textarea id="question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="e.g. What is causing the biggest slowdown?" /><div className="composer-footer"><span>{question.length}/500</span><button className="primary-button" type="submit"><Sparkles size={15} /> Ask ReVive</button></div></form></div></section>; }
function MiniChart({ history, large = false }) { const points = history.length ? history.map((item, index) => `${(index / Math.max(1, history.length - 1)) * 100},${145 - item.health}`).join(' ') : '0,67 20,70 40,78 60,83 80,91 100,97'; return <div className={`chart ${large ? 'chart-large' : ''}`}><div className="chart-lines"><span /><span /><span /><span /></div><svg viewBox="0 0 100 145" preserveAspectRatio="none" aria-label="Performance trend chart"><polyline points={points} fill="none" stroke="#35c5ac" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" /></svg><div className="chart-labels"><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span></div></div>; }
function Cause({ label, value, tone, evidence, action }) { return <div className="cause"><div className="cause-heading"><span className={`cause-dot ${tone}`} /><span>{label}</span><strong>{value}%</strong></div><div className="cause-track"><span className={tone} style={{ width: `${value}%` }} /></div>{evidence && <div className="cause-evidence"><span>{evidence}</span><em>{action}</em></div>}</div>; }
function Setting({ icon, title, description, checked, onChange }) { return <label className="setting-row"><span className="setting-icon">{icon}</span><div className="setting-copy"><strong>{title}</strong><span>{description}</span></div><input type="checkbox" checked={checked} onChange={onChange} /><span className="toggle-control" /></label>; }
function ToggleRow({ title, description, impact, difficulty, checked, onChange }) { return <label className="toggle-row"><div><strong>{title}</strong><span>{description}</span><small>{impact} · {difficulty}</small></div><input type="checkbox" checked={checked} onChange={onChange} /><span className="toggle-control" /></label>; }
function MetricCard({ title, score, icon, status, tone, detail }) { return <div className={`metric-card panel ${tone}-metric-card`}><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-info"><div className="metric-top"><strong>{title}</strong><span className={`metric-score ${tone}`}>{score}</span></div><div className="metric-bottom"><span className={`status-dot ${tone}`} />{status}<span className="metric-detail">{detail}</span></div><div className="progress-track"><span className={tone} style={{ width: `${score}%` }} /></div></div></div>; }
