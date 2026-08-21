from __future__ import annotations

import argparse
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text

from etl.build_dashboard_summaries import build_dashboard_summaries
from etl.client_config import list_client_configs, load_client_config


TABLE_FILES = {
    "dashboard_kpis": "dashboard_kpis.json",
    "daily_usage": "daily_usage.json",
    "hourly_usage": "hourly_usage.json",
    "trend_15min": "trend_15min.json",
    "mode_timeline": "mode_timeline.json",
    "data_quality_daily": "data_quality_daily.json",
    "alerts": "alerts.json",
}

DATE_COLUMNS = {
    "dashboard_kpis": ["latest_reading_at", "first_seen_at", "last_seen_at"],
    "daily_usage": ["local_date"],
    "hourly_usage": ["local_date"],
    "trend_15min": ["bucket_start"],
    "mode_timeline": ["local_date"],
    "data_quality_daily": ["local_date"],
    "alerts": ["local_date"],
}


def _load_table_frame(output_dir: Path, table: str) -> pd.DataFrame:
    frame = pd.read_json(output_dir / TABLE_FILES[table])
    for column in DATE_COLUMNS.get(table, []):
        if column in frame.columns:
            frame[column] = pd.to_datetime(frame[column], errors="coerce")
    return frame


def _delete_property_rows(engine, table: str, property_id: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(f"DELETE FROM {table} WHERE property_id = :property_id"),
            {"property_id": property_id},
        )


def export_property(client_id: str, engine, rebuild: bool = True) -> dict[str, int]:
    config = load_client_config(client_id)
    summary = build_dashboard_summaries(client_id) if rebuild else None
    output_dir = Path(summary.output_dir) if summary else Path("data/dashboard") / config.property_id
    inspector = inspect(engine)

    exported_counts = {}
    for table in TABLE_FILES:
        frame = _load_table_frame(output_dir, table)
        if inspector.has_table(table):
            _delete_property_rows(engine, table, config.property_id)
            frame.to_sql(table, engine, if_exists="append", index=False)
        else:
            frame.to_sql(table, engine, if_exists="replace", index=False)
        exported_counts[table] = len(frame)
        print(f"{config.property_id} -> {table}: pushed {len(frame):,} rows")

    return exported_counts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export dashboard summary tables to Supabase Postgres."
    )
    parser.add_argument(
        "client_id",
        nargs="?",
        choices=[*list_client_configs(), "all"],
        default="all",
        help="Client config to export, or all configs.",
    )
    parser.add_argument(
        "--no-rebuild",
        action="store_true",
        help="Export existing dashboard JSON files without rebuilding summaries first.",
    )
    args = parser.parse_args()

    load_dotenv()
    database_url = os.environ.get("SUPABASE_DB_URL")
    if not database_url:
        raise RuntimeError("SUPABASE_DB_URL is not set. Add it to backend/.env first.")

    engine = create_engine(database_url)
    client_ids = list_client_configs() if args.client_id == "all" else [args.client_id]

    for client_id in client_ids:
        export_property(client_id, engine, rebuild=not args.no_rebuild)

    print("Supabase dashboard export complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
