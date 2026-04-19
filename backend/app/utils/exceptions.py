from fastapi import HTTPException


class CiteLensError(Exception):
    """Base exception for all CiteLens errors."""
    pass


class InputParseError(CiteLensError):
    """Raised when user input cannot be classified or parsed."""
    pass


class PaperNotFoundError(CiteLensError):
    """Raised when the seed paper cannot be resolved from any source."""
    pass


class UpstreamAPIError(CiteLensError):
    """Raised when an upstream API (SS, OA, arXiv) returns an unexpected error."""

    def __init__(self, source: str, status_code: int, detail: str = ""):
        self.source = source
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"{source} API error {status_code}: {detail}")


class RateLimitError(UpstreamAPIError):
    """Raised when an upstream API rate-limits us."""
    pass


# Map domain exceptions to HTTP responses for FastAPI exception handlers
def to_http_exception(exc: CiteLensError) -> HTTPException:
    if isinstance(exc, PaperNotFoundError):
        return HTTPException(status_code=404, detail=str(exc) or "Paper not found.")
    if isinstance(exc, InputParseError):
        return HTTPException(status_code=422, detail=str(exc) or "Could not parse input.")
    if isinstance(exc, RateLimitError):
        return HTTPException(status_code=429, detail=f"Rate limited by {exc.source}. Try again later.")
    if isinstance(exc, UpstreamAPIError):
        return HTTPException(status_code=502, detail=str(exc))
    return HTTPException(status_code=500, detail="An unexpected error occurred.")
