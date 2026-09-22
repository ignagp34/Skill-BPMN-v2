"""Small JSON CLI exposing the authoritative M1 raw-XML validation result."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from bpmn_eval.raw_validation import validate_raw_bpmn


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="bpmn-eval-validate-raw")
    parser.add_argument("xml", type=Path)
    parser.add_argument("--schema", type=Path, required=True)
    args = parser.parse_args(argv)
    print(json.dumps(validate_raw_bpmn(args.xml, args.schema), ensure_ascii=False))


if __name__ == "__main__":
    main()
