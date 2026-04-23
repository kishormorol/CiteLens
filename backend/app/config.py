from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS — comma-separated origins, e.g. "http://localhost:5173,https://kishormorol.github.io"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://kishormorol.github.io"

    # Set to true to bypass all live API calls and return mock data
    USE_MOCK_DATA: bool = False

    # When a live upstream API fails during a real query, fall back to mock data
    # rather than returning a 502. Set to false in production if you want hard errors.
    FALLBACK_TO_MOCK_ON_ERROR: bool = True

    # External API credentials
    SEMANTIC_SCHOLAR_API_KEY: Optional[str] = None
    OPENALEX_EMAIL: Optional[str] = None
    ARXIV_USER_AGENT: str = "CiteLens/1.0"

    # Admin secret for the cache-clear endpoint.
    # If unset the endpoint is disabled entirely (returns 403).
    # Set via env: CACHE_CLEAR_SECRET=some-random-string
    CACHE_CLEAR_SECRET: Optional[str] = None

    # Comma-separated list of trusted reverse-proxy IPs whose
    # X-Forwarded-For header the rate limiter will honour.
    # Example: "10.0.0.1,10.0.0.2" (Render/Railway internal IPs)
    # Leave empty to trust only the direct client socket IP.
    TRUSTED_PROXY_IPS: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
