"""QuickPress Partner Change Requests & Admin Approval Engine.

Manages the audit trail and verification workflow for sensitive partner changes:
1. Store Name / Business Name & Owner Name
2. PAN Card & KYC Details
3. Bank Account & Payout IFSC Details
4. Services & Rate Card (Adding new services or changing prices)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import random

from app.db.client import database

logger = logging.getLogger(__name__)

REQUESTS_COLLECTION = "partner_approval_requests"
PROFILES_COLLECTION = "partner_profiles"
ADMIN_PARTNERS_COLLECTION = "admin_partners"
SERVICES_COLLECTION = "partner_services"


class PartnerApprovalEngine:
    """Handles submission, inspection, approval, and rejection of partner change requests."""

    async def submit_change_request(
        self,
        partner_id: str,
        request_type: str,  # "profile_update" | "bank_update" | "pan_update" | "service_create" | "service_update"
        payload: Dict[str, Any],
        target_id: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a pending approval request while keeping current live data safe."""
        # Fetch current partner info
        profile = (
            await database.find_one(PROFILES_COLLECTION, {"_id": partner_id})
            or await database.find_one(PROFILES_COLLECTION, {"partnerId": partner_id})
            or {}
        )
        business_name = profile.get("businessName") or profile.get("storeName") or "QuickPress Partner Store"

        req_id = f"REQ-{random.randint(100000, 999999)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        doc = {
            "_id": req_id,
            "requestId": req_id,
            "partnerId": partner_id,
            "businessName": business_name,
            "requestType": request_type,
            "targetId": target_id or partner_id,
            "requestedChanges": payload,
            "reason": reason or "",
            "status": "pending",  # "pending" | "approved" | "rejected"
            "submittedAt": now_iso,
            "reviewedAt": None,
            "reviewedBy": None,
            "rejectionReason": None,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }

        await database.insert(REQUESTS_COLLECTION, doc)
        logger.info(f"[ApprovalEngine] Created change request {req_id} ({request_type}) for partner {partner_id}")
        return doc

    async def list_partner_requests(self, partner_id: str) -> List[Dict[str, Any]]:
        """Returns all change requests submitted by a specific partner."""
        docs = await database.find_many(REQUESTS_COLLECTION, {"partnerId": partner_id})
        # Sort descending by submittedAt
        return sorted(docs or [], key=lambda x: str(x.get("submittedAt", "")), reverse=True)

    async def list_admin_requests(self, status_filter: str = "all") -> List[Dict[str, Any]]:
        """Returns all change requests across all partners for the Admin Console."""
        query = {} if status_filter == "all" else {"status": status_filter}
        docs = await database.find_many(REQUESTS_COLLECTION, query)
        return sorted(docs or [], key=lambda x: str(x.get("submittedAt", "")), reverse=True)

    async def approve_request(self, request_id: str, admin_name: str = "Super Admin") -> Dict[str, Any]:
        """Approves a change request and merges the requested changes into live collections."""
        req = await database.find_one(REQUESTS_COLLECTION, {"_id": request_id})
        if not req:
            req = await database.find_one(REQUESTS_COLLECTION, {"requestId": request_id})
        if not req:
            raise ValueError(f"Approval request {request_id} not found")

        partner_id = str(req["partnerId"])
        req_type = str(req["requestType"])
        changes = req.get("requestedChanges") or {}
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Profile / Store Name / Owner Name Update
        if req_type in ("profile_update", "name_update"):
            profile_patch = {
                k: v for k, v in changes.items()
                if k in ("businessName", "storeName", "ownerName", "phone", "email", "city", "area", "address")
            }
            if profile_patch:
                profile_patch["updatedAt"] = now_iso
                await database.update(PROFILES_COLLECTION, {"_id": partner_id}, profile_patch, upsert=True)
                await database.update(PROFILES_COLLECTION, {"partnerId": partner_id}, profile_patch)
                await database.update(ADMIN_PARTNERS_COLLECTION, {"_id": partner_id}, profile_patch, upsert=True)
                await database.update(ADMIN_PARTNERS_COLLECTION, {"partnerId": partner_id}, profile_patch)

        # 2. Bank Account Update
        elif req_type == "bank_update":
            acc_holder = str(changes.get("accountHolder") or changes.get("accountHolderName") or "").strip()
            ifsc_code = str(changes.get("ifsc") or changes.get("ifscCode") or "").upper().strip()
            acc_num = str(changes.get("accountNumber") or "").strip()
            bank_name = str(changes.get("bankName") or "").strip()
            upi_id = str(changes.get("upiId") or "").strip()

            bank_patch = {
                "bankName": bank_name,
                "accountHolder": acc_holder,
                "accountHolderName": acc_holder,
                "accountNumber": acc_num,
                "ifsc": ifsc_code,
                "ifscCode": ifsc_code,
                "upiId": upi_id,
                "bankVerified": True,
                "isVerified": True,
                "updatedAt": now_iso,
            }
            if changes.get("chequePhoto"):
                bank_patch["chequePhoto"] = changes.get("chequePhoto")

            await database.update(PROFILES_COLLECTION, {"_id": partner_id}, bank_patch, upsert=True)
            await database.update(PROFILES_COLLECTION, {"partnerId": partner_id}, bank_patch)
            await database.update(ADMIN_PARTNERS_COLLECTION, {"_id": partner_id}, bank_patch, upsert=True)
            await database.update(ADMIN_PARTNERS_COLLECTION, {"partnerId": partner_id}, bank_patch)
            await database.update("partner_bank_accounts", {"_id": partner_id}, {**bank_patch, "partnerId": partner_id}, upsert=True)
            await database.update("partner_bank_accounts", {"partnerId": partner_id}, {**bank_patch, "partnerId": partner_id}, upsert=True)

        # 3. PAN / KYC Details Update
        elif req_type == "pan_update":
            pan_val = str(changes.get("pan") or changes.get("panNumber") or "").upper().strip()
            pan_patch = {
                "pan": pan_val,
                "panNumber": pan_val,
                "panVerified": True,
                "updatedAt": now_iso,
            }
            if changes.get("panCard"):
                pan_patch["panCard"] = changes.get("panCard")
            await database.update(PROFILES_COLLECTION, {"_id": partner_id}, pan_patch, upsert=True)
            await database.update(PROFILES_COLLECTION, {"partnerId": partner_id}, pan_patch)
            await database.update(ADMIN_PARTNERS_COLLECTION, {"_id": partner_id}, pan_patch, upsert=True)
            await database.update(ADMIN_PARTNERS_COLLECTION, {"partnerId": partner_id}, pan_patch)

        # 3b. Comprehensive KYC & Documents Update
        elif req_type == "kyc_update":
            allowed_fields = (
                "businessName", "ownerName", "phone", "email",
                "pan", "panCard", "aadhaar", "aadhaarFront", "aadhaarBack",
                "bankName", "accountHolder", "accountHolderName", "accountNumber", "ifsc", "ifscCode", "chequePhoto",
                "gstin", "address", "city", "area", "pincode"
            )
            kyc_patch = {k: v for k, v in changes.items() if k in allowed_fields and v is not None}
            if kyc_patch:
                kyc_patch["updatedAt"] = now_iso
                kyc_patch["isVerified"] = True
                kyc_patch["kycStatus"] = "verified"

                # Normalize bank fields if present
                if "ifsc" in kyc_patch and "ifscCode" not in kyc_patch:
                    kyc_patch["ifscCode"] = str(kyc_patch["ifsc"]).upper()
                elif "ifscCode" in kyc_patch and "ifsc" not in kyc_patch:
                    kyc_patch["ifsc"] = str(kyc_patch["ifscCode"]).upper()

                if "accountHolder" in kyc_patch and "accountHolderName" not in kyc_patch:
                    kyc_patch["accountHolderName"] = kyc_patch["accountHolder"]
                elif "accountHolderName" in kyc_patch and "accountHolder" not in kyc_patch:
                    kyc_patch["accountHolder"] = kyc_patch["accountHolderName"]

                if "pan" in kyc_patch and "panNumber" not in kyc_patch:
                    kyc_patch["panNumber"] = str(kyc_patch["pan"]).upper()
                elif "panNumber" in kyc_patch and "pan" not in kyc_patch:
                    kyc_patch["pan"] = str(kyc_patch["panNumber"]).upper()

                await database.update(PROFILES_COLLECTION, {"_id": partner_id}, kyc_patch, upsert=True)
                await database.update(PROFILES_COLLECTION, {"partnerId": partner_id}, kyc_patch)
                await database.update(ADMIN_PARTNERS_COLLECTION, {"_id": partner_id}, kyc_patch, upsert=True)
                await database.update(ADMIN_PARTNERS_COLLECTION, {"partnerId": partner_id}, kyc_patch)

                if any(k in kyc_patch for k in ("bankName", "accountNumber", "ifsc", "ifscCode", "accountHolder", "accountHolderName")):
                    bank_sub = {
                        "bankName": kyc_patch.get("bankName") or "",
                        "accountHolder": kyc_patch.get("accountHolder") or kyc_patch.get("accountHolderName") or "",
                        "accountHolderName": kyc_patch.get("accountHolder") or kyc_patch.get("accountHolderName") or "",
                        "accountNumber": kyc_patch.get("accountNumber") or "",
                        "ifsc": str(kyc_patch.get("ifsc") or kyc_patch.get("ifscCode") or "").upper(),
                        "ifscCode": str(kyc_patch.get("ifsc") or kyc_patch.get("ifscCode") or "").upper(),
                        "isVerified": True,
                        "bankVerified": True,
                        "updatedAt": now_iso,
                    }
                    if kyc_patch.get("chequePhoto"):
                        bank_sub["chequePhoto"] = kyc_patch["chequePhoto"]
                    await database.update("partner_bank_accounts", {"_id": partner_id}, {**bank_sub, "partnerId": partner_id}, upsert=True)
                    await database.update("partner_bank_accounts", {"partnerId": partner_id}, {**bank_sub, "partnerId": partner_id}, upsert=True)

        # 4. Service Creation
        elif req_type == "service_create":
            svc_id = req.get("targetId") or f"svc-{random.randint(100000, 999999)}"
            new_service = {
                "_id": svc_id,
                "id": svc_id,
                "partnerId": partner_id,
                "name": str(changes.get("name") or "Custom Laundry Service"),
                "category": str(changes.get("category") or "laundry"),
                "price": int(changes.get("price") or 0),
                "unit": str(changes.get("unit") or "kg"),
                "turnaroundHours": int(changes.get("turnaroundHours") or 24),
                "enabled": True,
                "isActive": True,
                "pendingApproval": False,
                "approvalStatus": "approved",
                "isApproved": True,
                "rejectionReason": None,
                "pendingChanges": None,
                "description": str(changes.get("description") or ""),
                "image": str(changes.get("image") or ""),
                "minQuantity": int(changes.get("minQuantity") or 1),
                "expressAvailable": bool(changes.get("expressAvailable", False)),
                "createdAt": now_iso,
                "updatedAt": now_iso,
            }
            await database.update(SERVICES_COLLECTION, {"_id": svc_id}, new_service, upsert=True)
            await database.update(SERVICES_COLLECTION, {"id": svc_id}, new_service, upsert=True)

        # 5. Service Update / Price Change
        elif req_type == "service_update":
            target_svc_id = req.get("targetId")
            if target_svc_id:
                svc_patch = {
                    k: v for k, v in changes.items()
                    if k in ("name", "price", "unit", "category", "turnaroundHours", "description", "image", "enabled", "isActive", "expressAvailable")
                }
                svc_patch["pendingApproval"] = False
                svc_patch["approvalStatus"] = "approved"
                svc_patch["isApproved"] = True
                svc_patch["enabled"] = True
                svc_patch["isActive"] = True
                svc_patch["pendingChanges"] = None
                svc_patch["rejectionReason"] = None
                svc_patch["updatedAt"] = now_iso
                await database.update(SERVICES_COLLECTION, {"_id": target_svc_id}, svc_patch, upsert=True)
                await database.update(SERVICES_COLLECTION, {"id": target_svc_id}, svc_patch, upsert=True)

        # Update Request Status in DB
        update_result = {
            "status": "approved",
            "reviewedAt": now_iso,
            "reviewedBy": admin_name,
            "updatedAt": now_iso,
        }
        await database.update(REQUESTS_COLLECTION, {"_id": req["_id"]}, update_result)

        # Send in-app notification to partner
        await database.insert("notifications", {
            "_id": f"notif-{random.randint(100000, 999999)}",
            "userId": partner_id,
            "partnerId": partner_id,
            "title": "Change Request Approved ✅",
            "description": f"Your request to update {req_type.replace('_', ' ').title()} has been verified and approved by Admin.",
            "kind": "success",
            "read": False,
            "createdAt": now_iso,
        })

        return {**req, **update_result}

    async def reject_request(
        self, request_id: str, admin_name: str = "Super Admin", reason: str = "Information could not be verified."
    ) -> Dict[str, Any]:
        """Rejects a change request with feedback reason."""
        req = await database.find_one(REQUESTS_COLLECTION, {"_id": request_id})
        if not req:
            req = await database.find_one(REQUESTS_COLLECTION, {"requestId": request_id})
        if not req:
            raise ValueError(f"Approval request {request_id} not found")

        now_iso = datetime.now(timezone.utc).isoformat()
        partner_id = str(req["partnerId"])
        req_type = str(req["requestType"])

        # If it's a service request, also update the service in partner_services to reflect rejection
        if req_type in ("service_create", "service_update") and req.get("targetId"):
            target_svc_id = req["targetId"]
            reject_patch = {
                "pendingApproval": False,
                "approvalStatus": "rejected",
                "rejectionReason": reason or "Verification failed.",
                "enabled": False,
                "isActive": False,
                "updatedAt": now_iso,
            }
            await database.update(SERVICES_COLLECTION, {"_id": target_svc_id}, reject_patch)
            await database.update(SERVICES_COLLECTION, {"id": target_svc_id}, reject_patch)

        update_result = {
            "status": "rejected",
            "rejectionReason": reason or "Verification failed.",
            "reviewedAt": now_iso,
            "reviewedBy": admin_name,
            "updatedAt": now_iso,
        }
        await database.update(REQUESTS_COLLECTION, {"_id": req["_id"]}, update_result)

        # Send in-app notification to partner
        await database.insert("notifications", {
            "_id": f"notif-{random.randint(100000, 999999)}",
            "userId": partner_id,
            "partnerId": partner_id,
            "title": "Change Request Rejected ❌",
            "description": f"Your request to update {req_type.replace('_', ' ').title()} was rejected: {reason}",
            "kind": "warning",
            "read": False,
            "createdAt": now_iso,
        })

        return {**req, **update_result}


approval_engine = PartnerApprovalEngine()
