"""Metric protocol — the contract every evaluation metric must satisfy."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from bpmn_eval.models import BpmnModel, MetricResult


@runtime_checkable
class Metric(Protocol):
    """Structural-subtyping contract for evaluation metrics.

    Each metric has a machine-readable ``name``, a human-readable
    ``description``, and an ``evaluate`` method that produces a
    ``MetricResult`` from a parsed ``BpmnModel``.
    """

    name: str
    description: str

    def evaluate(self, model: BpmnModel) -> MetricResult: ...
