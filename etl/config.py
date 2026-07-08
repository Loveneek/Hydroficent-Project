"""
etl/config.py

Centralized settings for the whole pipeline. Nothing else in this project
should have paths or magic numbers hardcoded elsewhere -- if a setting might
ever need to change (a path, a threshold, a business rule constant), it
lives here, once.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Where your raw CSV exports live. Override with an environment variable so
# this never has to be hardcoded per machine.
RAW_CSV_DIR = Path(os.environ.get(
    "HYDRO_RAW_CSV_DIR",
    r"C:\Users\singh\OneDrive\Desktop\Hydroficent\Pfaff Audi Newmarket",
))

# Where the pipeline writes its own generated files (Parquet cache, DuckDB file).
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
RAW_PARQUET_DIR = PROJECT_ROOT / "data" / "raw_parquet"
DUCKDB_PATH = PROCESSED_DIR / "hydroficient.duckdb"

# ---------------------------------------------------------------------------
# Site / device constants (from the README Hydroficient gave us)
# ---------------------------------------------------------------------------

SITE_NAME = "Pfaff Audi Newmarket"
SERIAL_NUMBER = "HF1000017"

# The whole data window is Eastern Daylight Time (UTC-4), and no DST
# changeover happens inside it, so a fixed offset is simpler and still correct.
LOCAL_UTC_OFFSET_HOURS = -4

LEAK_REPAIR_LOCAL_DATE = "2026-05-04"
WATER_RATE_CAD_PER_M3 = 5.039
EXPECTED_SECONDS_PER_DAY = 86_400
MIN_DAY_COMPLETENESS_PCT = 0.90
MAX_PLAUSIBLE_FLOW_RATE_L_PER_SEC = 5.0


@dataclass
class PipelineConfig:
    raw_csv_dir: Path = RAW_CSV_DIR
    raw_parquet_dir: Path = RAW_PARQUET_DIR
    processed_dir: Path = PROCESSED_DIR
    duckdb_path: Path = DUCKDB_PATH
    min_day_completeness_pct: float = MIN_DAY_COMPLETENESS_PCT

    def ensure_dirs(self) -> None:
        for d in (self.raw_parquet_dir, self.processed_dir):
            d.mkdir(parents=True, exist_ok=True)


DEFAULT_CONFIG = PipelineConfig()