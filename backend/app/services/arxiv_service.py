"""
arXiv API integration (metadata enrichment only).

Used when we have an arXiv ID and want richer metadata (abstract, authors)
not yet available from other sources.

API docs: https://info.arxiv.org/help/api/index.html
Rate limits: 3 req/s suggested by arXiv.
"""

import logging
import re
import xml.etree.ElementTree as ET
from typing import Optional
import httpx

from app.config import settings
from app.models.paper import RawPaper

logger = logging.getLogger(__name__)

_BASE = "https://export.arxiv.org/api/query"
_NS = {"atom": "http://www.w3.org/2005/Atom"}


def _headers() -> dict[str, str]:
    return {"User-Agent": settings.ARXIV_USER_AGENT}


def _parse_entry(entry: ET.Element) -> Optional[RawPaper]:
    """Parse a single arXiv Atom entry into a RawPaper."""
    arxiv_id_el = entry.find("atom:id", _NS)
    if arxiv_id_el is None:
        return None

    # Extract ID from URL like http://arxiv.org/abs/1706.03762v5
    raw_id = arxiv_id_el.text or ""
    m = re.search(r"arxiv\.org/abs/([^\s/]+)", raw_id, re.IGNORECASE)
    arxiv_id = re.sub(r"v\d+$", "", m.group(1)) if m else raw_id

    title_el = entry.find("atom:title", _NS)
    title = (title_el.text or "").strip().replace("\n", " ") if title_el is not None else "Untitled"

    summary_el = entry.find("atom:summary", _NS)
    abstract = (summary_el.text or "").strip() if summary_el is not None else None

    authors = [
        (a.find("atom:name", _NS).text or "").strip()
        for a in entry.findall("atom:author", _NS)
        if a.find("atom:name", _NS) is not None
    ]

    published_el = entry.find("atom:published", _NS)
    year: Optional[int] = None
    if published_el is not None and published_el.text:
        try:
            year = int(published_el.text[:4])
        except ValueError:
            pass

    # DOI link if present
    doi: Optional[str] = None
    for link in entry.findall("atom:link", _NS):
        if link.get("title") == "doi":
            href = link.get("href", "")
            m2 = re.search(r"(10\.\d{4,9}/[^\s]+)", href)
            if m2:
                doi = m2.group(1)

    return RawPaper(
        id=arxiv_id,
        title=title,
        authors=authors,
        abstract=abstract,
        year=year,
        arxiv_id=arxiv_id,
        doi=doi,
        sources=["arXiv"],
    )


async def get_paper(arxiv_id: str) -> Optional[RawPaper]:
    """Fetch metadata for a single arXiv paper by ID."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                _BASE,
                params={"id_list": arxiv_id, "max_results": 1},
                headers=_headers(),
            )
        if not response.is_success:
            logger.warning("arXiv fetch failed: %s", response.status_code)
            return None

        root = ET.fromstring(response.text)
        entries = root.findall("atom:entry", _NS)
        if not entries:
            return None

        return _parse_entry(entries[0])

    except (httpx.HTTPError, ET.ParseError) as exc:
        logger.warning("arXiv fetch error for %s: %s", arxiv_id, exc)
        return None
