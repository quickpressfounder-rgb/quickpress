"""Request / response contracts for /api/auth/*.

The response shape mirrors the frontend `AuthSession` type in
`shared/src/types/account.ts`, so no screen changes when mocks are swapped out.
"""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.user import Role, User


class SendOtpRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    role: Role


class SendOtpResponse(BaseModel):
    ok: bool = True
    expiresInSeconds: int
    isNewAccount: bool


class VerifyPhoneRequest(BaseModel):
    id_token: str = ""
    code: Optional[str] = None
    phone: Optional[str] = None
    role: Role
    referral_code: Optional[str] = None


class SocialLoginRequest(BaseModel):
    id_token: str
    role: Role
    referral_code: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class AccountResponse(BaseModel):
    id: str
    role: Role
    name: str
    phone: str
    email: str
    city: str
    avatarInitials: str
    isOnboarded: bool
    isVerified: bool
    status: Optional[str] = "active"
    linkedId: Optional[str] = None
    permissions: Optional[List[str]] = None
    departmentRole: Optional[str] = None
    scope: Optional[str] = None
    isNewUser: Optional[bool] = False

    @classmethod
    def from_user(cls, user: User) -> "AccountResponse":
        name = user.display_name or user.phone or user.email or "QuickPress User"
        initials = "".join(part[0] for part in name.split()[:2]).upper() or "QP"
        user_status = user.status.value if hasattr(user.status, "value") else str(user.status)
        return cls(
            id=user.id,
            role=user.role,
            name=name,
            phone=user.phone or "",
            email=user.email or "",
            city=user.city or "",
            avatarInitials=initials,
            isOnboarded=user.is_onboarded,
            isVerified=user.is_verified,
            status=user_status,
            linkedId=user.linked_id,
            permissions=None,
            departmentRole=None,
            scope=None,
        )


class AuthSessionResponse(BaseModel):
    token: str
    refreshToken: str
    expiresAt: str
    account: AccountResponse
