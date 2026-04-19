from fastapi import APIRouter
from app.models.api import HealthResponse
from app.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    """Service health check — always returns 200 when the app is running."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        mock_mode=settings.USE_MOCK_DATA,
        environment=settings.APP_ENV,
    ).model_dump(by_alias=True)
