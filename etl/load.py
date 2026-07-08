"""
etl/load.py

Saves the transformed data into a real, permanent DuckDB database file.
Builds one detailed table (every second) plus smaller summary tables that
are much faster to query for typical day-level questions.
"""
from __future__ import annotations

import duckdb

from etl.config import DEFAULT_CONFIG, PipelineConfig
from etl.logging_config import get_logger
from etl.transform import build_fact_second_query

log = get_logger(__name__)

# A day with more gate-angle movement than this is considered "Engaged."
# We found this by looking at the data: on some days the gate barely moves
# at all (std close to 0), on others it swings around a lot -- a pretty
# clean split, and our best guess at which days the device was actively
# working vs. just sitting there passively.
GATE_A_ACTIVE_STD_THRESHOLD = 0.05


def get_connection(cfg: PipelineConfig = DEFAULT_CONFIG) -> duckdb.DuckDBPyConnection:
    cfg.ensure_dirs()
    return duckdb.connect(str(cfg.duckdb_path))


def load_fact_reading_second(con: duckdb.DuckDBPyConnection, cfg: PipelineConfig = DEFAULT_CONFIG) -> int:
    log.info("Building fact_reading_second ...")
    source_glob = str(cfg.raw_parquet_dir / "*.parquet")
    query = build_fact_second_query(source_glob)
    con.execute(f"CREATE OR REPLACE TABLE fact_reading_second AS {query}")
    n = con.execute("SELECT count(*) FROM fact_reading_second").fetchone()[0]
    log.info("fact_reading_second: %s rows", f"{n:,}")
    return n


def load_dim_date(con: duckdb.DuckDBPyConnection, cfg: PipelineConfig = DEFAULT_CONFIG) -> int:
    log.info("Building dim_date ...")
    con.execute(f"""
        CREATE OR REPLACE TABLE dim_date AS
        SELECT
            local_date,
            day_of_week,
            is_business_day,
            era,
            count(*) AS n_seconds,
            ROUND(count(*) * 1.0 / 86400, 4) AS pct_expected_seconds,
            (count(*) * 1.0 / 86400) >= {cfg.min_day_completeness_pct} AS is_complete_day
        FROM fact_reading_second
        GROUP BY 1, 2, 3, 4
        ORDER BY 1
    """)
    n = con.execute("SELECT count(*) FROM dim_date").fetchone()[0]
    log.info("dim_date: %s rows", n)
    return n


def load_fact_day_summary(con: duckdb.DuckDBPyConnection) -> int:
    log.info("Building fact_day_summary ...")
    con.execute(f"""
        CREATE OR REPLACE TABLE fact_day_summary AS
        WITH day_agg AS (
            SELECT
                local_date,
                sum(volume_delta_l) AS total_volume_l,
                avg(pressure_diff) AS avg_pressure_diff,
                avg(ga_mean) AS avg_ga,
                stddev_pop(ga_mean) AS std_ga
            FROM fact_reading_second
            GROUP BY 1
        )
        SELECT
            d.*,
            dd.day_of_week,
            dd.is_business_day,
            dd.era,
            dd.pct_expected_seconds,
            dd.is_complete_day,
            CASE WHEN d.std_ga > {GATE_A_ACTIVE_STD_THRESHOLD} THEN 'Engaged' ELSE 'Bypassed' END AS inferred_state
        FROM day_agg d
        JOIN dim_date dd USING (local_date)
        ORDER BY local_date
    """)
    n = con.execute("SELECT count(*) FROM fact_day_summary").fetchone()[0]
    log.info("fact_day_summary: %s rows", n)
    return n


def create_views(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("""
        CREATE OR REPLACE VIEW vw_engaged_vs_bypassed AS
        SELECT
            era, inferred_state,
            count(*) AS n_days,
            round(avg(total_volume_l), 1) AS avg_daily_volume_l,
            round(avg(avg_pressure_diff), 3) AS avg_pressure_diff_psi
        FROM fact_day_summary
        WHERE is_complete_day
        GROUP BY 1, 2
        ORDER BY 1, 2
    """)
    log.info("View created: vw_engaged_vs_bypassed")
    
def load_data_quality_log(con: duckdb.DuckDBPyConnection, cfg: PipelineConfig = DEFAULT_CONFIG) -> int:
    from etl.transform import build_data_quality_query
    log.info("Building data_quality_log ...")
    source_glob = str(cfg.raw_parquet_dir / "*.parquet")
    query = build_data_quality_query(source_glob)
    con.execute(f"CREATE OR REPLACE TABLE data_quality_log AS {query}")
    n = con.execute("SELECT count(*) FROM data_quality_log").fetchone()[0]
    log.info("data_quality_log: %s rows", n)
    return n

def run_load(cfg: PipelineConfig = DEFAULT_CONFIG) -> dict:
    con = get_connection(cfg)
    try:
        n_second = load_fact_reading_second(con, cfg)
        n_quality = load_data_quality_log(con, cfg)
        n_dim = load_dim_date(con, cfg)
        n_day = load_fact_day_summary(con)
        create_views(con)
        con.execute("CHECKPOINT")
        return {"fact_reading_second": n_second, "data_quality_log": n_quality, "dim_date": n_dim, "fact_day_summary": n_day}
    finally:
        con.close()


if __name__ == "__main__":
    stats = run_load()
    for table, n in stats.items():
        print(f"{table}: {n:,} rows")

