"""
Format internal scored data into API response shapes.
"""

from app.models.api import (
    SeedPaper, RankedPaper, ScoreBreakdown, AnalyzePaperResponse,
    SummaryInfo,
)
from app.models.paper import RawPaper
from app.services.ranking_service import ScoredPaper


def _paper_url(paper: RawPaper) -> str | None:
    return paper.url


def _badges(paper: RawPaper, impact: float, relevance: float) -> list[str]:
    badges: list[str] = []
    if paper.is_highly_influential:
        badges.append("Highly Influential")
    if impact >= 0.80:
        badges.append("High Impact")
    if relevance >= 0.75:
        badges.append("Highly Relevant")
    pub_types = getattr(paper, "publication_types", []) or []
    if any(t in ("Review", "Survey") for t in pub_types):
        badges.append("Survey")
    return badges


def _breakdown(paper: RawPaper, scored: ScoredPaper) -> ScoreBreakdown:
    impact_desc = ""
    if paper.citation_normalized_percentile is not None:
        impact_desc = f"Top {int((1 - paper.citation_normalized_percentile) * 100)}% cited in field."
    elif paper.citation_count > 0:
        impact_desc = f"{paper.citation_count:,} citations."

    fwci_desc = ""
    if paper.fwci:
        fwci_desc = f" FWCI {paper.fwci:.1f}×."

    network_desc = (
        "Based on local citation network PageRank across candidate set."
        if scored.network_score > 0
        else "Citation count proxy (reference data unavailable)."
    )

    rel_desc = (
        "Token-overlap similarity between seed and candidate title/abstract."
    )

    intent_desc = (
        "Marked as highly influential citation." if paper.is_highly_influential
        else "Standard citation (no influential signal from source)."
    )

    return ScoreBreakdown(
        impact=(impact_desc + fwci_desc).strip() or "No OpenAlex data available.",
        network=network_desc,
        relevance=rel_desc,
        context=intent_desc,
    )


def format_seed_paper(paper: RawPaper) -> SeedPaper:
    return SeedPaper(
        id=paper.id,
        title=paper.title,
        authors=paper.authors,
        abstract=paper.abstract,
        year=paper.year,
        venue=paper.venue,
        doi=paper.doi,
        arxiv_id=paper.arxiv_id,
        url=_paper_url(paper),
        citation_count=paper.citation_count,
        sources=paper.sources,
    )


def format_ranked_paper(scored: ScoredPaper) -> RankedPaper:
    p = scored.paper
    return RankedPaper(
        id=p.id,
        title=p.title,
        authors=p.authors,
        abstract=p.abstract,
        year=p.year,
        venue=p.venue,
        doi=p.doi,
        url=_paper_url(p),
        citation_count=p.citation_count,
        citation_normalized_percentile=p.citation_normalized_percentile,
        fwci=p.fwci,
        impact_score=scored.impact_score,
        network_score=scored.network_score,
        relevance_score=scored.relevance_score,
        citation_intent_score=scored.citation_intent_score,
        final_score=scored.final_score,
        highly_influential=p.is_highly_influential,
        badges=_badges(p, scored.impact_score, scored.relevance_score),
        why_ranked=scored.why_ranked,
        breakdown=_breakdown(p, scored),
    )


def format_response(
    seed: RawPaper,
    scored: list[ScoredPaper],
    total_citing: int,
    sources_used: list[str],
    mock_mode: bool,
) -> AnalyzePaperResponse:
    return AnalyzePaperResponse(
        seed_paper=format_seed_paper(seed),
        summary=SummaryInfo(
            total_citing_papers=total_citing,
            ranked_candidates=len(scored),
            sources_used=sources_used,
            mock_mode=mock_mode,
        ),
        results=[format_ranked_paper(s) for s in scored],
    )
