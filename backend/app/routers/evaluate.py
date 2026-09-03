"""
RiskSentinel AI v2.0 -- Risk Evaluation & Adaptive 3DS Router
===========================================================
POST /api/assess-risk  and  POST /api/evaluate

Generates Razorpay order IDs for both LOW_RISK and MEDIUM_RISK transactions.
Returns adaptive 3-tier recommendation and `requires_step_up_3ds` flag.
"""
import time
import json
from datetime import datetime
from fastapi import APIRouter, Request

from ..models.schemas import TransactionPayload, RiskAssessmentResponse
from ..services.risk_engine import classify_risk
from ..services.fraud_graph import FraudGraphService

router = APIRouter(prefix="/api", tags=["Risk Assessment & Evaluation"])


def compute_upi_risk_boost(payload_dict: dict, base_risk_score: float) -> tuple[float, list[str]]:
    """
    Compute UPI-specific risk boost and reasons.
    
    Returns:
        tuple: (risk_boost, list_of_reasons)
    """
    payment_method = payload_dict.get("payment_method", "card")
    if payment_method != "upi":
        return 0.0, []
    
    boost = 0.0
    reasons = []
    
    # Critical: Device Binding Failed
    device_binding = payload_dict.get("device_binding_verified", 1)
    if device_binding == 0:
        boost += 0.35
        reasons.append("UPI Device Binding Verification FAILED")
    
    # High: VPA Age < 30 days
    vpa_age = payload_dict.get("vpa_age_verified", 1)
    if vpa_age == 0:
        boost += 0.20
        reasons.append("VPA Handle Age < 30 Days")
    
    # Medium: High amount on UPI with failed checks
    amount = payload_dict.get("amount", 0)
    if amount > 25000 and (device_binding == 0 or vpa_age == 0):
        boost += 0.15
        reasons.append("High Amount UPI Transaction with Failed Security Checks")
    
    # Cap the boost
    boost = min(boost, 0.50)
    
    return boost, reasons


async def evaluate_transaction_logic(payload: TransactionPayload, request: Request) -> dict:
    """Core evaluation logic with dual-model ML, 3-tier adaptive classification, and Razorpay order creation."""
    start_time = time.time()

    ml_engine = request.app.state.ml_engine
    cache = request.app.state.cache
    db = request.app.state.db
    llm = request.app.state.llm_agent
    cfg = request.app.state.settings

    # Initialize fraud graph service
    fraud_graph = FraudGraphService(db, velocity_window_hours=24)

    payload_dict = payload.model_dump()

    # 1. Cache Check
    cache_key = {k: v for k, v in payload_dict.items() if k != "transaction_id"}
    cached = cache.get(cache_key)
    if cached:
        result = {**cached}
        result["transaction_id"] = payload.transaction_id
        result["execution_time_ms"] = round((time.time() - start_time) * 1000, 2)

        await db.log_assessment(
            transaction_id=payload.transaction_id,
            user_id=payload.user_id,
            order_amount=payload.amount,
            risk_score=result["risk_score"],
            xgboost_score=result.get("xgboost_score", 0.0),
            anomaly_score=result.get("anomaly_score", 0.0),
            risk_category=result.get("risk_category", result.get("risk_level", "LOW_RISK")),
            action_taken=result.get("action_taken", result.get("recommendation", "AUTO_APPROVE")),
            explanation=result["explanation"] + " [cached]",
            shap_top_features=json.dumps(result.get("shap_explanations", {})),
            threat_report=result.get("threat_report"),
            execution_time_ms=result["execution_time_ms"],
            account_age_days=payload_dict.get("account_age_days", 0),
            total_transactions_user=payload_dict.get("total_transactions_user", 0),
            avg_amount_user=payload_dict.get("avg_amount_user", 0.0),
            shipping_distance_km=payload_dict.get("shipping_distance_km", 0.0),
            promo_used=payload_dict.get("promo_used", 0),
            avs_match=payload_dict.get("avs_match", 0),
            cvv_result=payload_dict.get("cvv_result", 0),
            three_ds_flag=payload_dict.get("three_ds_flag", 0),
            country=payload_dict.get("country", "IN"),
            bin_country=payload_dict.get("bin_country", "IN"),
            channel=payload_dict.get("channel", "web"),
            merchant_category=payload_dict.get("merchant_category", "electronics"),
            ip_address=payload_dict.get("ip_address", ""),
            card_bin=payload_dict.get("card_bin", ""),
            device_fingerprint=payload_dict.get("device_fingerprint", ""),
            shipping_address=payload_dict.get("shipping_address", ""),
            payment_method=payload_dict.get("payment_method", "card"),
            vpa_handle=payload_dict.get("vpa_handle", ""),
            device_binding_verified=payload_dict.get("device_binding_verified", 1),
            vpa_age_verified=payload_dict.get("vpa_age_verified", 1),
        )
        return result

    # 2. Dual-Model ML Scoring
    ml_result = ml_engine.score(
        payload_dict,
        xgb_weight=cfg.XGBOOST_WEIGHT,
        anomaly_weight=cfg.ANOMALY_WEIGHT,
    )
    risk_score = ml_result["combined_risk_score"]

    # 3. UPI-Specific Risk Boost
    upi_boost, upi_reasons = compute_upi_risk_boost(payload_dict, risk_score)
    if upi_boost > 0:
        risk_score = min(1.0, risk_score + upi_boost)

    # 4. Adaptive 3-Tier Risk Gating
    classification = classify_risk(
        risk_score=risk_score,
        low_ceiling=cfg.LOW_RISK_CEILING,
        high_floor=cfg.HIGH_RISK_FLOOR,
    )
    category = classification["risk_category"]
    risk_level = classification["risk_level"]
    recommendation = classification["recommendation"]
    action = classification["action_taken"]
    requires_step_up_3ds = classification["requires_step_up_3ds"]
    explanation = classification["explanation"]
    
    # Append UPI-specific reasons to explanation
    if upi_reasons:
        explanation += f" UPI Alerts: {'; '.join(upi_reasons)}."

    # 5. Threat Intelligence Report (Generated for all risk tiers: Low, Medium, High)
    threat_report = None
    try:
        user_history = await db.get_user_history(payload.user_id)
        threat_report = await llm.generate_threat_report(
            payload_dict,
            ml_result["shap_explanations"],
            ml_result["anomaly_score"],
            risk_score,
            user_history,
        )
    except Exception as e:
        # Graceful fallback to template report
        threat_report = llm._template_report(
            payload_dict,
            ml_result["shap_explanations"],
            ml_result["anomaly_score"],
            risk_score,
            user_history if 'user_history' in locals() else None,
        )

    # 5. Fraud Ring Network Graph Analysis
    risk_network_data = None
    try:
        # Build network graph using current transaction + historical data
        # Merge payload with ML results for the current transaction context
        current_tx_context = {
            **payload_dict,
            "transaction_id": payload.transaction_id,
            "risk_score": risk_score,
            "risk_category": category,
            "action_taken": action,
            "order_amount": payload.amount,
            "timestamp": datetime.now().isoformat(),
        }
        risk_network_data = await fraud_graph.build_network_graph(current_tx_context)
    except Exception as e:
        # Graceful degradation - don't fail the whole request if graph analysis fails
        print(f"[FraudGraph] Network analysis failed: {e}")
        risk_network_data = {"nodes": [], "links": [], "clusters": [], "metadata": {"error": str(e)}}

    # 6. Razorpay Order Generation (for BOTH LOW_RISK and MEDIUM_RISK)
    razorpay_order_id = None
    if risk_level in ("LOW_RISK", "MEDIUM_RISK") and cfg.RAZORPAY_KEY_ID and cfg.RAZORPAY_KEY_SECRET:
        try:
            import razorpay
            client = razorpay.Client(auth=(cfg.RAZORPAY_KEY_ID, cfg.RAZORPAY_KEY_SECRET))
            amount_paise = max(100, int(payload.amount * 100))  # Convert to paise (minimum ₹1)

            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"receipt_{payload.transaction_id}",
                "notes": {
                    "transaction_id": payload.transaction_id,
                    "user_id": payload.user_id,
                    "risk_score": str(risk_score),
                    "risk_level": risk_level,
                    "risk_category": category,
                    "recommendation": recommendation,
                    "requires_step_up_3ds": str(requires_step_up_3ds),
                    "auth_strategy": "SMART_3DS_STEP_UP" if requires_step_up_3ds else "FRICTIONLESS_3DS",
                    "integration": "RiskSentinel AI v2.0"
                }
            }
            order = client.order.create(data=order_data)
            razorpay_order_id = order.get("id")
        except Exception as e:
            print(f"  [Razorpay] Order generation failed: {e}")
            razorpay_order_id = None

    execution_time_ms = round((time.time() - start_time) * 1000, 2)

    # 7. Audit Trail Logging
    await db.log_assessment(
        transaction_id=payload.transaction_id,
        user_id=payload.user_id,
        order_amount=payload.amount,
        risk_score=risk_score,
        xgboost_score=ml_result["xgboost_score"],
        anomaly_score=ml_result["anomaly_score"],
        risk_category=category,
        action_taken=action,
        explanation=explanation,
        shap_top_features=json.dumps(ml_result["shap_explanations"]),
        threat_report=threat_report,
        execution_time_ms=execution_time_ms,
        account_age_days=payload_dict.get("account_age_days", 0),
        total_transactions_user=payload_dict.get("total_transactions_user", 0),
        avg_amount_user=payload_dict.get("avg_amount_user", 0.0),
        shipping_distance_km=payload_dict.get("shipping_distance_km", 0.0),
        promo_used=payload_dict.get("promo_used", 0),
        avs_match=payload_dict.get("avs_match", 0),
        cvv_result=payload_dict.get("cvv_result", 0),
        three_ds_flag=payload_dict.get("three_ds_flag", 0),
        country=payload_dict.get("country", "IN"),
        bin_country=payload_dict.get("bin_country", "IN"),
        channel=payload_dict.get("channel", "web"),
        merchant_category=payload_dict.get("merchant_category", "electronics"),
        ip_address=payload_dict.get("ip_address", ""),
        card_bin=payload_dict.get("card_bin", ""),
        device_fingerprint=payload_dict.get("device_fingerprint", ""),
        shipping_address=payload_dict.get("shipping_address", ""),
        payment_method=payload_dict.get("payment_method", "card"),
        vpa_handle=payload_dict.get("vpa_handle", ""),
        device_binding_verified=payload_dict.get("device_binding_verified", 1),
        vpa_age_verified=payload_dict.get("vpa_age_verified", 1),
    )

    # 8. Build Response
    result = {
        "status": "SUCCESS",
        "transaction_id": payload.transaction_id,
        "risk_score": risk_score,
        "xgboost_score": ml_result["xgboost_score"],
        "anomaly_score": ml_result["anomaly_score"],
        "risk_category": category,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "action_taken": action,
        "requires_step_up_3ds": requires_step_up_3ds,
        "explanation": explanation,
        "shap_explanations": ml_result["shap_explanations"],
        "threat_report": threat_report,
        "razorpay_order_id": razorpay_order_id,
        "execution_time_ms": execution_time_ms,
        "risk_network_data": risk_network_data,
    }

    # 9. Cache result
    cache.set(cache_key, result)

    return result


@router.post("/assess-risk", response_model=RiskAssessmentResponse)
async def assess_risk(payload: TransactionPayload, request: Request):
    """Assess transaction risk with 3-tier Adaptive Authentication (Smart 3DS)."""
    return await evaluate_transaction_logic(payload, request)


@router.post("/evaluate", response_model=RiskAssessmentResponse)
async def evaluate_transaction(payload: TransactionPayload, request: Request):
    """Alias endpoint for transaction risk evaluation."""
    return await evaluate_transaction_logic(payload, request)
