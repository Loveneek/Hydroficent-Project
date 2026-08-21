import pandas as pd

from etl.adapters.mag_meter import MagMeterCsvAdapter
from etl.adapters.pulse_meter import PulseMeterCsvAdapter
from etl.client_config import ClientConfig


def _sensor_columns(value: float) -> dict[str, list[float]]:
    data = {}
    for prefix in ("up", "dp", "ga", "gb"):
        for i in range(10):
            data[f"{prefix}{i}"] = [value, value, value]
    return data


def _config(meter_type: str, columns: dict, pulse_meter=None) -> ClientConfig:
    return ClientConfig(
        client_id="test-client",
        client_name="Test Client",
        property_id="test-property",
        property_name="Test Property",
        timezone="America/Toronto",
        meter_type=meter_type,
        raw_csv_dir=".",
        serial_number="HFTEST",
        business_hours={},
        columns=columns,
        thresholds={},
        pulse_meter=pulse_meter or {},
    )


def test_mag_meter_normalizes_direct_flow_and_postotal_delta():
    frame = pd.DataFrame(
        {
            "ts": [1_800_000_000_000, 1_800_000_001_000, 1_800_000_002_000],
            "flow": [0.0, 1.0, 2.0],
            "postotal": [100.0, 101.5, 104.0],
            "serialnumber": ["HF1", "HF1", "HF1"],
            **_sensor_columns(50.0),
        }
    )
    adapter = MagMeterCsvAdapter(
        _config(
            "mag",
            {
                "timestamp_ms": "ts",
                "flow_lps": "flow",
                "total_liters": "postotal",
                "serial_number": "serialnumber",
                "upstream_pressure_prefix": "up",
                "downstream_pressure_prefix": "dp",
                "gate_a_prefix": "ga",
                "gate_b_prefix": "gb",
            },
        )
    )

    result = adapter.normalize(frame)

    assert result["meter_type"].unique().tolist() == ["mag"]
    assert result["flow_lps"].tolist() == [0.0, 1.0, 2.0]
    assert result["volume_delta_l"].tolist() == [0.0, 1.5, 2.5]
    assert result["upstream_pressure_psi"].tolist() == [50.0, 50.0, 50.0]


def test_pulse_meter_converts_pulses_to_rolling_gpm_and_volume():
    frame = pd.DataFrame(
        {
            "ts": [1_800_000_000_000, 1_800_000_001_000, 1_800_000_002_000],
            "fv": [0, 1, 2],
            "serialnumber": ["HF2", "HF2", "HF2"],
            **_sensor_columns(60.0),
        }
    )
    adapter = PulseMeterCsvAdapter(
        _config(
            "pulse",
            {
                "timestamp_ms": "ts",
                "pulse_count": "fv",
                "serial_number": "serialnumber",
                "upstream_pressure_prefix": "up",
                "downstream_pressure_prefix": "dp",
                "gate_a_prefix": "ga",
                "gate_b_prefix": "gb",
            },
            pulse_meter={"flow_window_seconds": 10},
        )
    )

    result = adapter.normalize(frame)

    assert result["meter_type"].unique().tolist() == ["pulse"]
    assert result["volume_delta_gal"].tolist() == [0, 1, 2]
    assert result["flow_gpm"].tolist() == [0.0, 6.0, 18.0]
    assert result["downstream_pressure_psi"].tolist() == [60.0, 60.0, 60.0]
