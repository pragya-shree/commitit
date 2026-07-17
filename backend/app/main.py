"""
CommitIt backend application entrypoint.

Creates the FastAPI app, wires up routing, logging, and a global
exception handler. Kept intentionally small: this milestone only
establishes the backend foundation.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log application startup and shutdown."""
    logger.info("%s v%s starting up", settings.APP_NAME, settings.VERSION)
    yield
    logger.info("%s shutting down", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-powered platform for understanding codebases.",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log basic information about every incoming request."""
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
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
    """Catch unexpected errors and return a clean JSON response."""
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/", summary="Root endpoint", tags=["Root"])
def read_root() -> dict:
    """Return basic project information."""
    return {"project": settings.APP_NAME, "version": settings.VERSION}


app.include_router(api_router, prefix="/api/v1")
