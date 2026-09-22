"""M1 — BPMN-XML Validity: strict XSD schema validation."""

from __future__ import annotations

from dataclasses import dataclass, field

from lxml import etree

from bpmn_eval.models import BpmnModel, MetricResult


@dataclass
class XmlValidityMetric:
    """Validates a BPMN XML tree against the official BPMN 2.0 XSD schema.

    The compiled ``etree.XMLSchema`` can be injected via *schema* to avoid
    re-parsing the XSD on every call.  If not provided, it is built from
    *schema_path* on first use and cached for subsequent calls.
    """

    name: str = "xml_validity"
    description: str = "Strict compliance with the BPMN 2.0 XSD schema"
    schema_path: str = ""
    schema: etree.XMLSchema | None = field(default=None, repr=False)

    def _get_schema(self) -> etree.XMLSchema:
        if self.schema is not None:
            return self.schema
        if not self.schema_path:
            raise ValueError(
                "XmlValidityMetric requires either a pre-compiled schema "
                "or a schema_path pointing to BPMN20.xsd"
            )
        schema_doc = etree.parse(self.schema_path)
        self.schema = etree.XMLSchema(schema_doc)
        return self.schema

    def evaluate(self, model: BpmnModel) -> MetricResult:
        xsd = self._get_schema()
        is_valid = xsd.validate(model.tree)
        errors: list[str] = []
        if not is_valid:
            log = xsd.error_log
            errors = [
                str(e)
                for e in log  # type: ignore[attr-defined]
            ]
        return MetricResult(
            metric_name=self.name,
            passed=is_valid,
            score=1.0 if is_valid else 0.0,
            details={"validation_errors": errors},
        )
