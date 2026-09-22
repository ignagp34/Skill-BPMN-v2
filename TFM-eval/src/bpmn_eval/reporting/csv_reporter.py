"""CSV reporter — flat table for statistical analysis in R / pandas / SPSS."""

from __future__ import annotations

import csv
from pathlib import Path

from bpmn_eval.models import CaseComparison


def write_csv_report(
    cases: list[CaseComparison],
    output_path: Path,
) -> None:
    """Write a flat CSV with one row per (case, method) and one column per metric score.

    Output example::

        case_id,method,xml_validity,structural_connectedness,...
        case_001,zero_shot,1.0,0.85,...
        case_001,dsl,1.0,1.0,...
    """
    if not cases:
        return

    # Determine column order from the first case
    metric_names = list(cases[0].zero_shot.results.keys())
    fieldnames = ["case_id", "method"] + metric_names

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for case in cases:
            for evaluation in (case.zero_shot, case.dsl):
                row: dict[str, object] = {
                    "case_id": case.case_id,
                    "method": evaluation.method.value,
                }
                for name in metric_names:
                    result = evaluation.results.get(name)
                    row[name] = result.score if result is not None else ""
                writer.writerow(row)
