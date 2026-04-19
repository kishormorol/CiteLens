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

    # External API credentials
    SEMANTIC_SCHOLAR_API_KEY: Optional[str] = None
    OPENALEX_EMAIL: Optional[str] = None
    ARXIV_USER_AGENT: str = "CiteLens/1.0"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
