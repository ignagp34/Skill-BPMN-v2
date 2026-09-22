"""Offline token-usage estimation for tracked experiment artifacts."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import tiktoken

ENCODING_NAME = "o200k_base"
TOKEN_SOURCE = "tiktoken_o200k_base_estimate"

PROMPT_FILES: dict[tuple[str, str], str] = {
    ("dsl", "SYSV31"): "bpmn_sketch_miner_system_prompt_v3_1.md",
    ("dsl", "SYSV4"): "bpmn_sketch_miner_system_prompt_v4.md",
    ("dsl", "SYSV41"): "bpmn_sketch_miner_system_prompt_v4_1.md",
    ("dsl", "SYSV5"): "bpmn_sketch_miner_system_prompt_v5.md",
    ("zero_shot_xml", "ZSXML"): "zero_shot_xml_system_prompt.md",
}


class UsageComputationError(RuntimeError):
    """Raised when an experiment cannot be tokenized without guessing."""


@dataclass(frozen=True)
class UsageEstimate:
    input_system_tokens: int
    input_process_tokens: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    token_source: str = TOKEN_SOURCE


def _read_json_object(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise UsageComputationError(f"Missing run-info.json: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise UsageComputationError(f"Could not read {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise UsageComputationError(f"run-info.json must contain an object: {path}")
    return value


def _required_string(run_info: dict[str, Any], field: str, path: Path) -> str:
    value = run_info.get(field)
    if not isinstance(value, str) or not value:
        raise UsageComputationError(f"{path} must contain non-empty {field!r}")
    return value


def _run_axes(case_dir: Path, run_info: dict[str, Any]) -> tuple[str, str]:
    """Read axes from run-info, with EXP-id fallback for legacy DSL records."""
    parts = case_dir.name.split("-")
    id_version = parts[2] if len(parts) == 6 and parts[0] == "EXP" else ""
    version_value = run_info.get("systemPromptVersion")
    version = version_value if isinstance(version_value, str) else id_version
    if not version:
        raise UsageComputationError(
            f"{case_dir / 'run-info.json'} has no systemPromptVersion "
            "and its EXP id cannot supply one"
        )

    representation_value = run_info.get("representation")
    if isinstance(representation_value, str) and representation_value:
        representation = representation_value
    elif version == "ZSXML":
        representation = "zero_shot_xml"
    elif version.startswith("SYSV"):
        representation = "dsl"
    else:
        raise UsageComputationError(
            f"{case_dir / 'run-info.json'} has no representation and "
            f"version {version!r} is not a recognized legacy convention"
        )
    return representation, version


def resolve_system_prompt(
    representation: str,
    system_prompt_version: str,
    system_prompts_dir: Path,
) -> Path:
    """Resolve a run's prompt through the explicit representation/version map."""
    key = (representation, system_prompt_version)
    filename = PROMPT_FILES.get(key)
    if filename is None:
        raise UsageComputationError(
            "No system-prompt mapping for "
            f"representation={representation!r}, "
            f"systemPromptVersion={system_prompt_version!r}"
        )
    prompt_path = system_prompts_dir / filename
    if not prompt_path.is_file():
        raise UsageComputationError(
            f"Resolved system prompt does not exist for {key}: {prompt_path}"
        )
    return prompt_path


def _raw_output_path(case_dir: Path, representation: str) -> Path:
    if representation == "dsl":
        path = case_dir / "output.dsl"
    elif representation == "zero_shot_xml":
        path = case_dir / "output.bpmn"
    else:
        raise UsageComputationError(
            f"Unsupported representation {representation!r} in {case_dir}"
        )
    if not path.is_file():
        raise UsageComputationError(
            f"Missing raw model output for {representation!r}: {path}"
        )
    return path


def _process_input_text(input_text: str, system_prompt: str, input_path: Path) -> str:
    """Remove one embedded prompt copy; otherwise treat input.md as process-only."""
    occurrences = input_text.count(system_prompt)
    if occurrences > 1:
        raise UsageComputationError(
            f"System prompt occurs {occurrences} times in {input_path}; "
            "cannot separate input components safely"
        )
    if occurrences == 1:
        return input_text.replace(system_prompt, "", 1)
    if "SYSTEM PROMPT:" in input_text:
        process_marker = "PROCESS PROMPT:"
        system_start = input_text.find("SYSTEM PROMPT:") + len("SYSTEM PROMPT:")
        process_start = input_text.find(process_marker, system_start)
        if process_start < 0:
            raise UsageComputationError(
                f"{input_path} has SYSTEM PROMPT: without PROCESS PROMPT:"
            )
        return input_text[:system_start] + input_text[process_start:]
    return input_text


def estimate_experiment_usage(
    case_dir: Path,
    system_prompts_dir: Path,
) -> UsageEstimate:
    """Compute the fixed-encoding estimate for one EXP folder."""
    run_info_path = case_dir / "run-info.json"
    run_info = _read_json_object(run_info_path)
    representation, version = _run_axes(case_dir, run_info)
    prompt_path = resolve_system_prompt(
        representation,
        version,
        system_prompts_dir,
    )
    input_path = case_dir / "input.md"
    if not input_path.is_file():
        raise UsageComputationError(f"Missing process input: {input_path}")
    output_path = _raw_output_path(case_dir, representation)

    system_text = prompt_path.read_text(encoding="utf-8-sig")
    input_text = input_path.read_text(encoding="utf-8-sig")
    process_text = _process_input_text(input_text, system_text, input_path)
    output_text = output_path.read_text(encoding="utf-8-sig")
    encoding = tiktoken.get_encoding(ENCODING_NAME)

    system_tokens = len(encoding.encode(system_text))
    process_tokens = len(encoding.encode(process_text))
    output_tokens = len(encoding.encode(output_text))
    input_tokens = system_tokens + process_tokens
    return UsageEstimate(
        input_system_tokens=system_tokens,
        input_process_tokens=process_tokens,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
    )


def update_experiment_usage(
    case_dir: Path,
    system_prompts_dir: Path,
) -> UsageEstimate:
    """Update only token-related run-info fields and preserve manual usage fields."""
    run_info_path = case_dir / "run-info.json"
    run_info = _read_json_object(run_info_path)
    estimate = estimate_experiment_usage(case_dir, system_prompts_dir)
    run_info.update(
        {
            "inputSystemTokens": estimate.input_system_tokens,
            "inputProcessTokens": estimate.input_process_tokens,
            "inputTokens": estimate.input_tokens,
            "outputTokens": estimate.output_tokens,
            "totalTokens": estimate.total_tokens,
            "tokenSource": estimate.token_source,
        }
    )
    run_info_path.write_text(
        json.dumps(run_info, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return estimate


def compute_all_usage(
    experiments_dir: Path,
    system_prompts_dir: Path,
) -> list[tuple[Path, UsageEstimate]]:
    """Update every EXP folder, aborting immediately when any run is ambiguous."""
    if not experiments_dir.is_dir():
        raise FileNotFoundError(
            f"Experiments directory not found: {experiments_dir}"
        )
    case_dirs = [
        case_dir
        for case_dir in sorted(experiments_dir.glob("EXP-*"))
        if (
            case_dir.is_dir()
            and (case_dir / "run-info.json").is_file()
            and (
                (case_dir / "output.dsl").is_file()
                or (case_dir / "output.bpmn").is_file()
            )
        )
    ]
    # Resolve and tokenize the full corpus first. A bad mapping/artifact causes
    # a loud failure without leaving a partially updated experiment tree.
    results = [
        (case_dir, estimate_experiment_usage(case_dir, system_prompts_dir))
        for case_dir in case_dirs
    ]
    for case_dir, _estimate in results:
        update_experiment_usage(case_dir, system_prompts_dir)
    return results
