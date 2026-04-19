"""
Relevance scoring between the seed paper and candidate citing papers.

Current implementation: token-overlap-based similarity (fast, zero dependencies).

Interface is stable: the function signature of `score_batch` must not change
when this module is upgraded to use SPECTER2 or sentence-transformers.
To swap in an embedding-based method, replace the body of `score_batch` and
`_score_one` while keeping the signature identical.
"""

from app.models.paper import RawPaper
from app.utils.text_similarity import compute_similarity
from app.utils.normalization import clamp


def _score_one(seed: RawPaper, candidate: RawPaper) -> float:
    """
    Return a raw relevance score in [0, 1] for a single candidate.

    TODO: Replace with embedding similarity (SPECTER2, sentence-transformers,
    or OpenAI ada-002) for higher recall on semantically close but lexically
    different papers.
    """
    return compute_similarity(
        seed_title=seed.title,
        seed_abstract=seed.abstract,
        candidate_title=candidate.title,
        candidate_abstract=candidate.abstract,
    )


def score_batch(seed: RawPaper, candidates: list[RawPaper]) -> list[float]:
    """
    Compute relevance scores for all candidates relative to seed.
    Returns a list of floats in [0, 1], same order as candidates.

    Note: token-overlap scores are naturally low (often 0.05–0.35) because
    research papers share few exact tokens. The scores are min-max normalised
    in ranking_service, so relative ordering is what matters here.
    """
    return [clamp(_score_one(seed, c)) for c in candidates]
