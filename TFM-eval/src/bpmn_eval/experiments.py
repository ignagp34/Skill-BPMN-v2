"""Per-experiment evaluation bridge.

Connects the tracked experiment folders produced by the tfm-lab app
(``EXP-<process>-<sys>-<provider>-<model>-R<NN>/``) to the metric engine.

Each experiment's generated BPMN (``diagram.bpmn``, or the ``layoutXml`` /
``semanticXml`` embedded in ``result.json``) is scored with the structural
metrics, enriched with parser element counts (plan §5.3), Level-0 feature
coverage (§6.1) and the engine's diagnostic codes (§6.2), and tagged with its
provenance axes — the unit of analysis is one DSL run, aggregated by process /
difficulty / model / provider / system-prompt / process-prompt / run.

The metrics are purely semantic (they read the ``<bpmn:process>`` tree, never
the diagram layout), so evaluation never needs rendering: a run that compiled is
scored from its BPMN; a run that failed to compile is recorded as a failure
(score 0.0), which is itself a result.
"""

from __future__ import annotations

import json
import logging
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from bpmn_eval.metrics.base import Metric
from bpmn_eval.models import BpmnModel, FileEvaluation, GenerationMethod
from bpmn_eval.parsing.counts import count_elements
from bpmn_eval.parsing.xml_parser import BpmnParseError, parse_bpmn
from bpmn_eval.pipeline import (
    _default_metrics,
    _evaluate_file,
    _make_failed_evaluation,
)
from bpmn_eval.semantic.diagnostics import (
    Diagnostic,
    extract_diagnostics,
)
from bpmn_eval.semantic.feature_coverage import (
    FeatureCoverage,
    compute_feature_coverage,
)

logger = logging.getLogger(__name__)

_PROVIDER_LABELS = {
    "CHATGPT": "ChatGPT",
    "GEMINI": "Gemini",
    "CLAUDE": "Claude",
}

# Fallback process → difficulty map (plan §3.1) for app-convention experiments
# that have no run-info.json to read ``difficulty`` from.
_PROCESS_DIFFICULTY: dict[str, str] = {
    "SYN001": "easy", "SYN002": "easy", "SYN003": "easy",
    "SYN004": "medium", "SYN005": "medium", "SYN006": "medium",
    "SYN007": "medium", "SYN008": "medium", "SYN009": "medium",
    "SYN010": "medium", "SYN011": "medium", "SYN012": "medium",
    "SYN013": "hard", "SYN014": "hard", "SYN015": "stress",
}


@dataclass(frozen=True)
class ExperimentAxes:
    """The experiment dimensions used to group results."""

    experiment_id: str
    process_id: str
    system_prompt_version: str
    provider: str
    model_label: str
    run: int
    difficulty: str = ""
    process_prompt_version: str = ""
    representation: str = "dsl"


@dataclass
class ExperimentEvaluation:
    """All metric results for one experiment, plus its provenance and extras."""

    axes: ExperimentAxes
    status: str  # compile status from result.json, or "unknown" / "no_output"
    source: str  # what was scored: "diagram.bpmn", "result.json:layoutXml", ...
    file_eval: FileEvaluation
    metric_names: list[str] = field(default_factory=list)
    # Robustness flags (plan §5.1) read from result.json.metadata.
    parser_valid: bool | None = None
    semantic_valid: bool | None = None
    bpmn_xml_valid: bool | None = None
    bpmn_import_valid: bool | None = None
    render_valid: bool | None = None
    input_system_tokens: int | None = None
    input_process_tokens: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    token_source: str = ""
    elapsed_seconds: float | None = None
    iterations: int | None = None
    postprocessing: list[str] = field(default_factory=list)
    # Parser element counts (plan §5.3); empty when no model was produced.
    counts: dict[str, int] = field(default_factory=dict)
    # Level-0 feature coverage (plan §6.1); None when no expectedFeatures declared.
    expected_features: list[str] = field(default_factory=list)
    feature_coverage: FeatureCoverage | None = None
    # Level-1a engine diagnostics (plan §6.2).
    diagnostics: list[Diagnostic] = field(default_factory=list)


def parse_experiment_id(name: str) -> ExperimentAxes | None:
    """Inverse of the app's ``generateExperimentId``.

    Format: ``EXP-{process}-{sys}-{provider}-{model}-R{NN}``. Every segment is
    normalised to ``[A-Z0-9_]`` by the app, so a plain 6-way split is exact.
    ``difficulty`` and ``process_prompt_version`` are not in the id; they are
    filled from run-info.json / result.json metadata by ``evaluate_experiment``.
    """
    parts = name.split("-")
    if len(parts) != 6 or parts[0] != "EXP":
        return None
    run_token = parts[5]
    if not run_token[:1].upper() == "R":
        return None
    try:
        run = int(run_token[1:])
    except ValueError:
        return None
    return ExperimentAxes(
        experiment_id=name,
        process_id=parts[1],
        system_prompt_version=parts[2],
        provider=_PROVIDER_LABELS.get(parts[3], parts[3]),
        model_label=parts[4],
        run=run,
        representation="zero_shot_xml" if parts[2] == "ZSXML" else "dsl",
    )


def discover_experiments(root: Path) -> list[Path]:
    """Return processed experiment directories under ``root``.

    A directory counts as processed once it has a ``diagram.bpmn`` or a
    ``result.json`` (compiled runs have both; failed runs have only
    ``result.json``). Stubs awaiting output (only ``notes.md``) and raw-only
    folders that have not been through the render step yet are skipped.
    """
    if not root.is_dir():
        raise FileNotFoundError(f"Experiments directory not found: {root}")

    found: list[Path] = []
    for entry in sorted(root.iterdir()):
        if not entry.is_dir() or not entry.name.startswith("EXP-"):
            continue
        if (
            (entry / "diagram.bpmn").exists()
            or (entry / "result.json").exists()
            or ("-ZSXML-" in entry.name and (entry / "output.bpmn").exists())
        ):
            found.append(entry)
    return found


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        # utf-8-sig tolerates the BOM the app sometimes writes.
        parsed = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read %s: %s", path, exc)
        return None
    return parsed if isinstance(parsed, dict) else None


def _read_result_json(case_dir: Path) -> dict[str, Any] | None:
    return _read_json(case_dir / "result.json")


def _read_run_info(case_dir: Path) -> dict[str, Any] | None:
    return _read_json(case_dir / "run-info.json")


def _as_bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None


def _as_int(value: Any) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _as_float(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _enrich_axes(
    base: ExperimentAxes,
    run_info: dict[str, Any] | None,
    metadata: dict[str, Any],
) -> ExperimentAxes:
    """Fill difficulty + process_prompt_version from run-info.json / metadata."""
    run_info = run_info or {}

    difficulty = run_info.get("difficulty")
    if not isinstance(difficulty, str) or not difficulty:
        difficulty = _PROCESS_DIFFICULTY.get(base.process_id, "")

    ppv = run_info.get("processPromptVersion") or metadata.get("processPromptVersion")
    if not isinstance(ppv, str):
        ppv = ""

    spv = base.system_prompt_version
    if not spv:
        candidate = run_info.get("systemPromptVersion") or metadata.get(
            "systemPromptVersion"
        )
        spv = candidate if isinstance(candidate, str) else ""

    representation = run_info.get("representation", base.representation)
    if representation not in {
        "dsl",
        "zero_shot_xml",
        "zero_shot_image",
        "zero_shot_mcp",
    }:
        representation = base.representation

    return ExperimentAxes(
        experiment_id=base.experiment_id,
        process_id=base.process_id,
        system_prompt_version=spv,
        provider=base.provider,
        model_label=base.model_label,
        run=base.run,
        difficulty=difficulty,
        process_prompt_version=ppv,
        representation=representation,
    )


def _resolve_bpmn_source(
    case_dir: Path,
    result: dict[str, Any] | None,
    representation: str,
) -> tuple[str, str] | None:
    """Return (xml_text_or_path, source_label). ``None`` if no BPMN is available.

    Precedence: on-disk diagram.bpmn → result.json layoutXml → semanticXml.
    """
    if representation == "zero_shot_xml":
        raw_output = case_dir / "output.bpmn"
        return (str(raw_output), "output.bpmn") if raw_output.exists() else None

    diagram = case_dir / "diagram.bpmn"
    if diagram.exists():
        return (str(diagram), "diagram.bpmn")
    if result is not None:
        layout_xml = result.get("layoutXml")
        if isinstance(layout_xml, str) and layout_xml.strip():
            return (layout_xml, "result.json:layoutXml")
        semantic_xml = result.get("semanticXml")
        if isinstance(semantic_xml, str) and semantic_xml.strip():
            return (semantic_xml, "result.json:semanticXml")
    return None


def _parse_model(
    payload: str,
    source_label: str,
    method: GenerationMethod,
) -> BpmnModel | None:
    """Parse the resolved BPMN payload into a model for element counting."""
    try:
        if source_label in {"diagram.bpmn", "output.bpmn"}:
            return parse_bpmn(Path(payload), method)
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp) / "diagram.bpmn"
            tmp_path.write_text(payload, encoding="utf-8")
            return parse_bpmn(tmp_path, method)
    except BpmnParseError as exc:
        logger.warning("Count parse failed for %s: %s", source_label, exc)
        return None


def _expected_features(run_info: dict[str, Any] | None) -> list[str]:
    if not run_info:
        return []
    declared = run_info.get("expectedFeatures")
    if not isinstance(declared, list):
        return []
    return [f for f in declared if isinstance(f, str)]


def evaluate_experiment(
    case_dir: Path,
    metrics: list[Metric] | None = None,
    schema_path: str = "",
) -> ExperimentEvaluation:
    """Score a single experiment directory and attach all provenance + extras."""
    if metrics is None:
        metrics = _default_metrics(schema_path)
    metric_names = [m.name for m in metrics]

    axes = parse_experiment_id(case_dir.name)
    if axes is None:
        axes = ExperimentAxes(
            experiment_id=case_dir.name,
            process_id="",
            system_prompt_version="",
            provider="",
            model_label="",
            run=0,
        )

    result = _read_result_json(case_dir)
    run_info = _read_run_info(case_dir)
    metadata = result.get("metadata", {}) if result else {}
    if not isinstance(metadata, dict):
        metadata = {}

    status = "unknown"
    if isinstance(metadata.get("status"), str):
        status = metadata["status"]

    axes = _enrich_axes(axes, run_info, metadata)
    expected_features = _expected_features(run_info)
    diagnostics = extract_diagnostics(result)

    parser_valid = _as_bool(metadata.get("parserValid"))
    semantic_valid = _as_bool(metadata.get("semanticValid"))
    metadata_bpmn_xml_valid = _as_bool(metadata.get("bpmnXmlValid"))
    bpmn_import_valid = _as_bool(metadata.get("bpmnImportValid"))
    render_valid = _as_bool(metadata.get("renderValid"))
    usage_source = run_info or {}
    input_system_tokens = _as_int(usage_source.get("inputSystemTokens"))
    input_process_tokens = _as_int(usage_source.get("inputProcessTokens"))
    input_tokens = _as_int(usage_source.get("inputTokens"))
    output_tokens = _as_int(usage_source.get("outputTokens"))
    total_tokens = _as_int(usage_source.get("totalTokens"))
    token_source_value = usage_source.get("tokenSource")
    token_source = token_source_value if isinstance(token_source_value, str) else ""
    elapsed_seconds = _as_float(usage_source.get("elapsedSeconds"))
    iterations = _as_int(usage_source.get("iterations"))
    run_postprocessing = usage_source.get("postprocessing")
    result_postprocessing = metadata.get("postprocessing")
    postprocessing = []
    for raw_postprocessing in (run_postprocessing, result_postprocessing):
        if not isinstance(raw_postprocessing, list):
            continue
        for item in raw_postprocessing:
            if isinstance(item, str) and item not in postprocessing:
                postprocessing.append(item)
    method = (
        GenerationMethod.ZERO_SHOT_XML
        if axes.representation == "zero_shot_xml"
        else GenerationMethod.DSL
    )

    source = _resolve_bpmn_source(case_dir, result, axes.representation)
    if source is None:
        # A run happened (result.json exists) but produced no BPMN — i.e. the
        # DSL did not compile. Record it as a failure so the failure rate is
        # visible in the aggregates rather than silently dropped.
        file_eval = _make_failed_evaluation(
            str(case_dir),
            method,
            axes.experiment_id,
            metric_names,
            f"no BPMN output (status={status})",
        )
        return ExperimentEvaluation(
            axes=axes,
            status=status if status != "unknown" else "no_output",
            source="none",
            file_eval=file_eval,
            metric_names=metric_names,
            parser_valid=parser_valid,
            semantic_valid=semantic_valid,
            bpmn_xml_valid=metadata_bpmn_xml_valid,
            bpmn_import_valid=bpmn_import_valid,
            render_valid=render_valid,
            input_system_tokens=input_system_tokens,
            input_process_tokens=input_process_tokens,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            token_source=token_source,
            elapsed_seconds=elapsed_seconds,
            iterations=iterations,
            postprocessing=postprocessing,
            counts={},
            expected_features=expected_features,
            feature_coverage=(
                compute_feature_coverage(expected_features, {})
                if expected_features
                else None
            ),
            diagnostics=diagnostics,
        )

    payload, source_label = source
    if source_label in {"diagram.bpmn", "output.bpmn"}:
        file_eval = _evaluate_file(
            Path(payload), method, axes.experiment_id, metrics
        )
    else:
        # XML came from result.json — write to a temp file for the parser.
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp) / "diagram.bpmn"
            tmp_path.write_text(payload, encoding="utf-8")
            file_eval = _evaluate_file(
                tmp_path, method, axes.experiment_id, metrics
            )
        # Keep the reported source path pointing at the experiment, not the temp.
        file_eval = FileEvaluation(
            source_path=str(case_dir / "result.json"),
            method=file_eval.method,
            case_id=file_eval.case_id,
            results=file_eval.results,
        )

    m1 = file_eval.results.get("xml_validity")
    bpmn_xml_valid = (
        m1.score == 1.0
        if m1 is not None
        else metadata_bpmn_xml_valid
    )
    model = _parse_model(payload, source_label, method)
    counts = count_elements(model) if model is not None else {}
    feature_coverage = (
        compute_feature_coverage(expected_features, counts)
        if expected_features
        else None
    )

    return ExperimentEvaluation(
        axes=axes,
        status=status,
        source=source_label,
        file_eval=file_eval,
        metric_names=metric_names,
        parser_valid=parser_valid,
        semantic_valid=semantic_valid,
        bpmn_xml_valid=bpmn_xml_valid,
        bpmn_import_valid=bpmn_import_valid,
        render_valid=render_valid,
        input_system_tokens=input_system_tokens,
        input_process_tokens=input_process_tokens,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        token_source=token_source,
        elapsed_seconds=elapsed_seconds,
        iterations=iterations,
        postprocessing=postprocessing,
        counts=counts,
        expected_features=expected_features,
        feature_coverage=feature_coverage,
        diagnostics=diagnostics,
    )


def evaluate_experiments(
    root: Path,
    metrics: list[Metric] | None = None,
    schema_path: str = "",
) -> list[ExperimentEvaluation]:
    """Discover and evaluate every processed experiment under ``root``."""
    if metrics is None:
        metrics = _default_metrics(schema_path)

    evaluations: list[ExperimentEvaluation] = []
    for case_dir in discover_experiments(root):
        logger.info("Evaluating experiment: %s", case_dir.name)
        evaluations.append(evaluate_experiment(case_dir, metrics, schema_path))
    return evaluations
