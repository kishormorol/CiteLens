"""
Semantic Scholar API integration.

API docs: https://api.semanticscholar.org/api-docs/graph
Rate limits: 1 req/s unauthenticated, 10 req/s with API key.
"""

import logging
from typing import Optional
import httpx

from app.config import settings
from app.models.paper import RawPaper
from app.utils.exceptions import PaperNotFoundError, UpstreamAPIError, RateLimitError

logger = logging.getLogger(__name__)

_BASE = "https://api.semanticscholar.org/graph/v1"

# Fields to request for a paper lookup
_PAPER_FIELDS = ",".join([
    "paperId", "title", "authors", "abstract", "year", "venue",
    "externalIds", "citationCount", "influentialCitationCount",
    "fieldsOfStudy", "publicationTypes",
])

# Fields for citation records (each has a .citingPaper sub-object)
_CITATION_FIELDS = ",".join([
    "citingPaper.paperId",
    "citingPaper.title",
    "citingPaper.authors",
    "citingPaper.abstract",
    "citingPaper.year",
    "citingPaper.venue",
    "citingPaper.externalIds",
    "citingPaper.citationCount",
    "citingPaper.influentialCitationCount",
    "citingPaper.fieldsOfStudy",
    "isInfluential",
])


def _headers() -> dict[str, str]:
    h: dict[str, str] = {"User-Agent": "CiteLens/1.0"}
    if settings.SEMANTIC_SCHOLAR_API_KEY:
        h["x-api-key"] = settings.SEMANTIC_SCHOLAR_API_KEY
    return h


def _raise_for_status(response: httpx.Response, source_name: str) -> None:
    if response.status_code == 429:
        raise RateLimitError(source_name, 429, "Rate limited by Semantic Scholar.")
    if response.status_code == 404:
        raise PaperNotFoundError(f"Paper not found on Semantic Scholar (HTTP 404).")
    if not response.is_success:
        raise UpstreamAPIError(source_name, response.status_code, response.text[:200])


def _paper_id_param(parsed_value: str, input_type: str) -> str:
    """
    Build the Semantic Scholar paper ID parameter from our parsed input.
    SS accepts: {ss_id}, ArXiv:{id}, DOI:{doi}, URL:{url}
    """
    if input_type in ("arxiv_id", "arxiv_url"):
        return f"ArXiv:{parsed_value}"
    if input_type in ("doi", "doi_url"):
        return f"DOI:{parsed_value}"
    if input_type == "semantic_scholar_url":
        return parsed_value  # already a SS paper ID
    return parsed_value


def _parse_paper(data: dict, is_highly_influential: bool = False) -> RawPaper:
    """Convert a raw SS API paper dict into a RawPaper."""
    external = data.get("externalIds") or {}
    authors = [a.get("name", "") for a in (data.get("authors") or [])]
    arxiv_id = external.get("ArXiv")
    doi = external.get("DOI")
    ss_id = data.get("paperId", "")

    # Choose a stable internal ID
    internal_id = ss_id or doi or arxiv_id or data.get("title", "unknown")

    return RawPaper(
        id=internal_id,
        title=data.get("title") or "Untitled",
        authors=authors,
        abstract=data.get("abstract"),
        year=data.get("year"),
        venue=data.get("venue"),
        doi=doi,
        arxiv_id=arxiv_id,
        semantic_scholar_id=ss_id,
        citation_count=data.get("citationCount") or 0,
        influential_citation_count=data.get("influentialCitationCount") or 0,
        is_highly_influential=is_highly_influential,
        fields_of_study=data.get("fieldsOfStudy") or [],
        sources=["Semantic Scholar"],
    )


async def get_paper(value: str, input_type: str) -> RawPaper:
    """Resolve and return a single paper by any supported ID type."""
    paper_id = _paper_id_param(value, input_type)
    url = f"{_BASE}/paper/{paper_id}"
    params = {"fields": _PAPER_FIELDS}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=_headers(), params=params)

    _raise_for_status(response, "Semantic Scholar")
    return _parse_paper(response.json())


async def search_by_title(title: str, limit: int = 5) -> list[RawPaper]:
    """Search SS by title and return top results."""
    url = f"{_BASE}/paper/search"
    params = {"query": title, "limit": limit, "fields": _PAPER_FIELDS}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=_headers(), params=params)

    if response.status_code == 404 or not response.is_success:
        logger.warning("SS title search failed: %s", response.status_code)
        return []

    data = response.json()
    papers = data.get("data") or []
    return [_parse_paper(p) for p in papers]


async def get_citing_papers(paper_id: str, limit: int = 200) -> list[RawPaper]:
    """
    Fetch papers that cite paper_id.
    paper_id must be a valid SS paper ID (not prefixed).
    Returns up to `limit` citing papers.
    """
    results: list[RawPaper] = []
    offset = 0
    page_size = min(limit, 100)

    async with httpx.AsyncClient(timeout=20.0) as client:
        while len(results) < limit:
            url = f"{_BASE}/paper/{paper_id}/citations"
            params = {
                "fields": _CITATION_FIELDS,
                "limit": page_size,
                "offset": offset,
            }
            response = await client.get(url, headers=_headers(), params=params)
            _raise_for_status(response, "Semantic Scholar")

            data = response.json()
            batch = data.get("data") or []
            if not batch:
                break

            for item in batch:
                citing = item.get("citingPaper") or {}
                if not citing.get("paperId"):
                    continue
                paper = _parse_paper(citing, is_highly_influential=item.get("isInfluential", False))
                results.append(paper)

            offset += len(batch)
            if len(batch) < page_size:
                break

    return results[:limit]
