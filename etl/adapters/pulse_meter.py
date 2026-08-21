from __future__ import annotations

import pandas as pd

from etl.adapters.base import LITERS_PER_GALLON, LPS_PER_GPM, MeterCsvAdapter


class PulseMeterCsvAdapter(MeterCsvAdapter):
    def normalize(self, frame: pd.DataFrame) -> pd.DataFrame:
        normalized = self._base_frame(frame)
        frame = frame.loc[normalized.index].copy()

        pulse_col = self.config.columns["pulse_count"]
        window_seconds = int(self.config.pulse_meter.get("flow_window_seconds", 10))

        pulses = pd.to_numeric(frame[pulse_col], errors="coerce").fillna(0).clip(lower=0)
        rolling_gallons = pulses.rolling(window=window_seconds, min_periods=1).sum()
        flow_gpm = rolling_gallons * (60 / window_seconds)

        normalized["flow_gpm"] = flow_gpm
        normalized["flow_lps"] = flow_gpm * LPS_PER_GPM
        normalized["volume_delta_gal"] = pulses
        normalized["volume_delta_l"] = pulses * LITERS_PER_GALLON

        normalized = self._with_common_sensors(normalized, frame)
        return self._finish(normalized)
