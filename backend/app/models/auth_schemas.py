"""
Pydantic schemas for Phase 12 & 12.1 Production Authentication request/response serialization.
"""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator, field_validator


class UserRegisterRequest(BaseModel):
    """Schema for user registration request."""
    email: Optional[str] = Field(None, description="Valid email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=6, description="Raw password (min 6 characters)")
    display_name: Optional[str] = Field(None, max_length=100, description="User display name")


class UserLoginRequest(BaseModel):
    """Schema for login request with backward-compatible alias fallback."""
    email_or_username: Optional[str] = Field(None, description="Registered Email address or Username")
    username: Optional[str] = Field(None, description="Legacy username payload fallback")
    password: str = Field(..., description="User password")
    remember_me: Optional[bool] = Field(False, description="Extend refresh token expiration")

    @model_validator(mode="before")
    @classmethod
    def check_credentials(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("email_or_username") and data.get("username"):
                data["email_or_username"] = data.get("username")
        return data


class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth token authentication."""
    credential: str = Field(..., description="Google ID Token credential string")


class LinkProviderRequest(BaseModel):
    """Schema for linking external OAuth provider to existing user account."""
    provider: str = Field(..., description="Provider name ('google', 'github', 'microsoft')")
    credential: str = Field(..., description="ID token or OAuth credential string")


class UserResponse(BaseModel):
    """Schema for returning user profile details."""
    id: str
    email: str
    username: str
    display_name: str
    provider: str = "local"
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool = False
    connected_providers: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class ProfileUpdateRequest(BaseModel):
    """Schema for profile update request."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=1000)


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password email trigger."""
    email: str


class ResetPasswordRequest(BaseModel):
    """Schema for reset password confirmation with token."""
    token: str
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    """Schema for authenticated password change."""
    current_password: str
    new_password: str = Field(..., min_length=6)


class VerifyEmailRequest(BaseModel):
    """Schema for email verification token execution."""
    token: str


class UserPreferencesSchema(BaseModel):
    """Schema for user UI and notification preferences."""
    theme: str = "dark"
    accent_color: str = "indigo"
    reduced_motion: bool = False
    compact_mode: bool = False
    default_dashboard_view: str = "overview"
    default_repository_view: str = "code"
    ai_response_length: str = "balanced"

    notify_security_alerts: bool = True
    notify_product_updates: bool = True
    notify_repo_analysis: bool = True
    notify_weekly_summary: bool = False
    notify_ai_tips: bool = False

    model_config = {
        "from_attributes": True
    }


class UserPreferencesUpdate(BaseModel):
    """Schema for partial update of preferences."""
    theme: Optional[str] = None
    accent_color: Optional[str] = None
    reduced_motion: Optional[bool] = None
    compact_mode: Optional[bool] = None
    default_dashboard_view: Optional[str] = None
    default_repository_view: Optional[str] = None
    ai_response_length: Optional[str] = None

    notify_security_alerts: Optional[bool] = None
    notify_product_updates: Optional[bool] = None
    notify_repo_analysis: Optional[bool] = None
    notify_weekly_summary: Optional[bool] = None
    notify_ai_tips: Optional[bool] = None


class UserSessionResponse(BaseModel):
    """Schema for returning user active sessions."""
    id: str
    browser: str
    os: str
    device: str
    ip_address: Optional[str] = None
    is_current: bool = False
    created_at: datetime
    last_active_at: datetime

    model_config = {
        "from_attributes": True
    }


class UserActivityResponse(BaseModel):
    """Schema for returning user activity log entries."""
    id: str
    action: str
    description: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class UserStatsResponse(BaseModel):
    """Schema for repository and account statistics."""
    repos_imported: int
    repos_analyzed: int
    knowledge_models: int
    files_indexed: int
    symbols_parsed: int
    ai_conversations: int
    last_analysis: Optional[str] = None


class CheckAvailabilityResponse(BaseModel):
    """Schema for username / email availability checks."""
    available: bool
    message: str


class DeleteAccountConfirmRequest(BaseModel):
    """Schema for confirm account deletion request."""
    password: Optional[str] = None
    confirm_username: str

