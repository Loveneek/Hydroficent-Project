from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import pandas as pd

from etl.adapters.base import LITERS_PER_GALLON
from etl.client_config import BACKEND_ROOT, ClientConfig, list_client_configs, load_client_config
from etl.normalize import adapter_for, discover_csv_files


DEFAULT_OUTPUT_ROOT = BACKEND_ROOT / "data" / "normalized"
DEFAULT_CHUNK_ROWS = 250_000


@dataclass(frozen=True)
class BuildResult:
    client_id: str
    property_id: str
    meter_type: str
    output_dir: str
    rows_written: int
    parts_written: int
    files_processed: int
    files_skipped: int
    source_files: list[str]
    built_at: str


def _required_columns(config: ClientConfig) -> set[str]:
    columns = config.columns
    required = {
        columns["timestamp_ms"],
        columns.get("serial_number", ""),
        columns.get("flow_lps", ""),
        columns.get("total_liters", ""),
        columns.get("pulse_count", ""),
    }

    for prefix_key in (
        "upstream_pressure_prefix",
        "downstream_pressure_prefix",
        "gate_a_prefix",
        "gate_b_prefix",
    ):
        prefix = columns.get(prefix_key)
        if prefix:
            required.update(f"{prefix}{index}" for index in range(10))

    return {column for column in required if column}


def _read_csv_chunks(
    csv_file: Path,
    required_columns: set[str],
    chunk_rows: int,
    remaining_rows: int | None,
) -> Iterable[pd.DataFrame]:
    rows_left = remaining_rows
    for chunk in pd.read_csv(
        csv_file,
        chunksize=chunk_rows,
        usecols=lambda column: column in required_columns,
    ):
        if rows_left is not None:
            if rows_left <= 0:
                break
            chunk = chunk.head(rows_left)
            rows_left -= len(chunk)

        if not chunk.empty:
            yield chunk

        if rows_left == 0:
            break


def _sort_by_timestamp(frame: pd.DataFrame, timestamp_column: str) -> pd.DataFrame:
    sorted_frame = frame.copy()
    sorted_frame["_normalized_sort_ts"] = pd.to_numeric(
        sorted_frame[timestamp_column], errors="coerce"
    )
    sorted_frame = sorted_frame.sort_values("_normalized_sort_ts").drop(
        columns=["_normalized_sort_ts"]
    )
    return sorted_frame.reset_index(drop=True)


def _adjust_mag_boundary_delta(
    normalized: pd.DataFrame,
    raw_frame: pd.DataFrame,
    config: ClientConfig,
    previous_total_liters: float | None,
) -> float | None:
    total_column = config.columns.get("total_liters")
    if not total_column or total_column not in raw_frame.columns:
        return previous_total_liters

    totals = pd.to_numeric(raw_frame[total_column], errors="coerce").dropna()
    if totals.empty:
        return previous_total_liters

    if previous_total_liters is not None and not normalized.empty:
        first_delta_liters = max(float(totals.iloc[0]) - previous_total_liters, 0.0)
        normalized.loc[normalized.index[0], "volume_delta_l"] = first_delta_liters
        normalized.loc[normalized.index[0], "volume_delta_gal"] = (
            first_delta_liters / LITERS_PER_GALLON
        )

    return float(totals.iloc[-1])


def _write_manifest(output_dir: Path, result: BuildResult) -> None:
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(asdict(result), indent=2), encoding="utf-8")


def _source_fingerprint(csv_file: Path) -> dict[str, int | str]:
    stat = csv_file.stat()
    return {
        "path": str(csv_file),
        "size_bytes": stat.st_size,
        "modified_ns": stat.st_mtime_ns,
    }


def _load_existing_manifest(output_dir: Path) -> dict:
    manifest_path = output_dir / "manifest.json"
    if not manifest_path.exists():
        return {}
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def _source_entry_by_path(manifest: dict) -> dict[str, dict]:
    entries = manifest.get("source_entries", [])
    return {entry.get("path"): entry for entry in entries}


def _is_unchanged_source(entry: dict | None, fingerprint: dict[str, int | str]) -> bool:
    if not entry:
        return False
    return (
        entry.get("size_bytes") == fingerprint["size_bytes"]
        and entry.get("modified_ns") == fingerprint["modified_ns"]
    )


def _delete_source_parts(output_dir: Path, entry: dict | None) -> None:
    if not entry:
        return
    for part_name in entry.get("parts", []):
        part_path = output_dir / part_name
        if part_path.exists():
            part_path.unlink()


def _clear_legacy_parts(output_dir: Path) -> None:
    for stale_part in output_dir.glob("part-*.parquet"):
        stale_part.unlink()
    for stale_part in output_dir.glob("source-*-part-*.parquet"):
        stale_part.unlink()


def _last_total_liters(raw_frame: pd.DataFrame, config: ClientConfig) -> float | None:
    total_column = config.columns.get("total_liters")
    if not total_column or total_column not in raw_frame.columns:
        return None
    totals = pd.to_numeric(raw_frame[total_column], errors="coerce").dropna()
    if totals.empty:
        return None
    return float(totals.iloc[-1])


def _json_safe_tail(frame: pd.DataFrame, row_count: int) -> list[dict]:
    if row_count <= 0 or frame.empty:
        return []
    tail = frame.tail(row_count).where(pd.notna(frame.tail(row_count)), None)
    return tail.to_dict(orient="records")


def build_normalized_dataset(
    client_id: str,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    chunk_rows: int = DEFAULT_CHUNK_ROWS,
    max_rows: int | None = None,
    force: bool = False,
) -> BuildResult:
    config = load_client_config(client_id)
    adapter = adapter_for(config)
    csv_files = discover_csv_files(config)
    required_columns = _required_columns(config)

    output_dir = output_root / config.property_id
    output_dir.mkdir(parents=True, exist_ok=True)

    existing_manifest = {} if force or max_rows else _load_existing_manifest(output_dir)
    existing_sources = _source_entry_by_path(existing_manifest)
    if force or max_rows or not existing_manifest:
        _clear_legacy_parts(output_dir)

    rows_written = 0
    parts_written = 0
    files_processed = 0
    files_skipped = 0
    rows_remaining = max_rows
    pulse_tail = pd.DataFrame()
    previous_total_liters: float | None = None
    timestamp_column = config.columns["timestamp_ms"]
    pulse_window = int(config.pulse_meter.get("flow_window_seconds", 10))
    source_entries: list[dict] = []

    for source_index, csv_file in enumerate(csv_files):
        if rows_remaining is not None and rows_remaining <= 0:
            break

        fingerprint = _source_fingerprint(csv_file)
        existing_entry = existing_sources.get(str(csv_file))
        if (
            max_rows is None
            and not force
            and _is_unchanged_source(existing_entry, fingerprint)
        ):
            files_skipped += 1
            parts_written += len(existing_entry.get("parts", []))
            rows_written += int(existing_entry.get("rows", 0))
            source_entries.append(existing_entry)
            previous_total_liters = existing_entry.get("last_total_liters")
            pulse_tail = pd.DataFrame(existing_entry.get("tail_rows", []))
            continue

        _delete_source_parts(output_dir, existing_entry)
        files_processed += 1
        source_parts = []
        source_rows = 0
        source_last_total_liters = previous_total_liters

        for chunk in _read_csv_chunks(
            csv_file,
            required_columns,
            chunk_rows,
            rows_remaining,
        ):
            rows_remaining = None if rows_remaining is None else rows_remaining - len(chunk)
            sorted_chunk = _sort_by_timestamp(chunk, timestamp_column)

            if config.meter_type == "pulse" and not pulse_tail.empty:
                adapter_frame = pd.concat([pulse_tail, sorted_chunk], ignore_index=True)
                trim_rows = len(pulse_tail)
            else:
                adapter_frame = sorted_chunk
                trim_rows = 0

            normalized = adapter.normalize(adapter_frame)
            if trim_rows:
                normalized = normalized.iloc[trim_rows:].reset_index(drop=True)

            if config.meter_type == "mag":
                previous_total_liters = _adjust_mag_boundary_delta(
                    normalized,
                    sorted_chunk,
                    config,
                    previous_total_liters,
                )

            if config.meter_type == "pulse":
                pulse_tail = adapter_frame.tail(max(pulse_window - 1, 0)).copy()

            if normalized.empty:
                continue

            part_name = f"source-{source_index:03d}-part-{len(source_parts):05d}.parquet"
            part_path = output_dir / part_name
            normalized.to_parquet(part_path, index=False)
            rows_written += len(normalized)
            source_rows += len(normalized)
            parts_written += 1
            source_parts.append(part_name)
            source_last_total_liters = _last_total_liters(sorted_chunk, config)

            if rows_remaining is not None and rows_remaining <= 0:
                break

        source_entry = {
            **fingerprint,
            "rows": source_rows,
            "parts": source_parts,
            "last_total_liters": source_last_total_liters,
            "tail_rows": _json_safe_tail(pulse_tail, max(pulse_window - 1, 0))
            if config.meter_type == "pulse"
            else [],
        }
        source_entries.append(source_entry)

    result = BuildResult(
        client_id=config.client_id,
        property_id=config.property_id,
        meter_type=config.meter_type,
        output_dir=str(output_dir),
        rows_written=rows_written,
        parts_written=parts_written,
        files_processed=files_processed,
        files_skipped=files_skipped,
        source_files=[str(path) for path in csv_files],
        built_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    manifest = {**asdict(result), "source_entries": source_entries}
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build dashboard-ready normalized Parquet files for a client."
    )
    parser.add_argument("client_id", choices=list_client_configs())
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--chunk-rows", type=int, default=DEFAULT_CHUNK_ROWS)
    parser.add_argument(
        "--max-rows",
        type=int,
        help="Limit raw rows processed. Useful for fast local smoke tests.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild all source files even if the manifest says they are unchanged.",
    )
    args = parser.parse_args()

    result = build_normalized_dataset(
        client_id=args.client_id,
        output_root=args.output_root,
        chunk_rows=args.chunk_rows,
        max_rows=args.max_rows,
        force=args.force,
    )
    print(json.dumps(asdict(result), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
