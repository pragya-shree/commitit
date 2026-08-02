"""
CommitIt Backend Application Entrypoint.

Creates the FastAPI application, wires up routing, middleware, CORS, logging,
database migration lifespans, and global exception handlers.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.db.database import Base, engine
import app.models.auth  # Register SQLAlchemy models

setup_logging()
logger = get_logger(__name__)


from app.db.database import Base, engine, init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log application startup/shutdown and initialize database tables."""
    logger.info("%s v%s starting up", settings.APP_NAME, settings.VERSION)
    init_db()
    yield
    logger.info("%s shutting down", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-powered platform for repository intelligence, deep code navigation, and impact analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_origin_regex=r"https://.*\.vercel\.app|https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log structured execution timing for incoming HTTP requests."""
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(
        "%s %s -> %s (%sms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch unhandled application exceptions and return clean JSON response."""
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=settings.DEBUG)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the request."},
    )


@app.get("/", summary="Root status endpoint", tags=["Root"])
def read_root() -> dict:
    """Return basic project metadata and status."""
    return {"project": settings.APP_NAME, "version": settings.VERSION, "status": "healthy"}


app.include_router(api_router, prefix="/api/v1")
