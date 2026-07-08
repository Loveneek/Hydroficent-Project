"""
etl/extract.py

Finds the raw CSV files, checks their columns match what we expect, and
converts each one into a Parquet file (a smaller, faster format) so the
rest of the pipeline never has to touch slow CSV parsing again.
"""
from __future__ import annotations

import glob
from pathlib import Path

import duckdb

from etl.config import DEFAULT_CONFIG, PipelineConfig
from etl.logging_config import get_logger

log = get_logger(__name__)

# The columns every raw CSV file must have. If a file is missing any of
# these, something is wrong with it and we should stop rather than silently
# process bad data.
EXPECTED_COLUMNS = [
    "ts", "flow", "vel", "postotal", "revtotal", "tup", "tdn", "serialnumber",
    "year", "month", "day", "hour",
]


class SchemaValidationError(Exception):
    """Raised when a raw CSV is missing columns we expect it to have."""


def discover_raw_files(cfg: PipelineConfig = DEFAULT_CONFIG) -> list[Path]:
    """Find every CSV file in the raw data folder, sorted so they line up
    in chronological order.
    """
    files = sorted(glob.glob(str(cfg.raw_csv_dir / "*.csv")))
    if not files:
        raise FileNotFoundError(f"No CSV files found in {cfg.raw_csv_dir}")
    return [Path(f) for f in files]


def validate_schema(con: duckdb.DuckDBPyConnection, csv_path: Path) -> None:
    """Check that a CSV file has all the columns we expect before we trust it."""
    described = con.execute(
        "DESCRIBE SELECT * FROM read_csv_auto(?, union_by_name=True)", [str(csv_path)]
    ).fetchdf()
    actual_columns = set(described["column_name"])
    missing = set(EXPECTED_COLUMNS) - actual_columns
    if missing:
        raise SchemaValidationError(f"{csv_path.name} is missing columns: {sorted(missing)}")


def extract_file(csv_path: Path, cfg: PipelineConfig = DEFAULT_CONFIG) -> int:
    """Convert one raw CSV into a Parquet file. Skips the work if it was
    already done on a previous run.
    """
    cfg.ensure_dirs()
    base = csv_path.stem.replace(" ", "_")
    out_path = cfg.raw_parquet_dir / f"{base}.parquet"
    done_marker = cfg.raw_parquet_dir / f"{base}.parquet.done"

    con = duckdb.connect()

    if done_marker.exists():
        row_count = con.execute("SELECT count(*) FROM read_parquet(?)", [str(out_path)]).fetchone()[0]
        log.info("SKIP %s (already extracted, %s rows)", base, f"{row_count:,}")
        return row_count

    log.info("Validating schema for %s", csv_path.name)
    validate_schema(con, csv_path)

    log.info("Extracting %s -> %s", csv_path.name, out_path.name)
    con.execute(
        f"COPY (SELECT * FROM read_csv_auto(?, union_by_name=True)) "
        f"TO '{out_path}' (FORMAT PARQUET, COMPRESSION ZSTD)",
        [str(csv_path)],
    )
    row_count = con.execute("SELECT count(*) FROM read_parquet(?)", [str(out_path)]).fetchone()[0]
    done_marker.write_text("ok")
    log.info("Extracted %s: %s rows", base, f"{row_count:,}")
    return row_count


def extract_all(cfg: PipelineConfig = DEFAULT_CONFIG) -> int:
    """Run extract_file on every raw CSV, and return the total row count."""
    total = 0
    for csv_path in discover_raw_files(cfg):
        total += extract_file(csv_path, cfg)
    log.info("Extract complete: %s total rows", f"{total:,}")
    return total


if __name__ == "__main__":
    extract_all()