"""
Identity Guard — Strict 1-to-1 Credential Uniqueness Across QuickPress.

Enforces zero duplicates across:
1. Mobile number: Exactly 1 User account across the entire system.
2. Aadhaar number: Exactly 1 Partner or Rider account across the platform.
3. PAN number: Exactly 1 Partner or Rider business entity.
4. Driving License (DL): Exactly 1 Rider captain account.
5. Vehicle Registration (RC): Exactly 1 Rider captain vehicle.
"""
from __future__ import annotations

import re
import logging
from typing import Optional

from fastapi import HTTPException, status

from app.db.client import database

logger = logging.getLogger(__name__)


def clean_digits(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r"\D", "", str(val))


def normalize_phone_10(phone: Optional[str]) -> str:
    digits = clean_digits(phone)
    return digits[-10:] if len(digits) >= 10 else digits


def phone_candidates(phone: Optional[str]) -> list[str]:
    p10 = normalize_phone_10(phone)
    if not p10:
        return []
    return list({
        p10,
        f"+91{p10}",
        f"+91 {p10}",
        f"91{p10}",
        f"0{p10}",
    })


async def assert_phone_unique(
    phone: str,
    allowed_user_id: Optional[str] = None,
    target_role: Optional[str] = None,
) -> None:
    """Ensure phone number does not exist on any other account of the same role."""
    candidates = phone_candidates(phone)
    if not candidates:
        return

    query: dict = {"phone": {"$in": candidates}}
    if target_role:
        query["role"] = str(target_role).lower()
    if allowed_user_id:
        query["_id"] = {"$ne": str(allowed_user_id)}

    existing_user = await database.collection("users").find_one(query)
    if existing_user:
        u_role = str(existing_user.get("role") or target_role or "account").capitalize()
        last4 = candidates[0][-4:]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This mobile number (ending in {last4}) is already registered with another {u_role} account. Only 1 {u_role} account is permitted per mobile number.",
        )


async def assert_aadhaar_unique(
    aadhaar: str,
    allowed_entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
) -> None:
    """Ensure Aadhaar is not registered across accounts within the same entity type or platform."""
    clean_a = clean_digits(aadhaar)
    if len(clean_a) != 12:
        return

    exclude = {"_id": {"$ne": str(allowed_entity_id)}} if allowed_entity_id else {}
    last4 = clean_a[-4:]

    # Check rider profiles if entity_type is 'rider' or unspecified
    if entity_type in ("rider", None):
        dup_rider = await database.collection("rider_profiles").find_one({
            "$or": [{"aadhaar": clean_a}, {"aadhaarNumber": clean_a}],
            **exclude,
        }) or await database.collection("riders").find_one({
            "$or": [{"aadhaar": clean_a}, {"aadhaarNumber": clean_a}],
            **exclude,
        })
        if dup_rider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This Aadhaar number (XXXX-XXXX-{last4}) is already registered with another Captain account. UIDAI guidelines permit only 1 account per Aadhaar.",
            )

    # Check partner profiles if entity_type is 'partner' or unspecified
    if entity_type in ("partner", None):
        dup_partner = await database.collection("partner_profiles").find_one({
            "$or": [{"aadhaar": clean_a}, {"aadhaarNumber": clean_a}],
            **exclude,
        }) or await database.collection("partners").find_one({
            "$or": [{"aadhaar": clean_a}, {"aadhaarNumber": clean_a}],
            **exclude,
        })
        if dup_partner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This Aadhaar number (XXXX-XXXX-{last4}) is already registered with a Partner Store ({dup_partner.get('businessName') or 'Partner'}).",
            )


async def assert_pan_unique(
    pan: str,
    allowed_entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
) -> None:
    """Ensure PAN is not registered across accounts within the same entity type or platform."""
    clean_p = (pan or "").strip().upper().replace(" ", "")
    if len(clean_p) != 10:
        return

    exclude = {"_id": {"$ne": str(allowed_entity_id)}} if allowed_entity_id else {}

    # Check partner profiles if entity_type is 'partner' or unspecified
    if entity_type in ("partner", None):
        dup_partner = await database.collection("partner_profiles").find_one({
            "$or": [{"pan": clean_p}, {"panNumber": clean_p}],
            **exclude,
        }) or await database.collection("partners").find_one({
            "$or": [{"pan": clean_p}, {"panNumber": clean_p}],
            **exclude,
        })
        if dup_partner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This PAN card ({clean_p}) is already registered with a Partner Store ({dup_partner.get('businessName') or 'Partner'}).",
            )

    # Check rider profiles if entity_type is 'rider' or unspecified
    if entity_type in ("rider", None):
        dup_rider = await database.collection("rider_profiles").find_one({
            "$or": [{"pan": clean_p}, {"panNumber": clean_p}],
            **exclude,
        }) or await database.collection("riders").find_one({
            "$or": [{"pan": clean_p}, {"panNumber": clean_p}],
            **exclude,
        })
        if dup_rider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This PAN card ({clean_p}) is already registered with another Captain account.",
            )


async def assert_dl_unique(
    dl: str,
    allowed_entity_id: Optional[str] = None,
) -> None:
    """Ensure Driving License is not registered across any rider profile."""
    clean_dl = re.sub(r"[^A-Za-z0-9]", "", dl or "").upper()
    if len(clean_dl) < 8:
        return

    exclude = {"_id": {"$ne": str(allowed_entity_id)}} if allowed_entity_id else {}

    dup = await database.collection("rider_profiles").find_one({
        "$or": [
            {"dl": clean_dl},
            {"dlNumber": clean_dl},
            {"drivingLicenseNumber": clean_dl},
        ],
        **exclude,
    })
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This Driving License ({clean_dl}) is already registered with another Captain account.",
        )


async def assert_rc_unique(
    rc: str,
    allowed_entity_id: Optional[str] = None,
) -> None:
    """Ensure Vehicle RC is not registered across any rider profile."""
    clean_rc = re.sub(r"[^A-Za-z0-9]", "", rc or "").upper()
    if len(clean_rc) < 6:
        return

    exclude = {"_id": {"$ne": str(allowed_entity_id)}} if allowed_entity_id else {}

    dup = await database.collection("rider_profiles").find_one({
        "$or": [
            {"rc": clean_rc},
            {"vehicleNumber": clean_rc},
            {"vehiclePlate": clean_rc},
        ],
        **exclude,
    })
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This vehicle registration ({clean_rc}) is already registered with another Captain account.",
        )
