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


def sanitize_order_for_partner(order: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes customer PII on an order document before returning it to a partner."""
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
        
    return order
