"""Tests for per-experiment discovery, evaluation, and aggregation."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from bpmn_eval.experiment_comparison import (
    aggregate,
    flat_record,
    record_fieldnames,
)
from bpmn_eval.experiments import (
    discover_experiments,
    evaluate_experiment,
    parse_experiment_id,
)
from bpmn_eval.metrics.cnc import CncMetric
from bpmn_eval.metrics.control_flow_complexity import ControlFlowComplexityMetric
from bpmn_eval.metrics.cyclicity import CyclicityMetric
from bpmn_eval.metrics.decision_completeness import DecisionCompletenessMetric
from bpmn_eval.metrics.element_degree import ElementDegreeMetric
from bpmn_eval.metrics.gateway_matching import GatewayMatchingMetric
from bpmn_eval.metrics.label_completeness import LabelCompletenessMetric
from bpmn_eval.metrics.size import SizeMetric
from bpmn_eval.metrics.structural_connectedness import StructuralConnectednessMetric

# All default metrics except XmlValidity (which needs the XSD schema dir).
NON_SCHEMA_METRICS = [
    StructuralConnectednessMetric(),
    ElementDegreeMetric(),
    DecisionCompletenessMetric(),
    LabelCompletenessMetric(),
    SizeMetric(),
    ControlFlowComplexityMetric(),
    GatewayMatchingMetric(),
    CncMetric(),
    CyclicityMetric(),
]


def test_parse_experiment_id_roundtrip() -> None:
    axes = parse_experiment_id("EXP-SYN001-SYSV31-CHATGPT-GPT_5_4_THINKING-R01")
    assert axes is not None
    assert axes.process_id == "SYN001"
    assert axes.system_prompt_version == "SYSV31"
    assert axes.provider == "ChatGPT"  # normalised segment mapped to label
    assert axes.model_label == "GPT_5_4_THINKING"
    assert axes.run == 1


def test_parse_experiment_id_model_with_digits() -> None:
    axes = parse_experiment_id("EXP-SYN015-SYSV31-GEMINI-3_1_PRO-R02")
    assert axes is not None
    assert axes.provider == "Gemini"
    assert axes.model_label == "3_1_PRO"
    assert axes.run == 2


def test_parse_zero_shot_xml_experiment_id() -> None:
    axes = parse_experiment_id(
        "EXP-SYN001-ZSXML-CHATGPT-GPT_5_5_THINKING-R01"
    )
    assert axes is not None
    assert axes.representation == "zero_shot_xml"
    assert axes.system_prompt_version == "ZSXML"


def test_parse_experiment_id_invalid() -> None:
    assert parse_experiment_id("not-an-experiment") is None
    assert parse_experiment_id("EXP-too-few-parts-R01") is None
    assert parse_experiment_id("EXP-A-B-C-D-X07") is None  # run token not R-prefixed


def _make_experiment(parent: Path, name: str) -> Path:
    case_dir = parent / name
    case_dir.mkdir(parents=True)
    return case_dir


def test_discover_experiments_skips_stubs(tmp_path: Path, fixtures_dir: Path) -> None:
    with_result = _make_experiment(tmp_path, "EXP-SYN001-SYSV31-CHATGPT-M-R01")
    (with_result / "result.json").write_text("{}", encoding="utf-8")

    with_diagram = _make_experiment(tmp_path, "EXP-SYN002-SYSV31-CLAUDE-M-R01")
    shutil.copy(fixtures_dir / "valid_simple.bpmn", with_diagram / "diagram.bpmn")

    stub = _make_experiment(tmp_path, "EXP-SYN003-SYSV31-GEMINI-M-R01")
    (stub / "notes.md").write_text("pending", encoding="utf-8")

    (tmp_path / "not-an-experiment").mkdir()

    discovered = [d.name for d in discover_experiments(tmp_path)]
    assert discovered == [
        "EXP-SYN001-SYSV31-CHATGPT-M-R01",
        "EXP-SYN002-SYSV31-CLAUDE-M-R01",
    ]


def test_evaluate_experiment_from_diagram(tmp_path: Path, fixtures_dir: Path) -> None:
    name = "EXP-SYN001-SYSV31-CHATGPT-GPT_5_4_THINKING-R01"
    case_dir = _make_experiment(tmp_path, name)
    shutil.copy(fixtures_dir / "valid_simple.bpmn", case_dir / "diagram.bpmn")
    (case_dir / "result.json").write_text(
        json.dumps({"metadata": {"status": "success"}}), encoding="utf-8"
    )

    ev = evaluate_experiment(case_dir, metrics=NON_SCHEMA_METRICS)

    assert ev.status == "success"
    assert ev.source == "diagram.bpmn"
    assert ev.axes.model_label == "GPT_5_4_THINKING"
    assert set(ev.file_eval.results) == {m.name for m in NON_SCHEMA_METRICS}
    assert ev.file_eval.results["structural_connectedness"].score == 1.0
    # Descriptive size value flows through to the flat record.
    record = flat_record(ev)
    assert isinstance(record["tnn"], int) and record["tnn"] > 0


def test_evaluate_experiment_from_result_json_xml(
    tmp_path: Path, fixtures_dir: Path
) -> None:
    case_dir = _make_experiment(tmp_path, "EXP-SYN001-SYSV31-CHATGPT-M-R01")
    layout_xml = (fixtures_dir / "valid_simple.bpmn").read_text(encoding="utf-8")
    (case_dir / "result.json").write_text(
        json.dumps(
            {"metadata": {"status": "success_with_warnings"}, "layoutXml": layout_xml}
        ),
        encoding="utf-8",
    )

    ev = evaluate_experiment(case_dir, metrics=NON_SCHEMA_METRICS)

    assert ev.source == "result.json:layoutXml"
    assert ev.status == "success_with_warnings"
    assert ev.file_eval.results["structural_connectedness"].score == 1.0


def test_evaluate_experiment_failed_run_records_zeros(tmp_path: Path) -> None:
    case_dir = _make_experiment(tmp_path, "EXP-SYN015-SYSV31-GEMINI-3_1_PRO-R01")
    (case_dir / "result.json").write_text(
        json.dumps({"metadata": {"status": "semantic_error"}}), encoding="utf-8"
    )

    ev = evaluate_experiment(case_dir, metrics=NON_SCHEMA_METRICS)

    assert ev.status == "semantic_error"
    assert ev.source == "none"
    assert all(result.score == 0.0 for result in ev.file_eval.results.values())


def test_flat_record_has_all_columns(tmp_path: Path, fixtures_dir: Path) -> None:
    case_dir = _make_experiment(tmp_path, "EXP-SYN001-SYSV31-CHATGPT-M-R01")
    shutil.copy(fixtures_dir / "valid_simple.bpmn", case_dir / "diagram.bpmn")
    ev = evaluate_experiment(case_dir, metrics=NON_SCHEMA_METRICS)
    record = flat_record(ev)
    assert set(record) == set(record_fieldnames())


def test_aggregate_by_model_label(tmp_path: Path, fixtures_dir: Path) -> None:
    ok_dir = _make_experiment(tmp_path, "EXP-SYN001-SYSV31-GEMINI-3_1_PRO-R01")
    shutil.copy(fixtures_dir / "valid_simple.bpmn", ok_dir / "diagram.bpmn")
    (ok_dir / "result.json").write_text(
        json.dumps({"metadata": {"status": "success"}}), encoding="utf-8"
    )
    bad_dir = _make_experiment(tmp_path, "EXP-SYN002-SYSV31-GEMINI-3_1_PRO-R01")
    (bad_dir / "result.json").write_text(
        json.dumps({"metadata": {"status": "semantic_error"}}), encoding="utf-8"
    )

    evals = [
        evaluate_experiment(ok_dir, metrics=NON_SCHEMA_METRICS),
        evaluate_experiment(bad_dir, metrics=NON_SCHEMA_METRICS),
    ]
    groups = aggregate(evals, "model_label")

    assert len(groups) == 1
    group = groups[0]
    assert group.group_value == "3_1_PRO"
    assert group.n == 2
    assert group.n_success == 1
    assert group.success_rate == 0.5
    # The failed run drags the connectedness mean to 0.5 (1.0 + 0.0) / 2.
    assert group.mean_scores["structural_connectedness"] == 0.5


def test_zero_shot_xml_scores_raw_output_not_rendered_diagram(
    tmp_path: Path,
    fixtures_dir: Path,
    schema_path: Path,
) -> None:
    case_dir = _make_experiment(
        tmp_path,
        "EXP-SYN001-ZSXML-CHATGPT-GPT_5_5_THINKING-R01",
    )
    raw_fixture = fixtures_dir / "zero_shot_xml" / "broken_references.bpmn"
    shutil.copy(raw_fixture, case_dir / "output.bpmn")
    shutil.copy(
        fixtures_dir / "zero_shot_xml" / "valid_with_di.bpmn",
        case_dir / "diagram.bpmn",
    )
    (case_dir / "run-info.json").write_text(
        json.dumps(
            {
                "representation": "zero_shot_xml",
                "expectedFeatures": ["tasks", "start_end_events"],
                "inputSystemTokens": 25,
                "inputProcessTokens": 75,
                "inputTokens": None,
                "outputTokens": 100,
                "totalTokens": None,
                "tokenSource": "tiktoken_o200k_base_estimate",
                "elapsedSeconds": 3.5,
                "iterations": 1,
                "postprocessing": [],
            }
        ),
        encoding="utf-8",
    )
    (case_dir / "result.json").write_text(
        json.dumps(
            {
                "metadata": {
                    "status": "success",
                    "bpmnXmlValid": True,
                    "bpmnImportValid": True,
                    "renderValid": True,
                    "postprocessing": ["bpmn-auto-layout:render_only"],
                }
            }
        ),
        encoding="utf-8",
    )

    evaluation = evaluate_experiment(
        case_dir,
        schema_path=str(schema_path),
    )
    record = flat_record(evaluation)

    assert evaluation.source == "output.bpmn"
    assert evaluation.file_eval.method.value == "zero_shot_xml"
    assert evaluation.file_eval.results["structural_connectedness"].score < 1.0
    assert record["representation"] == "zero_shot_xml"
    assert record["input_system_tokens"] == 25
    assert record["input_process_tokens"] == 75
    assert record["output_tokens"] == 100
    assert record["token_source"] == "tiktoken_o200k_base_estimate"
    assert record["elapsed_seconds"] == 3.5
    assert record["postprocessing"] == "bpmn-auto-layout:render_only"
    assert record["semantic_success"] == 1
