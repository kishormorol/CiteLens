"""
Lightweight citation graph utilities for computing NetworkScore.

Builds a directed graph from the candidate citing-paper set and runs PageRank.
Nodes are paper IDs. An edge A → B means paper A cites paper B.

In the MVP, direct reference data between candidates is rarely available without
extra API calls. When reference_ids are populated on RawPaper objects (from a
deeper fetch), the graph reflects actual citation relationships. When they are
empty, we fall back to a citation-count-weighted star graph centred on the seed,
which degrades gracefully to log-normalised citation count ranking.
"""

import math
from typing import Sequence

try:
    import networkx as nx
    _NETWORKX_AVAILABLE = True
except ImportError:
    _NETWORKX_AVAILABLE = False


def build_local_graph(
    paper_ids: list[str],
    reference_map: dict[str, list[str]],
) -> "nx.DiGraph | None":
    """
    Build a directed graph from candidate papers.

    paper_ids: IDs of all candidate papers.
    reference_map: maps paper_id → list of paper_ids it references.
                   Only edges between papers in paper_ids are included.
    Returns None if networkx is unavailable.
    """
    if not _NETWORKX_AVAILABLE:
        return None

    g = nx.DiGraph()
    id_set = set(paper_ids)
    g.add_nodes_from(paper_ids)

    for src, refs in reference_map.items():
        if src not in id_set:
            continue
        for dst in refs:
            if dst in id_set:
                g.add_edge(src, dst)

    return g


def pagerank_scores(
    paper_ids: list[str],
    reference_map: dict[str, list[str]],
    citation_counts: dict[str, int],
    alpha: float = 0.85,
) -> dict[str, float]:
    """
    Compute PageRank for each paper, returning raw (un-normalised) scores.

    Falls back to log-normalised citation count when:
    - networkx is unavailable
    - the graph has no edges (all reference_ids empty)
    """
    graph = build_local_graph(paper_ids, reference_map)

    has_edges = graph is not None and graph.number_of_edges() > 0

    if has_edges:
        pr = nx.pagerank(graph, alpha=alpha)
        return {pid: pr.get(pid, 0.0) for pid in paper_ids}

    # Fallback: log-normalised citation count as proxy for network centrality.
    # Papers with more citations are more likely to be embedded in the graph.
    return {pid: math.log1p(citation_counts.get(pid, 0)) for pid in paper_ids}


def normalised_pagerank(
    paper_ids: list[str],
    reference_map: dict[str, list[str]],
    citation_counts: dict[str, int],
) -> dict[str, float]:
    """
    Return PageRank scores min-max normalised to [0, 1].
    """
    raw = pagerank_scores(paper_ids, reference_map, citation_counts)
    values = list(raw.values())
    lo, hi = min(values, default=0.0), max(values, default=0.0)
    if hi == lo:
        return {pid: 0.0 for pid in paper_ids}
    return {pid: (v - lo) / (hi - lo) for pid, v in raw.items()}
