from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import duckdb

from etl.adapters.base import LITERS_PER_GALLON, LPS_PER_GPM
from etl.client_config import BACKEND_ROOT, ClientConfig, list_client_configs, load_client_config
from etl.normalize import discover_csv_files


DEFAULT_OUTPUT_ROOT = BACKEND_ROOT / "data" / "dashboard"
DEFAULT_DB_PATH = None
EXPECTED_SECONDS_PER_DAY = 86_400


@dataclass(frozen=True)
class SummaryBuildResult:
    client_id: str
    property_id: str
    meter_type: str
    output_dir: str
    source_files: int
    tables: dict[str, int]
    built_at: str


def _timezone_offset_hours(config: ClientConfig) -> int:
    offsets = {
        "America/Toronto": -4,
        "America/Vancouver": -7,
    }
    return offsets.get(config.timezone, 0)


def _mean_expr(prefix: str) -> str:
    columns = [f"{prefix}{index}" for index in range(10)]
    return "(" + " + ".join(columns) + ") / 10.0"


def _source_glob(config: ClientConfig) -> str:
    return str(config.raw_csv_dir / "*.csv")


def _local_ts_expr(offset_hours: int) -> str:
    sign = "+" if offset_hours >= 0 else "-"
    return f"to_timestamp(ts / 1000.0) {sign} INTERVAL {abs(offset_hours)} HOUR"


def _normalized_query(config: ClientConfig) -> str:
    offset_hours = _timezone_offset_hours(config)
    local_ts = _local_ts_expr(offset_hours)
    up_mean = _mean_expr(config.columns.get("upstream_pressure_prefix", "up"))
    dp_mean = _mean_expr(config.columns.get("downstream_pressure_prefix", "dp"))
    ga_mean = _mean_expr(config.columns.get("gate_a_prefix", "ga"))
    gb_mean = _mean_expr(config.columns.get("gate_b_prefix", "gb"))
    source_glob = _source_glob(config).replace("'", "''")

    if config.meter_type == "mag":
        flow_expr = f"GREATEST(COALESCE(flow, 0), 0) / {LPS_PER_GPM}"
        flow_lps_expr = "GREATEST(COALESCE(flow, 0), 0)"
        volume_l_expr = """
            CASE
                WHEN previous_total_liters IS NULL THEN 0
                WHEN postotal < previous_total_liters THEN 0
                ELSE postotal - previous_total_liters
            END
        """
        volume_gal_expr = f"({volume_l_expr}) / {LITERS_PER_GALLON}"
        extra_windows = "LAG(postotal) OVER (ORDER BY ts) AS previous_total_liters"
    else:
        window_seconds = int(config.pulse_meter.get("flow_window_seconds", 10))
        flow_expr = (
            f"SUM(GREATEST(COALESCE(fv, 0), 0)) "
            f"OVER (ORDER BY ts ROWS BETWEEN {window_seconds - 1} PRECEDING AND CURRENT ROW) "
            f"* (60.0 / {window_seconds})"
        )
        flow_lps_expr = f"({flow_expr}) * {LPS_PER_GPM}"
        volume_gal_expr = "GREATEST(COALESCE(fv, 0), 0)"
        volume_l_expr = f"({volume_gal_expr}) * {LITERS_PER_GALLON}"
        extra_windows = "NULL AS previous_total_liters"

    return f"""
        WITH raw AS (
            SELECT *, filename
            FROM read_csv_auto('{source_glob}', filename=true, union_by_name=true)
        ),
        deduped AS (
            SELECT
                *,
                ROW_NUMBER() OVER (PARTITION BY ts ORDER BY filename) AS rn
            FROM raw
            WHERE ts IS NOT NULL
        ),
        clean AS (
            SELECT * EXCLUDE (rn)
            FROM deduped
            WHERE rn = 1
        ),
        with_windows AS (
            SELECT
                *,
                {extra_windows}
            FROM clean
        )
        SELECT
            ts,
            {local_ts} AS local_ts,
            CAST({local_ts} AS DATE) AS local_date,
            EXTRACT(HOUR FROM {local_ts}) AS local_hour,
            '{config.client_id}' AS client_id,
            '{config.property_id}' AS property_id,
            COALESCE(serialnumber, '{config.serial_number or ""}') AS device_serial,
            '{config.meter_type}' AS meter_type,
            {flow_expr} AS flow_gpm,
            {flow_lps_expr} AS flow_lps,
            {volume_gal_expr} AS volume_delta_gal,
            {volume_l_expr} AS volume_delta_l,
            {up_mean} AS upstream_pressure_psi,
            {dp_mean} AS downstream_pressure_psi,
            ({up_mean}) - ({dp_mean}) AS pressure_diff_psi,
            {ga_mean} AS gate_angle_a,
            {gb_mean} AS gate_angle_b
        FROM with_windows
    """


def _create_summary_tables(con: duckdb.DuckDBPyConnection, config: ClientConfig) -> dict[str, int]:
    prefix = config.property_id.replace("-", "_")
    table = f"{prefix}_normalized"

    con.execute(f"CREATE OR REPLACE TABLE {table} AS {_normalized_query(config)}")

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_dashboard_kpis AS
        WITH latest AS (
            SELECT *
            FROM {table}
            ORDER BY ts DESC
            LIMIT 1
        ),
        totals AS (
            SELECT
                MIN(local_ts) AS first_seen_at,
                MAX(local_ts) AS last_seen_at,
                COUNT(*) AS reading_count,
                COUNT(DISTINCT local_date) AS days_observed,
                SUM(volume_delta_gal) AS total_volume_gal,
                AVG(flow_gpm) AS avg_flow_gpm,
                MAX(flow_gpm) AS max_flow_gpm,
                AVG(upstream_pressure_psi) AS avg_upstream_pressure_psi,
                AVG(downstream_pressure_psi) AS avg_downstream_pressure_psi
            FROM {table}
        )
        SELECT
            '{config.client_id}' AS client_id,
            '{config.property_id}' AS property_id,
            '{config.meter_type}' AS meter_type,
            latest.local_ts AS latest_reading_at,
            latest.flow_gpm AS current_flow_gpm,
            latest.upstream_pressure_psi AS current_upstream_pressure_psi,
            latest.downstream_pressure_psi AS current_downstream_pressure_psi,
            totals.*,
            ROUND(100 * LEAST(1.0, GREATEST(0.0, 1.0 - (
                ABS(COALESCE(latest.upstream_pressure_psi, totals.avg_upstream_pressure_psi) - totals.avg_upstream_pressure_psi)
                / NULLIF(totals.avg_upstream_pressure_psi, 0)
            ))), 1) AS water_stability_index
        FROM latest, totals
    """)

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_daily_usage AS
        SELECT
            client_id,
            property_id,
            local_date,
            COUNT(*) AS reading_count,
            ROUND(COUNT(*) * 100.0 / {EXPECTED_SECONDS_PER_DAY}, 2) AS data_completeness_pct,
            ROUND(SUM(volume_delta_gal), 2) AS total_volume_gal,
            ROUND(AVG(flow_gpm), 3) AS avg_flow_gpm,
            ROUND(MAX(flow_gpm), 3) AS max_flow_gpm,
            ROUND(AVG(upstream_pressure_psi), 2) AS avg_upstream_pressure_psi,
            ROUND(AVG(downstream_pressure_psi), 2) AS avg_downstream_pressure_psi,
            ROUND(STDDEV_POP(gate_angle_a), 4) AS gate_a_stddev,
            CASE WHEN STDDEV_POP(gate_angle_a) > 0.05 THEN 'Engaged' ELSE 'Bypassed' END AS inferred_mode
        FROM {table}
        GROUP BY 1, 2, 3
        ORDER BY local_date
    """)

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_hourly_usage AS
        SELECT
            client_id,
            property_id,
            local_date,
            local_hour,
            ROUND(SUM(volume_delta_gal), 2) AS total_volume_gal,
            ROUND(AVG(flow_gpm), 3) AS avg_flow_gpm,
            ROUND(MAX(flow_gpm), 3) AS max_flow_gpm,
            ROUND(AVG(upstream_pressure_psi), 2) AS avg_upstream_pressure_psi,
            ROUND(AVG(downstream_pressure_psi), 2) AS avg_downstream_pressure_psi
        FROM {table}
        GROUP BY 1, 2, 3, 4
        ORDER BY local_date, local_hour
    """)

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_trend_15min AS
        SELECT
            client_id,
            property_id,
            time_bucket(INTERVAL 15 MINUTE, local_ts) AS bucket_start,
            ROUND(SUM(volume_delta_gal), 2) AS volume_gal,
            ROUND(AVG(flow_gpm), 3) AS avg_flow_gpm,
            ROUND(MAX(flow_gpm), 3) AS max_flow_gpm,
            ROUND(AVG(upstream_pressure_psi), 2) AS avg_upstream_pressure_psi,
            ROUND(AVG(downstream_pressure_psi), 2) AS avg_downstream_pressure_psi
        FROM {table}
        GROUP BY 1, 2, 3
        ORDER BY bucket_start
    """)

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_mode_timeline AS
        SELECT
            client_id,
            property_id,
            local_date,
            inferred_mode,
            total_volume_gal,
            avg_flow_gpm,
            data_completeness_pct
        FROM {prefix}_daily_usage
        ORDER BY local_date
    """)

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_data_quality_daily AS
        SELECT
            client_id,
            property_id,
            local_date,
            reading_count,
            data_completeness_pct,
            CASE
                WHEN data_completeness_pct >= 90 THEN 'good'
                WHEN data_completeness_pct >= 70 THEN 'warning'
                ELSE 'critical'
            END AS completeness_status
        FROM {prefix}_daily_usage
        ORDER BY local_date
    """)

    con.execute(f"""
        CREATE OR REPLACE TABLE {prefix}_alerts AS
        WITH daily AS (
            SELECT
                client_id,
                property_id,
                local_date,
                data_completeness_pct,
                max_flow_gpm,
                avg_upstream_pressure_psi,
                avg_downstream_pressure_psi,
                total_volume_gal
            FROM {prefix}_daily_usage
        )
        SELECT
            client_id,
            property_id,
            local_date,
            'warning' AS severity,
            'High pressure day' AS alert_type,
            ROUND(avg_upstream_pressure_psi, 2) AS metric_value,
            'Review pressure trend and valve state.' AS operator_note
        FROM daily
        WHERE avg_upstream_pressure_psi >= {config.thresholds.get("high_pressure_psi", 75)}
        UNION ALL
        SELECT
            client_id,
            property_id,
            local_date,
            'warning' AS severity,
            'Low data completeness' AS alert_type,
            data_completeness_pct AS metric_value,
            'Check data feed continuity before trusting totals.' AS operator_note
        FROM daily
        WHERE data_completeness_pct < {config.thresholds.get("low_data_completeness_percent", 90)}
        UNION ALL
        SELECT
            client_id,
            property_id,
            local_date,
            'info' AS severity,
            'High flow day' AS alert_type,
            max_flow_gpm AS metric_value,
            'Inspect daily usage and hourly pattern for abnormal demand.' AS operator_note
        FROM daily
        WHERE max_flow_gpm > (SELECT AVG(max_flow_gpm) + 2 * STDDEV_POP(max_flow_gpm) FROM daily)
        ORDER BY local_date DESC, severity
    """)

    tables = {
        "dashboard_kpis": f"{prefix}_dashboard_kpis",
        "daily_usage": f"{prefix}_daily_usage",
        "hourly_usage": f"{prefix}_hourly_usage",
        "trend_15min": f"{prefix}_trend_15min",
        "mode_timeline": f"{prefix}_mode_timeline",
        "data_quality_daily": f"{prefix}_data_quality_daily",
        "alerts": f"{prefix}_alerts",
    }
    return {
        name: con.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        for name, table_name in tables.items()
    }


def _export_tables(con: duckdb.DuckDBPyConnection, config: ClientConfig, output_dir: Path) -> None:
    prefix = config.property_id.replace("-", "_")
    tables = [
        "dashboard_kpis",
        "daily_usage",
        "hourly_usage",
        "trend_15min",
        "mode_timeline",
        "data_quality_daily",
        "alerts",
    ]
    output_dir.mkdir(parents=True, exist_ok=True)
    for name in tables:
        table_name = f"{prefix}_{name}"
        parquet_path = output_dir / f"{name}.parquet"
        json_path = output_dir / f"{name}.json"
        con.execute(f"COPY {table_name} TO ? (FORMAT PARQUET)", [str(parquet_path)])
        frame = con.execute(f"SELECT * FROM {table_name}").fetchdf()
        frame.to_json(json_path, orient="records", date_format="iso", indent=2)


def build_dashboard_summaries(
    client_id: str,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    db_path: Path | None = DEFAULT_DB_PATH,
) -> SummaryBuildResult:
    config = load_client_config(client_id)
    csv_files = discover_csv_files(config)
    output_dir = output_root / config.property_id
    if db_path:
        db_path.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(str(db_path) if db_path else ":memory:")
    try:
        table_counts = _create_summary_tables(con, config)
        _export_tables(con, config, output_dir)
        con.execute("CHECKPOINT")
    finally:
        con.close()

    result = SummaryBuildResult(
        client_id=config.client_id,
        property_id=config.property_id,
        meter_type=config.meter_type,
        output_dir=str(output_dir),
        source_files=len(csv_files),
        tables=table_counts,
        built_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    (output_dir / "manifest.json").write_text(
        json.dumps(asdict(result), indent=2), encoding="utf-8"
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build full-history dashboard summary tables for a client."
    )
    parser.add_argument("client_id", choices=list_client_configs())
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument(
        "--db-path",
        type=Path,
        help="Optional DuckDB file path. Omit for an in-memory build.",
    )
    args = parser.parse_args()

    result = build_dashboard_summaries(
        client_id=args.client_id,
        output_root=args.output_root,
        db_path=args.db_path,
    )
    print(json.dumps(asdict(result), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
