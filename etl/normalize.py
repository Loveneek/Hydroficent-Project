from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from etl.adapters import MagMeterCsvAdapter, PulseMeterCsvAdapter
from etl.client_config import ClientConfig, list_client_configs, load_client_config


def adapter_for(config: ClientConfig):
    if config.meter_type == "mag":
        return MagMeterCsvAdapter(config)
    if config.meter_type == "pulse":
        return PulseMeterCsvAdapter(config)
    raise ValueError(f"Unsupported meter type: {config.meter_type}")


def discover_csv_files(config: ClientConfig) -> list[Path]:
    files = sorted(config.raw_csv_dir.glob("*.csv"))
    if not files:
        raise FileNotFoundError(f"No CSV files found in {config.raw_csv_dir}")
    return files


def normalize_preview(client_id: str, rows: int = 1000) -> pd.DataFrame:
    config = load_client_config(client_id)
    adapter = adapter_for(config)
    first_file = discover_csv_files(config)[0]
    frame = pd.read_csv(first_file, nrows=rows)
    return adapter.normalize(frame)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize a client CSV sample.")
    parser.add_argument("client_id", choices=list_client_configs())
    parser.add_argument("--rows", type=int, default=1000)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    normalized = normalize_preview(args.client_id, rows=args.rows)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        normalized.to_parquet(args.out, index=False)
        print(f"Wrote {len(normalized):,} normalized rows to {args.out}")
    else:
        print(normalized.head(10).to_string(index=False))
        print(f"\nColumns: {list(normalized.columns)}")
        print(f"Rows: {len(normalized):,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
