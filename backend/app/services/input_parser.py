"""
Classify and normalise user input into a typed ParsedInput.

Supports:
  - arXiv IDs  (1706.03762, 2301.12345v2)
  - arXiv URLs (arxiv.org/abs/..., arxiv.org/pdf/...)
  - DOIs       (10.1145/3292500, doi.org/10.x/y, https://doi.org/...)
  - DOI URLs   (any dx.doi.org/... or doi.org/...)
  - Semantic Scholar paper URLs
  - Plain title strings (fallback)
"""

import re
from app.models.api import ParsedInput
from app.utils.exceptions import InputParseError


# arXiv ID: YYMM.NNNNN[vN] — new format, or ARCHIVE/NNNNNN — old format
_ARXIV_ID_RE = re.compile(
    r"^(?:(?:cs|math|physics|stat|q-bio|q-fin|econ|eess|nlin)\.\w+/)?\d{4}\.\d{4,5}(?:v\d+)?$",
    re.IGNORECASE,
)
_ARXIV_OLD_RE = re.compile(r"^[a-z\-]+/\d{7}$", re.IGNORECASE)

# arXiv URL
_ARXIV_URL_RE = re.compile(
    r"arxiv\.org/(?:abs|pdf|e-print)/([^\s/?#]+?)(?:\.pdf)?(?:\?.*)?$",
    re.IGNORECASE,
)

# DOI bare (starts with 10.)
_DOI_BARE_RE = re.compile(r"^(10\.\d{4,9}/[^\s]+)$")

# DOI embedded in a URL (doi.org/... or dx.doi.org/...)
_DOI_URL_RE = re.compile(
    r"(?:https?://)?(?:dx\.)?doi\.org/(10\.\d{4,9}/[^\s?#]+)",
    re.IGNORECASE,
)

# Semantic Scholar paper URL
_SS_URL_RE = re.compile(
    r"semanticscholar\.org/paper/(?:[^/]+/)?([a-f0-9]{40}|[a-zA-Z0-9]+)(?:/|$)",
    re.IGNORECASE,
)


def parse_input(raw: str) -> ParsedInput:
    """
    Classify raw user input and return a ParsedInput with type and cleaned value.

    Raises InputParseError if input is blank.
    """
    query = raw.strip()
    if not query:
        raise InputParseError("Input must not be empty.")
    if len(query) > 500:
        raise InputParseError("Input too long — maximum 500 characters.")

    # --- arXiv URL ----------------------------------------------------------
    m = _ARXIV_URL_RE.search(query)
    if m:
        arxiv_id = _clean_arxiv_id(m.group(1))
        return ParsedInput(raw=raw, input_type="arxiv_url", value=arxiv_id)

    # --- DOI URL ------------------------------------------------------------
    m = _DOI_URL_RE.search(query)
    if m:
        return ParsedInput(raw=raw, input_type="doi_url", value=m.group(1))

    # --- Semantic Scholar URL -----------------------------------------------
    m = _SS_URL_RE.search(query)
    if m:
        return ParsedInput(raw=raw, input_type="semantic_scholar_url", value=m.group(1))

    # --- Bare arXiv ID ------------------------------------------------------
    # Handle paths like "cs.LG/9912.01234" or trailing slashes
    clean = query.strip("/").split("/")[-1]
    if _ARXIV_ID_RE.match(query) or _ARXIV_OLD_RE.match(query):
        return ParsedInput(raw=raw, input_type="arxiv_id", value=_clean_arxiv_id(query))
    # Also try matching the clean (path-tail) version for inputs like "/abs/1706.03762"
    if _ARXIV_ID_RE.match(clean) or _ARXIV_OLD_RE.match(clean):
        return ParsedInput(raw=raw, input_type="arxiv_id", value=_clean_arxiv_id(clean))

    # --- Bare DOI -----------------------------------------------------------
    m = _DOI_BARE_RE.match(query)
    if m:
        return ParsedInput(raw=raw, input_type="doi", value=m.group(1))

    # --- Fallback: treat as paper title ------------------------------------
    return ParsedInput(raw=raw, input_type="title", value=query)


def _clean_arxiv_id(raw_id: str) -> str:
    """Strip version suffix and whitespace from an arXiv ID."""
    # Remove trailing version like v1, v2
    return re.sub(r"v\d+$", "", raw_id.strip())
