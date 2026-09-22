"""Tests for offline fixed-encoding usage estimation."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
import tiktoken

from bpmn_eval.usage import (
    TOKEN_SOURCE,
    UsageComputationError,
    compute_all_usage,
    resolve_system_prompt,
)


def _tokens(text: str) -> int:
    return len(tiktoken.get_encoding("o200k_base").encode(text))


def test_usage_components_prompt_resolution_and_idempotence(
    tmp_path: Path,
    fixtures_dir: Path,
) -> None:
    fixture = fixtures_dir / "usage"
    experiments = tmp_path / "experiments"
    prompts = tmp_path / "system"
    shutil.copytree(fixture / "experiments", experiments)
    shutil.copytree(fixture / "system", prompts)
    pending = experiments / "EXP-SYN003-SYSV31-CHATGPT-TINY-R01"
    pending.mkdir()
    (pending / "run-info.json").write_text(
        json.dumps(
            {
                "representation": "dsl",
                "systemPromptVersion": "SYSV31",
                "status": "pending",
            }
        ),
        encoding="utf-8",
    )

    first = compute_all_usage(experiments, prompts)
    assert len(first) == 2

    for case_dir, estimate in first:
        run_info_path = case_dir / "run-info.json"
        run_info = json.loads(run_info_path.read_text(encoding="utf-8"))
        representation = run_info["representation"]
        version = run_info["systemPromptVersion"]
        prompt_path = resolve_system_prompt(representation, version, prompts)
        output_name = "output.dsl" if representation == "dsl" else "output.bpmn"
        system_text = prompt_path.read_text(encoding="utf-8")
        full_input = (case_dir / "input.md").read_text(encoding="utf-8")
        process_text = full_input.replace(system_text, "", 1)
        output_text = (case_dir / output_name).read_text(encoding="utf-8")

        assert estimate.input_system_tokens == _tokens(system_text)
        assert estimate.input_process_tokens == _tokens(process_text)
        assert estimate.input_tokens == (
            estimate.input_system_tokens + estimate.input_process_tokens
        )
        assert estimate.output_tokens == _tokens(output_text)
        assert estimate.total_tokens == (
            estimate.input_tokens + estimate.output_tokens
        )
        assert run_info["inputSystemTokens"] == estimate.input_system_tokens
        assert run_info["inputProcessTokens"] == estimate.input_process_tokens
        assert run_info["inputTokens"] == estimate.input_tokens
        assert run_info["outputTokens"] == estimate.output_tokens
        assert run_info["totalTokens"] == estimate.total_tokens
        assert run_info["tokenSource"] == TOKEN_SOURCE
        assert run_info["notes"].startswith("preserve me")

    snapshots = {
        path: path.read_bytes()
        for path in experiments.glob("EXP-*/run-info.json")
    }
    second = compute_all_usage(experiments, prompts)
    assert [estimate for _path, estimate in second] == [
        estimate for _path, estimate in first
    ]
    assert snapshots == {
        path: path.read_bytes()
        for path in experiments.glob("EXP-*/run-info.json")
    }


def test_unresolved_system_prompt_fails_before_writes(
    tmp_path: Path,
    fixtures_dir: Path,
) -> None:
    fixture = fixtures_dir / "usage"
    experiments = tmp_path / "experiments"
    prompts = tmp_path / "system"
    shutil.copytree(fixture / "experiments", experiments)
    shutil.copytree(fixture / "system", prompts)
    bad_info = experiments / (
        "EXP-SYN002-ZSXML-CHATGPT-TINY-R01/run-info.json"
    )
    payload = json.loads(bad_info.read_text(encoding="utf-8"))
    payload["systemPromptVersion"] = "UNKNOWN"
    bad_info.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    good_info = experiments / (
        "EXP-SYN001-SYSV31-CHATGPT-TINY-R01/run-info.json"
    )
    before = good_info.read_bytes()

    with pytest.raises(UsageComputationError, match="No system-prompt mapping"):
        compute_all_usage(experiments, prompts)

    assert good_info.read_bytes() == before
