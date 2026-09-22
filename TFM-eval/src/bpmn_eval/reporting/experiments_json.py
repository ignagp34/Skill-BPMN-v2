"""JSON reporter for per-experiment evaluation — full detail + aggregates."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from bpmn_eval.experiment_comparison import (
    aggregate_all_groupings,
    aggregate_diagnostics,
    flat_record,
)
from bpmn_eval.experiments import ExperimentEvaluation


def _experiment_dict(evaluation: ExperimentEvaluation) -> dict[str, object]:
    return {
        "experiment_id": evaluation.axes.experiment_id,
        "axes": asdict(evaluation.axes),
        "status": evaluation.status,
        "source": evaluation.source,
        "record": flat_record(evaluation),
        "results": {
            name: asdict(result)
            for name, result in evaluation.file_eval.results.items()
        },
    }


def write_experiments_json(
    evaluations: list[ExperimentEvaluation],
    output_path: Path,
) -> None:
    """Write full per-experiment metric detail plus aggregates across all axes."""
    groupings = aggregate_all_groupings(evaluations)
    report = {
        "experiments": [_experiment_dict(evaluation) for evaluation in evaluations],
        "aggregates": {
            field: [asdict(stats) for stats in group_stats]
            for field, group_stats in groupings.items()
        },
        "diagnostics": {
            field: aggregate_diagnostics(evaluations, field)
            for field in ("overall", "model_label", "difficulty")
        },
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
