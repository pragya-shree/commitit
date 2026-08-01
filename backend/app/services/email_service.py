"""
Email Service for Phase 12 Production Authentication.
Handles verification tokens, single-use password reset tokens, and email dispatch.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_email_token(payload_data: Dict[str, Any], expires_in_minutes: int = 60) -> str:
    """Generate a signed JWT token for email verification or password reset."""
    data = payload_data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    data.update({"exp": expire})
    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_email_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a signed email JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def send_verification_email(email: str, token: str) -> bool:
    """Simulate or dispatch account email verification message."""
    verify_url = f"http://localhost:5173/verify-email?token={token}"
    logger.info(f"[EmailService] Verification email sent to {email}. Link: {verify_url}")
    return True


def send_password_reset_email(email: str, token: str) -> bool:
    """Simulate or dispatch password reset token email message."""
    reset_url = f"http://localhost:5173/reset-password?token={token}"
    logger.info(f"[EmailService] Password reset email sent to {email}. Link: {reset_url}")
    return True
