"""Privacy and PII protection utilities for QuickPress.

Ensures customer sensitive data (phone numbers, full names, precise location metadata)
is masked appropriately for delivery riders, store partners, and public endpoints.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional


def mask_phone(phone: Optional[str]) -> str:
    """Masks a phone number for customer privacy (e.g. '+91 98765 43210' -> '+91 98••• ••210').
    
    Leaves country code and first 2 digits, masks middle digits, and keeps last 3 digits.
    """
    if not phone or not isinstance(phone, str):
        return ""
    
    clean = phone.strip()
    if not clean:
        return ""
    
    # Extract raw digits and optional leading plus
    has_plus = clean.startswith("+")
    digits_only = re.sub(r"[^\d]", "", clean)
    
    if len(digits_only) < 7:
        return "••••••••••"
    
    if len(digits_only) == 10:
        # Standard 10 digit Indian number: 9876543210 -> +91 98••• ••210
        first2 = digits_only[:2]
        last3 = digits_only[-3:]
        return f"+91 {first2}••• ••{last3}"
    
    if len(digits_only) > 10:
        # Number with country code, e.g. 919876543210 -> +91 98••• ••210
        country_code = digits_only[:-10]
        national_number = digits_only[-10:]
        first2 = national_number[:2]
        last3 = national_number[-3:]
        prefix = f"+{country_code}" if has_plus or country_code != "91" else "+91"
        return f"{prefix} {first2}••• ••{last3}"
    
    return f"•••• ••{digits_only[-3:]}"


def mask_name(name: Optional[str]) -> str:
    """Masks full name (e.g. 'Rahul Sharma' -> 'Rahul S.')."""
    if not name or not isinstance(name, str):
        return "Customer"
    
    parts = name.strip().split()
    if len(parts) == 1:
        return parts[0]
    
    return f"{parts[0]} {parts[-1][0]}."


def sanitize_order_for_rider(order: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes customer PII on an order document before returning it to a rider."""
    if not isinstance(order, dict):
        return order
    
    raw_phone = (
        order.get("customerPhone")
        or (order.get("customer") or {}).get("phone")
        or (order.get("address") or {}).get("phone")
        or ""
    )
    
    masked = mask_phone(raw_phone)
    order["customerPhone"] = masked
    order["customerPhoneMasked"] = masked
    order["isNumberMasked"] = True
    order["virtualCallAvailable"] = True
    
    if "customer" in order and isinstance(order["customer"], dict):
        order["customer"]["phone"] = masked
        order["customer"]["phoneMasked"] = masked
        
    return order


def mask_customer_address(address: Any, is_delivered: bool = False) -> str:
    """DPDP-compliant doorstep address masking.
    
    Once an order is completed/delivered or cancelled, customer doorstep units
    (flat numbers, villa units, house numbers) are masked from store and fleet screens
    while preserving locality, city, and pincode for operational reconciliation.
    """
    if not address:
        return "Customer Address"
        
    if isinstance(address, dict):
        line = str(address.get("line") or address.get("address") or address.get("street") or "").strip()
        locality = str(address.get("locality") or address.get("area") or address.get("landmark") or "").strip()
        city = str(address.get("city") or "").strip()
        pincode = str(address.get("pincode") or address.get("postalCode") or "").strip()
        
        if not is_delivered:
            parts = [line or locality, city, pincode]
            return ", ".join([p for p in parts if p]).strip(", ")
            
        # Post-delivery masking: mask specific unit/house
        safe_parts = []
        if locality:
            safe_parts.append(locality)
        elif line:
            # Mask the first comma-separated token (e.g. "Flat 401, Green Glen" -> "Green Glen")
            tokens = [t.strip() for t in line.split(",") if t.strip()]
            safe_parts.append(", ".join(tokens[1:]) if len(tokens) > 1 else "Locality")
        if city:
            safe_parts.append(city)
        if pincode:
            safe_parts.append(pincode)
            
        locality_str = ", ".join([p for p in safe_parts if p]).strip(", ")
        return f"[Doorstep Masked - Delivered] {locality_str}".strip()
        
    addr_str = str(address).strip()
    if not is_delivered:
        return addr_str
        
    tokens = [t.strip() for t in addr_str.split(",") if t.strip()]
    if len(tokens) > 1:
        rest = ", ".join(tokens[1:])
        return f"[Doorstep Masked - Delivered] {rest}"
    return "[Doorstep Masked - Delivered]"


def sanitize_order_for_rider(order: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes customer PII on an order document before returning it to a rider."""
    if not isinstance(order, dict):
        return order
    
    raw_phone = (
        order.get("customerPhone")
        or (order.get("customer") or {}).get("phone")
        or (order.get("address") or {}).get("phone")
        or ""
    )
    
    masked = mask_phone(raw_phone)
    order["customerPhone"] = masked
    order["customerPhoneMasked"] = masked
    order["isNumberMasked"] = True
    order["virtualCallAvailable"] = True
    
    if "customer" in order and isinstance(order["customer"], dict):
        order["customer"]["phone"] = masked
        order["customer"]["phoneMasked"] = masked
        
    return order


def sanitize_order_for_partner(order: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes customer PII on an order document before returning it to a partner.
    
    DPDP Compliance:
    - Customer phone numbers are masked.
    - Customer doorstep addresses are masked automatically once delivered or cancelled.
    """
    if not isinstance(order, dict):
        return order
        
    raw_phone = (
        order.get("customerPhone")
        or (order.get("customer") or {}).get("phone")
        or ""
    )
    
    masked = mask_phone(raw_phone)
    order["customerPhone"] = masked
    order["customerPhoneMasked"] = masked
    order["isNumberMasked"] = True
    
    if "customer" in order and isinstance(order["customer"], dict):
        order["customer"]["phone"] = masked
        
    # Check if order is delivered or cancelled
    st = str(order.get("status") or order.get("stage") or "").lower()
    is_delivered = st in ("delivered", "completed", "cancelled", "rejected")
    
    if is_delivered:
        addr = order.get("address")
        masked_addr = mask_customer_address(addr, is_delivered=True)
        order["address"] = masked_addr
        order["pickupAddress"] = masked_addr
        order["deliveryAddress"] = masked_addr
        order["isAddressMasked"] = True
        
    return order

