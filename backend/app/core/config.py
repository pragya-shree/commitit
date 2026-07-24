"""
Application configuration.

Settings are loaded from environment variables (and a local .env file
when present) using Pydantic Settings. Keeping configuration in one
place makes it easy to see every setting the app depends on.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    APP_NAME: str = "CommitIt"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Optional Gemini LLM configuration (Milestone 9). If GEMINI_API_KEY
    # is not set, the AI endpoints automatically fall back to the
    # deterministic Explanation Engine — the app never requires this.
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Authentication settings
    JWT_SECRET_KEY: str = "dev_secret_key_change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage settings
    REPO_STORAGE_DIR: str = "repositories"
    DATABASE_URL: str = "sqlite:///commitit.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Single shared settings instance used across the application.
settings = Settings()
