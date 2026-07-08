"""
etl/pipeline.py

Runs the whole pipeline end to end: extract, then load.
Usage: python -m etl.pipeline
"""
from __future__ import annotations

import sys

from etl.extract import extract_all
from etl.load import run_load
from etl.logging_config import get_logger

log = get_logger(__name__)


def main() -> int:
    log.info("=== Pipeline starting ===")
    extract_all()
    stats = run_load()
    log.info("=== Pipeline complete: %s ===", stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())