import psutil
import time
import platform
import uuid
import os
import sys
import requests

BACKEND_URL = os.getenv("REVIVE_BACKEND_URL", "http://localhost:5000/api/telemetry")
DEVICE_ID = str(uuid.getnode())

def get_system_metrics():
    # CPU & RAM
    cpu_pct = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory()
    
    # Disk
    disk = psutil.disk_usage('/')
    
    # Battery
    battery = psutil.sensors_battery()
    bat_pct = battery.percent if battery else 100.0
    bat_charging = battery.power_plugged if battery else True

    # Processes & Boot Time
    processes = len(psutil.pids())
    boot_time = round(time.time() - psutil.boot_time(), 2)

    return {
        "device_id": DEVICE_ID,
        "device_name": platform.node(),
        "os_name": platform.system(),
        "os_version": platform.release(),
        "total_ram_gb": round(ram.total / (1024**3), 2),
        "total_storage_gb": round(disk.total / (1024**3), 2),
        "metrics": {
            "cpu_usage_pct": cpu_pct,
            "ram_usage_pct": ram.percent,
            "storage_usage_pct": disk.percent,
            "boot_time_sec": boot_time,
            "battery_health_pct": round(bat_pct, 1),
            "battery_charging": bat_charging,
            "cpu_temp_c": float(os.getenv("REVIVE_CPU_TEMP_C", "45.0")),
            "startup_apps_count": int(os.getenv("REVIVE_STARTUP_APPS", "8")),
            "background_processes_count": processes,
            "cache_size_gb": float(os.getenv("REVIVE_CACHE_SIZE_GB", "4.5"))
        }
    }

def send_telemetry():
    payload = get_system_metrics()
    try:
        res = requests.post(BACKEND_URL, json=payload)
        print(f"[{time.strftime('%H:%M:%S')}] Telemetry synced: Status {res.status_code}")
    except Exception as e:
        print(f"Failed to transmit metrics: {e}")

if __name__ == "__main__":
    print(f"ReVive Agent active. Monitoring Device ID: {DEVICE_ID}")
    once = "--once" in sys.argv
    while True:
        send_telemetry()
        if once:
            break
        time.sleep(float(os.getenv("REVIVE_INTERVAL_SECONDS", "5")))