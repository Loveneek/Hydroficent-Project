from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from etl.build_dashboard_summaries import build_dashboard_summaries
from etl.client_config import BACKEND_ROOT, list_client_configs, load_client_config


DEFAULT_FRONTEND_ROOT = BACKEND_ROOT.parent / "hydroficient-operator-dashboard"
SUMMARY_JSON_FILES = [
    "alerts.json",
    "daily_usage.json",
    "dashboard_kpis.json",
    "data_quality_daily.json",
    "hourly_usage.json",
    "manifest.json",
    "mode_timeline.json",
    "trend_15min.json",
]


@dataclass(frozen=True)
class FrontendDataResult:
    client_id: str
    property_id: str
    backend_output_dir: str
    frontend_output_dir: str
    copied_files: list[str]
    built_at: str


def prepare_frontend_data(
    client_id: str,
    frontend_root: Path = DEFAULT_FRONTEND_ROOT,
) -> FrontendDataResult:
    config = load_client_config(client_id)
    summary = build_dashboard_summaries(client_id)
    backend_output_dir = Path(summary.output_dir)
    frontend_output_dir = frontend_root / "src" / "data" / "generated" / config.property_id
    frontend_output_dir.mkdir(parents=True, exist_ok=True)

    for stale_parquet in frontend_output_dir.glob("*.parquet"):
        stale_parquet.unlink()

    copied_files = []
    for file_name in SUMMARY_JSON_FILES:
        source = backend_output_dir / file_name
        if not source.exists():
            raise FileNotFoundError(f"Expected summary file was not created: {source}")

        destination = frontend_output_dir / file_name
        shutil.copy2(source, destination)
        copied_files.append(file_name)

    result = FrontendDataResult(
        client_id=config.client_id,
        property_id=config.property_id,
        backend_output_dir=str(backend_output_dir),
        frontend_output_dir=str(frontend_output_dir),
        copied_files=copied_files,
        built_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    print(json.dumps(asdict(result), indent=2))
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build dashboard summaries and copy JSON into the Vite frontend."
    )
    parser.add_argument("client_id", choices=list_client_configs())
    parser.add_argument("--frontend-root", type=Path, default=DEFAULT_FRONTEND_ROOT)
    args = parser.parse_args()

    prepare_frontend_data(args.client_id, frontend_root=args.frontend_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
