"""Pipeline orchestrator: discover cases, parse, evaluate, and compare."""

from __future__ import annotations

import logging
from pathlib import Path

from bpmn_eval.metrics import ALL_METRICS
from bpmn_eval.metrics.base import Metric
from bpmn_eval.metrics.xml_validity import XmlValidityMetric
from bpmn_eval.models import (
    CaseComparison,
    FileEvaluation,
    GenerationMethod,
    MetricResult,
)
from bpmn_eval.parsing.xml_parser import BpmnParseError, parse_bpmn

logger = logging.getLogger(__name__)


def _make_failed_evaluation(
    source_path: str,
    method: GenerationMethod,
    case_id: str,
    metric_names: list[str],
    reason: str,
) -> FileEvaluation:
    """Create a FileEvaluation with score 0.0 for all metrics (parse failure)."""
    results: dict[str, MetricResult] = {}
    for name in metric_names:
        results[name] = MetricResult(
            metric_name=name,
            passed=False,
            score=0.0,
            details={"error": reason},
        )
    return FileEvaluation(
        source_path=source_path,
        method=method,
        case_id=case_id,
        results=results,
    )


def _evaluate_file(
    file_path: Path,
    method: GenerationMethod,
    case_id: str,
    metrics: list[Metric],
) -> FileEvaluation:
    """Parse one .bpmn file and run all metrics on it."""
    metric_names = [m.name for m in metrics]

    try:
        model = parse_bpmn(file_path, method)
    except BpmnParseError as exc:
        logger.warning("Parse failure for %s: %s", file_path.name, exc)
        return _make_failed_evaluation(
            str(file_path), method, case_id, metric_names, str(exc)
        )

    evaluation = FileEvaluation(
        source_path=str(file_path),
        method=method,
        case_id=case_id,
    )

    for metric in metrics:
        try:
            result = metric.evaluate(model)
        except Exception as exc:
            logger.warning(
                "Metric %s failed on %s: %s", metric.name, file_path.name, exc
            )
            result = MetricResult(
                metric_name=metric.name,
                passed=False,
                score=0.0,
                details={"error": str(exc)},
            )
        evaluation.results[metric.name] = result

    return evaluation


def evaluate_case(
    case_dir: Path,
    metrics: list[Metric] | None = None,
    schema_path: str = "",
) -> CaseComparison:
    """Evaluate a single test case directory.

    The directory must contain ``zero_shot.bpmn`` and ``dsl.bpmn``.
    """
    if metrics is None:
        metrics = _default_metrics(schema_path)

    case_id = case_dir.name
    zs_path = case_dir / "zero_shot.bpmn"
    dsl_path = case_dir / "dsl.bpmn"

    if not zs_path.exists():
        raise FileNotFoundError(f"Missing zero_shot.bpmn in {case_dir}")
    if not dsl_path.exists():
        raise FileNotFoundError(f"Missing dsl.bpmn in {case_dir}")

    zs_eval = _evaluate_file(zs_path, GenerationMethod.ZERO_SHOT, case_id, metrics)
    dsl_eval = _evaluate_file(dsl_path, GenerationMethod.DSL, case_id, metrics)

    return CaseComparison(case_id=case_id, zero_shot=zs_eval, dsl=dsl_eval)


def evaluate_all(
    data_dir: Path,
    metrics: list[Metric] | None = None,
    schema_path: str = "",
) -> list[CaseComparison]:
    """Discover and evaluate all test cases under ``data_dir/cases/``."""
    cases_dir = data_dir / "cases"
    if not cases_dir.is_dir():
        raise FileNotFoundError(f"Cases directory not found: {cases_dir}")

    if metrics is None:
        metrics = _default_metrics(schema_path)

    results: list[CaseComparison] = []
    for case_dir in sorted(cases_dir.iterdir()):
        if not case_dir.is_dir():
            continue
        logger.info("Evaluating case: %s", case_dir.name)
        results.append(evaluate_case(case_dir, metrics, schema_path))

    return results


def _default_metrics(schema_path: str) -> list[Metric]:
    """Instantiate the default set of metrics."""
    instances: list[Metric] = []
    for cls in ALL_METRICS:
        if cls is XmlValidityMetric:
            instances.append(cls(schema_path=schema_path))
        else:
            instances.append(cls())
    return instances
