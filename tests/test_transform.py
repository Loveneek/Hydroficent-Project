"""
Unit tests for the business rules in etl/transform.py.

These use small, made-up numbers instead of the real 5-million-row
dataset, so they run in milliseconds and pin down exactly what each
function should do -- especially the counter-reset volume fix.
"""
import pandas as pd
import pytest
from datetime import datetime, timezone

from etl.transform import (
    classify_era,
    is_business_day,
    positive_delta_volume,
    subsample_stats,
    to_local_datetime,
)


def test_to_local_datetime_shifts_back_four_hours():
    ts_ms = int(datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
    result = to_local_datetime(ts_ms)
    assert result.hour == 20  # midnight UTC - 4 hours = 8pm the day before
    assert result.day == 31


def test_classify_era_before_repair_date():
    assert classify_era(datetime(2026, 5, 3)) == "pre_repair"


def test_classify_era_on_or_after_repair_date():
    assert classify_era(datetime(2026, 5, 4)) == "post_repair"
    assert classify_era(datetime(2026, 6, 20)) == "post_repair"


def test_sunday_is_not_a_business_day():
    assert is_business_day("Sunday") is False


def test_other_days_are_business_days():
    assert is_business_day("Monday") is True
    assert is_business_day("Saturday") is True


def test_positive_delta_volume_simple_increase():
    s = pd.Series([100.0, 101.0, 103.0, 106.0])
    result = positive_delta_volume(s)
    assert result.tolist() == [0.0, 1.0, 2.0, 3.0]


def test_positive_delta_volume_survives_counter_reset():
    # Mirrors the real June 1 event: reading climbs, resets to 0, climbs again.
    s = pd.Series([1000.0, 1003.0, 1005.0, 0.0, 3.0, 10.0])
    result = positive_delta_volume(s)
    assert result.tolist() == [0.0, 3.0, 2.0, 0.0, 3.0, 7.0]
    assert result.sum() == 15.0  # correct total, not the wrong 1005.0


def test_subsample_stats_on_constant_values():
    stats = subsample_stats([7.0] * 10)
    assert stats["mean"] == 7.0
    assert stats["std"] == 0.0
    assert stats["min"] == 7.0
    assert stats["max"] == 7.0