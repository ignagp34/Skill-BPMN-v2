"""BPMN 2.0 XML namespace constants and helpers.

LLMs are inconsistent with namespace prefixes (bpmn:, bpmn2:, default ns,
or even wrong URIs). This module centralises namespace handling so the rest
of the codebase never hardcodes Clark-notation strings.
"""

from __future__ import annotations

from lxml import etree

BPMN_NS = "http://www.omg.org/spec/BPMN/20100524/MODEL"
BPMNDI_NS = "http://www.omg.org/spec/BPMN/20100524/DI"

NSMAP: dict[str, str] = {
    "bpmn": BPMN_NS,
    "bpmndi": BPMNDI_NS,
}


def bpmn_tag(local_name: str) -> str:
    """Return the fully-qualified Clark-notation tag for a BPMN element.

    Example: bpmn_tag("task") → "{http://www.omg.org/spec/BPMN/20100524/MODEL}task"
    """
    return f"{{{BPMN_NS}}}{local_name}"


def detect_bpmn_namespace(root: etree._Element) -> str | None:
    """Detect the BPMN model namespace URI used in the document.

    LLMs sometimes use non-standard namespace URIs.  This function checks the
    root element's namespace map for a URI containing the canonical substring
    and returns the first match, or None if nothing resembles BPMN.
    """
    canonical_substring = "omg.org/spec/BPMN"
    # Check the root element's own namespace first
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0].lstrip("{")
        if canonical_substring in ns:
            return ns
    # Fall back to the declared namespace map
    for uri in root.nsmap.values():
        if isinstance(uri, str) and canonical_substring in uri:
            return uri
    return None


def make_find(ns: str) -> callable:  # type: ignore[valid-type]
    """Return a helper that builds XPath-style tag selectors for a given ns.

    Usage::

        f = make_find(detected_ns)
        root.findall(f("process"))   # finds all <process> in the detected ns
    """

    def _find(local_name: str) -> str:
        return f"{{{ns}}}{local_name}"

    return _find
