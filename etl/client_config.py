from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal


BACKEND_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = BACKEND_ROOT / "configs"


MeterType = Literal["mag", "pulse"]


@dataclass(frozen=True)
class ClientConfig:
    client_id: str
    client_name: str
    property_id: str
    property_name: str
    timezone: str
    meter_type: MeterType
    raw_csv_dir: Path
    serial_number: str | None
    business_hours: dict[str, str]
    columns: dict[str, str]
    thresholds: dict[str, float]
    pulse_meter: dict[str, Any]


def _resolve_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return (BACKEND_ROOT / path).resolve()


def load_client_config(client_id: str) -> ClientConfig:
    config_path = CONFIG_DIR / f"{client_id}.json"
    if not config_path.exists():
        available = sorted(path.stem for path in CONFIG_DIR.glob("*.json"))
        raise FileNotFoundError(
            f"No config found for {client_id!r}. Available configs: {available}"
        )

    raw = json.loads(config_path.read_text(encoding="utf-8"))
    return ClientConfig(
        client_id=raw["client_id"],
        client_name=raw["client_name"],
        property_id=raw["property_id"],
        property_name=raw["property_name"],
        timezone=raw["timezone"],
        meter_type=raw["meter_type"],
        raw_csv_dir=_resolve_path(raw["raw_csv_dir"]),
        serial_number=raw.get("serial_number"),
        business_hours=raw.get("business_hours", {}),
        columns=raw.get("columns", {}),
        thresholds=raw.get("thresholds", {}),
        pulse_meter=raw.get("pulse_meter", {}),
    )


def list_client_configs() -> list[str]:
    return sorted(path.stem for path in CONFIG_DIR.glob("*.json"))
