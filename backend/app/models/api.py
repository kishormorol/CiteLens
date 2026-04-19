"""
Pydantic models for all API request and response payloads.

All response models use camelCase aliases so the frontend receives JSON in its
expected shape (seedPaper, finalScore, etc.) while Python code uses snake_case.
"""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Optional, Literal


class _CamelModel(BaseModel):
    """Base model that serialises to camelCase JSON."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------

class AnalyzePaperRequest(BaseModel):
    query: str = Field(..., min_length=1, description="arXiv ID/URL, DOI, Semantic Scholar URL, or paper title")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum results to return")


class ResolvePaperRequest(BaseModel):
    query: str


class CitationsRequest(BaseModel):
    paper_id: str = Field(..., description="Semantic Scholar paper ID, arXiv ID, or DOI")
    limit: int = Field(default=50, ge=1, le=500)


class RankedCitationsRequest(BaseModel):
    query: str
    limit: int = Field(default=20, ge=1, le=100)


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class SeedPaper(_CamelModel):
    id: str
    title: str
    authors: list[str]
    abstract: Optional[str] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    url: Optional[str] = None
    citation_count: int = 0
    sources: list[str] = []


class ScoreBreakdown(_CamelModel):
    impact: str = ""
    network: str = ""
    relevance: str = ""
    context: str = ""


class RankedPaper(_CamelModel):
    id: str
    title: str
    authors: list[str]
    abstract: Optional[str] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    citation_count: int = 0
    citation_normalized_percentile: Optional[float] = None
    fwci: Optional[float] = None
    impact_score: float
    network_score: float
    relevance_score: float
    citation_intent_score: float
    final_score: float
    highly_influential: bool = False
    badges: list[str] = []
    why_ranked: str
    breakdown: ScoreBreakdown = ScoreBreakdown()


class SummaryInfo(_CamelModel):
    total_citing_papers: int
    ranked_candidates: int
    sources_used: list[str]
    mock_mode: bool


# ---------------------------------------------------------------------------
# Top-level responses
# ---------------------------------------------------------------------------

class AnalyzePaperResponse(_CamelModel):
    seed_paper: SeedPaper
    summary: SummaryInfo
    results: list[RankedPaper]


class ResolvePaperResponse(_CamelModel):
    paper: SeedPaper
    mock_mode: bool = False


class CitationsResponse(_CamelModel):
    seed_paper_id: str
    total: int
    papers: list[RankedPaper]
    mock_mode: bool = False


class HealthResponse(_CamelModel):
    status: Literal["ok"] = "ok"
    version: str = "1.0.0"
    mock_mode: bool
    environment: str


# ---------------------------------------------------------------------------
# Parsed input (internal use, but also returned by /resolve-paper)
# ---------------------------------------------------------------------------

class ParsedInput(_CamelModel):
    raw: str
    input_type: Literal["arxiv_id", "doi", "semantic_scholar_url", "arxiv_url", "doi_url", "title"]
    value: str  # cleaned/extracted value (e.g. "1706.03762" for arXiv)
