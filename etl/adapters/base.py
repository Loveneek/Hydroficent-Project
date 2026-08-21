from __future__ import annotations

from abc import ABC, abstractmethod
from zoneinfo import ZoneInfo

import pandas as pd

from etl.client_config import ClientConfig


LITERS_PER_GALLON = 3.785411784
LPS_PER_GPM = 0.0630901964


NORMALIZED_COLUMNS = [
    "ts",
    "utc_ts",
    "local_ts",
    "local_date",
    "client_id",
    "property_id",
    "device_serial",
    "meter_type",
    "flow_gpm",
    "flow_lps",
    "volume_delta_gal",
    "volume_delta_l",
    "upstream_pressure_psi",
    "downstream_pressure_psi",
    "gate_angle_a",
    "gate_angle_b",
    "data_quality_flag",
]


class MeterCsvAdapter(ABC):
    def __init__(self, config: ClientConfig):
        self.config = config

    @abstractmethod
    def normalize(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Return one common telemetry shape from meter-specific raw rows."""

    def _base_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        timestamp_col = self.config.columns["timestamp_ms"]
        serial_col = self.config.columns.get("serial_number")

        normalized = pd.DataFrame()
        normalized["ts"] = pd.to_numeric(frame[timestamp_col], errors="coerce").astype("Int64")
        normalized = normalized.dropna(subset=["ts"]).copy()
        normalized["ts"] = normalized["ts"].astype("int64")

        utc = pd.to_datetime(normalized["ts"], unit="ms", utc=True)
        local = utc.dt.tz_convert(ZoneInfo(self.config.timezone))
        normalized["utc_ts"] = utc.dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        normalized["local_ts"] = local.dt.strftime("%Y-%m-%dT%H:%M:%S%z")
        normalized["local_date"] = local.dt.date.astype(str)
        normalized["client_id"] = self.config.client_id
        normalized["property_id"] = self.config.property_id
        normalized["device_serial"] = (
            frame.loc[normalized.index, serial_col].astype(str)
            if serial_col and serial_col in frame
            else self.config.serial_number
        )
        normalized["meter_type"] = self.config.meter_type
        normalized["data_quality_flag"] = "good"
        return normalized

    def _prefixed_mean(self, frame: pd.DataFrame, prefix_key: str) -> pd.Series:
        prefix = self.config.columns.get(prefix_key)
        if not prefix:
            return pd.Series([pd.NA] * len(frame), index=frame.index, dtype="Float64")

        columns = [f"{prefix}{i}" for i in range(10) if f"{prefix}{i}" in frame.columns]
        if not columns:
            return pd.Series([pd.NA] * len(frame), index=frame.index, dtype="Float64")

        values = frame[columns].apply(pd.to_numeric, errors="coerce")
        return values.mean(axis=1)

    def _with_common_sensors(self, normalized: pd.DataFrame, frame: pd.DataFrame) -> pd.DataFrame:
        normalized["upstream_pressure_psi"] = self._prefixed_mean(frame, "upstream_pressure_prefix")
        normalized["downstream_pressure_psi"] = self._prefixed_mean(frame, "downstream_pressure_prefix")
        normalized["gate_angle_a"] = self._prefixed_mean(frame, "gate_a_prefix")
        normalized["gate_angle_b"] = self._prefixed_mean(frame, "gate_b_prefix")
        return normalized

    def _finish(self, normalized: pd.DataFrame) -> pd.DataFrame:
        return normalized[NORMALIZED_COLUMNS].sort_values("ts").reset_index(drop=True)
