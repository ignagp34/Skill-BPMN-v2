"""Tests for representation-aware comparative outputs."""

from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

from bpmn_eval.experiments import evaluate_experiment
from bpmn_eval.reporting.comparative import (
    comparative_rows,
    write_comparative_report,
)


def _experiment(
    root: Path,
    name: str,
    representation: str,
    fixture: Path,
) -> Path:
    case_dir = root / name
    case_dir.mkdir()
    target = "output.bpmn" if representation == "zero_shot_xml" else "diagram.bpmn"
    shutil.copy(fixture, case_dir / target)
    metadata = {
        "status": "success",
        "renderValid": True,
        "bpmnImportValid": True,
    }
    if representation == "dsl":
        metadata.update({"parserValid": True, "semanticValid": True})
    else:
        metadata["bpmnXmlValid"] = True
    (case_dir / "result.json").write_text(
        json.dumps({"metadata": metadata}),
        encoding="utf-8",
    )
    (case_dir / "run-info.json").write_text(
        json.dumps(
            {
                "representation": representation,
                "difficulty": "easy",
                "expectedFeatures": ["tasks"],
                "inputSystemTokens": 20,
                "inputProcessTokens": 30,
                "inputTokens": 50,
                "outputTokens": 50,
                "totalTokens": 100,
                "tokenSource": "tiktoken_o200k_base_estimate",
            }
        ),
        encoding="utf-8",
    )
    return case_dir


def test_comparative_report_groups_by_representation(
    tmp_path: Path,
    fixtures_dir: Path,
    schema_path: Path,
) -> None:
    fixture = fixtures_dir / "zero_shot_xml" / "valid_with_di.bpmn"
    dsl = _experiment(
        tmp_path,
        "EXP-SYN001-SYSV31-CHATGPT-MODEL-R01",
        "dsl",
        fixture,
    )
    zero = _experiment(
        tmp_path,
        "EXP-SYN001-ZSXML-CHATGPT-MODEL-R02",
        "zero_shot_xml",
        fixture,
    )
    evaluations = [
        evaluate_experiment(dsl, schema_path=str(schema_path)),
        evaluate_experiment(zero, schema_path=str(schema_path)),
    ]

    rows = comparative_rows(evaluations, "difficulty")
    assert {row["representation"] for row in rows} == {
        "dsl",
        "zero_shot_xml",
    }

    output = tmp_path / "report"
    write_comparative_report(evaluations, output)
    with (output / "comparative_by_difficulty.csv").open(
        encoding="utf-8"
    ) as handle:
        written = list(csv.DictReader(handle))
    assert len(written) == 2
    assert written[0]["input_system_tokens"] == "20.0"
    assert written[0]["input_process_tokens"] == "30.0"
    assert written[0]["token_source"] == "tiktoken_o200k_base_estimate"
    assert (output / "figures" / "dsl_vs_zero_shot_by_model.svg").exists()
    assert (output / "comparative_report.md").exists()


def test_penalized_score_and_prompt_version_grouping(
    tmp_path: Path,
    fixtures_dir: Path,
    schema_path: Path,
) -> None:
    fixture = fixtures_dir / "zero_shot_xml" / "valid_with_di.bpmn"
    ok = _experiment(
        tmp_path, "EXP-SYN001-SYSV31-CHATGPT-MODEL-R01", "dsl", fixture
    )
    # A zero-shot run that did NOT reach semantic success: the raw output.bpmn is
    # not valid BPMN-XML, so Python M1 scores it invalid (bpmn_xml_valid=False).
    bad = tmp_path / "EXP-SYN002-ZSXML-CHATGPT-MODEL-R01"
    bad.mkdir()
    (bad / "output.bpmn").write_text(
        '<?xml version="1.0"?><root><not-bpmn/></root>', encoding="utf-8"
    )
    (bad / "result.json").write_text(
        json.dumps(
            {
                "metadata": {
                    "status": "bpmn_xml_error",
                    "renderValid": True,
                    "bpmnImportValid": True,
                }
            }
        ),
        encoding="utf-8",
    )
    (bad / "run-info.json").write_text(
        json.dumps(
            {
                "representation": "zero_shot_xml",
                "difficulty": "stress",
                "expectedFeatures": ["tasks"],
            }
        ),
        encoding="utf-8",
    )
    evaluations = [
        evaluate_experiment(ok, schema_path=str(schema_path)),
        evaluate_experiment(bad, schema_path=str(schema_path)),
    ]

    # Composite grouping (RQ5): "model / version".
    rows = comparative_rows(evaluations, ("model_label", "system_prompt_version"))
    assert any(" / " in row["group"] for row in rows)

    # Failed zero-shot run: conditional score may be high, penalized must be 0.
    zs = next(r for r in rows if r["representation"] == "zero_shot_xml")
    assert "scored_mean_penalized" in zs
    assert zs["scored_mean_penalized"] == 0.0

    output = tmp_path / "report"
    write_comparative_report(evaluations, output)
    assert (output / "comparative_by_prompt_version.csv").exists()
    assert (output / "comparative_by_model_prompt.csv").exists()
