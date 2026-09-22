"""Tests for M5 — Label Completeness."""

from __future__ import annotations

import pytest

from bpmn_eval.metrics.label_completeness import LabelCompletenessMetric


def test_fully_labeled(valid_model):
    metric = LabelCompletenessMetric()
    result = metric.evaluate(valid_model)
    assert result.score == 1.0
    assert result.details["unlabeled_elements"] == []


def test_partially_labeled(missing_labels_model):
    metric = LabelCompletenessMetric()
    result = metric.evaluate(missing_labels_model)
    # 4 elements (Start_1, Task_1, Task_2, End_1), only Task_2 has a name
    assert result.score == pytest.approx(0.25)
    assert len(result.details["unlabeled_elements"]) == 3
