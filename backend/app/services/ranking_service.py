"""
Ranking pipeline for citing papers.

Score breakdown:
  ImpactScore      = 0.70 * citation_normalized_percentile + 0.30 * minmax(log1p(fwci))
  NetworkScore     = minmax(local_pagerank or log_citation_count)
  RelevanceScore   = minmax(token_overlap_similarity)
  CitationIntent   = 1.0 if highly_influential else 0.0

  FinalScore = 0.45 * Impact + 0.25 * Network + 0.20 * Relevance + 0.10 * CitationIntent

Weights are renormalized when signals are unavailable for any paper.
All scores returned in [0, 1].
"""

import math
import logging
from dataclasses import dataclass

from app.models.paper import RawPaper
from app.services.relevance_service import score_batch as relevance_score_batch
from app.utils.normalization import log1p_norm, minmax, renormalize_weights, clamp
from app.utils.graph_utils import normalised_pagerank

logger = logging.getLogger(__name__)

_BASE_WEIGHTS = {
    "impact": 0.45,
    "network": 0.25,
    "relevance": 0.20,
    "intent": 0.10,
}


@dataclass
class ScoredPaper:
    paper: RawPaper
    impact_score: float
    network_score: float
    relevance_score: float
    citation_intent_score: float
    final_score: float
    why_ranked: str


def _impact_scores(papers: list[RawPaper]) -> list[float]:
    """
    ImpactScore per paper.

    Prefers OpenAlex citation_normalized_percentile (0–1) and fwci.
    Falls back to log-normalised citation count when OA data is absent.
    """
    # Check how many papers have OA data
    has_cnp = [p.citation_normalized_percentile is not None for p in papers]
    has_fwci = [p.fwci is not None for p in papers]
    use_oa = sum(has_cnp) > len(papers) * 0.3  # use OA if >30% have it

    if use_oa:
        # For papers without OA data, estimate from log citation count
        raw_counts = [log1p_norm(p.citation_count) for p in papers]
        normed_counts = minmax(raw_counts)

        fwci_raw = [log1p_norm(p.fwci) if p.fwci else 0.0 for p in papers]
        fwci_normed = minmax(fwci_raw)

        scores = []
        for i, p in enumerate(papers):
            cnp = p.citation_normalized_percentile if p.citation_normalized_percentile is not None else normed_counts[i]
            fwci_n = fwci_normed[i]
            scores.append(0.70 * cnp + 0.30 * fwci_n)
        return scores

    # Pure citation-count fallback
    raw = [log1p_norm(p.citation_count) for p in papers]
    return minmax(raw)


def _network_scores(papers: list[RawPaper]) -> list[float]:
    """
    NetworkScore per paper via local PageRank on the candidate set.
    Falls back to log-citation if reference data is unavailable.
    """
    paper_ids = [p.id for p in papers]
    reference_map = {p.id: p.reference_ids for p in papers}
    citation_counts = {p.id: p.citation_count for p in papers}

    pr = normalised_pagerank(paper_ids, reference_map, citation_counts)
    return [pr.get(p.id, 0.0) for p in papers]


def _generate_why(paper: RawPaper, scores: dict[str, float], rank: int) -> str:
    """
    Generate a short human-readable explanation for why this paper ranked here.
    """
    parts: list[str] = []

    if scores["impact"] >= 0.75:
        parts.append("high normalized citation impact")
    elif scores["impact"] >= 0.50:
        parts.append("solid citation impact")

    if paper.is_highly_influential:
        parts.append("marked as highly influential by Semantic Scholar")

    if scores["relevance"] >= 0.70:
        parts.append("strong semantic overlap with the seed paper")
    elif scores["relevance"] >= 0.45:
        parts.append("moderate topical relevance to the seed paper")

    if scores["network"] >= 0.70:
        parts.append("well-cited within the local citation network")

    if paper.fwci and paper.fwci >= 2.0:
        parts.append(f"field-weighted citation impact of {paper.fwci:.1f}×")

    if not parts:
        if rank <= 3:
            parts.append("consistently strong signals across all scoring dimensions")
        else:
            parts.append("balanced combination of impact, relevance, and network signals")

    return "Ranked here due to: " + ", and ".join(parts) + "."


def rank_papers(seed: RawPaper, candidates: list[RawPaper]) -> list[ScoredPaper]:
    """
    Score and rank all candidates relative to the seed.
    Returns ScoredPaper list sorted by final_score descending.
    """
    if not candidates:
        return []

    # Compute raw signal vectors
    impact_vec = _impact_scores(candidates)
    network_vec = _network_scores(candidates)
    relevance_vec = relevance_score_batch(seed, candidates)
    # Re-normalise relevance since raw similarity values are low
    relevance_vec = minmax(relevance_vec)
    intent_vec = [1.0 if p.is_highly_influential else 0.0 for p in candidates]

    # Determine which signals are actually available (have non-zero values)
    available: set[str] = set()
    if any(i > 0 for i in impact_vec):
        available.add("impact")
    if any(n > 0 for n in network_vec):
        available.add("network")
    if any(r > 0 for r in relevance_vec):
        available.add("relevance")
    if any(iv > 0 for iv in intent_vec):
        available.add("intent")
    # Ensure at least one signal is available (fallback to all)
    if not available:
        available = {"impact", "network", "relevance", "intent"}

    weights = renormalize_weights(_BASE_WEIGHTS, available)

    scored: list[ScoredPaper] = []
    for i, paper in enumerate(candidates):
        s = {
            "impact": impact_vec[i],
            "network": network_vec[i],
            "relevance": relevance_vec[i],
            "intent": intent_vec[i],
        }
        final = sum(weights.get(k, 0.0) * v for k, v in s.items())
        final = clamp(final)

        scored.append(ScoredPaper(
            paper=paper,
            impact_score=round(s["impact"], 4),
            network_score=round(s["network"], 4),
            relevance_score=round(s["relevance"], 4),
            citation_intent_score=round(s["intent"], 4),
            final_score=round(final, 4),
            why_ranked="",  # filled after sorting
        ))

    # Sort descending by final score
    scored.sort(key=lambda x: x.final_score, reverse=True)

    # Assign why_ranked after we know the rank
    for rank_idx, sp in enumerate(scored, start=1):
        sp.why_ranked = _generate_why(
            sp.paper,
            {
                "impact": sp.impact_score,
                "network": sp.network_score,
                "relevance": sp.relevance_score,
                "intent": sp.citation_intent_score,
            },
            rank_idx,
        )

    return scored
