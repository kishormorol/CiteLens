"""
Token-based text similarity utilities.

This module provides the relevance scoring fallback used when embedding APIs
are unavailable. The interface is intentionally simple so that a SPECTER2 or
sentence-transformer-based implementation can be swapped in later by replacing
the `compute_similarity` function with an embedding-based one.
"""

import re
import math
from typing import Optional


_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "this", "that", "these", "those",
    "it", "its", "we", "our", "us", "they", "their", "them", "via", "using",
    "based", "we", "paper", "method", "approach", "model", "work", "show",
    "propose", "present", "novel", "new", "study", "results", "analysis",
}


def tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, remove stopwords, return tokens."""
    text = text.lower()
    tokens = re.findall(r"\b[a-z]{3,}\b", text)
    return [t for t in tokens if t not in _STOPWORDS]


def token_freq(tokens: list[str]) -> dict[str, int]:
    freq: dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    return freq


def tf_idf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    """Compute a TF-IDF vector for a document given a pre-built IDF table."""
    freq = token_freq(tokens)
    total = len(tokens) or 1
    return {t: (freq[t] / total) * idf.get(t, 1.0) for t in freq}


def cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    """Cosine similarity between two sparse vectors (dicts)."""
    common = set(vec_a) & set(vec_b)
    if not common:
        return 0.0
    dot = sum(vec_a[k] * vec_b[k] for k in common)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def token_overlap(text_a: str, text_b: str) -> float:
    """
    Jaccard similarity over token sets — fast O(n) relevance proxy.
    Returns 0.0–1.0.
    """
    set_a = set(tokenize(text_a))
    set_b = set(tokenize(text_b))
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def compute_similarity(
    seed_title: str,
    seed_abstract: Optional[str],
    candidate_title: str,
    candidate_abstract: Optional[str],
) -> float:
    """
    Compute a relevance score between [0, 1] for a candidate paper relative
    to the seed paper.

    Current implementation: weighted combination of title and abstract
    token-overlap (Jaccard similarity).

    TODO: Replace with SPECTER2 or sentence-transformer embeddings for
    higher-quality semantic similarity. The function signature is intentionally
    stable so callers do not need to change.
    """
    title_sim = token_overlap(seed_title, candidate_title)

    if seed_abstract and candidate_abstract:
        abstract_sim = token_overlap(seed_abstract, candidate_abstract)
        # Title similarity is slightly more informative — weighted 40/60
        return 0.4 * title_sim + 0.6 * abstract_sim

    # Fall back to title-only when abstracts are missing
    return title_sim
