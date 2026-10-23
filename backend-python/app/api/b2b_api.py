"""QuickPress B2B Bulk Order Partner Registration & Admin Operations API.

Provides:
1. POST /api/b2b/register — Public endpoint for commercial clients (Hotels, Hospitals, PGs, Corporates)
   to register for regular bulk laundry contracts and receive an instant unique B2B ID.
2. GET  /api/b2b/partners — List all B2B partner leads and contracts for Admin Panel.
3. PATCH /api/b2b/partners/{id}/status — Update lead status, assign Key Account Manager, or log contact notes.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db.client import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/b2b", tags=["b2b-enterprise"])

B2B_COLLECTION = "b2b_partners"


class B2BRegisterPayload(BaseModel):
    businessName: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., description="Hotel, Hospital, Hostel, Restaurant, Salon, Corporate")
    address: str = Field(..., min_length=3, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., min_length=5, max_length=10)
    unitsCount: Optional[str] = Field("1 Unit", max_length=50)
    contactName: str = Field(..., min_length=2, max_length=100)
    designation: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    whatsapp: Optional[str] = Field(None, max_length=15)
    email: str = Field(..., min_length=5, max_length=150)
    dailyVolume: str = Field(..., description="e.g. 150-500 kg/day")
    frequency: str = Field(..., description="e.g. Daily 2x, Daily 1x, Alternate Days")
    services: List[str] = Field(default_factory=list)
    sla: Optional[str] = Field("24 Hours Express Turnaround", max_length=100)
    gstin: Optional[str] = Field(None, max_length=20)
    pan: Optional[str] = Field(None, max_length=15)
    billingModel: Optional[str] = Field("Per Kg Weight Basis", max_length=100)
    creditTerms: Optional[str] = Field("Weekly Invoicing", max_length=100)
    trialRequested: bool = Field(True)
    trialDate: Optional[str] = Field(None, max_length=50)
    specialNotes: Optional[str] = Field(None, max_length=1000)


class B2BStatusUpdatePayload(BaseModel):
    status: str = Field(..., description="NEW_INQUIRY | CONTACTED | TRIAL_SCHEDULED | CONTRACT_ACTIVE | CLOSED")
    notes: Optional[str] = Field(None, max_length=1000)
    accountManager: Optional[str] = Field(None, max_length=100)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_b2b_partner(payload: B2BRegisterPayload) -> Dict[str, Any]:
    """Public endpoint: Commercial client registers for bulk laundry setup."""
    now_iso = datetime.now(timezone.utc).isoformat()
    random_num = random.randint(100000, 999999)
    b2b_id = f"QP-B2B-{random_num}"

    doc = {
        "_id": b2b_id,
        "id": b2b_id,
        "b2bId": b2b_id,
        "businessName": payload.businessName.strip(),
        "category": payload.category.strip(),
        "address": payload.address.strip(),
        "city": payload.city.strip(),
        "pincode": payload.pincode.strip(),
        "unitsCount": payload.unitsCount or "1 Unit",
        "contactName": payload.contactName.strip(),
        "designation": payload.designation.strip(),
        "phone": payload.phone.strip(),
        "whatsapp": payload.whatsapp.strip() if payload.whatsapp else payload.phone.strip(),
        "email": payload.email.strip().lower(),
        "dailyVolume": payload.dailyVolume,
        "frequency": payload.frequency,
        "services": payload.services,
        "sla": payload.sla,
        "gstin": payload.gstin.strip().upper() if payload.gstin else None,
        "pan": payload.pan.strip().upper() if payload.pan else None,
        "billingModel": payload.billingModel,
        "creditTerms": payload.creditTerms,
        "trialRequested": payload.trialRequested,
        "trialDate": payload.trialDate,
        "specialNotes": payload.specialNotes,
        "status": "NEW_INQUIRY",
        "accountManager": "Corporate Relations Desk",
        "contactLogs": [],
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    try:
        await database.insert(B2B_COLLECTION, doc)
        logger.info(f"[B2B] Successfully registered B2B client {b2b_id}: {payload.businessName}")
    except Exception as err:
        logger.error(f"[B2B] Failed to insert to database: {err}")

    return {
        "success": True,
        "b2bId": b2b_id,
        "message": "Official B2B Registration Completed Successfully",
        "data": doc,
    }


@router.get("/partners")
async def list_b2b_partners(
    query: Optional[str] = Query(None, description="Search by name, ID, phone, city"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by industry category"),
) -> Dict[str, Any]:
    """Admin endpoint: Fetch all B2B bulk laundry clients and inquiries."""
    try:
        filter_dict: Dict[str, Any] = {}
        if status and status.lower() != "all":
            filter_dict["status"] = status.upper()
        if category and category.lower() != "all":
            filter_dict["category"] = category

        items = await database.find_many(B2B_COLLECTION, filter_dict)
    except Exception as err:
        logger.warning(f"[B2B] Database read fallback: {err}")
        items = []

    # Filter by search query if provided
    if query and query.strip():
        q = query.strip().lower()
        items = [
            it for it in items
            if q in str(it.get("b2bId", "")).lower()
            or q in str(it.get("businessName", "")).lower()
            or q in str(it.get("contactName", "")).lower()
            or q in str(it.get("phone", "")).lower()
            or q in str(it.get("city", "")).lower()
            or q in str(it.get("email", "")).lower()
        ]

    # Sort newest first
    items.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)

    return {
        "total": len(items),
        "items": items,
    }


@router.patch("/partners/{b2b_id}/status")
async def update_b2b_status(
    b2b_id: str,
    payload: B2BStatusUpdatePayload,
) -> Dict[str, Any]:
    """Admin endpoint: Update B2B partner status, append contact notes, or assign manager."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = await database.find_one(B2B_COLLECTION, {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]})
    if not record:
        raise HTTPException(status_code=404, detail=f"B2B Partner {b2b_id} not found")

    contact_logs = record.get("contactLogs") or []
    if payload.notes and payload.notes.strip():
        contact_logs.append({
            "timestamp": now_iso,
            "note": payload.notes.strip(),
            "status": payload.status,
            "manager": payload.accountManager or record.get("accountManager") or "Admin",
        })

    update_fields = {
        "status": payload.status,
        "contactLogs": contact_logs,
        "updatedAt": now_iso,
    }
    if payload.accountManager:
        update_fields["accountManager"] = payload.accountManager

    await database.update(
        B2B_COLLECTION,
        {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]},
        update_fields,
    )

    return {
        "success": True,
        "b2bId": b2b_id,
        "status": payload.status,
        "message": f"B2B Partner status updated to {payload.status}",
    }
