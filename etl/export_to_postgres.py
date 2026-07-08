"""
Push the small summary tables (not the 5M-row fact_reading_second) to
Supabase Postgres, so the dashboard can query them without needing DuckDB.

Rerun this any time new pilot data has been processed -- it replaces each
table's contents fresh each time (safe to run repeatedly).
"""
import os

import duckdb
from dotenv import load_dotenv
from sqlalchemy import create_engine

from etl.config import DEFAULT_CONFIG

load_dotenv()

TABLES_TO_EXPORT = ["dim_date", "fact_day_summary", "data_quality_log", "vw_engaged_vs_bypassed"]


def main():
    engine = create_engine(os.environ["SUPABASE_DB_URL"])
    con = duckdb.connect(str(DEFAULT_CONFIG.duckdb_path), read_only=True)

    for table in TABLES_TO_EXPORT:
        df = con.execute(f"SELECT * FROM {table}").fetchdf()
        df.to_sql(table, engine, if_exists="replace", index=False)
        print(f"{table}: pushed {len(df)} rows to Postgres")

    con.close()


if __name__ == "__main__":
    main()