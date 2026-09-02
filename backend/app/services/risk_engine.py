"""
RiskSentinel AI v2.0 -- Adaptive Risk Engine (Smart 3DS)
=========================================================
Implements the 3-tier adaptive authentication strategy:
  1. Low Risk (< 30.0%)       -> recommendation: "AUTO_APPROVE", risk_level: "LOW_RISK"
  2. Medium Risk (30.0%-74.9%) -> recommendation: "STEP_UP_AUTH", risk_level: "MEDIUM_RISK"
  3. High Risk (>= 75.0%)      -> recommendation: "BLOCK", risk_level: "HIGH_RISK"

Provides unified scoring, classification, and gating decisions for payment processing.
"""
from typing import Dict, Any, Tuple


def classify_risk(risk_score: float, low_ceiling: float = 0.30, high_floor: float = 0.75) -> Dict[str, Any]:
    """
    Classify a normalized risk score (0.0 to 1.0) into 3-tier Adaptive Authentication levels.

    Args:
        risk_score: Combined risk score between 0.0 and 1.0
        low_ceiling: Upper bound for low risk (default 0.30 / 30.0%)
        high_floor: Lower bound for high risk (default 0.75 / 75.0%)

    Returns:
        Dict containing:
            - recommendation: "AUTO_APPROVE" | "STEP_UP_AUTH" | "BLOCK"
            - risk_level: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK"
            - risk_category: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK"
            - action_taken: "AUTO_APPROVE" | "REQUIRE_STEP_UP_AUTH" | "BLOCK_AND_REVIEW"
            - requires_step_up_3ds: bool (True only for MEDIUM_RISK)
            - explanation: str merchant-facing verdict summary
    """
    # Clamp score to [0.0, 1.0]
    score = max(0.0, min(1.0, float(risk_score)))

    if score < low_ceiling:
        return {
            "recommendation": "AUTO_APPROVE",
            "risk_level": "LOW_RISK",
            "risk_category": "LOW_RISK",
            "action_taken": "AUTO_APPROVE",
            "requires_step_up_3ds": False,
            "explanation": "Transaction metrics within normal behavioral parameters. Auto-approved for seamless checkout.",
        }
    elif score < high_floor:
        return {
            "recommendation": "STEP_UP_AUTH",
            "risk_level": "MEDIUM_RISK",
            "risk_category": "MEDIUM_RISK",
            "action_taken": "REQUIRE_STEP_UP_AUTH",
            "requires_step_up_3ds": True,
            "explanation": "Elevated risk score (30.0%–74.9%). Step-Up Authentication (Smart 3DS OTP challenge) triggered to protect merchant revenue while verifying card ownership.",
        }
    else:
        return {
            "recommendation": "BLOCK",
            "risk_level": "HIGH_RISK",
            "risk_category": "HIGH_RISK",
            "action_taken": "BLOCK_AND_REVIEW",
            "requires_step_up_3ds": False,
            "explanation": "High fraud probability (>= 75.0%). Transaction blocked and flagged for manual review.",
        }


class RiskEngine:
    """Adaptive Risk Evaluation Service."""

    def __init__(self, low_ceiling: float = 0.30, high_floor: float = 0.75):
        self.low_ceiling = low_ceiling
        self.high_floor = high_floor

    def evaluate(self, risk_score: float) -> Dict[str, Any]:
        """Evaluate a risk score and return 3-tier adaptive authentication strategy."""
        return classify_risk(risk_score, self.low_ceiling, self.high_floor)
