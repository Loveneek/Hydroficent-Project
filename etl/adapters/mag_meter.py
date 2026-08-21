from __future__ import annotations

import pandas as pd

from etl.adapters.base import LITERS_PER_GALLON, LPS_PER_GPM, MeterCsvAdapter


class MagMeterCsvAdapter(MeterCsvAdapter):
    def normalize(self, frame: pd.DataFrame) -> pd.DataFrame:
        normalized = self._base_frame(frame)
        frame = frame.loc[normalized.index].copy()

        flow_col = self.config.columns["flow_lps"]
        total_col = self.config.columns["total_liters"]

        flow_lps = pd.to_numeric(frame[flow_col], errors="coerce").clip(lower=0)
        total_liters = pd.to_numeric(frame[total_col], errors="coerce")
        volume_delta_l = total_liters.diff().clip(lower=0).fillna(0)

        normalized["flow_lps"] = flow_lps
        normalized["flow_gpm"] = flow_lps / LPS_PER_GPM
        normalized["volume_delta_l"] = volume_delta_l
        normalized["volume_delta_gal"] = volume_delta_l / LITERS_PER_GALLON

        normalized = self._with_common_sensors(normalized, frame)
        return self._finish(normalized)
