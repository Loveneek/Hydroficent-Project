import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import duckdb

con = duckdb.connect("data/processed/hydroficient.duckdb")

query = """
    SELECT local_date, avg_pressure_diff, std_ga
    FROM fact_day_summary
    WHERE inferred_state = 'Engaged' AND is_complete_day
    ORDER BY local_date
"""
print(con.execute(query).fetchdf().to_string())