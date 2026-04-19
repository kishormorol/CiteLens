import pytest
from app.models.paper import RawPaper
from app.services.ranking_service import rank_papers
from app.utils.normalization import minmax, renormalize_weights, log1p_norm


# ---------------------------------------------------------------------------
# Normalization utils
# ---------------------------------------------------------------------------

def test_minmax_basic():
    result = minmax([0.0, 5.0, 10.0])
    assert result == [0.0, 0.5, 1.0]


def test_minmax_all_equal():
    result = minmax([3.0, 3.0, 3.0])
    assert result == [0.0, 0.0, 0.0]


def test_minmax_empty():
    assert minmax([]) == []


def test_log1p_positive():
    import math
    assert log1p_norm(0) == 0.0
    assert log1p_norm(99) == pytest.approx(math.log1p(99))


def test_renormalize_weights_missing():
    weights = {"impact": 0.45, "network": 0.25, "relevance": 0.20, "intent": 0.10}
    available = {"impact", "relevance", "intent"}
    result = renormalize_weights(weights, available)
    assert abs(sum(result.values()) - 1.0) < 1e-9
    assert "network" not in result


# ---------------------------------------------------------------------------
# Ranking service
# ---------------------------------------------------------------------------

def _make_paper(pid: str, citations: int, influential: bool = False) -> RawPaper:
    return RawPaper(
        id=pid,
        title=f"Paper about transformers and attention {pid}",
        authors=["Author A"],
        abstract="We present a novel method for improving transformer efficiency.",
        year=2022,
        citation_count=citations,
        is_highly_influential=influential,
        sources=["Semantic Scholar"],
    )


def _seed() -> RawPaper:
    return RawPaper(
        id="seed",
        title="Attention Is All You Need",
        authors=["Vaswani et al."],
        abstract="We propose the Transformer, a new network architecture based solely on attention.",
        year=2017,
        citation_count=100000,
        sources=["Semantic Scholar"],
    )


def test_rank_returns_sorted_descending():
    seed = _seed()
    papers = [_make_paper(f"p{i}", citations=100 * i) for i in range(1, 6)]
    scored = rank_papers(seed, papers)
    scores = [s.final_score for s in scored]
    assert scores == sorted(scores, reverse=True)


def test_rank_highly_influential_boosted():
    seed = _seed()
    low_citations = _make_paper("low", citations=10, influential=True)
    high_citations = _make_paper("high", citations=10000, influential=False)
    scored = rank_papers(seed, [low_citations, high_citations])
    # Highly influential paper should still score well despite fewer citations
    # (not necessarily rank 1, but intent score should be 1.0)
    intent_scores = {s.paper.id: s.citation_intent_score for s in scored}
    assert intent_scores["low"] == 1.0
    assert intent_scores["high"] == 0.0


def test_rank_empty_candidates():
    seed = _seed()
    result = rank_papers(seed, [])
    assert result == []


def test_rank_single_paper():
    seed = _seed()
    paper = _make_paper("only", citations=500)
    scored = rank_papers(seed, [paper])
    assert len(scored) == 1
    assert 0.0 <= scored[0].final_score <= 1.0


def test_all_scores_in_range():
    seed = _seed()
    papers = [_make_paper(f"p{i}", citations=1000 * i) for i in range(1, 10)]
    scored = rank_papers(seed, papers)
    for s in scored:
        assert 0.0 <= s.impact_score <= 1.0
        assert 0.0 <= s.network_score <= 1.0
        assert 0.0 <= s.relevance_score <= 1.0
        assert s.citation_intent_score in (0.0, 1.0)
        assert 0.0 <= s.final_score <= 1.0


def test_why_ranked_not_empty():
    seed = _seed()
    papers = [_make_paper("p1", citations=5000, influential=True)]
    scored = rank_papers(seed, papers)
    assert scored[0].why_ranked
    assert len(scored[0].why_ranked) > 10
