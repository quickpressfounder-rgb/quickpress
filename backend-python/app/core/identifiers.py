"""Unique 6-digit random identifier generators & formatters for QuickPress actors."""

import random
import re
from typing import Optional
from app.db.client import database


def format_captain_id(raw_id: Optional[str]) -> str:
    """Format any raw ID/UUID into a clean code word: CAP-XXXXXX (e.g. CAP-919300)."""
    if not raw_id:
        return "CAP-100001"
    clean = str(raw_id).strip()
    if clean.upper().startswith("CAP-"):
        return clean.upper()
    if clean.upper().startswith("RDR-"):
        return f"CAP-{clean[4:].upper()}"
    if clean.upper().startswith("CP-"):
        return f"CAP-{clean[3:].upper()}"
    
    # If UUID (e.g. ca919300-8c7e-47f2-ac35-67fd99792a3d):
    # Try to extract first 6 consecutive digits
    digits = re.sub(r"\D", "", clean)
    if len(digits) >= 6:
        return f"CAP-{digits[:6]}"
    
    # Fallback to first 6 alphanumeric hex characters uppercase
    alnum = re.sub(r"[^a-zA-Z0-9]", "", clean).upper()
    if len(alnum) >= 6:
        return f"CAP-{alnum[:6]}"
    return f"CAP-{alnum.ljust(6, '0')}"


def format_partner_id(raw_id: Optional[str]) -> str:
    """Format any raw ID/UUID into a clean code word: PRT-XXXXXX (e.g. PRT-619284)."""
    if not raw_id:
        return "PRT-100001"
    clean = str(raw_id).strip()
    if clean.upper().startswith("PRT-"):
        return clean.upper()
    if clean.upper().startswith("PARTNER-"):
        return f"PRT-{clean[8:].upper()}"
    
    digits = re.sub(r"\D", "", clean)
    if len(digits) >= 6:
        return f"PRT-{digits[:6]}"
    
    alnum = re.sub(r"[^a-zA-Z0-9]", "", clean).upper()
    if len(alnum) >= 6:
        return f"PRT-{alnum[:6]}"
    return f"PRT-{alnum.ljust(6, '0')}"


async def generate_rider_id() -> str:
    """Generate a unique 6-digit random Captain ID: CAP-XXXXXX (e.g. CAP-582914)."""
    for _ in range(20):
        code = random.randint(100000, 999999)
        candidate = f"CAP-{code}"
        existing = await database.find_one("rider_profiles", {"$or": [{"_id": candidate}, {"riderId": candidate}, {"code": candidate}]})
        if not existing:
            return candidate
    return f"CAP-{random.randint(100000, 999999)}"


async def generate_partner_id() -> str:
    """Generate a unique 6-digit random Partner ID: PRT-XXXXXX (e.g. PRT-619284)."""
    for _ in range(20):
        code = random.randint(100000, 999999)
        candidate = f"PRT-{code}"
        existing = await database.find_one("partner_profiles", {"$or": [{"_id": candidate}, {"partnerId": candidate}, {"code": candidate}]})
        if not existing:
            return candidate
    return f"PRT-{random.randint(100000, 999999)}"


async def generate_customer_id() -> str:
    """Generate a unique 6-digit random Customer ID, e.g. CUST-391048."""
    code = random.randint(100000, 999999)
    return f"CUST-{code}"
