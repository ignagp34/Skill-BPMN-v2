"""Parse .bpmn XML files into the internal BpmnModel representation."""

from __future__ import annotations

from pathlib import Path

from lxml import etree

from bpmn_eval.models import BpmnModel, GenerationMethod
from bpmn_eval.parsing.namespaces import BPMN_NS, detect_bpmn_namespace


class BpmnParseError(Exception):
    """Raised when a .bpmn file cannot be parsed as XML."""


def parse_bpmn(file_path: str | Path, method: GenerationMethod) -> BpmnModel:
    """Parse a .bpmn XML file into a BpmnModel.

    Raises:
        BpmnParseError: If the file is not well-formed XML.
    """
    path = Path(file_path)
    try:
        tree = etree.parse(str(path))
    except etree.XMLSyntaxError as exc:
        raise BpmnParseError(f"Malformed XML in {path.name}: {exc}") from exc

    root = tree.getroot()
    ns = detect_bpmn_namespace(root) or BPMN_NS

    processes = root.findall(f"{{{ns}}}process")

    # Build element index: every descendant with an id attribute
    elements: dict[str, etree._Element] = {}
    for elem in root.iter():
        elem_id = elem.get("id")
        if elem_id is not None:
            elements[elem_id] = elem

    # Collect all sequence flows (may live inside <process> elements)
    sequence_flows: list[etree._Element] = []
    for proc in processes:
        sequence_flows.extend(proc.findall(f"{{{ns}}}sequenceFlow"))

    return BpmnModel(
        source_path=str(path),
        method=method,
        tree=tree,
        root=root,
        processes=processes,
        elements=elements,
        sequence_flows=sequence_flows,
    )
