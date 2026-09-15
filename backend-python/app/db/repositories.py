"""Repositories — the only place that knows about collection shapes."""

from __future__ import annotations

import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.db.client import database
from app.models.user import ROLE_COLLECTIONS, Role, RoleProfile, User, UserStatus, utcnow


class UserRepository:
    collection_name = "users"

    @property
    def _c(self):
        return database.collection(self.collection_name)

    async def by_firebase_uid(self, firebase_uid: str, role: Optional[Role] = None) -> Optional[User]:
        query: Dict[str, Any] = {"firebase_uid": firebase_uid}
        if role is not None:
            query["role"] = role.value
        doc = await self._c.find_one(query)
        return User.from_document(doc) if doc else None

    async def by_id(self, user_id: str) -> Optional[User]:
        doc = await self._c.find_one({"_id": user_id})
        return User.from_document(doc) if doc else None

    async def by_email(self, email: str, role: Optional[Role] = None) -> Optional[User]:
        clean = email.strip().lower()
        query: Dict[str, Any] = {"email": {"$regex": f"^{re.escape(clean)}$", "$options": "i"}}
        if role is not None:
            query["role"] = role.value
        doc = await self._c.find_one(query)
        return User.from_document(doc) if doc else None

    async def by_phone(self, phone: str, role: Optional[Role] = None) -> Optional[User]:
        if not phone:
            return None
        digits = "".join(ch for ch in str(phone) if ch.isdigit())
        ten_digits = digits[-10:] if len(digits) >= 10 else digits
        candidates = list({
            str(phone).strip(),
            ten_digits,
            f"+91{ten_digits}",
            f"+91 {ten_digits}",
            f"91{ten_digits}",
            f"0{ten_digits}",
        })
        query: Dict[str, Any] = {"phone": {"$in": candidates}}
        if role is not None:
            query["role"] = role.value
        doc = await self._c.find_one(query)
        if doc:
            return User.from_document(doc)

        # Fallback check in customers collection
        if role in (Role.customer, None):
            cust = await database.collection("customers").find_one({"phone": {"$in": candidates}})
            if cust:
                user_id = cust.get("userId") or cust.get("user_id") or cust.get("_id")
                if user_id:
                    user_doc = await self._c.find_one({"_id": user_id})
                    if user_doc:
                        return User.from_document(user_doc)
        return None

    async def create(self, user: User) -> User:
        await self._c.insert_one(user.to_document())
        await self._ensure_role_profile(user)
        return user

    async def update(self, user_id: str, changes: Dict[str, Any]) -> None:
        changes = {**changes, "updated_at": utcnow().isoformat()}
        await self._c.update_one({"_id": user_id}, {"$set": changes})

    async def _ensure_role_profile(self, user: User) -> None:
        """Every authenticated user gets linked to their actual role profile document."""
        clean_phone = (user.phone or "").replace("+91", "").replace("+", "").strip()
        phone_candidates = [user.phone, clean_phone, f"+91{clean_phone}", f"+91 {clean_phone}"]

        if user.role == Role.rider:
            # Look for existing rider profile by userId or phone
            profile = await database.collection("rider_profiles").find_one({
                "$or": [
                    {"userId": user.id},
                    {"phone": {"$in": phone_candidates}},
                    {"mobile": {"$in": phone_candidates}},
                ]
            })
            if profile:
                rider_id = profile.get("riderId") or profile.get("_id")
                profile_status = str(profile.get("status") or "").lower()
                kyc_status = str(profile.get("kycStatus") or "").lower()
                is_verified = bool(
                    profile.get("isVerified", False)
                    or profile_status == "approved"
                    or (profile_status == "active" and kyc_status == "verified")
                )
                full_name = profile.get("fullName") or profile.get("name") or user.display_name
                city = profile.get("city") or user.city or "Kasganj"

                await database.collection("rider_profiles").update_one(
                    {"_id": profile["_id"]},
                    {"$set": {"userId": user.id, "riderId": str(rider_id)}}
                )
                await database.collection("riders").update_one(
                    {"user_id": user.id},
                    {"$set": {"rider_id": str(rider_id), "user_id": user.id, "status": "active" if is_verified else "pending", "is_verified": is_verified}},
                    upsert=True
                )
                await self.update(user.id, {
                    "linked_id": str(rider_id),
                    "is_onboarded": True,
                    "is_verified": is_verified,
                    "status": "active" if is_verified else "pending",
                    "display_name": full_name,
                    "city": city,
                })
                user.linked_id = str(rider_id)
                user.is_onboarded = True
                user.is_verified = is_verified
                user.status = UserStatus.active if is_verified else UserStatus.pending
                user.display_name = full_name
                user.city = city
                return
            else:
                # NO rider profile found in rider_profiles (not registered in admin system)
                await self.update(user.id, {
                    "linked_id": None,
                    "is_onboarded": False,
                    "is_verified": False,
                    "status": "pending",
                })
                user.linked_id = None
                user.is_onboarded = False
                user.is_verified = False
                user.status = UserStatus.pending
                return

        elif user.role == Role.partner:
            # Look for existing partner profile by userId or phone
            profile = await database.collection("partner_profiles").find_one({
                "$or": [
                    {"userId": user.id},
                    {"phone": {"$in": phone_candidates}},
                    {"ownerPhone": {"$in": phone_candidates}},
                ]
            })
            if profile:
                partner_id = profile.get("partnerId") or profile.get("_id")
                is_verified = bool(profile.get("isVerified", False) or profile.get("status") == "active")
                business_name = profile.get("businessName") or profile.get("name") or user.display_name
                city = profile.get("city") or user.city or "Kasganj"

                await database.collection("partner_profiles").update_one(
                    {"_id": profile["_id"]},
                    {"$set": {"userId": user.id, "partnerId": str(partner_id)}}
                )
                await database.collection("partners").update_one(
                    {"user_id": user.id},
                    {"$set": {"partner_id": str(partner_id), "user_id": user.id}},
                    upsert=True
                )
                await self.update(user.id, {
                    "linked_id": str(partner_id),
                    "linked_partner_id": str(partner_id),
                    "is_onboarded": True,
                    "is_verified": is_verified,
                    "display_name": business_name,
                    "city": city,
                })
                user.linked_id = str(partner_id)
                user.is_onboarded = True
                user.is_verified = is_verified
                user.display_name = business_name
                user.city = city
                return

        name = ROLE_COLLECTIONS[user.role]
        existing = await database.collection(name).find_one({"user_id": user.id})
        if existing:
            return
        if user.role == Role.rider:
            profile_id = f"RDR-{random.randint(100000, 999999)}"
        elif user.role == Role.partner:
            profile_id = f"PRT-{random.randint(100000, 999999)}"
        elif user.role == Role.customer:
            profile_id = f"CUST-{random.randint(100000, 999999)}"
        else:
            profile_id = str(uuid.uuid4())

        profile_doc = RoleProfile(
            id=profile_id,
            user_id=user.id,
            firebase_uid=user.firebase_uid,
            status=user.status,
        )
        await database.collection(name).insert_one(profile_doc.to_document())
        await self.update(user.id, {"linked_id": profile_doc.id})
        user.linked_id = profile_doc.id

    async def upsert_from_firebase(
        self,
        *,
        firebase_uid: str,
        role: Role,
        phone: Optional[str],
        email: Optional[str],
        display_name: Optional[str],
        photo_url: Optional[str],
    ) -> User:
        existing = await self.by_firebase_uid(firebase_uid, role=role)
        if not existing and phone:
            existing = await self.by_phone(phone, role=role)
        if not existing and email:
            existing = await self.by_email(email, role=role)

        if existing:
            changes: Dict[str, Any] = {"role": role.value}
            if firebase_uid and firebase_uid != existing.firebase_uid:
                changes["firebase_uid"] = firebase_uid
            if phone and phone != existing.phone:
                changes["phone"] = phone
            if email and email != existing.email:
                changes["email"] = email
            if display_name and display_name != existing.display_name:
                changes["display_name"] = display_name
            if photo_url and photo_url != existing.photo_url:
                changes["photo_url"] = photo_url
            if changes:
                await self.update(existing.id, changes)
            await self._ensure_role_profile(existing)
            refreshed = await self.by_id(existing.id)
            return refreshed or existing

        user = User(
            id=str(uuid.uuid4()),
            firebase_uid=firebase_uid,
            role=role,
            phone=phone,
            email=email,
            display_name=display_name,
            photo_url=photo_url,
            status=UserStatus.active if role in (Role.customer, Role.admin) else UserStatus.pending,
            is_verified=role in (Role.customer, Role.admin),
            is_onboarded=role in (Role.customer, Role.admin),
        )
        created = await self.create(user)
        await self._ensure_role_profile(created)
        refreshed = await self.by_id(created.id)
        return refreshed or created

    async def create_phone_user(self, *, phone: str, role: Role) -> User:
        existing = await self.by_phone(phone, role)
        if existing:
            await self._ensure_role_profile(existing)
            refreshed = await self.by_id(existing.id)
            return refreshed or existing
        user = User(
            id=str(uuid.uuid4()),
            firebase_uid=f"phone-{phone}",
            role=role,
            phone=phone,
            status=UserStatus.active if role in (Role.customer, Role.admin) else UserStatus.pending,
            is_verified=role in (Role.customer, Role.admin),
            is_onboarded=role in (Role.customer, Role.admin),
        )
        created = await self.create(user)
        await self._ensure_role_profile(created)
        refreshed = await self.by_id(created.id)
        return refreshed or created


class RefreshTokenRepository:
    collection_name = "refresh_tokens"

    @property
    def _c(self):
        return database.collection(self.collection_name)

    async def store(self, token_id: str, user_id: str, expires_at: datetime) -> None:
        await self._c.insert_one(
            {
                "_id": token_id,
                "token_id": token_id,
                "user_id": user_id,
                "expires_at": expires_at.isoformat(),
                "created_at": utcnow().isoformat(),
                "revoked": False,
            }
        )

    async def is_active(self, token_id: str) -> bool:
        doc = await self._c.find_one({"token_id": token_id})
        return bool(doc) and not doc.get("revoked", False)

    async def revoke(self, token_id: str) -> None:
        await self._c.update_one({"token_id": token_id}, {"$set": {"revoked": True}})

    async def revoke_all_for_user(self, user_id: str) -> None:
        await self._c.update_one({"user_id": user_id}, {"$set": {"revoked": True}})


class OtpAttemptRepository:
    """Server-side audit + rate limit. Firebase performs the actual SMS delivery."""

    collection_name = "otp_attempts"

    @property
    def _c(self):
        return database.collection(self.collection_name)

    async def record(self, phone: str, role: Role) -> None:
        await self._c.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "phone": phone,
                "role": role.value,
                "created_at": utcnow().isoformat(),
            }
        )

    async def sends_in_last_hour(self, phone: str) -> int:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        return await self._c.count_documents({"phone": phone, "created_at": {"$gt": cutoff}})


users = UserRepository()
refresh_tokens = RefreshTokenRepository()
otp_attempts = OtpAttemptRepository()
