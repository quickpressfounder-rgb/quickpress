"""Financial Anomaly & Risk Monitoring API Router for QuickPress.

Prefix: `/api/finance-anomalies`
Provides real-time exception feeds for the 'Attention Required' bar on the Finance Dashboard.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from app.services.financial_anomaly_service import financial_anomaly_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance-anomalies", tags=["finance-anomalies"])


@router.get("/attention-required", summary="Get Live Financial Exceptions for Attention Required Bar")
async def get_attention_required() -> Dict[str, Any]:
    """Returns real-time financial exceptions across COD, Payments, Settlements, Wallets, and Refunds."""
    summary = await financial_anomaly_service.get_active_anomalies_summary()
    return {"ok": True, **summary}
