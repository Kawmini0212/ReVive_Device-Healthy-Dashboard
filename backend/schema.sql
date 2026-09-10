CREATE DATABASE IF NOT EXISTS revive_db;
USE revive_db;

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    os_name VARCHAR(100),
    os_version VARCHAR(100),
    cpu_model VARCHAR(255),
    total_ram_gb FLOAT,
    total_storage_gb FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64),
    cpu_usage_pct FLOAT,
    ram_usage_pct FLOAT,
    storage_usage_pct FLOAT,
    boot_time_sec FLOAT,
    battery_health_pct FLOAT,
    battery_charging TINYINT(1),
    cpu_temp_c FLOAT,
    startup_apps_count INT,
    background_processes_count INT,
    cache_size_gb FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS health_diagnostics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64),
    overall_health INT,
    performance_score INT,
    memory_score INT,
    storage_score INT,
    battery_score INT,
    thermal_score INT,
    performance_age FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);