"""QuickPress B2B Bulk Order Partner Registration & Enterprise Admin Operations API.

Provides:
1. Public endpoints:
   - POST /api/b2b/register — Commercial client registration
   - GET  /api/b2b/partners — List B2B partner leads
   - PATCH /api/b2b/partners/{id}/status — Update lead status

2. Enterprise Admin Operations (/api/b2b/admin/...):
   - GET  /api/b2b/admin/stats — Top KPI Ribbon metrics & Aging A/R summary
   - GET  /api/b2b/admin/clients — Master Corporate Clients Directory & Rate Cards
   - POST /api/b2b/admin/clients — Direct Admin Creation of Commercial Account
   - PUT  /api/b2b/admin/clients/{b2b_id}/contract — Dynamic Rate Card Builder & Credit Limits
   - GET  /api/b2b/admin/orders — Bulk Orders Queue & Dual Scale Weigh-in Verification
   - POST /api/b2b/admin/orders — Schedule Commercial Bulk Order / Dispatch
   - PATCH /api/b2b/admin/orders/{order_id}/assign — Assign Cargo Driver & Hub
   - PATCH /api/b2b/admin/orders/{order_id}/weigh-in — Record Scale Readings & Discrepancy Flag
   - PATCH /api/b2b/admin/orders/{order_id}/status — Progress Logistics Delivery Status
   - GET  /api/b2b/admin/invoices — Monthly GST B2B Tax Invoices & Aging Receivables
   - POST /api/b2b/admin/invoices/generate — Auto-Compile GST Tax Invoice (HSN 9987)
   - POST /api/b2b/admin/invoices/{invoice_id}/pay — Record Offline Bank UTR Payment
   - GET  /api/b2b/admin/invoices/{invoice_id}/pdf — Download GST Tax Invoice PDF
   - POST /api/b2b/admin/leads/{lead_id}/trial — Schedule 20 kg Free Commercial Trial
   - POST /api/b2b/admin/leads/{lead_id}/convert — 1-Click Convert Lead to Active Contract
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.db.client import database
from app.services.b2b_invoice_generator import generate_b2b_invoice_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/b2b", tags=["b2b-enterprise"])

B2B_CLIENTS_COL = "b2b_partners"
B2B_ORDERS_COL = "b2b_orders"
B2B_INVOICES_COL = "b2b_invoices"


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
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
    creditTerms: Optional[str] = Field("NET_15_DAYS", max_length=100)
    trialRequested: bool = Field(True)
    trialDate: Optional[str] = Field(None, max_length=50)
    specialNotes: Optional[str] = Field(None, max_length=1000)


class B2BStatusUpdatePayload(BaseModel):
    status: str = Field(..., description="NEW_INQUIRY | CONTACTED | TRIAL_SCHEDULED | CONTRACT_ACTIVE | SUSPENDED | CLOSED")
    notes: Optional[str] = Field(None, max_length=1000)
    accountManager: Optional[str] = Field(None, max_length=100)


class B2BContractUpdatePayload(BaseModel):
    baseRatePerKg: float = Field(..., ge=1.0)
    itemizedRates: Optional[Dict[str, float]] = Field(default_factory=dict)
    addons: Optional[Dict[str, float]] = Field(default_factory=dict)
    billingCycle: str = Field("MONTHLY", description="WEEKLY | BI_WEEKLY | MONTHLY")
    creditTerms: str = Field("NET_15_DAYS", description="NET_7_DAYS | NET_15_DAYS | NET_30_DAYS")
    creditLimit: float = Field(50000.0, ge=0.0)
    autoHoldEnabled: bool = Field(True)
    assignedHubId: Optional[str] = None
    assignedHubName: Optional[str] = None
    sla: Optional[str] = "24 Hours Express"
    accountManager: Optional[str] = None
    notes: Optional[str] = None


class B2BOrderCreatePayload(BaseModel):
    b2bId: str = Field(..., min_length=3)
    pickupDate: Optional[str] = None
    pickupSlot: Optional[str] = "09:00 AM - 11:00 AM"
    estimatedKg: float = Field(..., ge=1.0)
    bagCount: int = Field(1, ge=1)
    serviceType: Optional[str] = "Commercial Linen Wash & Press"
    specialInstructions: Optional[str] = None


class B2BOrderAssignPayload(BaseModel):
    driverId: Optional[str] = None
    driverName: Optional[str] = None
    driverPhone: Optional[str] = None
    vehicleType: Optional[str] = Field("cargo", description="cargo | van | auto | bike")
    hubId: Optional[str] = None
    hubName: Optional[str] = None


class B2BOrderWeighInPayload(BaseModel):
    stage: str = Field(..., description="doorstep | hub")
    scaleWeightKg: float = Field(..., ge=0.0)
    tareWeightKg: Optional[float] = Field(0.0, ge=0.0)
    bagBarcodes: Optional[List[str]] = None
    scalePhotoUrl: Optional[str] = None


class B2BOrderDeliveryPayload(BaseModel):
    storekeeperName: str = Field(..., min_length=2)
    signatureUrl: Optional[str] = None
    bayPhotoUrl: Optional[str] = None
    notes: Optional[str] = None


class B2BInvoiceGeneratePayload(BaseModel):
    b2bId: str = Field(..., min_length=3)
    billingPeriod: Optional[str] = None
    orderIds: Optional[List[str]] = None
    totalKg: Optional[float] = None
    ratePerKg: Optional[float] = None
    dueDateDays: Optional[int] = 15


class B2BPaymentPayload(BaseModel):
    utrNumber: str = Field(..., min_length=4)
    amount: float = Field(..., gt=0.0)
    paymentDate: Optional[str] = None
    bankName: Optional[str] = "Bank Transfer"
    tdsDeducted: Optional[float] = 0.0
    mode: Optional[str] = "NEFT / RTGS"
    remarks: Optional[str] = None


class B2BTrialSchedulePayload(BaseModel):
    trialDate: str = Field(..., min_length=4)
    pickupSlot: Optional[str] = "10:00 AM - 12:00 PM"
    assignedHubId: Optional[str] = None
    assignedHubName: Optional[str] = None
    trialKg: Optional[float] = 20.0
    instructions: Optional[str] = None


# -----------------------------------------------------------------------------
# Default Contract Template
# -----------------------------------------------------------------------------
DEFAULT_ITEMIZED_RATES = {
    "Single Bed Sheet": 20.0,
    "Double / King Bed Sheet": 30.0,
    "Pillow Cover": 7.0,
    "Bath Towel": 12.0,
    "Bath Mat": 15.0,
    "Duvet / Quilt Cover": 45.0,
    "Uniform / Scrub Set": 35.0,
}

DEFAULT_ADDONS = {
    "starchStiffFinish": 6.0,
    "severeStainRemoval": 15.0,
    "expressSurchargePct": 20.0,
}


def _calc_aging_bucket(due_date_str: Optional[str]) -> str:
    """Classify invoice aging based on due date."""
    if not due_date_str:
        return "current_0_15"
    try:
        now = datetime.now(timezone.utc)
        due = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        delta_days = (now - due).days
        if delta_days <= 0:
            return "current_0_15"
        elif delta_days <= 15:
            return "due_16_30"
        elif delta_days <= 45:
            return "overdue_31_60"
        else:
            return "critical_60_plus"
    except Exception:
        return "current_0_15"


# -----------------------------------------------------------------------------
# Public & Core Inbound Endpoints
# -----------------------------------------------------------------------------
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
        "sla": payload.sla or "24 Hours Express Turnaround",
        "gstin": payload.gstin.strip().upper() if payload.gstin else None,
        "pan": payload.pan.strip().upper() if payload.pan else None,
        "billingModel": payload.billingModel,
        "creditTerms": payload.creditTerms or "NET_15_DAYS",
        "trialRequested": payload.trialRequested,
        "trialDate": payload.trialDate,
        "specialNotes": payload.specialNotes,
        "status": "NEW_INQUIRY",
        "accountManager": "Corporate Relations Desk",
        "assignedHubId": None,
        "assignedHubName": "Central Hub",
        "contract": {
            "baseRatePerKg": 32.0,
            "itemizedRates": dict(DEFAULT_ITEMIZED_RATES),
            "addons": dict(DEFAULT_ADDONS),
            "billingCycle": "MONTHLY",
            "creditTerms": payload.creditTerms or "NET_15_DAYS",
            "creditLimit": 50000.0,
            "autoHoldEnabled": True,
            "sla": payload.sla or "24 Hours Express",
        },
        "currentBalance": 0.0,
        "totalOrdersCount": 0,
        "totalVolumeKg": 0.0,
        "contactLogs": [],
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    try:
        await database.insert(B2B_CLIENTS_COL, doc)
        logger.info(f"[B2B] Successfully registered B2B client {b2b_id}: {payload.businessName}")
        
        # Asynchronously dispatch Client Confirmation & Admin Alert Emails
        import asyncio
        from app.core.email_service import (
            send_b2b_inquiry_confirmation_email,
            send_b2b_inquiry_admin_alert_email,
        )
        from app.services.order_notifications import send_admin_notification

        asyncio.create_task(send_b2b_inquiry_confirmation_email(doc))
        asyncio.create_task(send_b2b_inquiry_admin_alert_email(doc))
        asyncio.create_task(
            send_admin_notification(
                title=f"New B2B Lead: {payload.businessName}",
                description=f"Inbound inquiry from {payload.contactName} ({payload.category}, {payload.dailyVolume}). Review dossier #{b2b_id}.",
                order_code=b2b_id,
            )
        )
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

        items = await database.find_many(B2B_CLIENTS_COL, filter_dict)
    except Exception as err:
        logger.warning(f"[B2B] Database read fallback: {err}")
        items = []

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
    record = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]})
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

    update_fields: Dict[str, Any] = {
        "status": payload.status,
        "contactLogs": contact_logs,
        "updatedAt": now_iso,
    }
    if payload.accountManager:
        update_fields["accountManager"] = payload.accountManager

    await database.update(
        B2B_CLIENTS_COL,
        {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]},
        update_fields,
    )

    return {
        "success": True,
        "b2bId": b2b_id,
        "status": payload.status,
        "message": f"B2B Partner status updated to {payload.status}",
    }


# -----------------------------------------------------------------------------
# Advanced Enterprise Admin Operations Endpoints
# -----------------------------------------------------------------------------

@router.get("/admin/stats")
async def get_b2b_admin_stats() -> Dict[str, Any]:
    """Top Dashboard KPI summary ribbon for B2B Enterprise."""
    try:
        clients = await database.find_many(B2B_CLIENTS_COL, {})
    except Exception:
        clients = []

    try:
        orders = await database.find_many(B2B_ORDERS_COL, {})
    except Exception:
        orders = []

    try:
        invoices = await database.find_many(B2B_INVOICES_COL, {})
    except Exception:
        invoices = []

    # 1. Active Corporate Clients
    active_clients = [c for c in clients if c.get("status") in ("CONTRACT_ACTIVE", "TRIAL_SCHEDULED")]
    active_accounts_count = len(active_clients)

    # 2. Today's Volume in Kg
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_volume_kg = 0.0
    for o in orders:
        created = str(o.get("createdAt", ""))
        pickup = str(o.get("pickupDate", ""))
        if today_str in created or today_str in pickup:
            net_kg = float(o.get("netKg") or o.get("hubScaleKg") or o.get("doorstepScaleKg") or o.get("estimatedKg") or 0.0)
            today_volume_kg += net_kg

    # 3. Monthly Billed GMV
    current_month_prefix = datetime.now(timezone.utc).strftime("%Y-%m")
    monthly_billing_gmv = 0.0
    for inv in invoices:
        inv_date = str(inv.get("invoiceDate") or inv.get("createdAt") or "")
        if current_month_prefix in inv_date:
            monthly_billing_gmv += float(inv.get("totalAmount") or inv.get("grandTotal") or 0.0)

    # 4. Outstanding Accounts Receivable & Aging Buckets
    outstanding_ar = 0.0
    aging_buckets = {
        "current_0_15": 0.0,
        "due_16_30": 0.0,
        "overdue_31_60": 0.0,
        "critical_60_plus": 0.0,
    }

    for inv in invoices:
        st = str(inv.get("status", "UNPAID")).upper()
        if st in ("UNPAID", "PARTIAL", "OVERDUE"):
            balance = float(inv.get("balanceDue") or inv.get("totalAmount") or 0.0)
            outstanding_ar += balance
            bucket = _calc_aging_bucket(inv.get("dueDate"))
            aging_buckets[bucket] = round(aging_buckets[bucket] + balance, 2)

    # 5. Active Cargo Dispatches
    active_statuses = {"SCHEDULED", "DISPATCHED_PICKUP", "PICKED_UP", "AT_HUB_PROCESSING", "READY_FOR_DELIVERY", "DISPATCHED_DELIVERY"}
    active_dispatches = sum(1 for o in orders if o.get("status") in active_statuses)

    return {
        "activeAccounts": active_accounts_count,
        "totalClientsCount": len(clients),
        "todayVolumeKg": round(today_volume_kg, 1),
        "monthlyBillingGmv": round(monthly_billing_gmv, 2),
        "outstandingAr": round(outstanding_ar, 2),
        "activeCargoDispatches": active_dispatches,
        "agingBuckets": aging_buckets,
    }


@router.get("/admin/clients")
async def list_admin_b2b_clients(
    query: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Fetch commercial clients master directory with rate cards, credit limits, and balances."""
    try:
        filter_dict: Dict[str, Any] = {}
        if status and status.lower() != "all":
            filter_dict["status"] = status.upper()
        if category and category.lower() != "all":
            filter_dict["category"] = category

        items = await database.find_many(B2B_CLIENTS_COL, filter_dict)
    except Exception as err:
        logger.warning(f"[B2B] Error fetching admin clients: {err}")
        items = []

    if query and query.strip():
        q = query.strip().lower()
        items = [
            it for it in items
            if q in str(it.get("b2bId", "")).lower()
            or q in str(it.get("businessName", "")).lower()
            or q in str(it.get("contactName", "")).lower()
            or q in str(it.get("phone", "")).lower()
            or q in str(it.get("city", "")).lower()
            or q in str(it.get("gstin", "")).lower()
        ]

    # Calculate real-time unpaid balance from invoices for each client
    try:
        invoices = await database.find_many(B2B_INVOICES_COL, {})
        client_balances: Dict[str, float] = {}
        for inv in invoices:
            c_id = str(inv.get("b2bId") or "")
            if inv.get("status") in ("UNPAID", "PARTIAL", "OVERDUE"):
                bal = float(inv.get("balanceDue") or inv.get("totalAmount") or 0.0)
                client_balances[c_id] = round(client_balances.get(c_id, 0.0) + bal, 2)
    except Exception:
        client_balances = {}

    # Attach balance and ensure default contract fields
    for it in items:
        cid = str(it.get("b2bId") or it.get("id") or "")
        it["currentBalance"] = client_balances.get(cid, float(it.get("currentBalance", 0.0)))
        if "contract" not in it or not isinstance(it["contract"], dict):
            it["contract"] = {
                "baseRatePerKg": 32.0,
                "itemizedRates": dict(DEFAULT_ITEMIZED_RATES),
                "addons": dict(DEFAULT_ADDONS),
                "billingCycle": "MONTHLY",
                "creditTerms": it.get("creditTerms") or "NET_15_DAYS",
                "creditLimit": 50000.0,
                "autoHoldEnabled": True,
                "sla": it.get("sla") or "24 Hours Express",
            }

    items.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)

    return {
        "total": len(items),
        "items": items,
    }


@router.post("/admin/clients", status_code=status.HTTP_201_CREATED)
async def create_admin_b2b_client(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Admin directly onboarding an institutional client contract."""
    now_iso = datetime.now(timezone.utc).isoformat()
    random_num = random.randint(100000, 999999)
    b2b_id = f"QP-B2B-{random_num}"

    b_name = str(payload.get("businessName", "")).strip()
    if not b_name:
        raise HTTPException(status_code=400, detail="Business Name is required")

    contract_data = payload.get("contract") or {}
    base_rate = float(contract_data.get("baseRatePerKg") or 32.0)
    itemized = contract_data.get("itemizedRates") or dict(DEFAULT_ITEMIZED_RATES)
    addons = contract_data.get("addons") or dict(DEFAULT_ADDONS)
    credit_limit = float(contract_data.get("creditLimit") or 50000.0)
    credit_terms = str(contract_data.get("creditTerms") or "NET_15_DAYS")
    billing_cycle = str(contract_data.get("billingCycle") or "MONTHLY")

    doc = {
        "_id": b2b_id,
        "id": b2b_id,
        "b2bId": b2b_id,
        "businessName": b_name,
        "category": payload.get("category", "Hotel"),
        "address": payload.get("address", "").strip(),
        "city": payload.get("city", "Kasganj").strip(),
        "pincode": payload.get("pincode", "207123").strip(),
        "unitsCount": payload.get("unitsCount", "1 Unit"),
        "contactName": payload.get("contactName", "").strip(),
        "designation": payload.get("designation", "General Manager").strip(),
        "phone": payload.get("phone", "").strip(),
        "whatsapp": payload.get("whatsapp") or payload.get("phone", "").strip(),
        "email": payload.get("email", "").strip().lower(),
        "dailyVolume": payload.get("dailyVolume", "200 kg/day"),
        "frequency": payload.get("frequency", "Daily 1x"),
        "services": payload.get("services") or ["Commercial Linen Wash", "Steam Ironing"],
        "sla": payload.get("sla", "24 Hours Express Turnaround"),
        "gstin": str(payload.get("gstin", "")).strip().upper() or None,
        "pan": str(payload.get("pan", "")).strip().upper() or None,
        "status": "CONTRACT_ACTIVE",
        "accountManager": payload.get("accountManager", "Key Accounts Lead"),
        "assignedHubId": payload.get("assignedHubId"),
        "assignedHubName": payload.get("assignedHubName", "Central Commercial Hub"),
        "contract": {
            "baseRatePerKg": base_rate,
            "itemizedRates": itemized,
            "addons": addons,
            "billingCycle": billing_cycle,
            "creditTerms": credit_terms,
            "creditLimit": credit_limit,
            "autoHoldEnabled": bool(contract_data.get("autoHoldEnabled", True)),
            "sla": payload.get("sla", "24 Hours Express Turnaround"),
        },
        "currentBalance": 0.0,
        "totalOrdersCount": 0,
        "totalVolumeKg": 0.0,
        "contactLogs": [
            {
                "timestamp": now_iso,
                "note": "Commercial Account Created via Admin Enterprise Desk",
                "status": "CONTRACT_ACTIVE",
                "manager": "Admin",
            }
        ],
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    await database.insert(B2B_CLIENTS_COL, doc)
    return {"success": True, "b2bId": b2b_id, "data": doc}


@router.put("/admin/clients/{b2b_id}/contract")
async def update_b2b_contract(
    b2b_id: str,
    payload: B2BContractUpdatePayload,
) -> Dict[str, Any]:
    """Update dynamic rate cards, itemized linen rates, credit limits, and assigned hub."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]})
    if not record:
        raise HTTPException(status_code=404, detail=f"B2B Client {b2b_id} not found")

    merged_itemized = dict(DEFAULT_ITEMIZED_RATES)
    if payload.itemizedRates:
        merged_itemized.update(payload.itemizedRates)

    merged_addons = dict(DEFAULT_ADDONS)
    if payload.addons:
        merged_addons.update(payload.addons)

    updated_contract = {
        "baseRatePerKg": payload.baseRatePerKg,
        "itemizedRates": merged_itemized,
        "addons": merged_addons,
        "billingCycle": payload.billingCycle,
        "creditTerms": payload.creditTerms,
        "creditLimit": payload.creditLimit,
        "autoHoldEnabled": payload.autoHoldEnabled,
        "sla": payload.sla or record.get("sla") or "24 Hours Express",
    }

    update_fields: Dict[str, Any] = {
        "contract": updated_contract,
        "creditTerms": payload.creditTerms,
        "updatedAt": now_iso,
    }
    if payload.assignedHubId:
        update_fields["assignedHubId"] = payload.assignedHubId
    if payload.assignedHubName:
        update_fields["assignedHubName"] = payload.assignedHubName
    if payload.sla:
        update_fields["sla"] = payload.sla
    if payload.accountManager:
        update_fields["accountManager"] = payload.accountManager

    if payload.notes:
        logs = record.get("contactLogs") or []
        logs.append({
            "timestamp": now_iso,
            "note": f"Contract updated: Base Rate ₹{payload.baseRatePerKg}/kg, Limit ₹{payload.creditLimit}. {payload.notes}",
            "status": record.get("status", "CONTRACT_ACTIVE"),
            "manager": payload.accountManager or "Admin",
        })
        update_fields["contactLogs"] = logs

    await database.update(
        B2B_CLIENTS_COL,
        {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]},
        update_fields,
    )

    return {
        "success": True,
        "b2bId": b2b_id,
        "message": "Commercial Contract & Rate Cards Updated Successfully",
        "contract": updated_contract,
    }


# -----------------------------------------------------------------------------
# Live Bulk Orders & Logistics Endpoints
# -----------------------------------------------------------------------------

@router.get("/admin/orders")
async def list_b2b_orders(
    status: Optional[str] = Query(None),
    b2b_id: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Live Commercial Orders Queue with dual scale weigh-in tracking."""
    try:
        filter_dict: Dict[str, Any] = {}
        if status and status.lower() != "all":
            filter_dict["status"] = status.upper()
        if b2b_id and b2b_id.lower() != "all":
            filter_dict["b2bId"] = b2b_id

        orders = await database.find_many(B2B_ORDERS_COL, filter_dict)
    except Exception as err:
        logger.warning(f"[B2B] Error reading orders: {err}")
        orders = []

    orders.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
    return {
        "total": len(orders),
        "items": orders,
    }


@router.post("/admin/orders", status_code=status.HTTP_201_CREATED)
async def create_b2b_order(payload: B2BOrderCreatePayload) -> Dict[str, Any]:
    """Schedule a commercial bulk pickup and generate multi-bag QR codes."""
    now_iso = datetime.now(timezone.utc).isoformat()
    client = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": payload.b2bId}, {"b2bId": payload.b2bId}, {"id": payload.b2bId}]})
    if not client:
        raise HTTPException(status_code=404, detail=f"B2B Client {payload.b2bId} not found")

    # Credit Auto-Hold Check
    contract = client.get("contract") or {}
    credit_limit = float(contract.get("creditLimit") or 50000.0)
    current_balance = float(client.get("currentBalance") or 0.0)
    auto_hold = contract.get("autoHoldEnabled", True)

    if auto_hold and current_balance > credit_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Credit Limit Exceeded: Outstanding ₹{current_balance:,.2f} exceeds approved limit ₹{credit_limit:,.2f}. Clear balance to resume pickups."
        )

    order_num = random.randint(1000, 9999)
    order_code = f"QP-B2B-{datetime.now().year}-{order_num}"
    bag_count = max(1, payload.bagCount)

    # Generate QR codes for each sealed bag: QP-B2B-9041-BAG-1/3
    bag_barcodes = [f"{order_code}-BAG-{i}/{bag_count}" for i in range(1, bag_count + 1)]

    order_doc = {
        "_id": order_code,
        "id": order_code,
        "orderCode": order_code,
        "b2bId": client.get("b2bId") or payload.b2bId,
        "businessName": client.get("businessName"),
        "category": client.get("category"),
        "address": client.get("address"),
        "city": client.get("city"),
        "contactName": client.get("contactName"),
        "phone": client.get("phone"),
        "pickupDate": payload.pickupDate or datetime.now().strftime("%Y-%m-%d"),
        "pickupSlot": payload.pickupSlot or "09:00 AM - 11:00 AM",
        "sla": client.get("sla") or "24 Hours Express",
        "estimatedKg": payload.estimatedKg,
        "doorstepScaleKg": None,
        "hubScaleKg": None,
        "tareWeightKg": 0.0,
        "netKg": None,
        "variancePercent": 0.0,
        "varianceStatus": "SAFE",
        "bagCount": bag_count,
        "bagBarcodes": bag_barcodes,
        "scannedBagsDoorstep": [],
        "scannedBagsHub": [],
        "assignedDriver": {
            "id": None,
            "name": "Fleet Cargo Desk",
            "phone": None,
            "vehicleType": "cargo",
        },
        "assignedHub": {
            "id": client.get("assignedHubId"),
            "name": client.get("assignedHubName", "Central Commercial Hub"),
        },
        "serviceType": payload.serviceType or "Commercial Linen Wash & Press",
        "specialInstructions": payload.specialInstructions,
        "status": "SCHEDULED",
        "billed": False,
        "invoiceId": None,
        "pod": None,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    await database.insert(B2B_ORDERS_COL, order_doc)

    # Update client order counter
    await database.update(
        B2B_CLIENTS_COL,
        {"$or": [{"_id": payload.b2bId}, {"b2bId": payload.b2bId}]},
        {"$inc": {"totalOrdersCount": 1}},
    )

    return {"success": True, "order": order_doc}


@router.patch("/admin/orders/{order_id}/assign")
async def assign_b2b_order_logistics(
    order_id: str,
    payload: B2BOrderAssignPayload,
) -> Dict[str, Any]:
    """Assign or reassign cargo driver and processing laundromat hub."""
    now_iso = datetime.now(timezone.utc).isoformat()
    order = await database.find_one(B2B_ORDERS_COL, {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]})
    if not order:
        raise HTTPException(status_code=404, detail=f"B2B Order {order_id} not found")

    driver_info = order.get("assignedDriver") or {}
    if payload.driverId:
        driver_info["id"] = payload.driverId
    if payload.driverName:
        driver_info["name"] = payload.driverName
    if payload.driverPhone:
        driver_info["phone"] = payload.driverPhone
    if payload.vehicleType:
        driver_info["vehicleType"] = payload.vehicleType

    hub_info = order.get("assignedHub") or {}
    if payload.hubId:
        hub_info["id"] = payload.hubId
    if payload.hubName:
        hub_info["name"] = payload.hubName

    update_fields = {
        "assignedDriver": driver_info,
        "assignedHub": hub_info,
        "status": "DISPATCHED_PICKUP" if order.get("status") == "SCHEDULED" else order.get("status"),
        "updatedAt": now_iso,
    }

    await database.update(
        B2B_ORDERS_COL,
        {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]},
        update_fields,
    )

    return {"success": True, "message": "Logistics Assigned Successfully", "assignedDriver": driver_info, "assignedHub": hub_info}


@router.patch("/admin/orders/{order_id}/weigh-in")
async def record_b2b_weigh_in(
    order_id: str,
    payload: B2BOrderWeighInPayload,
) -> Dict[str, Any]:
    """Dual scale verification: Record driver doorstep scale vs partner hub scale with variance calculation."""
    now_iso = datetime.now(timezone.utc).isoformat()
    order = await database.find_one(B2B_ORDERS_COL, {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]})
    if not order:
        raise HTTPException(status_code=404, detail=f"B2B Order {order_id} not found")

    update_fields: Dict[str, Any] = {"updatedAt": now_iso}

    if payload.stage == "doorstep":
        doorstep_kg = payload.scaleWeightKg
        update_fields["doorstepScaleKg"] = doorstep_kg
        update_fields["status"] = "PICKED_UP"
        if payload.bagBarcodes:
            update_fields["scannedBagsDoorstep"] = payload.bagBarcodes
    else:  # hub stage
        hub_raw = payload.scaleWeightKg
        tare = payload.tareWeightKg or 0.0
        net_kg = max(0.0, hub_raw - tare)
        update_fields["hubScaleKg"] = hub_raw
        update_fields["tareWeightKg"] = tare
        update_fields["netKg"] = net_kg
        update_fields["status"] = "AT_HUB_PROCESSING"
        if payload.bagBarcodes:
            update_fields["scannedBagsHub"] = payload.bagBarcodes

        # Calculate Scale Variance if Doorstep reading is present
        doorstep_kg = float(order.get("doorstepScaleKg") or net_kg)
        if doorstep_kg > 0:
            diff = abs(net_kg - doorstep_kg)
            variance_pct = round((diff / doorstep_kg) * 100, 2)
            update_fields["variancePercent"] = variance_pct
            update_fields["varianceStatus"] = "ALERT" if variance_pct > 5.0 else "SAFE"
        else:
            update_fields["variancePercent"] = 0.0
            update_fields["varianceStatus"] = "SAFE"

    await database.update(
        B2B_ORDERS_COL,
        {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]},
        update_fields,
    )

    return {"success": True, "message": f"{payload.stage.capitalize()} Weigh-in Recorded", "order": update_fields}


@router.patch("/admin/orders/{order_id}/status")
async def update_b2b_order_status(
    order_id: str,
    status_val: str = Query(..., description="SCHEDULED | DISPATCHED_PICKUP | PICKED_UP | AT_HUB_PROCESSING | READY_FOR_DELIVERY | DELIVERED"),
) -> Dict[str, Any]:
    """Progress order status in commercial workflow."""
    now_iso = datetime.now(timezone.utc).isoformat()
    order = await database.find_one(B2B_ORDERS_COL, {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]})
    if not order:
        raise HTTPException(status_code=404, detail=f"B2B Order {order_id} not found")

    await database.update(
        B2B_ORDERS_COL,
        {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]},
        {"status": status_val.upper(), "updatedAt": now_iso},
    )

    return {"success": True, "status": status_val.upper()}


@router.post("/admin/orders/{order_id}/deliver")
async def deliver_b2b_order(
    order_id: str,
    payload: B2BOrderDeliveryPayload,
) -> Dict[str, Any]:
    """Complete delivery with storekeeper proof of delivery & digital signoff."""
    now_iso = datetime.now(timezone.utc).isoformat()
    order = await database.find_one(B2B_ORDERS_COL, {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]})
    if not order:
        raise HTTPException(status_code=404, detail=f"B2B Order {order_id} not found")

    pod = {
        "storekeeperName": payload.storekeeperName,
        "signatureUrl": payload.signatureUrl,
        "bayPhotoUrl": payload.bayPhotoUrl,
        "notes": payload.notes,
        "deliveredAt": now_iso,
    }

    await database.update(
        B2B_ORDERS_COL,
        {"$or": [{"_id": order_id}, {"id": order_id}, {"orderCode": order_id}]},
        {
            "status": "DELIVERED",
            "pod": pod,
            "updatedAt": now_iso,
        },
    )

    return {"success": True, "message": "Order Delivered with Bay Signoff Proof", "pod": pod}


# -----------------------------------------------------------------------------
# Monthly GST Invoicing & Accounts Receivable (A/R) Endpoints
# -----------------------------------------------------------------------------

@router.get("/admin/invoices")
async def list_b2b_invoices(
    b2b_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """List compiled monthly GST B2B tax invoices with live aging breakdown."""
    try:
        filter_dict: Dict[str, Any] = {}
        if status and status.lower() != "all":
            filter_dict["status"] = status.upper()
        if b2b_id and b2b_id.lower() != "all":
            filter_dict["b2bId"] = b2b_id

        invoices = await database.find_many(B2B_INVOICES_COL, filter_dict)
    except Exception as err:
        logger.warning(f"[B2B] Error reading invoices: {err}")
        invoices = []

    # Update aging bucket on the fly
    for inv in invoices:
        inv["agingBucket"] = _calc_aging_bucket(inv.get("dueDate"))

    invoices.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
    return {"total": len(invoices), "items": invoices}


@router.post("/admin/invoices/generate", status_code=status.HTTP_201_CREATED)
async def generate_b2b_monthly_invoice(payload: B2BInvoiceGeneratePayload) -> Dict[str, Any]:
    """Auto-compile completed orders into a GST B2B Tax Invoice (HSN 9987)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    client = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": payload.b2bId}, {"b2bId": payload.b2bId}, {"id": payload.b2bId}]})
    if not client:
        raise HTTPException(status_code=404, detail=f"B2B Client {payload.b2bId} not found")

    contract = client.get("contract") or {}
    rate_per_kg = float(payload.ratePerKg or contract.get("baseRatePerKg") or 32.0)

    # Fetch unbilled delivered orders if orderIds not specified
    if payload.orderIds:
        orders = await database.find_many(B2B_ORDERS_COL, {"orderCode": {"$in": payload.orderIds}})
    else:
        orders = await database.find_many(B2B_ORDERS_COL, {"b2bId": payload.b2bId, "billed": False, "status": "DELIVERED"})

    total_kg = float(payload.totalKg or sum(float(o.get("netKg") or o.get("hubScaleKg") or o.get("doorstepScaleKg") or o.get("estimatedKg") or 0.0) for o in orders))
    if total_kg <= 0:
        total_kg = 150.0  # minimum commercial batch fallback

    subtotal = round(total_kg * rate_per_kg, 2)

    # GST Calculation (9% CGST + 9% SGST = 18%)
    cgst = round(subtotal * 0.09, 2)
    sgst = round(subtotal * 0.09, 2)
    total_tax = cgst + sgst
    grand_total = round(subtotal + total_tax, 2)

    inv_num = f"QP-INV-B2B-{datetime.now().year}-{random.randint(1000, 9999)}"
    due_days = payload.dueDateDays or 15
    due_date = (datetime.now(timezone.utc) + timedelta(days=due_days)).isoformat()
    period = payload.billingPeriod or datetime.now().strftime("%B %Y")

    items = [
        {
            "description": f"Commercial Linen Sanitization & Heavy Laundry Processing ({total_kg:.1f} kg verified net weight)",
            "sac": "9987",
            "qty": f"{total_kg:.1f} kg",
            "rate": rate_per_kg,
            "amount": subtotal,
        }
    ]

    invoice_doc = {
        "_id": inv_num,
        "id": inv_num,
        "invoiceNumber": inv_num,
        "b2bId": client.get("b2bId"),
        "businessName": client.get("businessName"),
        "category": client.get("category"),
        "address": client.get("address"),
        "city": client.get("city"),
        "gstin": client.get("gstin"),
        "pan": client.get("pan"),
        "contactName": client.get("contactName"),
        "phone": client.get("phone"),
        "email": client.get("email"),
        "creditTerms": client.get("creditTerms") or "NET_15_DAYS",
        "billingPeriod": period,
        "invoiceDate": now_iso,
        "dueDate": due_date,
        "totalKg": total_kg,
        "ratePerKg": rate_per_kg,
        "items": items,
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "taxTotal": total_tax,
        "totalAmount": grand_total,
        "balanceDue": grand_total,
        "status": "UNPAID",
        "agingBucket": "current_0_15",
        "ordersIncluded": [str(o.get("orderCode") or o.get("id")) for o in orders],
        "payments": [],
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    await database.insert(B2B_INVOICES_COL, invoice_doc)

    # Mark orders as billed
    for o in orders:
        await database.update(
            B2B_ORDERS_COL,
            {"_id": o.get("_id")},
            {"billed": True, "invoiceId": inv_num},
        )

    # Increment client current balance
    await database.update(
        B2B_CLIENTS_COL,
        {"$or": [{"_id": payload.b2bId}, {"b2bId": payload.b2bId}]},
        {"$inc": {"currentBalance": grand_total}},
    )

    return {"success": True, "invoice": invoice_doc}


@router.post("/admin/invoices/{invoice_id}/pay")
async def record_b2b_payment(
    invoice_id: str,
    payload: B2BPaymentPayload,
) -> Dict[str, Any]:
    """Record offline bank transfer / RTGS / NEFT UTR payment for an invoice."""
    now_iso = datetime.now(timezone.utc).isoformat()
    inv = await database.find_one(B2B_INVOICES_COL, {"$or": [{"_id": invoice_id}, {"id": invoice_id}, {"invoiceNumber": invoice_id}]})
    if not inv:
        raise HTTPException(status_code=404, detail=f"B2B Invoice {invoice_id} not found")

    pay_record = {
        "utrNumber": payload.utrNumber.strip(),
        "amount": payload.amount,
        "tdsDeducted": payload.tdsDeducted or 0.0,
        "totalCredit": payload.amount + (payload.tdsDeducted or 0.0),
        "paymentDate": payload.paymentDate or now_iso,
        "bankName": payload.bankName,
        "mode": payload.mode or "NEFT / RTGS",
        "remarks": payload.remarks,
        "recordedAt": now_iso,
    }

    payments = inv.get("payments") or []
    payments.append(pay_record)

    total_paid = sum(float(p.get("totalCredit") or p.get("amount", 0.0)) for p in payments)
    total_amount = float(inv.get("totalAmount") or 0.0)
    new_balance = max(0.0, round(total_amount - total_paid, 2))
    new_status = "PAID" if new_balance <= 0.01 else "PARTIAL"

    await database.update(
        B2B_INVOICES_COL,
        {"$or": [{"_id": invoice_id}, {"id": invoice_id}, {"invoiceNumber": invoice_id}]},
        {
            "payments": payments,
            "balanceDue": new_balance,
            "status": new_status,
            "updatedAt": now_iso,
        },
    )

    # Adjust client's balance
    b2b_id = inv.get("b2bId")
    if b2b_id:
        credit_val = -(payload.amount + (payload.tdsDeducted or 0.0))
        await database.update(
            B2B_CLIENTS_COL,
            {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}]},
            {"$inc": {"currentBalance": credit_val}},
        )

    return {
        "success": True,
        "message": f"Payment of ₹{payload.amount:,.2f} (UTR: {payload.utrNumber}) Recorded",
        "invoiceStatus": new_status,
        "remainingBalance": new_balance,
    }


@router.get("/admin/invoices/{invoice_id}/pdf")
async def download_b2b_invoice_pdf(invoice_id: str) -> Response:
    """Download official Indian GST Tax Invoice PDF for B2B Commercial Client."""
    inv = await database.find_one(B2B_INVOICES_COL, {"$or": [{"_id": invoice_id}, {"id": invoice_id}, {"invoiceNumber": invoice_id}]})
    if not inv:
        raise HTTPException(status_code=404, detail=f"B2B Invoice {invoice_id} not found")

    client = None
    if inv.get("b2bId"):
        client = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": inv["b2bId"]}, {"b2bId": inv["b2bId"]}]})

    pdf_bytes = generate_b2b_invoice_pdf(inv, client)
    filename = f"Tax-Invoice-{inv.get('invoiceNumber', invoice_id)}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


# -----------------------------------------------------------------------------
# Inbound Leads & Free Trial Pipeline Endpoints
# -----------------------------------------------------------------------------

@router.post("/admin/leads/{lead_id}/trial")
async def schedule_b2b_free_trial(
    lead_id: str,
    payload: B2BTrialSchedulePayload,
) -> Dict[str, Any]:
    """Schedule 20 kg free commercial trial linen pickup for inbound lead."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": lead_id}, {"b2bId": lead_id}, {"id": lead_id}]})
    if not record:
        raise HTTPException(status_code=404, detail=f"B2B Lead {lead_id} not found")

    update_fields = {
        "status": "TRIAL_SCHEDULED",
        "trialDate": payload.trialDate,
        "trialSlot": payload.pickupSlot,
        "trialKg": payload.trialKg or 20.0,
        "assignedHubId": payload.assignedHubId or record.get("assignedHubId"),
        "assignedHubName": payload.assignedHubName or record.get("assignedHubName", "Central Commercial Hub"),
        "updatedAt": now_iso,
    }

    logs = record.get("contactLogs") or []
    logs.append({
        "timestamp": now_iso,
        "note": f"20 Kg Commercial Trial Scheduled for {payload.trialDate} ({payload.pickupSlot}). {payload.instructions or ''}".strip(),
        "status": "TRIAL_SCHEDULED",
        "manager": "Admin",
    })
    update_fields["contactLogs"] = logs

    await database.update(
        B2B_CLIENTS_COL,
        {"$or": [{"_id": lead_id}, {"b2bId": lead_id}, {"id": lead_id}]},
        update_fields,
    )

    return {"success": True, "message": "Commercial Trial Scheduled Successfully", "leadId": lead_id}


@router.post("/admin/leads/{lead_id}/convert")
async def convert_lead_to_contract(lead_id: str) -> Dict[str, Any]:
    """1-Click convert inbound lead into an Active Commercial Contract with rate cards & credit terms."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": lead_id}, {"b2bId": lead_id}, {"id": lead_id}]})
    if not record:
        raise HTTPException(status_code=404, detail=f"B2B Lead {lead_id} not found")

    logs = record.get("contactLogs") or []
    logs.append({
        "timestamp": now_iso,
        "note": "Lead successfully converted to Active Institutional Contract with dynamic rate cards.",
        "status": "CONTRACT_ACTIVE",
        "manager": "Admin",
    })

    update_fields = {
        "status": "CONTRACT_ACTIVE",
        "contactLogs": logs,
        "updatedAt": now_iso,
    }

    # Ensure full contract rates are set
    if "contract" not in record or not record.get("contract"):
        update_fields["contract"] = {
            "baseRatePerKg": 32.0,
            "itemizedRates": dict(DEFAULT_ITEMIZED_RATES),
            "addons": dict(DEFAULT_ADDONS),
            "billingCycle": "MONTHLY",
            "creditTerms": record.get("creditTerms") or "NET_15_DAYS",
            "creditLimit": 50000.0,
            "autoHoldEnabled": True,
            "sla": record.get("sla") or "24 Hours Express",
        }

    await database.update(
        B2B_CLIENTS_COL,
        {"$or": [{"_id": lead_id}, {"b2bId": lead_id}, {"id": lead_id}]},
        update_fields,
    )

    return {"success": True, "message": "Lead Successfully Converted to Active Contract", "leadId": lead_id}


# -----------------------------------------------------------------------------
# B2B Commercial Client Self-Service & Authentication Endpoints
# -----------------------------------------------------------------------------

class B2BClientLoginPayload(BaseModel):
    b2bIdOrPhone: str = Field(..., min_length=3, max_length=100)
    otp: Optional[str] = None


@router.post("/client/login")
async def b2b_client_login(payload: B2BClientLoginPayload) -> Dict[str, Any]:
    """Client Portal Login: Authenticate institutional client by B2B ID, Phone, or Email."""
    identifier = payload.b2bIdOrPhone.strip()
    clean_digits = "".join(filter(str.isdigit, identifier))

    query_clauses: List[Dict[str, Any]] = [
        {"b2bId": identifier},
        {"b2bId": identifier.upper()},
        {"_id": identifier},
        {"id": identifier},
        {"email": identifier.lower()},
    ]
    if clean_digits:
        query_clauses.append({"phone": {"$regex": clean_digits}})

    client = await database.find_one(B2B_CLIENTS_COL, {"$or": query_clauses})
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Commercial account not found. Please verify your B2B ID or register your property first."
        )

    # Calculate real-time unpaid balance from invoices
    b2b_id = str(client.get("b2bId") or client.get("id"))
    try:
        invoices = await database.find_many(B2B_INVOICES_COL, {"b2bId": b2b_id})
        unpaid_balance = sum(
            float(inv.get("balanceDue") or inv.get("totalAmount") or 0.0)
            for inv in invoices
            if inv.get("status") in ("UNPAID", "PARTIAL", "OVERDUE")
        )
    except Exception:
        unpaid_balance = float(client.get("currentBalance", 0.0))

    client["currentBalance"] = round(unpaid_balance, 2)
    session_token = f"b2b_sess_{b2b_id}_{random.randint(100000, 999999)}"

    return {
        "success": True,
        "token": session_token,
        "client": client,
        "message": f"Welcome back, {client.get('businessName')}",
    }


@router.get("/client/me")
async def get_b2b_client_me(b2b_id: str = Query(..., description="B2B Client ID")) -> Dict[str, Any]:
    """Fetch profile, contract rate card, and balance for logged-in commercial client."""
    client = await database.find_one(B2B_CLIENTS_COL, {"$or": [{"_id": b2b_id}, {"b2bId": b2b_id}, {"id": b2b_id}]})
    if not client:
        raise HTTPException(status_code=404, detail=f"B2B Client {b2b_id} not found")

    try:
        invoices = await database.find_many(B2B_INVOICES_COL, {"b2bId": b2b_id})
        unpaid_balance = sum(
            float(inv.get("balanceDue") or inv.get("totalAmount") or 0.0)
            for inv in invoices
            if inv.get("status") in ("UNPAID", "PARTIAL", "OVERDUE")
        )
    except Exception:
        unpaid_balance = float(client.get("currentBalance", 0.0))

    client["currentBalance"] = round(unpaid_balance, 2)
    return {"success": True, "client": client}


@router.get("/client/orders")
async def list_b2b_client_orders(b2b_id: str = Query(..., description="B2B Client ID")) -> Dict[str, Any]:
    """List commercial bulk orders for client portal."""
    try:
        orders = await database.find_many(B2B_ORDERS_COL, {"$or": [{"b2bId": b2b_id}, {"b2bId": b2b_id.upper()}]})
    except Exception:
        orders = []

    orders.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
    return {"total": len(orders), "items": orders}


@router.post("/client/orders", status_code=status.HTTP_201_CREATED)
async def create_b2b_client_order(payload: B2BOrderCreatePayload) -> Dict[str, Any]:
    """Client self-service: Schedule bulk laundry pickup from hotel/hospital facility."""
    return await create_b2b_order(payload)


@router.get("/client/invoices")
async def list_b2b_client_invoices(b2b_id: str = Query(..., description="B2B Client ID")) -> Dict[str, Any]:
    """List GST Tax Invoices for client portal with PDF URLs."""
    try:
        invoices = await database.find_many(B2B_INVOICES_COL, {"$or": [{"b2bId": b2b_id}, {"b2bId": b2b_id.upper()}]})
    except Exception:
        invoices = []

    for inv in invoices:
        inv["pdfUrl"] = f"/api/b2b/admin/invoices/{inv.get('invoiceNumber') or inv.get('id')}/pdf"

    invoices.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
    return {"total": len(invoices), "items": invoices}
