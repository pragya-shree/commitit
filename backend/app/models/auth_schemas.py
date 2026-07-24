"""
Pydantic schemas for Authentication request/response serialization.
"""

from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    """Schema for user registration request."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=6, description="Raw password (min 6 characters)")


class UserLoginRequest(BaseModel):
    """Schema for login request."""
    username: str
    password: str


class UserResponse(BaseModel):
    """Schema for returning user profile details."""
    id: str
    username: str

    model_config = {
        "from_attributes": True
    }
