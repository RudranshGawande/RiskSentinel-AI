"""
RiskSentinel AI v2.0 -- Agentic LLM Risk Investigator
======================================================
Uses AIML API (OpenAI-compatible, Claude 3 Opus via anthropic/claude-3-opus-20240229)
to generate Threat Intelligence Reports and provide real-time conversational
risk Q&A with live Razorpay Payment Gateway API telemetry.

IMPORTANT: The LLM is white-labeled as "RiskSentinel AI Investigator".
           It must NEVER reference Claude, Anthropic, Gemini, Google, OpenAI,
           or any external brand.
"""
import asyncio
import json
import logging
import os
import re
import traceback
from collections import defaultdict
from typing import Optional, Dict, Any, List

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Module-level logger
logger = logging.getLogger(__name__)


# ── Human-readable feature name mapping ─────────────────
FEATURE_LABELS = {
    "account_age_days": "Account Age",
    "total_transactions_user": "Purchase History",
    "avg_amount_user": "Average Spend",
    "amount": "Order Amount",
    "shipping_distance_km": "Shipping Distance",
    "promo_used": "Promo Code Used",
    "avs_match": "Address Verification (AVS)",
    "cvv_result": "CVV Match",
    "three_ds_flag": "3-D Secure Auth",
    "country_match": "Country Match",
    "hour": "Time of Day",
    "dayofweek": "Day of Week",
    "channel_web": "Web Channel",
    "merchant_category_fashion": "Fashion Category",
    "merchant_category_gaming": "Gaming Category",
    "merchant_category_grocery": "Grocery Category",
    "merchant_category_travel": "Travel Category",
}


def _humanize_feature(raw_name: str) -> str:
    """Convert raw feature name to human-readable label."""
    return FEATURE_LABELS.get(raw_name, raw_name.replace("_", " ").title())


def _sanitize_llm_value(value, field_name: str = "") -> str:
    """Convert None/null/missing values to explicit fallouts for LLM prompts."""
    if value is None or value == "null" or value == "":
        return "Not recorded"
    
    if isinstance(value, str):
        stripped = value.strip()
        if stripped == "" or stripped.lower() in ("none", "not recorded", "nan", "nil", "null"):
            return "Not recorded"
        if field_name in ("shipping_distance_km", "account_age_days", "amount"):
            try:
                float(stripped)
                return stripped
            except ValueError:
                return "Not recorded"
        return stripped
    
    if isinstance(value, (int, float)):
        if value == 0 and field_name in ("shipping_distance_km", "account_age_days"):
            return f"0 ({field_name.replace('_', ' ').title()})"
        if isinstance(value, float):
            return f"{value:,.2f}"
        return str(value)
    
    str_val = str(value).strip()
    if str_val == "" or str_val.lower() in ("none", "not recorded", "nan", "nil", "null"):
        return "Not recorded"
    return str_val or "Not recorded"


def _safe_float(value, default: float = 0.0) -> float:
    """Safely cast a value to float, handling sanitized strings like '0 (Digital Item)'."""
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return default
    cleaned = value.replace(",", "").strip()
    if not cleaned:
        return default
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        pass
    match = re.match(r'^([+-]?\d+\.?\d*)', cleaned)
    if match:
        try:
            return float(match.group(1))
        except (ValueError, TypeError):
            pass
    return default


def _sanitize_tx_record(tx: dict) -> dict:
    """Lightweight transaction sanitizer local to the LLM agent."""
    sanitized = {}
    for key, value in tx.items():
        sanitized[key] = _sanitize_llm_value(value, key)
    return sanitized


def _explain_shap_impact(name: str, value: float, tx: dict) -> str:
    """Generate a merchant-friendly explanation for a single SHAP feature."""
    safe_value = _sanitize_llm_value(value, name)
    label = _humanize_feature(name)

    if safe_value == "Not recorded":
        return f"**{label}** — This factor is **Not recorded** in the transaction data."

    if isinstance(safe_value, str) and safe_value.startswith("0 ("):
        try:
            numeric_val = float(safe_value.split("(")[0].strip())
            safe_value = numeric_val
        except (ValueError, IndexError):
            safe_value = 0.0

    numeric_val = _safe_float(safe_value, default=0.0)

    if name == "avs_match":
        if numeric_val == 0 or safe_value in (0, "0", "0 (Not Verified)"):
            return f"**{label}** (Failed/Mismatch) — Billing address did NOT match card on file, driving elevated risk."
        return f"**{label}** (Verified) — Billing address matched card on file."

    if name == "cvv_result":
        if numeric_val == 0 or safe_value in (0, "0", "0 (Not Verified)"):
            return f"**{label}** (Failed/Mismatch) — CVV code check failed or was missing."
        return f"**{label}** (Verified) — CVV security code matched."

    if name == "three_ds_flag":
        if numeric_val == 0 or safe_value in (0, "0", "0 (Not Authenticated)"):
            return f"**{label}** (Not Authenticated) — 3-D Secure OTP challenge bypassed or failed."
        return f"**{label}** (Authenticated) — 3-D Secure authentication completed successfully."

    if name == "account_age_days":
        age = _safe_float(tx.get("account_age_days", numeric_val)) if tx else numeric_val
        if age <= 3:
            return f"**{label}** ({age:.0f} days old) — Account is newly created ({age:.0f} days old), a common fraud signature."
        elif age > 180:
            return f"**{label}** ({age:.0f} days old) — Established account history, providing positive trust signal."
        else:
            return f"**{label}** ({age:.0f} days old) — Account age recorded at {age:.0f} days."

    if name == "amount":
        amt = _safe_float(tx.get("amount", numeric_val)) if tx else numeric_val
        avg = _safe_float(tx.get("avg_amount_user", 0)) if tx else 0.0
        if amt > 0:
            if avg > 0 and amt > avg * 1.5:
                return (
                    f"**{label}** (₹{amt:,.2f}) — Order amount is significantly higher than "
                    f"typical spend (avg ₹{avg:,.2f})."
                )
            return f"**{label}** (₹{amt:,.2f}) — High order value contributing to risk score."
        return f"**{label}** (₹{amt:,.2f}) — Order amount recorded."

    if name == "shipping_distance_km":
        dist = _safe_float(tx.get("shipping_distance_km", numeric_val)) if tx else numeric_val
        if dist > 500:
            return f"**{label}** ({dist:,.0f} km) — Unusually large shipping distance, indicating potential reshipping fraud."
        elif dist == 0:
            return f"**{label}** (0 km) — Local shipping or digital delivery."
        return f"**{label}** ({dist:,.0f} km) — Shipping distance recorded."

    direction = "increased" if value > 0 else "decreased"
    return f"**{label}** — {direction.title()} risk score based on pattern analysis."


class LLMAgent:
    """Agentic wrapper using AIML API (anthropic/claude-3-opus-20240229)."""

    def __init__(self, api_key: str = "", model_name: str = "anthropic/claude-3-opus-20240229"):
        self.api_key = api_key or os.getenv("AIML_API_KEY", "")
        self.model_name = model_name or "anthropic/claude-3-opus-20240229"
        self._is_api_available = bool(self.api_key and self.api_key.strip())
        self.client = None

        if self._is_api_available:
            try:
                self.client = OpenAI(
                    base_url="https://api.aimlapi.com/v1",
                    api_key=self.api_key.strip(),
                )
                logger.info(f"LLMAgent initialized with AIML API model '{self.model_name}'")
            except Exception as e:
                logger.error(f"Failed to initialize AIML API client: {e}")
                self._is_api_available = False
        else:
            logger.warning("AIML_API_KEY is empty. LLMAgent running in TEMPLATE FALLBACK mode.")

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Execute chat completion call via AIML API (OpenAI-compatible)."""
        if not self.client or not self._is_api_available:
            return None

        def _sync_call():
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1024,
                temperature=0.2,
            )
            return response.choices[0].message.content

        try:
            return await asyncio.to_thread(_sync_call)
        except Exception as e:
            logger.error(f"AIML API Call Error with model {self.model_name}: {e}")
            return None

    def _get_chat_system_prompt(self) -> str:
        """System prompt for conversational Co-Pilot chat."""
        return (
            "You are the RiskSentinel AI Investigator, an expert fraud analyst for e-commerce and Indian digital payments.\n"
            "You have full access to live transaction telemetry, risk model scores, user history, "
            "live Razorpay Payment Gateway API telemetry (orders, payment statuses, receipt IDs, and gateway notes), "
            "and FRAUD RING NETWORK ANALYSIS GRAPH DATA showing connections between transactions "
            "sharing IP addresses, Card BINs, device fingerprints, or shipping addresses within velocity windows.\n\n"
            "MANDATORY CONSISTENCY & ACCURACY GUARDRAILS:\n"
            "1. CRITICAL: Maintain 100% internal numerical consistency across your entire response.\n"
            "2. Never state that a user has '0 prior orders' or 'no prior history' if historical assessment data shows prior transaction history.\n"
            "3. Ensure every top SHAP driver (including AVS address check, CVV status, order amount, shipping distance, and account age) is explicitly mentioned if it contributed to the risk score.\n"
            "4. When asked about payments, Razorpay orders, receipt status, or checkout details, reference the live Razorpay API order telemetry provided in the context.\n"
            "5. CRITICAL NETWORK ANALYSIS: If the network analysis graph (risk_network_data) shows the current user is linked via shared IP to multiple previously blocked transactions (Velocity Attack), EXPLICITLY mention this as a severe risk-increasing factor: *'Fraud Ring Network detected: This transaction is behaviorally linked to X previously blocked attempts sharing the same proxy IP address.'* Similarly, flag shared Card BINs, device fingerprints, or shipping addresses across multiple suspicious transactions.\n"
            "6. CRITICAL UPI FRAUD INTELLIGENCE: If the transaction uses UPI (payment_method='upi'), you MUST evaluate:\n"
            "   - Device Binding Verified: If FAILED (device_binding_verified=0), EXPLICITLY state: *'CRITICAL RISK: UPI Device Binding failure detected. This strongly indicates a SIM-swapping or remote-access screen-sharing attack, which is a primary vector for UPI fraud in India. Transaction blocked to protect merchant from immediate UPI dispute.'*\n"
            "   - VPA Age > 30 Days: If FAILED (vpa_age_verified=0), state: *'ELEVATED RISK: VPA handle is less than 30 days old. Newly created VPA handles are frequently used in social engineering and phishing campaigns.'*\n"
            "   - High Amount + Failed Binding: If amount > ₹25,000 AND device binding failed, state: *'SEVERE RISK: High-value UPI transaction on unbound device. Immediate block recommended per NPCI fraud mitigation guidelines.'*\n"
            "7. Base your answers STRICTLY on the provided data. Do not hallucinate or invent reasons.\n"
            "8. Keep your tone professional, analytical, and conversational. Do not output raw JSON or robotic templates.\n"
            "9. NEVER mention Claude, Anthropic, Gemini, Google, OpenAI, GPT, or ANY external AI brand or model name. You are 'RiskSentinel AI Investigator'.\n"
            "10. NEVER use ML jargon (no 'SHAP', 'feature importance', 'XGBoost', 'Isolation Forest', 'gradient boosting'). Refer to them as 'Pattern Recognition Engine' and 'Anomaly Detection Engine'.\n"
            "11. 3-TIER ADAPTIVE AUTHENTICATION (Smart 3DS) POLICY: "
            "When asked about medium-risk orders (risk score 30%–75%), explain: "
            "\"This transaction fell into the Medium Risk category (30-75%), so instead of blocking the buyer, RiskSentinel triggered Step-Up Authentication (3DS OTP challenge) to protect merchant revenue while verifying card ownership.\"\n"
            "12. Keep responses conversational, specific, and concise."
        )

    def _build_report_prompt(
        self, tx: dict, shap: dict, anomaly: float, risk: float, history: list | None,
    ) -> str:
        shap_summary_text = self._build_shap_summary(shap, tx)

        hist_block = ""
        if history and len(history) > 0:
            scores = [str(round(h.get("risk_score", 0), 3)) for h in history[:5]]
            hist_block = (
                f"\n## User History\n"
                f"Prior transactions in DB: {len(history)}\n"
                f"Recent risk scores: {', '.join(scores)}\n"
            )
        else:
            hist_block = "\n## User History\nPrior transactions in DB: 0\n"

        # UPI-specific context block
        upi_block = ""
        if tx.get("payment_method") == "upi":
            vpa = tx.get("vpa_handle", "unknown")
            dev_binding = "FAILED" if tx.get("device_binding_verified", 1) == 0 else "PASSED"
            vpa_age = "FAILED (<30 days)" if tx.get("vpa_age_verified", 1) == 0 else "PASSED (>30 days)"
            
            upi_block = f"""
## UPI FRAUD INTELLIGENCE CONTEXT
- Payment Method: UPI
- VPA Handle: {vpa}
- Device Binding Verified: {dev_binding}
- VPA Age > 30 Days: {vpa_age}

CRITICAL: If Device Binding is FAILED, this is a PRIMARY INDICATOR of SIM-swapping or remote-access attack.
CRITICAL: If VPA Age < 30 days, this is an ELEVATED RISK indicator for social engineering/phishing.
"""

        safe_tx = {k: v for k, v in tx.items() if k not in ("transaction_time",)}

        return f"""You are the **RiskSentinel AI Investigator**, an autonomous fraud analysis agent built into the RiskSentinel AI platform.

## CRITICAL IDENTITY & CONSISTENCY RULES
- You are "RiskSentinel AI Investigator".
- ABSOLUTELY NEVER mention "Gemini", "Google", "OpenAI", "GPT", "Claude", "Anthropic", or any external brand.
- ABSOLUTELY NEVER reveal internal model names like "XGBoost", "Isolation Forest", "SHAP".
- Refer to scoring systems ONLY as "RiskSentinel's Pattern Recognition Engine" and "RiskSentinel's Anomaly Detection Engine".
- CRITICAL: Maintain 100% internal numerical consistency across your entire response.
- Never state that a user has '0 prior orders' if historical assessment data shows prior transaction history.
- Ensure every top SHAP driver (including AVS address check, CVV status, order amount, shipping distance, and account age) is explicitly mentioned if it contributed to the risk score.

## Transaction Data
{json.dumps(safe_tx, indent=2)}

## Risk Assessment
- Combined Risk Score: {risk:.1%} (0% = safe, 100% = fraud)
- Anomaly Detection Score: {anomaly:.1%}

## Top Risk Drivers & Security Checks
{shap_summary_text}
{hist_block}
{upi_block}

## Output Format
### Risk Summary
2–3 plain-English sentences explaining why this transaction was flagged. Focus on the BUSINESS MEANING.

### Key Risk Indicators
Bullet list of top signals (Address Verification AVS, CVV Match, Order Amount, Shipping Distance, Account Age, UPI Device Binding, VPA Age).

### Behavioral Anomaly Analysis
Explain in simple terms what anomalous behavior means for this case.

### Recommended Action
BLOCK / STEP-UP AUTHENTICATION / MANUAL REVIEW — with justification.

### Confidence Level
State: Low / Medium / High confidence."""

    def _template_report(
        self, tx: dict, shap: dict, anomaly: float, risk: float, history: list | None,
    ) -> str:
        risk_level = "HIGH" if risk >= 0.75 else "MEDIUM" if risk >= 0.30 else "LOW"
        anomaly_status = "flagged as unusual" if anomaly > 0.5 else "within normal range"
        indicator_text = self._build_shap_summary(shap, tx)

        hist_note = "No prior transaction history available for this user."
        if history and len(history) > 0:
            avg = sum(h.get("risk_score", 0) for h in history) / len(history)
            hist_note = f"This user has {len(history)} prior transactions with an average risk score of {avg:.1%}."

        # UPI-specific context for template report
        upi_note = ""
        if tx.get("payment_method") == "upi":
            vpa = tx.get("vpa_handle", "unknown")
            dev_binding = "FAILED" if tx.get("device_binding_verified", 1) == 0 else "PASSED"
            vpa_age = "FAILED (<30 days)" if tx.get("vpa_age_verified", 1) == 0 else "PASSED (>30 days)"
            
            upi_alerts = []
            if dev_binding == "FAILED":
                upi_alerts.append("**CRITICAL: UPI Device Binding FAILED — Strong indicator of SIM-swapping or remote-access screen-sharing attack**")
            if vpa_age == "FAILED (<30 days)":
                upi_alerts.append("**ELEVATED: VPA Handle < 30 days old — Common in phishing/social engineering campaigns**")
            
            upi_note = f"""

### UPI Fraud Intelligence
- **VPA Handle:** {vpa}
- **Device Binding:** {dev_binding}
- **VPA Age:** {vpa_age}
{''.join([f'- {alert}\\n' for alert in upi_alerts])}"""

        if risk >= 0.75:
            action = "**BLOCK & HOLD FOR MANUAL REVIEW** — Multiple high-confidence fraud indicators were detected."
        elif risk >= 0.30:
            action = (
                "**REQUIRE STEP-UP AUTHENTICATION (Smart 3DS)** — This transaction fell into the Medium Risk category (30-75%), "
                "so instead of blocking the buyer, RiskSentinel triggered Step-Up Authentication (3DS OTP challenge) to protect merchant revenue while verifying card ownership."
            )
        else:
            action = "**AUTO-APPROVE** — Transaction metrics within normal behavioral parameters."

        return f"""### Risk Summary
Transaction **{tx.get('transaction_id', 'N/A')}** from user **{tx.get('user_id', 'N/A')}** has been flagged with a combined risk score of **{risk:.1%}** ({risk_level} RISK). The order amount is ₹{tx.get('amount', 0):,.2f}.

### Key Risk Indicators
{indicator_text}

### Behavioral Anomaly Analysis
RiskSentinel's Anomaly Detection Engine scored this transaction at **{anomaly:.1%}**, which is {anomaly_status}.

### Historical Context
{hist_note}
{upi_note}

### Recommended Action
{action}
### Confidence Level
RiskSentinel AI Confidence: **{risk_level}**
"""

    async def generate_threat_report(
        self, payload: dict, shap: dict, anomaly: float, risk: float, history: list | None = None,
    ) -> str:
        """Generate structured Threat Intelligence Report."""
        if self._is_api_available:
            system_prompt = self._get_chat_system_prompt()
            user_prompt = self._build_report_prompt(payload, shap, anomaly, risk, history)
            report = await self._call_llm(system_prompt, user_prompt)
            if report:
                return report

        return self._template_report(payload, shap, anomaly, risk, history)

    # ================================================================
    #  CO-PILOT CHAT HELPERS
    # ================================================================

    def _build_shap_summary(self, shap_data: dict, tx: dict) -> str:
        """Build a human-readable summary of SHAP risk drivers ensuring ALL key security drivers are present."""
        if not shap_data:
            return "No SHAP risk driver data is available for this transaction."

        sorted_shap = sorted(shap_data.items(), key=lambda x: abs(x[1]), reverse=True)
        critical_keys = {"avs_match", "cvv_result", "three_ds_flag", "account_age_days", "amount", "shipping_distance_km"}
        
        selected_features = []
        seen = set()

        for name, val in sorted_shap:
            if abs(val) > 0.0001:
                selected_features.append((name, val))
                seen.add(name)
            if len(selected_features) >= 8:
                break

        for name, val in sorted_shap:
            if name in critical_keys and name not in seen:
                selected_features.append((name, val))
                seen.add(name)

        risk_increasing = [(n, v) for n, v in selected_features if v > 0]
        risk_reducing = [(n, v) for n, v in selected_features if v < 0]

        lines = []
        if risk_increasing:
            lines.append("**Factors that INCREASED risk:**")
            for name, value in risk_increasing:
                lines.append(f"  - {_explain_shap_impact(name, value, tx)}")
        if risk_reducing:
            lines.append("**Factors that DECREASED risk:**")
            for name, value in risk_reducing:
                lines.append(f"  - {_explain_shap_impact(name, value, tx)}")

        return "\n".join(lines) if lines else "All features within baseline range."

    def _build_context_block(
        self,
        tx: dict,
        shap_data: dict,
        user_history: list | None,
        razorpay_context: Optional[dict] = None,
        network_data: Optional[dict] = None
    ) -> str:
        """Build a structured context block including live Razorpay Payment Gateway API telemetry and Fraud Ring Network Analysis."""
        sanitized_tx = _sanitize_tx_record(tx)

        amount = _safe_float(sanitized_tx.get("order_amount", 0.0))
        risk_score = _safe_float(sanitized_tx.get("risk_score", 0.0))
        xgb_score = _safe_float(sanitized_tx.get("xgboost_score", 0.0))
        anomaly_score = _safe_float(sanitized_tx.get("anomaly_score", 0.0))
        category = str(sanitized_tx.get("risk_category", "N/A"))
        action = str(sanitized_tx.get("action_taken", "N/A"))

        shap_summary = self._build_shap_summary(shap_data, sanitized_tx)
        prior_count = len(user_history) if user_history is not None else 0

        hist_block = ""
        if user_history and len(user_history) > 0:
            recent_scores = [f"{_safe_float(h.get('risk_score', 0)) * 100:.0f}%" for h in user_history[:5]]
            avg_hist_risk = sum(_safe_float(h.get("risk_score", 0)) for h in user_history) / prior_count
            categories = [str(h.get("risk_category", "?")) for h in user_history[:5]]
            hist_block = (
                f"\n## User Transaction History\n"
                f"- Total prior assessments: {prior_count}\n"
                f"- Total prior orders: {prior_count}\n"
                f"- Recent risk scores: {', '.join(recent_scores)}\n"
                f"- Recent verdicts: {', '.join(c.replace('_', ' ') for c in categories)}\n"
                f"- Average historical risk: {avg_hist_risk * 100:.1f}%\n"
            )
        else:
            hist_block = (
                f"\n## User Transaction History\n"
                f"- Total prior assessments: 0\n"
                f"- Total prior orders: 0\n"
            )

        # ── Razorpay Gateway Context Block ──
        rzp_block = ""
        if razorpay_context:
            matching_order = razorpay_context.get("matching_order")
            recent_orders = razorpay_context.get("recent_orders", [])
            
            rzp_lines = ["\n## Live Razorpay Payment Gateway Telemetry"]
            if matching_order:
                rzp_lines.append(f"- **Matching Order ID:** {matching_order.get('order_id')}")
                rzp_lines.append(f"- **Order Status:** {matching_order.get('status')}")
                rzp_lines.append(f"- **Order Amount:** ₹{matching_order.get('amount_inr', 0):,.2f}")
                rzp_lines.append(f"- **Receipt ID:** {matching_order.get('receipt')}")
                rzp_lines.append(f"- **Attempts:** {matching_order.get('attempts')}")
                rzp_lines.append(f"- **Gateway Notes:** {json.dumps(matching_order.get('notes', {}))}")
            elif recent_orders:
                rzp_lines.append(f"- **Recent Gateway Orders Count:** {len(recent_orders)}")
                sample_orders = [f"{o.get('order_id')} (₹{o.get('amount_inr'):,.2f}, status: {o.get('status')})" for o in recent_orders[:3]]
                rzp_lines.append(f"- **Recent Gateway Orders:** {', '.join(sample_orders)}")
            
            rzp_block = "\n".join(rzp_lines)

        # ── Fraud Ring Network Analysis Block ──
        network_block = ""
        if network_data:
            metadata = network_data.get("metadata", {})
            clusters = network_data.get("clusters", [])
            nodes = network_data.get("nodes", [])
            links = network_data.get("links", [])
            
            # Count connections by type
            total_connections = metadata.get("total_connections", 0)
            blocked_connections = metadata.get("blocked_connections", 0)
            velocity_score = metadata.get("velocity_score", 0)
            is_velocity_attack = metadata.get("is_velocity_attack", False)
            
            # Group links by attribute type
            link_types = defaultdict(int)
            for link in links:
                attr = link.get("attribute", "unknown")
                link_types[attr] += 1
            
            network_lines = ["\n## Fraud Ring Network Analysis (Velocity & Ring Detection)"]
            network_lines.append(f"- **Velocity Window:** {metadata.get('velocity_window_hours', 24)} hours")
            network_lines.append(f"- **Total Network Connections:** {total_connections}")
            network_lines.append(f"- **Blocked Transaction Links:** {blocked_connections}")
            network_lines.append(f"- **Velocity Score:** {velocity_score:.0%} {'(VELOCITY ATTACK DETECTED)' if is_velocity_attack else '(Normal)'}")
            
            if link_types:
                network_lines.append("- **Shared Attribute Breakdown:**")
                for attr, count in sorted(link_types.items(), key=lambda x: -x[1]):
                    attr_label = self.FRAUD_ATTRIBUTES.get(attr, attr.replace("_", " ").title())
                    network_lines.append(f"  - {attr_label}: {count} connections")
            
            if clusters:
                network_lines.append(f"- **Fraud Clusters Detected:** {len(clusters)}")
                for cluster in clusters:
                    shared_attrs = ", ".join([a["display"] for a in cluster.get("shared_attributes", [])])
                    network_lines.append(f"  - Cluster {cluster['id']}: {len(cluster['members'])} transactions sharing [{shared_attrs}] — Severity: {cluster['severity']}")
                    network_lines.append(f"    *{cluster['description']}*")
            
            network_block = "\n".join(network_lines)

        total_tx_str = str(prior_count) if prior_count > 0 else _sanitize_llm_value(sanitized_tx.get("total_transactions_user", 0), "total_transactions_user")

        raw_features = {
            "account_age_days": _sanitize_llm_value(sanitized_tx.get("account_age_days", 0), "account_age_days"),
            "total_transactions_user": total_tx_str,
            "avg_amount_user": _sanitize_llm_value(sanitized_tx.get("avg_amount_user", 0.0), "avg_amount_user"),
            "shipping_distance_km": _sanitize_llm_value(sanitized_tx.get("shipping_distance_km", 0.0), "shipping_distance_km"),
            "promo_used": _sanitize_llm_value(sanitized_tx.get("promo_used", 0), "promo_used"),
            "avs_match": _sanitize_llm_value(sanitized_tx.get("avs_match", 0), "avs_match"),
            "cvv_result": _sanitize_llm_value(sanitized_tx.get("cvv_result", 0), "cvv_result"),
            "three_ds_flag": _sanitize_llm_value(sanitized_tx.get("three_ds_flag", 0), "three_ds_flag"),
            "country": str(sanitized_tx.get("country", "IN")),
            "bin_country": str(sanitized_tx.get("bin_country", "IN")),
            "channel": str(sanitized_tx.get("channel", "web")),
            "merchant_category": str(sanitized_tx.get("merchant_category", "electronics")),
        }

        avg_spend_val = _safe_float(raw_features['avg_amount_user'])

        return f"""## Transaction Telemetry
- **Transaction ID:** {str(sanitized_tx.get('transaction_id', 'N/A'))}
- **User ID:** {str(sanitized_tx.get('user_id', 'N/A'))}
- **Amount:** ₹{amount:,.2f}
- **Timestamp:** {str(sanitized_tx.get('timestamp', 'N/A'))}

## Risk Assessment Results
- **Combined Risk Score:** {risk_score * 100:.1f}%
- **Pattern Recognition Engine (XGBoost):** {xgb_score * 100:.1f}%
- **Behavioral Anomaly Engine (Isolation Forest):** {anomaly_score * 100:.1f}%
- **Risk Category:** {category.replace('_', ' ')}
- **Action Taken:** {action.replace('_', ' ')}

## Key Risk Drivers & Gateway Security Checks
{shap_summary}
{hist_block}{rzp_block}{network_block}

## Raw Transaction Features
- Account Age: {raw_features['account_age_days']}
- Prior Orders: {raw_features['total_transactions_user']}
- Average Spend: ₹{avg_spend_val:,.2f}
- Shipping Distance: {raw_features['shipping_distance_km']}
- Promo Code Used: {raw_features['promo_used']}
- Address Verification (AVS): {raw_features['avs_match']}
- CVV Match: {raw_features['cvv_result']}
- 3-D Secure: {raw_features['three_ds_flag']}
- Buyer Country: {raw_features['country']}
- Card Country: {raw_features['bin_country']}
- Channel: {raw_features['channel'].title()}
- Merchant Category: {raw_features['merchant_category'].title()}"""

    async def chat(
        self,
        message: str,
        transaction_context: Optional[dict] = None,
        user_history: Optional[list] = None,
        razorpay_context: Optional[dict] = None,
        network_data: Optional[dict] = None,
    ) -> str:
        """Conversational Risk Co-Pilot powered by AIML API (anthropic/claude-3-opus-20240229)."""
        shap_data = {}
        if transaction_context:
            shap_raw = transaction_context.get("shap_top_features", "{}")
            try:
                shap_data = json.loads(shap_raw) if isinstance(shap_raw, str) else (shap_raw or {})
            except Exception:
                shap_data = {}

        if self._is_api_available and transaction_context:
            try:
                context_block = self._build_context_block(transaction_context, shap_data, user_history, razorpay_context, network_data)
                system_prompt = self._get_chat_system_prompt()
                user_prompt = f"""CONTEXT TELEMETRY:
{context_block}

USER QUESTION:
{message}"""

                result = await self._call_llm(system_prompt, user_prompt)
                if result:
                    return result
            except Exception as e:
                logger.error("AIML API Error: %s", e, exc_info=True)

        elif self._is_api_available and not transaction_context:
            rzp_info = ""
            if razorpay_context and razorpay_context.get("recent_orders"):
                orders = razorpay_context["recent_orders"]
                rzp_info = f"\nRecent Razorpay Gateway Orders: {json.dumps(orders[:3])}\n"

            system_prompt = self._get_chat_system_prompt()
            user_prompt = f"""No specific transaction is currently attached.
{rzp_info}
If the user asks about a specific transaction, suggest attaching a Transaction ID.

USER QUESTION:
{message}"""

            try:
                result = await self._call_llm(system_prompt, user_prompt)
                if result:
                    return result
            except Exception as e:
                logger.error("AIML API Error: %s", e, exc_info=True)

        # ── Dynamic Fallback if LLM unavailable or fails ──
        try:
            return self._dynamic_fallback(message, transaction_context, user_history, shap_data, razorpay_context, network_data)
        except Exception as e:
            logger.error("Dynamic fallback error: %s", e, exc_info=True)
            return self._ultimate_fallback(message, transaction_context)

    def _dynamic_fallback(
        self,
        message: str,
        transaction_context: Optional[dict],
        user_history: Optional[list],
        shap_data: dict,
        razorpay_context: Optional[dict] = None,
        network_data: Optional[dict] = None,
    ) -> str:
        """Data-driven fallback when LLM is unavailable."""
        msg = message.lower()

        if transaction_context:
            tx_id = transaction_context.get("transaction_id", "N/A")
            user_id = transaction_context.get("user_id", "N/A")
            amount = _safe_float(transaction_context.get("order_amount", 0.0))
            risk_score = _safe_float(transaction_context.get("risk_score", 0.0))
            xgb_score = _safe_float(transaction_context.get("xgboost_score", 0.0))
            anomaly_score = _safe_float(transaction_context.get("anomaly_score", 0.0))
            category = transaction_context.get("risk_category", "N/A")

            drivers_text = self._build_shap_summary(shap_data, transaction_context)

            hist_narrative = ""
            if user_history and len(user_history) > 0:
                prior_count = len(user_history)
                avg_hist_risk = sum(_safe_float(h.get("risk_score", 0)) for h in user_history) / prior_count
                hist_narrative = (
                    f"\n\nLooking at this user's history, they have **{prior_count}** prior orders "
                    f"in our audit trail with an average risk score of **{avg_hist_risk * 100:.1f}%**."
                )

            rzp_narrative = ""
            if razorpay_context and razorpay_context.get("matching_order"):
                mo = razorpay_context["matching_order"]
                rzp_narrative = (
                    f"\n\n**Razorpay Gateway Telemetry:** Order **{mo.get('order_id')}** "
                    f"status is **{mo.get('status')}** (Amount: ₹{mo.get('amount_inr', 0):,.2f}, Receipt: {mo.get('receipt')})."
                )

            # Network analysis narrative
            network_narrative = ""
            if network_data:
                metadata = network_data.get("metadata", {})
                total_connections = metadata.get("total_connections", 0)
                blocked_connections = metadata.get("blocked_connections", 0)
                velocity_score = metadata.get("velocity_score", 0)
                is_velocity_attack = metadata.get("is_velocity_attack", False)
                clusters = network_data.get("clusters", [])

                if total_connections > 0:
                    network_narrative = (
                        f"\n\n**Fraud Ring Network Analysis:** "
                        f"Found **{total_connections}** linked transactions in the last {metadata.get('velocity_window_hours', 24)}h "
                        f"({blocked_connections} blocked). Velocity score: {velocity_score:.0%}."
                    )
                    if is_velocity_attack:
                        network_narrative += " **⚠ VELOCITY ATTACK DETECTED** — Multiple transactions from different users sharing attributes."
                    if clusters:
                        network_narrative += f" **{len(clusters)} fraud cluster(s) identified** with 3+ shared attributes."

            if category == "LOW_RISK":
                verdict_intro = (
                    f"Transaction **{tx_id}** was **approved** (risk score: **{risk_score * 100:.1f}%**). "
                    f"The order of **₹{amount:,.2f}** from user **{user_id}** passed all checks."
                )
            elif category == "MEDIUM_RISK":
                verdict_intro = (
                    f"Transaction **{tx_id}** was flagged for **Step-Up Authentication** (risk score: **{risk_score * 100:.1f}%**). "
                    f"This transaction fell into the Medium Risk category (30-75%), so instead of blocking the buyer, "
                    f"RiskSentinel triggered Step-Up Authentication (3DS OTP challenge) to protect merchant revenue while verifying card ownership."
                )
            else:
                verdict_intro = (
                    f"Transaction **{tx_id}** was **blocked** for manual review (risk score: **{risk_score * 100:.1f}%**). "
                    f"The order of **₹{amount:,.2f}** from user **{user_id}** triggered high-confidence fraud indicators."
                )

            return f"""{verdict_intro}

Here are the key factors evaluated:

{drivers_text}

The **Pattern Recognition Engine** scored this at **{xgb_score * 100:.1f}%**, while the **Anomaly Detection Engine** scored it at **{anomaly_score * 100:.1f}%**.{hist_narrative}{rzp_narrative}{network_narrative}"""

        # ── General Questions Fallback (No Transaction Context) ──
        if any(k in msg for k in ["hi", "hello", "hey", "greetings"]):
            return (
                "Hello! I am the **RiskSentinel AI Investigator**, your AI-powered fraud analyst. "
                "How can I assist you today?\n\n"
                "You can ask me general questions about risk scoring, fraud detection, and Razorpay integration, "
                "or enter a **Transaction ID** above to analyze a specific order in real time."
            )
        elif any(k in msg for k in ["who", "what are you", "identity", "help"]):
            return (
                "I am the **RiskSentinel AI Investigator**, built to help merchants detect, explain, and prevent payment fraud.\n\n"
                "Here's what I can do:\n"
                "1. **Transaction Risk Analysis:** Explain why an order was approved, flagged, or blocked.\n"
                "2. **Dual-Engine Scoring:** Compare scores from the **Pattern Recognition Engine** and **Behavioral Anomaly Engine**.\n"
                "3. **Security Drivers:** Analyze AVS address matches, CVV verification, 3-D Secure status, shipping distance, and account age.\n"
                "4. **Razorpay Telemetry:** Fetch live Razorpay gateway order statuses, receipt IDs, and amounts.\n\n"
                "Enter a **Transaction ID** in the top field to inspect a specific order, or ask me any question!"
            )
        elif any(k in msg for k in ["razorpay", "gateway", "payment", "checkout"]):
            return (
                "RiskSentinel integrates directly with the **Razorpay Payment Gateway API**.\n\n"
                "For every transaction:\n"
                "- Low-risk orders generate a live Razorpay Order ID (`order_...`) for instant checkout.\n"
                "- Medium-risk orders (30%-75%) generate a Razorpay Order ID requiring Step-Up 3DS authentication.\n"
                "- I track order status (`created`, `paid`), amounts in INR, receipt IDs, and gateway notes.\n"
                "- High-risk orders are blocked before payment capture to prevent chargeback losses."
            )
        elif any(k in msg for k in ["how", "detect", "work", "engine", "model"]):
            return (
                "RiskSentinel uses a **Dual-Engine Risk Architecture**:\n\n"
                "1. **Pattern Recognition Engine:** Supervised XGBoost classifier trained on known fraud signatures.\n"
                "2. **Behavioral Anomaly Engine:** Unsupervised Isolation Forest model detecting statistical outliers in buyer behavior.\n"
                "3. **Explainable SHAP Drivers:** Decomposes risk scores into clear business factors (AVS, CVV, amount, distance, account age).\n"
                "4. **3-Tier Adaptive Gating:** Auto-approves safe orders (<30%), triggers Step-Up Authentication (Smart 3DS OTP challenge) for medium risk (30%-75%) to protect merchant revenue while verifying card ownership, and blocks high risk (>=75%)."
            )

        return (
            "Hello! I am the **RiskSentinel AI Investigator**. "
            "You can ask me questions about risk analysis, or enter a **Transaction ID** above to investigate a specific order."
        )

    def _ultimate_fallback(self, message: str, transaction_context: Optional[dict]) -> str:
        return "I'm the **RiskSentinel AI Investigator**. The model service is temporarily unavailable."
