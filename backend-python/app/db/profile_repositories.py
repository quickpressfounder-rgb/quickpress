"""Customer profile + settings repositories — Sprint 2.6.

Collections
-----------
`users`               the authenticated identity (name, phone, email, city,
                      photo_url, created_at) — already created at sign-up.
`customers`           the customer role profile document.
`customer_settings`   one document per customer: theme, language,
                      notification preferences and privacy preferences.

    {_id: <userId>, theme, language, notifications: {...}, privacy: {...},
     updatedAt}
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from app.db.client import database
from app.db.repositories import users
from app.models.profile import (
    ProfileResponse,
    ProfileUpdatePayload,
    SettingsResponse,
    SettingsUpdatePayload,
)
from app.models.user import User, utcnow

SETTINGS_COLLECTION = "customer_settings"


def initials_for(name: str) -> str:
    parts = [part for part in str(name or "").split() if part]
    if not parts:
        return "QP"
    first = parts[0][0]
    last = parts[-1][0] if len(parts) > 1 else ""
    return (first + last).upper()


def _member_since(value: Any) -> str:
    if isinstance(value, datetime):
        return value.strftime("%B %Y")
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%B %Y")
        except ValueError:
            return ""
    return ""


def to_profile(user: User, unread: int = 0) -> ProfileResponse:
    name = user.display_name or user.phone or ""
    return ProfileResponse(
        id=user.id,
        name=name,
        initials=initials_for(name) if name else "QP",
        avatarInitials=initials_for(name) if name else "QP",
        avatarUrl=user.photo_url,
        photoUrl=user.photo_url,
        phone=user.phone or "",
        email=user.email or "",
        city=user.city or "",
        memberSince=_member_since(user.created_at),
        isVerified=user.is_verified,
        isOnboarded=user.is_onboarded,
        role=user.role.value,
        unreadNotifications=unread,
    )


class ProfileRepository:
    async def get(self, user: User) -> ProfileResponse:
        return to_profile(user)

    async def update(self, user: User, payload: ProfileUpdatePayload) -> ProfileResponse:
        changes: Dict[str, Any] = {}
        if payload.name is not None:
            name_val = payload.name.strip()
            changes["display_name"] = name_val
            changes["name"] = name_val
            changes["is_onboarded"] = True
        if payload.email is not None:
            changes["email"] = payload.email.strip()
        if payload.city is not None:
            changes["city"] = payload.city.strip()
        if payload.phone is not None:
            phone_val = payload.phone.strip()
            # If user does not have a phone or is linking their mobile number:
            if phone_val and (not user.phone or not user.phone.strip() or user.phone == "Not linked"):
                # Check if this mobile number is already linked to another account in the system
                existing = await users.by_phone(phone_val, role=user.role)
                if existing and str(existing.id) != str(user.id):
                    raise ValueError(
                        "This mobile number is already registered with another account. Please use a different number or log in with this number."
                    )
                changes["phone"] = phone_val
                await database.collection("customers").update_many(
                    {"$or": [{"_id": user.id}, {"userId": user.id}, {"user_id": user.id}]},
                    {"$set": {"phone": phone_val}},
                )
        if changes:
            await users.update(user.id, changes)
        refreshed = await users.by_id(user.id)
        return to_profile(refreshed or user)

    async def set_photo(self, user: User, photo: str) -> ProfileResponse:
        # Cloudinary owns the bytes; MongoDB stores only the secure URL.
        from app.core.cloudinary import upload_image

        url = await upload_image(photo, kind="customer_photo", public_id=user.id)
        await users.update(user.id, {"photo_url": url})
        refreshed = await users.by_id(user.id)
        return to_profile(refreshed or user)

    async def delete_account(self, user: User) -> Dict[str, Any]:
        """Permanently delete / wipe the user's account and associated data from MongoDB."""
        from app.core.firebase import revoke_refresh_tokens
        from app.db.repositories import refresh_tokens

        # 1. Revoke refresh tokens
        await refresh_tokens.revoke_all_for_user(user.id)
        if user.firebase_uid:
            revoke_refresh_tokens(user.firebase_uid)
            try:
                from firebase_admin import auth as firebase_auth
                from app.core.firebase import _firebase_app
                if _firebase_app() is not None:
                    firebase_auth.delete_user(user.firebase_uid)
            except Exception:
                pass

        # 2. Delete user settings
        await database.collection(SETTINGS_COLLECTION).delete_many({"_id": user.id})

        # 3. Delete saved addresses
        await database.collection("customer_addresses").delete_many({"userId": user.id})
        await database.collection("addresses").delete_many({"userId": user.id})

        # 4. Delete saved payment methods & active carts
        await database.collection("payment_methods").delete_many({"$or": [{"user_id": user.id}, {"userId": user.id}]})
        await database.collection("cart_items").delete_many({"$or": [{"user_id": user.id}, {"userId": user.id}]})
        await database.collection("carts").delete_many({"$or": [{"_id": user.id}, {"user_id": user.id}, {"userId": user.id}]})

        # 5. Delete role profiles & notifications
        await database.collection("customers").delete_many({"$or": [{"_id": user.id}, {"user_id": user.id}, {"userId": user.id}]})
        await database.collection("notifications").delete_many({"$or": [{"user_id": user.id}, {"userId": user.id}]})

        # 6. Delete user record from users collection
        await database.collection("users").delete_one({"_id": user.id})

        return {"ok": True, "message": "Account successfully deleted"}


class SettingsRepository:
    @property
    def _c(self):
        return database.collection(SETTINGS_COLLECTION)

    async def get(self, user_id: str) -> SettingsResponse:
        document: Optional[Dict[str, Any]] = await self._c.find_one({"_id": user_id})
        if not document:
            return SettingsResponse()
        data = {k: v for k, v in document.items() if k != "_id"}
        return SettingsResponse(**data)

    async def update(self, user_id: str, payload: SettingsUpdatePayload) -> SettingsResponse:
        current = await self.get(user_id)
        patch = payload.model_dump(exclude_unset=True, exclude_none=True)
        merged = {**current.model_dump(), **patch, "updatedAt": utcnow().isoformat()}
        await self._c.update_one({"_id": user_id}, {"$set": merged}, upsert=True)
        return SettingsResponse(**merged)


profile_repository = ProfileRepository()
settings_repository = SettingsRepository()
