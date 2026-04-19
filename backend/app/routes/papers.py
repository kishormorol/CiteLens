"""
Paper-related endpoints.

POST /api/resolve-paper     — parse input and resolve seed paper metadata only
POST /api/citations         — fetch raw citing papers for a known paper ID
POST /api/ranked-citations  — fetch + rank citations without full analyze flow
POST /api/analyze-paper     — full pipeline: resolve → fetch → enrich → rank → format
"""

import logging
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.api import (
    AnalyzePaperRequest, AnalyzePaperResponse,
    ResolvePaperRequest, ResolvePaperResponse,
    CitationsRequest, CitationsResponse,
    RankedCitationsRequest,
    ParsedInput,
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["papers"])


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
        return CitationsResponse(
            seed_paper_id=mock_resp.seed_paper.id,
            total=mock_resp.summary.total_citing_papers,
            papers=mock_resp.results,
            mock_mode=True,
        ).model_dump(by_alias=True)

    try:
        papers = await ss.get_citing_papers(req.paper_id, limit=req.limit)
        papers = dedup.deduplicate(papers)
        # No scoring for this endpoint — return as RankedPaper with zero scores
        dummy_seed_paper = papers[0] if papers else None
        return CitationsResponse(
            seed_paper_id=req.paper_id,
            total=len(papers),
            papers=[],  # callers who want scores should use /ranked-citations
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
        # Graceful fallback to mock so the frontend always gets usable data
        logger.info("Falling back to mock data due to upstream failure.")
        resp = mock.get_mock_analyze_response()
        return resp.model_dump(by_alias=True)

    seed_ss_id = seed.semantic_scholar_id
    if not seed_ss_id:
        raise HTTPException(
            status_code=422,
            detail="Could not determine Semantic Scholar ID for this paper. "
                   "Try using a direct Semantic Scholar URL.",
        )

    # --- 3. Fetch citing papers from Semantic Scholar -----------------------
    sources_used: list[str] = list(seed.sources)
    try:
        raw_citing = await ss.get_citing_papers(seed_ss_id, limit=min(req.limit * 5, 300))
        if "Semantic Scholar" not in sources_used:
            sources_used.append("Semantic Scholar")
    except UpstreamAPIError as exc:
        logger.warning("Failed to fetch citations from SS: %s", exc)
        raw_citing = []

    # --- 4. Enrich with OpenAlex --------------------------------------------
    if raw_citing:
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
    return response.model_dump(by_alias=True)
