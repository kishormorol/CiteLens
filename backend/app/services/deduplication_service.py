"""
Deduplicate a list of RawPaper objects.

Strategy (applied in order, earliest match wins):
  1. Exact DOI match
  2. Exact Semantic Scholar ID match
  3. Exact arXiv ID match
  4. Normalised title similarity above threshold

When duplicates are found, the record with more metadata wins (merged).
"""

import re
from app.models.paper import RawPaper
from app.utils.text_similarity import token_overlap

_TITLE_SIMILARITY_THRESHOLD = 0.85


def _normalise_title(title: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    t = title.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _merge(a: RawPaper, b: RawPaper) -> RawPaper:
    """
    Merge two records that refer to the same paper.
    Keep the richer record as base and fill in any missing fields from the other.
    'Richer' = more non-None fields.
    """
    def count_fields(p: RawPaper) -> int:
        return sum(1 for v in p.model_dump().values() if v not in (None, [], ""))

    base, extra = (a, b) if count_fields(a) >= count_fields(b) else (b, a)

    updates: dict = {}
    if not base.doi and extra.doi:
        updates["doi"] = extra.doi
    if not base.arxiv_id and extra.arxiv_id:
        updates["arxiv_id"] = extra.arxiv_id
    if not base.semantic_scholar_id and extra.semantic_scholar_id:
        updates["semantic_scholar_id"] = extra.semantic_scholar_id
    if not base.openalex_id and extra.openalex_id:
        updates["openalex_id"] = extra.openalex_id
    if not base.abstract and extra.abstract:
        updates["abstract"] = extra.abstract
    if not base.citation_normalized_percentile and extra.citation_normalized_percentile:
        updates["citation_normalized_percentile"] = extra.citation_normalized_percentile
    if not base.fwci and extra.fwci:
        updates["fwci"] = extra.fwci
    if extra.is_highly_influential:
        updates["is_highly_influential"] = True
    if extra.sources:
        updates["sources"] = list(set(base.sources + extra.sources))

    if updates:
        return base.model_copy(update=updates)
    return base


def deduplicate(papers: list[RawPaper]) -> list[RawPaper]:
    """
    Remove duplicate papers from the list, merging metadata.
    Preserves relative order of first occurrence.
    """
    seen_doi: dict[str, int] = {}       # doi → index in result
    seen_ss: dict[str, int] = {}        # semantic_scholar_id → index
    seen_arxiv: dict[str, int] = {}     # arxiv_id → index
    seen_title: dict[str, int] = {}     # normalised_title → index

    result: list[RawPaper] = []

    for paper in papers:
        existing_idx: int | None = None

        # Check exact ID matches
        if paper.doi and paper.doi in seen_doi:
            existing_idx = seen_doi[paper.doi]
        elif paper.semantic_scholar_id and paper.semantic_scholar_id in seen_ss:
            existing_idx = seen_ss[paper.semantic_scholar_id]
        elif paper.arxiv_id and paper.arxiv_id in seen_arxiv:
            existing_idx = seen_arxiv[paper.arxiv_id]
        else:
            # Title similarity check
            norm = _normalise_title(paper.title)
            for existing_norm, idx in seen_title.items():
                if token_overlap(norm, existing_norm) >= _TITLE_SIMILARITY_THRESHOLD:
                    existing_idx = idx
                    break

        if existing_idx is not None:
            # Merge with existing record
            result[existing_idx] = _merge(result[existing_idx], paper)
        else:
            idx = len(result)
            result.append(paper)
            if paper.doi:
                seen_doi[paper.doi] = idx
            if paper.semantic_scholar_id:
                seen_ss[paper.semantic_scholar_id] = idx
            if paper.arxiv_id:
                seen_arxiv[paper.arxiv_id] = idx
            seen_title[_normalise_title(paper.title)] = idx

    return result
