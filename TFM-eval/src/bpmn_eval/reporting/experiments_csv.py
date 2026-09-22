"""CSV reporter for per-experiment evaluation — one flat row per experiment."""

from __future__ import annotations

import csv
from pathlib import Path

from bpmn_eval.experiment_comparison import flat_record, record_fieldnames
from bpmn_eval.experiments import ExperimentEvaluation


def write_experiments_csv(
    evaluations: list[ExperimentEvaluation],
    output_path: Path,
) -> None:
    """Write one row per experiment: provenance axes + 10 metric scores +
    descriptive values (tnn, tnsf, cfc_total, cnc, has_cycle).

    Drops straight into pandas/R for grouping by process / model / provider.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=record_fieldnames())
        writer.writeheader()
        for evaluation in evaluations:
            writer.writerow(flat_record(evaluation))
