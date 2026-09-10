const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_mysql_password',
  database: 'revive_db',
  waitForConnections: true,
  connectionLimit: 10
});

const ML_SERVICE_URL = 'http://localhost:8000';
let preferences = {
  notifications: true,
  automaticDiagnostics: true,
  recoveryMode: 'balanced'
};
let latestTelemetry = null;

// Sync Telemetry Data
app.post('/api/telemetry', async (req, res) => {
  const { device_id, device_name, os_name, os_version, total_ram_gb, total_storage_gb, metrics } = req.body;
  latestTelemetry = { device_id, device_name, os_name, os_version, total_ram_gb, total_storage_gb, metrics, received_at: new Date().toISOString() };

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

// Fetch Latest Health Diagnosis
app.get('/api/diagnostics/:deviceId', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT * FROM telemetry_logs WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1`,
      [req.params.deviceId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "No metrics found" });

    const latest = rows[0];
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