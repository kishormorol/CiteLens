"""
OpenAlex API integration.

Used for normalised citation metrics (citation_normalized_percentile, FWCI)
that are not available from Semantic Scholar.

API docs: https://docs.openalex.org
Rate limits: 10 req/s with email, 100k/day.
"""

import logging
from typing import Optional
import httpx

from app.config import settings
from app.models.paper import RawPaper
from app.utils.exceptions import UpstreamAPIError

logger = logging.getLogger(__name__)

_BASE = "https://api.openalex.org"


def _params() -> dict[str, str]:
    """Always include polite-pool email if configured."""
    p: dict[str, str] = {}
    if settings.OPENALEX_EMAIL:
        p["mailto"] = settings.OPENALEX_EMAIL
    return p


def _extract_metrics(data: dict) -> tuple[Optional[float], Optional[float]]:
    """
    Pull citation_normalized_percentile and fwci from an OpenAlex work record.
    Returns (cnp, fwci) — either may be None.
    """
    cited = data.get("cited_by_percentile_year") or {}
    cnp: Optional[float] = None
    # OA provides min/max percentile per year; we use the max as an upper bound
    if "max" in cited:
        cnp = float(cited["max"]) / 100.0  # normalise to [0, 1]

    fwci: Optional[float] = data.get("fwci")
    if fwci is not None:
        try:
            fwci = float(fwci)
        except (TypeError, ValueError):
            fwci = None

    return cnp, fwci


async def enrich_paper_by_doi(paper: RawPaper) -> RawPaper:
    """
    Fetch OpenAlex work by DOI and enrich the RawPaper in-place (returns updated copy).
    Silently returns original if lookup fails — OA enrichment is best-effort.
    """
    if not paper.doi:
        return paper

    url = f"{_BASE}/works/https://doi.org/{paper.doi}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=_params())
        if not response.is_success:
            logger.debug("OA enrichment failed for DOI %s: %s", paper.doi, response.status_code)
            return paper

        data = response.json()
        cnp, fwci = _extract_metrics(data)
        oa_id: Optional[str] = data.get("id")  # e.g. "https://openalex.org/W..."

        return paper.model_copy(update={
            "citation_normalized_percentile": cnp,
            "fwci": fwci,
            "openalex_id": oa_id,
            "sources": list(set(paper.sources + ["OpenAlex"])),
        })

    except httpx.HTTPError as exc:
        logger.warning("OA HTTP error for DOI %s: %s", paper.doi, exc)
        return paper


async def enrich_batch(papers: list[RawPaper]) -> list[RawPaper]:
    """
    Enrich a list of papers with OpenAlex metrics.
    Papers without a DOI are returned unchanged.
    Errors are swallowed — this is always best-effort.
    """
    enriched = []
    for paper in papers:
        try:
            enriched.append(await enrich_paper_by_doi(paper))
        except Exception as exc:
            logger.warning("OA enrichment skipped for %s: %s", paper.id, exc)
            enriched.append(paper)
    return enriched


async def search_by_title(title: str, limit: int = 5) -> list[dict]:
    """
    Search OpenAlex by title. Returns raw API dicts (caller decides how to use them).
    Used as a fallback resolver when Semantic Scholar search fails.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{_BASE}/works",
                params={**_params(), "search": title, "per-page": limit, "select": "id,doi,title,authorships,publication_year,primary_location,cited_by_count,fwci,cited_by_percentile_year"},
            )
        if not response.is_success:
            return []
        return (response.json().get("results") or [])[:limit]
    except httpx.HTTPError:
        return []
