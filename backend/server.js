const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'your_mysql_password',
  database: process.env.MYSQL_DATABASE || 'revive_db',
  waitForConnections: true,
  connectionLimit: 10
});

const ML_SERVICE_URL = 'http://localhost:8000';
let preferences = {
  notifications: true,
  automaticDiagnostics: true,
  recoveryMode: 'balanced'
};
const demoTelemetry = {
  device_id: 'demo-revive-device',
  device_name: 'Dell Latitude 5490',
  os_name: 'Windows',
  os_version: '11',
  total_ram_gb: 16,
  total_storage_gb: 256,
  metrics: {
    cpu_usage_pct: 19,
    ram_usage_pct: 69,
    storage_usage_pct: 91,
    boot_time_sec: 72,
    battery_health_pct: 83,
    battery_charging: true,
    cpu_temp_c: 58,
    startup_apps_count: 8,
    background_processes_count: 64,
    cache_size_gb: 7.5
  },
  received_at: new Date().toISOString()
};
let latestTelemetry = demoTelemetry;
let latestTelemetryReceivedAt = null;
const telemetryHistory = Array.from({ length: 6 }, (_, index) => ({
  recorded_at: new Date(Date.now() - (5 - index) * 30 * 24 * 60 * 60 * 1000).toISOString(),
  health: [78, 76, 73, 70, 66, 61][index],
  memory: [48, 54, 59, 66, 75, 83][index],
  storage: [73, 77, 80, 84, 88, 91][index]
}));

function getScores(telemetry = latestTelemetry) {
  const metrics = telemetry.metrics;
  const performance = Math.max(10, Math.round(100 - (metrics.cpu_usage_pct * 0.4) - (metrics.boot_time_sec * 0.2)));
  const memory = Math.max(10, Math.round(100 - metrics.ram_usage_pct));
  const storage = Math.max(10, Math.round(100 - metrics.storage_usage_pct));
  const battery = Math.round(metrics.battery_health_pct);
  const thermal = Math.max(10, Math.round(100 - Math.max(0, (metrics.cpu_temp_c - 40) * 1.5)));
  const overall = Math.round(performance * .25 + memory * .25 + storage * .2 + battery * .15 + thermal * .15);
  return { overall, performance, memory, storage, battery, thermal };
}

function getRecommendations(telemetry = latestTelemetry) {
  const { metrics } = telemetry;
  return [
    { id: 'startup', title: 'Disable non-essential startup apps', description: 'Reduce boot latency and background work.', impact: '+12 health', difficulty: 'Easy', enabled: metrics.startup_apps_count > 5 },
    { id: 'storage', title: 'Recover storage headroom', description: `Free approximately ${Math.max(15, Math.round(telemetry.total_storage_gb * .06 || 15))} GB without removing personal files.`, impact: '+8 health', difficulty: 'Easy', enabled: metrics.storage_usage_pct > 85 },
    { id: 'cache', title: 'Clear system and application cache', description: 'Remove temporary files that are safe to regenerate.', impact: '+5 health', difficulty: 'Easy', enabled: metrics.cache_size_gb > 3 },
    { id: 'background', title: 'Review background processes', description: 'Reduce memory pressure from apps running while idle.', impact: '+6 health', difficulty: 'Medium', enabled: metrics.background_processes_count > 50 }
  ];
}

function isTelemetryLive() {
  return latestTelemetryReceivedAt !== null && Date.now() - latestTelemetryReceivedAt < 30000;
}

// Sync Telemetry Data
app.post('/api/telemetry', async (req, res) => {
  const { device_id, device_name, os_name, os_version, total_ram_gb, total_storage_gb, metrics } = req.body;
  latestTelemetry = { device_id, device_name, os_name, os_version, total_ram_gb, total_storage_gb, metrics, received_at: new Date().toISOString() };
  latestTelemetryReceivedAt = Date.now();
  telemetryHistory.push({
    recorded_at: latestTelemetry.received_at,
    health: getScores(latestTelemetry).overall,
    memory: metrics.ram_usage_pct,
    storage: metrics.storage_usage_pct
  });
  if (telemetryHistory.length > 30) telemetryHistory.shift();

  try {

    // Register or Update Device
    await dbPool.query(
      `INSERT INTO devices (id, device_name, os_name, os_version, total_ram_gb, total_storage_gb) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE device_name=?, os_name=?, os_version=?`,
      [device_id, device_name, os_name, os_version, total_ram_gb, total_storage_gb, device_name, os_name, os_version]
    );

    // Insert Log
    await dbPool.query(
      `INSERT INTO telemetry_logs 
       (device_id, cpu_usage_pct, ram_usage_pct, storage_usage_pct, boot_time_sec, battery_health_pct, battery_charging, cpu_temp_c, startup_apps_count, background_processes_count, cache_size_gb) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device_id, metrics.cpu_usage_pct, metrics.ram_usage_pct, metrics.storage_usage_pct,
        metrics.boot_time_sec, metrics.battery_health_pct, metrics.battery_charging,
        metrics.cpu_temp_c, metrics.startup_apps_count, metrics.background_processes_count, metrics.cache_size_gb
      ]
    );

    res.status(200).json({ status: "success", message: "Telemetry processed", persisted: true });
  } catch (err) {
    console.error('Telemetry persistence unavailable:', err.message);
    res.status(202).json({ status: "accepted", message: "Telemetry available for live monitoring", persisted: false });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'revive-api', database: 'optional' }));

app.get('/api/dashboard', (req, res) => {
  const scores = getScores();
  const performanceAge = Number((3.8 + Math.max(0, 100 - scores.overall) * .045).toFixed(1));
  res.json({
    device: latestTelemetry,
    scores,
    performance_age: performanceAge,
    physical_age: 4.2,
    recommendations: getRecommendations(),
    latest_check: latestTelemetry.received_at,
    mode: isTelemetryLive() ? 'live' : 'demo',
    telemetry_stale: !isTelemetryLive()
  });
});

app.get('/api/history', (req, res) => {
  res.json({ history: telemetryHistory.slice(-12), prediction: { six_months: 71, twelve_months: 63 } });
});

app.post('/api/assistant', (req, res) => {
  const question = String(req.body.question || '').toLowerCase();
  const { metrics } = latestTelemetry;
  const answers = question.includes('buy') || question.includes('replace')
    ? { answer: 'Not yet. Your hardware is still capable of meeting this workload. Addressing storage and memory pressure should extend its useful life.', actions: ['Recover 15 GB of storage', 'Disable 4 startup applications', 'Reduce background activity'] }
    : question.includes('fix') || question.includes('first')
      ? { answer: 'Start with storage pressure, then reduce startup and background activity. Those changes target the largest contributors to the current slowdown.', actions: ['Free storage headroom', 'Disable non-essential startup apps', 'Review background processes'] }
      : { answer: `Your device is not simply old. The main signals are ${metrics.storage_usage_pct > 85 ? 'storage pressure' : 'storage usage'}, ${metrics.ram_usage_pct > 75 ? 'memory pressure' : 'background activity'}, and startup load. ReVive estimates that targeted cleanup can restore noticeable responsiveness.`, actions: ['Run the recovery simulation', 'Review storage categories', 'Check memory-heavy processes'] };
  res.json({ ...answers, question: req.body.question || '' });
});

app.post('/api/rescue', (req, res) => {
  const current = getScores().overall;
  const selected = Array.isArray(req.body.actions) ? req.body.actions : ['startup', 'storage', 'cache'];
  const improvement = selected.reduce((total, action) => total + ({ startup: 12, storage: 8, cache: 5, background: 6 }[action] || 0), 0);
  res.json({ current_health: current, projected_health: Math.min(98, current + improvement), current_boot_time: latestTelemetry.metrics.boot_time_sec, projected_boot_time: Math.max(18, latestTelemetry.metrics.boot_time_sec - (selected.length * 7)), estimated_life_extension_months: Math.min(24, 8 + selected.length * 3) });
});

// Fetch Latest Health Diagnosis
app.get('/api/diagnostics/:deviceId', async (req, res) => {
  try {
    let latest;
    try {
      const [rows] = await dbPool.query(
        `SELECT * FROM telemetry_logs WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1`,
        [req.params.deviceId]
      );
      latest = rows[0];
    } catch (dbError) {
      console.warn('Diagnostics using live telemetry:', dbError.message);
    }
    if (!latest && latestTelemetry.device_id === req.params.deviceId) latest = { ...latestTelemetry.metrics, device_id: latestTelemetry.device_id };
    if (!latest) return res.status(404).json({ error: "No metrics found" });
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/analyze`, {
      cpu_usage_pct: latest.cpu_usage_pct,
      ram_usage_pct: latest.ram_usage_pct,
      storage_usage_pct: latest.storage_usage_pct,
      boot_time_sec: latest.boot_time_sec,
      battery_health_pct: latest.battery_health_pct,
      cpu_temp_c: latest.cpu_temp_c,
      startup_apps_count: latest.startup_apps_count,
      background_processes_count: latest.background_processes_count,
      cache_size_gb: latest.cache_size_gb
    });

    res.json({
      telemetry: latest,
      analysis: mlResponse.data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch diagnostics" });
  }
});

// Run Simulation
app.post('/api/simulate', async (req, res) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/simulate`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Simulation error" });
  }
});

app.get('/api/performance', (req, res) => {
  if (!latestTelemetry?.metrics) return res.status(503).json({ error: 'Waiting for device telemetry' });

  const metrics = latestTelemetry.metrics;
  const cpuScore = Math.max(10, Math.round(100 - (metrics.cpu_usage_pct * 0.4)));
  const memoryScore = Math.max(10, Math.round(100 - metrics.ram_usage_pct));
  const storageScore = Math.max(10, Math.round(100 - metrics.storage_usage_pct));
  const batteryScore = Math.round(metrics.battery_health_pct);
  const statusFor = score => score >= 75 ? 'Stable' : score >= 50 ? 'Needs attention' : 'Critical';

  res.json({
    device: { id: latestTelemetry.device_id, name: latestTelemetry.device_name, received_at: latestTelemetry.received_at },
    recommendation: metrics.storage_usage_pct > 85 || metrics.ram_usage_pct > 75 ? 'Recovery recommended' : 'Device is running well',
    metrics: [
      { title: 'CPU performance', score: cpuScore, status: statusFor(cpuScore), tone: 'blue', detail: `${metrics.cpu_usage_pct.toFixed(1)}% active` },
      { title: 'Memory pressure', score: memoryScore, status: statusFor(memoryScore), tone: 'amber', detail: `${metrics.ram_usage_pct.toFixed(1)}% used` },
      { title: 'Storage space', score: storageScore, status: statusFor(storageScore), tone: 'coral', detail: `${metrics.storage_usage_pct.toFixed(1)}% full` },
      { title: 'Battery condition', score: batteryScore, status: statusFor(batteryScore), tone: 'teal', detail: metrics.battery_charging ? `${batteryScore}% charging` : `${batteryScore}% remaining` }
    ],
    actions: [
      { title: 'Disable non-essential startup apps', description: 'Reduce boot latency and background work.', impact: '-15 sec boot' },
      { title: 'Clear system and application cache', description: 'Recover space without removing personal files.', impact: '+7.5 GB' },
      { title: 'Review background processes', description: 'Identify apps consuming memory while idle.', impact: `${metrics.background_processes_count} active` }
    ],
    live: true
  });
});

app.get('/api/protection', (req, res) => {
  res.json({
    status: 'Protected',
    summary: 'The essential checks for a reliable recovery workflow are active.',
    checks: [
      { title: 'Recovery points', detail: 'Last checkpoint created today at 09:42', ok: true },
      { title: 'System integrity', detail: 'No unexpected changes detected', ok: true },
      { title: 'Storage reserve', detail: 'Free space is below the recommended 15%', ok: false },
      { title: 'Battery safeguards', detail: 'Charging and thermal limits are normal', ok: true }
    ]
  });
});

app.get('/api/preferences', (req, res) => res.json(preferences));

app.put('/api/preferences', (req, res) => {
  const { notifications, automaticDiagnostics, recoveryMode } = req.body;
  if (typeof notifications !== 'boolean' || typeof automaticDiagnostics !== 'boolean' || !['balanced', 'performance', 'conservative'].includes(recoveryMode)) {
    return res.status(400).json({ error: 'Invalid preferences' });
  }
  preferences = { notifications, automaticDiagnostics, recoveryMode };
  res.json(preferences);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`ReVive Express server running on port ${PORT}`));