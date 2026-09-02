"""
RiskSentinel AI v2.0 -- Risk Assessment Router
================================================
POST /api/assess-risk  (core endpoint)
Integrated with 3-tier Adaptive Authentication (Smart 3DS) logic.
"""
from fastapi import APIRouter, Request

from ..models.schemas import TransactionPayload, RiskAssessmentResponse
from .evaluate import evaluate_transaction_logic

router = APIRouter(prefix="/api", tags=["Risk Assessment"])


@router.post("/assess-risk", response_model=RiskAssessmentResponse)
async def assess_risk(payload: TransactionPayload, request: Request):
    """Score a transaction with dual-model ML + 3-tier Adaptive Authentication + optional LLM threat report."""
    return await evaluate_transaction_logic(payload, request)
