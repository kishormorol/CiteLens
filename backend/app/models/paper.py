"""Internal paper representation — used between services, never sent to client."""

from pydantic import BaseModel, Field
from typing import Optional


class RawPaper(BaseModel):
    """A paper as resolved/fetched from external sources, before scoring."""

    # Canonical internal ID — prefer semantic_scholar_id, fall back to DOI or arXiv
    id: str

    title: str
    authors: list[str] = []
    abstract: Optional[str] = None
    year: Optional[int] = None
    venue: Optional[str] = None

    # External identifiers
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    semantic_scholar_id: Optional[str] = None
    openalex_id: Optional[str] = None

    # Raw citation metrics
    citation_count: int = 0
    influential_citation_count: int = 0

    # OpenAlex-enriched metrics (None when OA lookup failed or was skipped)
    citation_normalized_percentile: Optional[float] = None
    fwci: Optional[float] = None

    # Semantic Scholar citation context flag
    is_highly_influential: bool = False

    # Taxonomy
    fields_of_study: list[str] = []

    # Which data sources contributed to this record
    sources: list[str] = []

    # IDs of papers in the candidate set that this paper references.
    # Populated only when a deeper fetch is performed; usually empty in MVP.
    reference_ids: list[str] = []

    @property
    def url(self) -> Optional[str]:
        if self.arxiv_id:
            return f"https://arxiv.org/abs/{self.arxiv_id}"
        if self.doi:
            return f"https://doi.org/{self.doi}"
        if self.semantic_scholar_id:
            return f"https://www.semanticscholar.org/paper/{self.semantic_scholar_id}"
        return None
