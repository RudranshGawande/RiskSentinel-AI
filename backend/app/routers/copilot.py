"""
RiskSentinel AI v2.0 -- Co-Pilot Chat Router
============================================
POST /api/copilot/chat  (LLM-powered risk analyst conversations)
"""
import logging
import traceback
import re
from fastapi import APIRouter, Request
from ..models.schemas import CopilotRequest, CopilotResponse
from ..services.llm_agent import _safe_float

router = APIRouter(prefix="/api/copilot", tags=["Risk Co-Pilot"])

# Module-level logger
logger = logging.getLogger(__name__)


def _sanitize_value(value, fallback="Not recorded"):
    """Convert None, null, or missing values to explicit fallback strings.
    
    Numeric fields get fallback string, others get "Not recorded".
    String values are stripped and checked for empty/null.
    """
    if value is None or value == "null" or value == "":
        return fallback
    
    if isinstance(value, (int, float)) and value == 0:
        return fallback
    
    if isinstance(value, str):
        stripped = value.strip()
        if stripped == "" or stripped.lower() in ("none", "null", "nan", "nil"):
            return fallback
        return stripped
    
    str_val = str(value).strip()
    if str_val == "" or str_val.lower() in ("none", "null", "nan", "nil"):
        return fallback
    return str_val or fallback


def sanitize_transaction_record(tx: dict) -> dict:
    """Sanitize a fetched transaction record from the database before passing to the model."""
    sanitized = {}
    
    numeric_fields = {
        "account_age_days": "0 days (Newly Created)",
        "total_transactions_user": "0 (No Prior History)",
        "avg_amount_user": "0.00 (No Prior Spend)",
        "shipping_distance_km": "0 km (Same Location / Digital Item)",
        "promo_used": "0 (No Promo)",
        "avs_match": "0 (Not Verified)",
        "cvv_result": "0 (Not Verified)",
        "three_ds_flag": "0 (Not Authenticated)",
        "risk_score": "0.0 (Not Scored)",
        "xgboost_score": "0.0 (Not Scored)",
        "anomaly_score": "0.0 (Not Scored)",
        "prior_order_count": "0",
        "prior_assessment_count": "0",
    }
    
    string_fields = {
        "transaction_id": "Not recorded",
        "user_id": "Not recorded",
        "category": "Not recorded",
        "action_taken": "Not recorded",
        "country": "Not recorded",
        "bin_country": "Not recorded",
        "channel": "Not recorded",
        "merchant_category": "Not recorded",
    }
    
    for field, fallback in numeric_fields.items():
        if field in tx:
            sanitized[field] = _sanitize_value(tx.get(field), fallback)
    
    for field, fallback in string_fields.items():
        if field in tx:
            sanitized[field] = _sanitize_value(tx.get(field), fallback)
    
    for key, value in tx.items():
        if key not in numeric_fields and key not in string_fields:
            sanitized[key] = _sanitize_value(value)
    
    return sanitized


@router.get("/transactions/search")
async def search_copilot_transactions(request: Request, q: str = "", limit: int = 10):
    """Search audit logs for transactions matching query (or return recent ones)."""
    db = request.app.state.db
    results = await db.search_transactions(query=q, limit=limit)
    return {"status": "SUCCESS", "query": q, "results": results}


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(body: CopilotRequest, request: Request):
    """Chat with the AI Risk Co-Pilot about transactions and Razorpay telemetry."""
    db = request.app.state.db
    llm = request.app.state.llm_agent
    razorpay_service = getattr(request.app.state, "razorpay_service", None)

    tx_context = None
    user_history = None
    razorpay_context = {}

    try:
        # 1. Fetch transaction & user history
        if body.transaction_id:
            raw_tx = await db.get_transaction(body.transaction_id)
            if raw_tx:
                tx_context = sanitize_transaction_record(raw_tx)
                user_id = tx_context.get("user_id")

                if user_id and user_id != "Not recorded":
                    raw_user_history = await db.get_user_history(user_id, limit=20)
                    user_history = [
                        h for h in raw_user_history
                        if h.get("transaction_id") != body.transaction_id
                    ]
                    prior_count = len(user_history)
                    
                    tx_context["prior_order_count"] = prior_count
                    tx_context["prior_assessment_count"] = prior_count

                    if prior_count > 0:
                        tx_context["total_transactions_user"] = str(prior_count)
                else:
                    user_history = []
                    tx_context["prior_order_count"] = 0
                    tx_context["prior_assessment_count"] = 0

        # 2. Fetch live Razorpay gateway context (matching order + recent orders)
        if razorpay_service:
            try:
                if body.transaction_id:
                    matching_order = razorpay_service.fetch_order_by_tx_id(body.transaction_id)
                    if matching_order:
                        razorpay_context["matching_order"] = matching_order
                recent_orders = razorpay_service.fetch_recent_orders(limit=5)
                if recent_orders:
                    razorpay_context["recent_orders"] = recent_orders
            except Exception as e:
                logger.error(f"Error building Razorpay context: {e}")

        # Call LLM with full context
        response_text = await _safe_llm_chat(llm, body.message, tx_context, user_history, razorpay_context)

    except Exception as e:
        logger.error(
            "Copilot chat failed: %s\n%s",
            str(e),
            traceback.format_exc()
        )
        response_text = _build_fallback_response(body.message, tx_context)

    return CopilotResponse(response=response_text, transaction_context=tx_context)


async def _safe_llm_chat(llm, message: str, tx_context, user_history, razorpay_context=None) -> str:
    """Wrapper around LLMAgent.chat() guaranteeing a string response."""
    try:
        return await llm.chat(message, tx_context, user_history, razorpay_context)
    except Exception as e:
        logger.error("LLM API Error: %s", e, exc_info=True)
        return _build_fallback_response(message, tx_context)


def _build_fallback_response(message: str, tx_context: dict | None) -> str:
    """Build a clean fallback response when LLM is unavailable."""
    try:
        if tx_context:
            tx_id = tx_context.get("transaction_id", "N/A")
            user_id = tx_context.get("user_id", "N/A")
            amount = _safe_float(tx_context.get("order_amount", 0.0))
            risk_score = _safe_float(tx_context.get("risk_score", 0.0))
            category = tx_context.get("risk_category", "UNKNOWN")
            return (
                f"I'm currently analyzing transaction **{tx_id}** (₹{amount:,.2f}, "
                f"user **{user_id}**, risk: **{risk_score * 100:.1f}%**, "
                f"category: **{category}**). "
                f"The AI model is temporarily unavailable, but you can review the "
                f"transaction details above or ask me a specific question about this case."
            )
    except Exception:
        pass
    return (
        "I'm the **RiskSentinel AI Investigator**. The model service is temporarily "
        "unavailable. Please try again in a moment, or attach a Transaction ID "
        "to investigate a specific case."
    )
