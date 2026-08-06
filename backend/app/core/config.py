"""
Application configuration module.

Settings are loaded from environment variables (and a local .env file when present)
using Pydantic BaseSettings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    APP_NAME: str = "CommitIt"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

   # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",

        # Production frontend
        "https://commitit-seven.vercel.app",

        # Preview deployment
        "https://commitit-4qygsb00s-hello-99fc.vercel.app",
    ]

    # Optional Gemini LLM configuration. If GEMINI_API_KEY is not set,
    # the AI Assistant automatically uses the Grounded Repository Engine.
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Authentication settings
    JWT_SECRET_KEY: str = "dev_secret_key_change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth settings
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None
    FRONTEND_URL: str = "http://localhost:5173"

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
