"""
etl/logging_config.py

One shared logging setup for the whole pipeline. Any file that wants to log
something calls get_logger(__name__) and uses the result -- it never
configures logging itself.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

from etl.config import DEFAULT_CONFIG

_CONFIGURED = False


def _configure(log_dir: Path | None = None, level: int = logging.INFO) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    log_dir = log_dir or (DEFAULT_CONFIG.processed_dir.parent / "logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "pipeline.log"

    fmt = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(level)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(fmt)
    root.addHandler(stream_handler)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    _configure()
    return logging.getLogger(name)