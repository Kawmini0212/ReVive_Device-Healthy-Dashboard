from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np

app = FastAPI()

class TelemetryInput(BaseModel):
    cpu_usage_pct: float
    ram_usage_pct: float
    storage_usage_pct: float
    boot_time_sec: float
    battery_health_pct: float
    cpu_temp_c: float
    startup_apps_count: int
    background_processes_count: int
    cache_size_gb: float
    physical_age_years: float = 3.0

class RecoverySimulationInput(BaseModel):
    disable_startup_apps: bool
    clear_cache: bool
    free_storage_gb: float
    current_boot_time: float
    current_health_score: int

@app.post("/analyze")
def analyze_telemetry(data: TelemetryInput):
    # Rule-assisted Scoring Logic
    perf_score = max(10, int(100 - (data.cpu_usage_pct * 0.4 + data.boot_time_sec * 0.2)))
    mem_score = max(10, int(100 - data.ram_usage_pct))
    storage_score = max(10, int(100 - data.storage_usage_pct))
    bat_score = int(data.battery_health_pct)
    thermal_score = max(10, int(100 - max(0, (data.cpu_temp_c - 40) * 1.5)))

    overall_health = int(
        perf_score * 0.25 + 
        mem_score * 0.25 + 
        storage_score * 0.20 + 
        bat_score * 0.15 + 
        thermal_score * 0.15
    )

    # Performance Age Model Simulation
    aging_factor = (data.storage_usage_pct / 50.0) + (data.ram_usage_pct / 60.0) + (data.startup_apps_count / 5.0)
    perf_age = round(data.physical_age_years * (1 + (aging_factor * 0.15)), 1)

    return {
        "scores": {
            "overall": overall_health,
            "performance": perf_score,
            "memory": mem_score,
            "storage": storage_score,
            "battery": bat_score,
            "thermal": thermal_score
        },
        "performance_age": perf_age,
        "root_causes": [
            {"factor": "Storage Pressure", "impact_pct": 34 if data.storage_usage_pct > 80 else 12},
            {"factor": "Background Processes", "impact_pct": 27 if data.background_processes_count > 50 else 10},
            {"factor": "Memory Pressure", "impact_pct": 21 if data.ram_usage_pct > 75 else 8},
            {"factor": "Startup Apps", "impact_pct": 11 if data.startup_apps_count > 5 else 4}
        ]
    }

@app.post("/simulate")
def simulate_recovery(data: RecoverySimulationInput):
    improvement = 0
    boot_reduction = 0

    if data.disable_startup_apps:
        improvement += 12
        boot_reduction += 15
    if data.clear_cache:
        improvement += 5
        boot_reduction += 3
    if data.free_storage_gb > 10:
        improvement += 10
        boot_reduction += 8

    projected_score = min(98, data.current_health_score + improvement)
    projected_boot = max(18.0, data.current_boot_time - boot_reduction)

    return {
        "projected_health_score": projected_score,
        "projected_boot_time_sec": projected_boot,
        "performance_gain_pct": round(((projected_score - data.current_health_score) / data.current_health_score) * 100, 1)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)