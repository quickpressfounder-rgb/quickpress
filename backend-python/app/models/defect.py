"""Garment Defect & Pre-wash Inspection Models for QuickPress.

Enables photographic pre-wash tagging of tears, stains, broken buttons,
burns, or missing items with customer digital consent before processing.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DefectType(str, Enum):
    STAIN = "stain"                      # Daag
    TORN_OR_CUT = "torn_or_cut"          # Fata hua ya chhed
    BROKEN_BUTTON = "broken_button"      # Toota button
    COLOR_BLEED_RISK = "color_bleed_risk"# Rang chhootne ka khatra
    BURN_MARK = "burn_mark"              # Purana jala hua daag
    MISSING_ACCESSORY = "missing_accessory" # Belt/cufflink missing
    OTHER = "other"                      # Doosra issue


class CustomerDefectStatus(str, Enum):
    PENDING = "pending"                  # Waiting for customer action
    PROCEED_WASH = "proceed_wash"        # Customer gave consent: Wash with care
    RETURN_UNWASHED = "return_unwashed"  # Customer refused: Return item without washing


class GarmentDefect(BaseModel):
    defect_id: str = Field(..., description="Unique defect ID e.g. def-9a1b2c")
    order_id: str = Field(..., description="Canonical order ID")
    order_code: Optional[str] = Field(default="", description="Order reference code e.g. ord-QP10019")
    item_name: str = Field(..., description="Garment name e.g. White Linen Shirt")
    defect_type: DefectType = Field(default=DefectType.STAIN)
    photo_url: str = Field(..., description="Cloudinary secure URL")
    description: Optional[str] = Field(default="", description="Partner comment / defect note")
    reported_by_id: str = Field(..., description="Partner ID")
    reported_by_role: str = Field(default="partner")
    reported_by_name: Optional[str] = Field(default="Partner Store")
    reported_at: str = Field(..., description="ISO 8601 UTC timestamp")
    customer_status: CustomerDefectStatus = Field(default=CustomerDefectStatus.PENDING)
    customer_note: Optional[str] = Field(default="")
    customer_responded_at: Optional[str] = None
    admin_override_status: Optional[str] = None
    admin_override_notes: Optional[str] = None


class LogDefectPayload(BaseModel):
    item_name: str = Field(..., description="Name of garment e.g. White Linen Shirt")
    defect_type: DefectType = Field(default=DefectType.STAIN)
    photo: str = Field(..., description="Base64 data URI or image URL")
    description: Optional[str] = Field(default="", description="Optional note describing location/nature of defect")


class CustomerDefectDecisionPayload(BaseModel):
    action: CustomerDefectStatus = Field(..., description="proceed_wash or return_unwashed")
    note: Optional[str] = Field(default="", description="Optional comment from customer")


class AdminDefectOverridePayload(BaseModel):
    decision: str = Field(..., description="proceed_wash, return_unwashed, or dispute_closed")
    notes: Optional[str] = Field(default="", description="Admin QC audit remarks")
