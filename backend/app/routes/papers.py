"""
Paper-related endpoints.

POST /api/resolve-paper     — parse input and resolve seed paper metadata only
POST /api/citations         — fetch raw citing papers for a known paper ID
POST /api/ranked-citations  — fetch + rank citations without full analyze flow
POST /api/analyze-paper     — full pipeline: resolve → fetch → enrich → rank → format
"""

import logging
from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.models.api import (
    AnalyzePaperRequest, AnalyzePaperResponse,
    ResolvePaperRequest, ResolvePaperResponse,
    CitationsRequest, CitationsResponse,
    RankedCitationsRequest,
    PaperMetadata,
)
from app.services import input_parser as parser
from app.services import paper_resolver
from app.services import semantic_scholar_service as ss
from app.services import openalex_service as oa
from app.services import deduplication_service as dedup
from app.services import ranking_service
from app.services import formatter_service as fmt
from app.services import mock_data_service as mock
from app.utils.exceptions import (
    InputParseError, PaperNotFoundError, UpstreamAPIError, to_http_exception, CiteLensError,
)
from app.utils.cache import response_cache, make_cache_key

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["papers"])


def _make_paper_cache_key(paper_id: str, limit: int) -> str:
    """
    Build a cache key from the resolved canonical paper ID, not the raw query.

    This means equivalent inputs — arXiv ID, DOI, full URL, title — all
    resolve to the same cache entry once the paper is identified.
    """
    return make_cache_key(paper_id, limit)


# ---------------------------------------------------------------------------
# POST /api/resolve-paper
# ---------------------------------------------------------------------------

@router.post("/resolve-paper", response_model=ResolvePaperResponse)
async def resolve_paper(req: ResolvePaperRequest) -> dict:
    if settings.USE_MOCK_DATA:
        seed = mock.get_mock_seed()
        return ResolvePaperResponse(
            paper=fmt.format_seed_paper(seed),
            mock_mode=True,
        ).model_dump(by_alias=True)

    try:
        parsed = parser.parse_input(req.query)
        seed = await paper_resolver.resolve(parsed)
        return ResolvePaperResponse(
            paper=fmt.format_seed_paper(seed),
            mock_mode=False,
        ).model_dump(by_alias=True)
    except CiteLensError as exc:
        raise to_http_exception(exc)
    except Exception as exc:
        logger.exception("Unexpected error in resolve_paper")
        raise HTTPException(status_code=500, detail="Internal server error.")


# ---------------------------------------------------------------------------
# POST /api/citations
# ---------------------------------------------------------------------------

@router.post("/citations", response_model=CitationsResponse)
async def get_citations(req: CitationsRequest) -> dict:
    if settings.USE_MOCK_DATA:
        mock_resp = mock.get_mock_analyze_response()
        mock_papers = [
            PaperMetadata(
                id=rp.id, title=rp.title, authors=rp.authors,
                abstract=rp.abstract, year=rp.year, venue=rp.venue,
                doi=rp.doi, url=rp.url, citation_count=rp.citation_count,
            )
            for rp in mock_resp.results
        ]
        return CitationsResponse(
            seed_paper_id=mock_resp.seed_paper.id,
            total=mock_resp.summary.total_citing_papers,
            papers=mock_papers,
            mock_mode=True,
        ).model_dump(by_alias=True)

    try:
        raw_papers = await ss.get_citing_papers(req.paper_id, limit=req.limit)
        raw_papers = dedup.deduplicate(raw_papers)
        papers_out = [
            PaperMetadata(
                id=p.id, title=p.title, authors=p.authors,
                abstract=p.abstract, year=p.year, venue=p.venue,
                doi=p.doi, url=p.url, citation_count=p.citation_count,
                sources=p.sources,
            )
            for p in raw_papers
        ]
        return CitationsResponse(
            seed_paper_id=req.paper_id,
            total=len(raw_papers),
            papers=papers_out,
            mock_mode=False,
        ).model_dump(by_alias=True)
    except CiteLensError as exc:
        raise to_http_exception(exc)
    except Exception as exc:
        logger.exception("Unexpected error in get_citations")
        raise HTTPException(status_code=500, detail="Internal server error.")


# ---------------------------------------------------------------------------
# POST /api/ranked-citations
# ---------------------------------------------------------------------------

@router.post("/ranked-citations", response_model=AnalyzePaperResponse)
async def ranked_citations(req: RankedCitationsRequest) -> dict:
    """Alias for analyze-paper — useful for explicit semantic distinction."""
    return await analyze_paper(AnalyzePaperRequest(query=req.query, limit=req.limit))


# ---------------------------------------------------------------------------
# POST /api/analyze-paper  (primary endpoint)
# ---------------------------------------------------------------------------

@router.post("/analyze-paper", response_model=AnalyzePaperResponse)
async def analyze_paper(req: AnalyzePaperRequest) -> dict:
    """
    Full CiteLens pipeline:
      1. Parse input
      2. Resolve seed paper
      3. Fetch citing papers
      4. Enrich with OpenAlex metrics
      5. Deduplicate
      6. Rank (Impact + Network + Relevance + CitationIntent)
      7. Format and return
    Falls back to mock data if USE_MOCK_DATA=true or if resolution fails fatally.
    """
    if settings.USE_MOCK_DATA:
        resp = mock.get_mock_analyze_response()
        data = resp.model_dump(by_alias=True)
        data["results"] = data["results"][: req.limit]
        data["summary"]["rankedCandidates"] = len(data["results"])
        return data

    # Check cache before hitting upstream APIs.
    # NOTE: we don't cache yet — we need the resolved paper ID first.
    # The cache lookup happens after step 2 (resolve) below.

    # --- 1. Parse -----------------------------------------------------------
    try:
        parsed = parser.parse_input(req.query)
    except InputParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # --- 2. Resolve seed paper ----------------------------------------------
    try:
        seed = await paper_resolver.resolve(parsed)
    except PaperNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except UpstreamAPIError as exc:
        logger.warning("Upstream failure resolving paper: %s", exc)
        if not settings.FALLBACK_TO_MOCK_ON_ERROR:
            raise HTTPException(status_code=502, detail="Upstream API unavailable. Try again later.")
        logger.info("Falling back to mock data due to upstream failure.")
        resp = mock.get_mock_analyze_response()
        return resp.model_dump(by_alias=True)

    seed_ss_id = seed.semantic_scholar_id
    seed_oa_id = seed.openalex_id

    # Derive canonical ID for cache key: prefer SS ID, then OA ID, then arXiv ID
    canonical_id = (
        seed_ss_id
        or seed_oa_id
        or getattr(seed, "arxiv_id", None)
        or seed.title.lower().strip()
    )
    cache_key = _make_paper_cache_key(canonical_id, req.limit)
    cached = await response_cache.get(cache_key)
    if cached is not None:
        logger.info("Cache hit for paper '%s'", seed.title[:60])
        result = dict(cached)
        result["summary"] = {**cached["summary"], "cachedResponse": True}
        return result

    if not seed_ss_id and not seed_oa_id:
        raise HTTPException(
            status_code=422,
            detail="Could not determine a citation source ID for this paper. "
                   "Try using a direct arXiv ID, DOI, or Semantic Scholar URL.",
        )

    # --- 3. Fetch citing papers (SS primary, OpenAlex fallback) -------------
    sources_used: list[str] = list(seed.sources)
    raw_citing: list = []

    fetch_limit = min(req.limit * 3, 100)

    if seed_ss_id:
        try:
            raw_citing = await ss.get_citing_papers(seed_ss_id, limit=fetch_limit)
            if "Semantic Scholar" not in sources_used:
                sources_used.append("Semantic Scholar")
        except UpstreamAPIError as exc:
            logger.warning("Failed to fetch citations from SS: %s", exc)

    if not raw_citing and seed_oa_id:
        logger.info("Falling back to OpenAlex for citing papers (no SS data)")
        try:
            raw_citing = await oa.get_citing_papers(seed_oa_id, limit=fetch_limit)
            if "OpenAlex" not in sources_used:
                sources_used.append("OpenAlex")
        except Exception as exc:
            logger.warning("OA citing papers failed: %s", exc)

    # --- 4. Enrich with OpenAlex --------------------------------------------
    if raw_citing and seed_ss_id:  # only enrich if we used SS (OA papers already have metrics)
        try:
            raw_citing = await oa.enrich_batch(raw_citing)
            if "OpenAlex" not in sources_used:
                sources_used.append("OpenAlex")
        except Exception as exc:
            logger.warning("OA enrichment batch failed (non-fatal): %s", exc)

    # --- 5. Deduplicate -----------------------------------------------------
    total_before_dedup = len(raw_citing)
    candidates = dedup.deduplicate(raw_citing)
    logger.info(
        "Deduplicated %d → %d candidates for '%s'",
        total_before_dedup, len(candidates), seed.title[:60],
    )

    # --- 6. Rank ------------------------------------------------------------
    scored = ranking_service.rank_papers(seed, candidates)
    top_n = scored[: req.limit]

    # --- 7. Format ----------------------------------------------------------
    response = fmt.format_response(
        seed=seed,
        scored=top_n,
        total_citing=total_before_dedup,
        sources_used=list(set(sources_used)),
        mock_mode=False,
    )
    result_data = response.model_dump(by_alias=True)

    # Cache the successful response
    await response_cache.set(cache_key, result_data)
    logger.info("Cached response for '%s' (key: %s)", seed.title[:60], cache_key[:12])

    return result_data


# ---------------------------------------------------------------------------
# GET /api/stats  — operational metrics
# ---------------------------------------------------------------------------

@router.get("/stats", tags=["meta"])
async def api_stats() -> dict:
    """Return operational stats: cache size, configuration summary."""
    return {
        "cache": {
            "size": response_cache.size,
            "max_entries": 256,
            "ttl_seconds": 300,
        },
        "version": "1.0.0",
    }


# ---------------------------------------------------------------------------
# POST /api/cache/clear  — admin cache invalidation (secret-protected)
# ---------------------------------------------------------------------------

@router.post("/cache/clear", tags=["admin"])
async def clear_cache(request: Request) -> dict:
    """
    Clear the in-memory response cache.

    Requires the X-Admin-Secret header to match CACHE_CLEAR_SECRET.
    If CACHE_CLEAR_SECRET is not configured this endpoint always returns 403.
    """
    secret = settings.CACHE_CLEAR_SECRET
    if not secret:
        raise HTTPException(
            status_code=403,
            detail="Cache management is disabled. Set CACHE_CLEAR_SECRET to enable it.",
        )

    provided = request.headers.get("x-admin-secret", "")
    if not provided or provided != secret:
        logger.warning("Rejected cache-clear attempt with wrong or missing secret")
        raise HTTPException(status_code=403, detail="Invalid or missing X-Admin-Secret header.")

    size_before = response_cache.size
    await response_cache.clear()
    logger.info("Cache cleared by admin request (%d entries removed)", size_before)
    return {"cleared": size_before, "message": "Cache cleared successfully."}
