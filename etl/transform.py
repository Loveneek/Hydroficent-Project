"""
etl/transform.py

The business rules that turn raw sensor readings into something we can
analyze. Written first as plain Python functions (easy to test on a
handful of numbers), then mirrored in SQL later so the same logic can run
against millions of rows fast.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from etl.config import LEAK_REPAIR_LOCAL_DATE, LOCAL_UTC_OFFSET_HOURS, MAX_PLAUSIBLE_FLOW_RATE_L_PER_SEC


def to_local_datetime(ts_ms: int, offset_hours: int = LOCAL_UTC_OFFSET_HOURS) -> datetime:
    """Convert a raw timestamp (milliseconds since 1970, UTC) into local time."""
    utc_dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
    return (utc_dt + timedelta(hours=offset_hours)).replace(tzinfo=None)


def classify_era(local_date, repair_date: str = LEAK_REPAIR_LOCAL_DATE) -> str:
    """Was this date before or after the leak was fixed?"""
    repair = datetime.strptime(repair_date, "%Y-%m-%d").date()
    d = local_date.date() if hasattr(local_date, "date") else local_date
    return "pre_repair" if d < repair else "post_repair"


def is_business_day(day_of_week: str) -> bool:
    """The dealership is closed Sundays."""
    return day_of_week != "Sunday"


def positive_delta_volume(postotal: pd.Series) -> pd.Series:
    """Turn a cumulative, ever-increasing meter reading into 'how much water
    was used this second,' safely handling the one-time counter reset.
    """
    prev = postotal.shift(1)
    delta = postotal - prev
    delta = delta.clip(lower=0)
    delta.iloc[0] = 0.0
    return delta.fillna(0.0)


def subsample_stats(values) -> dict:
    """Collapse 10 pressure/gate-angle readings taken within one second into
    one summary: average, how much they varied, lowest, highest.
    """
    arr = np.asarray(list(values), dtype=float)
    return {
        "mean": float(arr.mean()),
        "std": float(arr.std(ddof=0)),
        "min": float(arr.min()),
        "max": float(arr.max()),
    }

def _mean_expr(columns: list[str]) -> str:
    """Build the SQL text for 'average of these columns'."""
    return "(" + " + ".join(columns) + f") / {len(columns)}.0"


def _variance_expr(columns: list[str], mean_expr: str) -> str:
    """Build the SQL text for 'how spread out these columns are' (variance),
    using the shortcut formula: variance = average(x^2) - (average(x))^2
    """
    mean_of_squares = "(" + " + ".join(f"{c}*{c}" for c in columns) + f") / {len(columns)}.0"
    return f"({mean_of_squares}) - (({mean_expr}) * ({mean_expr}))"

def build_fact_second_query(source_glob: str) -> str:
    """Build the full SQL query that turns raw sensor rows into clean,
    analysis-ready rows -- deduplicated, with local time, era, weekday,
    collapsed pressure/gate stats, and a safe volume calculation.
    """
    up_cols = [f"up{i}" for i in range(10)]
    dp_cols = [f"dp{i}" for i in range(10)]
    ga_cols = [f"ga{i}" for i in range(10)]

    up_mean = _mean_expr(up_cols)
    dp_mean = _mean_expr(dp_cols)
    ga_mean = _mean_expr(ga_cols)

    up_var = _variance_expr(up_cols, up_mean)
    dp_var = _variance_expr(dp_cols, dp_mean)
    ga_var = _variance_expr(ga_cols, ga_mean)

    return f"""
    WITH raw AS (
        SELECT *, filename FROM read_parquet('{source_glob}', filename=True)
    ),
    deduped AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY ts ORDER BY filename) AS rn
        FROM raw
    ),
    clean AS (
        SELECT * FROM deduped WHERE rn = 1
    ),
    enriched AS (
        SELECT
            ts,
            to_timestamp(ts / 1000.0 + {LOCAL_UTC_OFFSET_HOURS} * 3600) AS local_ts,
            CAST(to_timestamp(ts / 1000.0 + {LOCAL_UTC_OFFSET_HOURS} * 3600) AS DATE) AS local_date,
            flow, postotal, tup, tdn,
            ({up_mean}) AS up_mean,
            SQRT(GREATEST({up_var}, 0)) AS up_std,
            ({dp_mean}) AS dp_mean,
            SQRT(GREATEST({dp_var}, 0)) AS dp_std,
            ({ga_mean}) AS ga_mean,
            SQRT(GREATEST({ga_var}, 0)) AS ga_std
        FROM clean
    ),
     with_volume AS (
        SELECT
            *,
            (postotal - LAG(postotal) OVER (ORDER BY ts)) AS volume_delta_l_raw,
            GREATEST((ts - LAG(ts) OVER (ORDER BY ts)) / 1000.0, 1.0) AS gap_seconds
        FROM enriched
    ),
    capped_volume AS (
        SELECT
            * EXCLUDE (volume_delta_l_raw, gap_seconds),
            CASE
                WHEN volume_delta_l_raw IS NULL THEN 0
                WHEN volume_delta_l_raw < 0 THEN 0
                WHEN (volume_delta_l_raw / gap_seconds) > {MAX_PLAUSIBLE_FLOW_RATE_L_PER_SEC} THEN 0
                ELSE volume_delta_l_raw
            END AS volume_delta_l
        FROM with_volume
    )
    SELECT
        *,
        (up_mean - dp_mean) AS pressure_diff,
        dayname(local_date) AS day_of_week,
        (dayname(local_date) <> 'Sunday') AS is_business_day,
        CASE WHEN local_date < DATE '{LEAK_REPAIR_LOCAL_DATE}' THEN 'pre_repair' ELSE 'post_repair' END AS era
    FROM capped_volume
    ORDER BY ts
    """

def build_data_quality_query(source_glob: str, offset_hours: int = LOCAL_UTC_OFFSET_HOURS) -> str:
    """Scan the raw data for known kinds of bad/suspicious readings and
    summarize them per day -- an audit trail of what we found and ignored,
    instead of silently deleting anything.
    """
    return f"""
    WITH raw AS (
        SELECT *, filename FROM read_parquet('{source_glob}', filename=True)
    ),
    with_date AS (
        SELECT *, CAST(to_timestamp(ts / 1000.0 + {offset_hours} * 3600) AS DATE) AS local_date
        FROM raw
    ),
    dup_flagged AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY ts ORDER BY filename) AS rn
        FROM with_date
    ),
    duplicates AS (
        SELECT local_date, 'duplicate_timestamp' AS issue_type, count(*) AS n_affected
        FROM dup_flagged WHERE rn > 1 GROUP BY 1
    ),
    clean AS (
        SELECT * FROM dup_flagged WHERE rn = 1
    ),
    with_lag AS (
        SELECT
            *,
            LAG(postotal) OVER (ORDER BY ts) AS prev_postotal,
            LAG(ts) OVER (ORDER BY ts) AS prev_ts
        FROM clean
    ),
    resets AS (
        SELECT local_date, 'counter_reset' AS issue_type, count(*) AS n_affected
        FROM with_lag WHERE postotal < prev_postotal GROUP BY 1
    ),
       volume_spikes AS (
        SELECT local_date, 'implausible_volume_jump' AS issue_type, count(*) AS n_affected
        FROM with_lag
        WHERE prev_postotal IS NOT NULL
          AND postotal > prev_postotal
          AND (postotal - prev_postotal) / GREATEST((ts - prev_ts) / 1000.0, 1.0) > {MAX_PLAUSIBLE_FLOW_RATE_L_PER_SEC}
        GROUP BY 1
    ),
    pressure_bad AS (
        SELECT local_date, 'pressure_out_of_range' AS issue_type, count(*) AS n_affected
        FROM clean
        WHERE (up0+up1+up2+up3+up4+up5+up6+up7+up8+up9)/10.0 NOT BETWEEN 0 AND 200
           OR (dp0+dp1+dp2+dp3+dp4+dp5+dp6+dp7+dp8+dp9)/10.0 NOT BETWEEN 0 AND 200
        GROUP BY 1
    ),
    temp_bad AS (
        SELECT local_date, 'temperature_out_of_range' AS issue_type, count(*) AS n_affected
        FROM clean WHERE tup NOT BETWEEN -10 AND 50 OR tdn NOT BETWEEN -10 AND 50
        GROUP BY 1
    ),
    flow_bad AS (
        SELECT local_date, 'negative_flow' AS issue_type, count(*) AS n_affected
        FROM clean WHERE flow < 0 GROUP BY 1
    )
    SELECT * FROM duplicates
    UNION ALL SELECT * FROM resets
    UNION ALL SELECT * FROM volume_spikes
    UNION ALL SELECT * FROM pressure_bad
    UNION ALL SELECT * FROM temp_bad
    UNION ALL SELECT * FROM flow_bad
    ORDER BY local_date, issue_type
    """