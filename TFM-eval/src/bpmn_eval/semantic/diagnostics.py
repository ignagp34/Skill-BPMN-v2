"""Level 1a — behavioural-validity taxonomy (plan §6.2).

The tfm-lab engine already runs a graph-validation pass whose diagnostic codes
cover *structural* soundness (reachability, dead ends, isolated nodes, broken
references, fragment-anchor AP-7, start/end normalisation, layout crashes).  This
module harvests those codes from each ``result.json`` and aggregates them by an
experiment axis — read + tabulate, no new BPMN analysis.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any

# result.json keys whose entries carry a diagnostic ``code``.  ``diagnostics``
# is the unified stream; the others are kept for runs whose JSON predates it.
_CODE_LISTS: tuple[str, ...] = (
    "diagnostics",
    "parserErrors",
    "semanticErrors",
    "semanticWarnings",
    "renderErrors",
)

_ERROR_SEVERITIES = frozenset({"error", "fatal"})
_WARNING_SEVERITIES = frozenset({"warning"})


@dataclass(frozen=True)
class Diagnostic:
    """One diagnostic emitted by the engine for a single experiment."""

    code: str
    severity: str


def extract_diagnostics(result: dict[str, Any] | None) -> list[Diagnostic]:
    """Pull (code, severity) pairs out of a ``result.json`` payload.

    Prefers the unified ``diagnostics`` stream; falls back to the typed error /
    warning lists when ``diagnostics`` is absent, so older runs still report.
    """
    if not result:
        return []

    entries = result.get("diagnostics")
    if isinstance(entries, list) and entries:
        return _collect(entries, default_severity="info")

    found: list[Diagnostic] = []
    for key in _CODE_LISTS[1:]:
        items = result.get(key)
        if not isinstance(items, list):
            continue
        default = "warning" if key == "semanticWarnings" else "error"
        found.extend(_collect(items, default_severity=default))
    return found


def _collect(items: list[Any], default_severity: str) -> list[Diagnostic]:
    out: list[Diagnostic] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        code = item.get("code")
        if not isinstance(code, str) or not code:
            continue
        severity = item.get("severity")
        out.append(
            Diagnostic(
                code=code,
                severity=severity if isinstance(severity, str) else default_severity,
            )
        )
    return out


def count_by_severity(diagnostics: list[Diagnostic]) -> tuple[int, int]:
    """Return ``(n_errors, n_warnings)`` for a list of diagnostics."""
    errors = sum(1 for d in diagnostics if d.severity in _ERROR_SEVERITIES)
    warnings = sum(1 for d in diagnostics if d.severity in _WARNING_SEVERITIES)
    return errors, warnings


def unique_codes(diagnostics: list[Diagnostic]) -> list[str]:
    """Sorted, de-duplicated diagnostic codes (compact CSV cell)."""
    return sorted({d.code for d in diagnostics})


def code_histogram(diagnostics: list[Diagnostic]) -> dict[str, int]:
    """Code → occurrence count for one collection of diagnostics."""
    return dict(Counter(d.code for d in diagnostics))
