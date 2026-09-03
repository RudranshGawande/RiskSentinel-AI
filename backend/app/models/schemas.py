from typing import Optional

from pydantic import BaseModel, Field

class TransactionPayload(BaseModel):
    """Incoming transaction for risk assessment.
    
    All fields except transaction_id and user_id have safe defaults
    so the API never crashes on missing optional fields.
    """
    transaction_id: str
    user_id: str
    account_age_days: int = Field(default=0, ge=0)
    total_transactions_user: int = Field(default=0, ge=0)
    avg_amount_user: float = Field(default=0.0, ge=0)
    amount: float = Field(default=0.0, ge=0)
    shipping_distance_km: float = Field(default=0.0, ge=0)
    promo_used: int = Field(default=0, ge=0, le=1)
    avs_match: int = Field(default=0, ge=0, le=1)
    cvv_result: int = Field(default=0, ge=0, le=1)
    three_ds_flag: int = Field(default=0, ge=0, le=1)
    country: str = "IN"
    bin_country: str = "IN"
    channel: str = "web"
    merchant_category: str = "electronics"
    transaction_time: Optional[str] = None
    # Fraud ring detection attributes
    ip_address: Optional[str] = ""
    card_bin: Optional[str] = ""
    device_fingerprint: Optional[str] = ""
    shipping_address: Optional[str] = ""
    # UPI-specific attributes
    payment_method: str = "card"  # "card" or "upi"
    vpa_handle: Optional[str] = ""
    device_binding_verified: int = Field(default=1, ge=0, le=1)
    vpa_age_verified: int = Field(default=1, ge=0, le=1)

class RiskAssessmentResponse(BaseModel):
    """Full risk assessment result returned by POST /api/assess-risk."""
    status: str
    transaction_id: str
    risk_score: float
    xgboost_score: float
    anomaly_score: float
    risk_category: str
    action_taken: str
    recommendation: Optional[str] = None
    risk_level: Optional[str] = None
    requires_step_up_3ds: bool = False
    explanation: str
    shap_explanations: dict = Field(default_factory=dict)
    threat_report: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    execution_time_ms: float
    risk_network_data: Optional[dict] = None


class CopilotRequest(BaseModel):
    """Chat message to the Risk Co-Pilot."""
    message: str
    transaction_id: Optional[str] = None


class CopilotResponse(BaseModel):
    """Response from the Risk Co-Pilot."""
    response: str
    transaction_context: Optional[dict] = None


class AuditLogEntry(BaseModel):
    """Single row from the audit trail."""
    id: int
    transaction_id: str
    user_id: str
    order_amount: float
    risk_score: float
    xgboost_score: float = 0.0
    anomaly_score: float = 0.0
    risk_category: str
    action_taken: str
    explanation: str
    shap_top_features: str = "{}"
    threat_report: Optional[str] = None
    execution_time_ms: float
    timestamp: str


class PaginatedAuditResponse(BaseModel):
    """Paginated audit log listing."""
    total: int
    page: int
    limit: int
    data: list[AuditLogEntry]


class AnalyticsSummary(BaseModel):
    """KPI summary for the Command Center dashboard."""
    total_transactions: int = 0
    approved_count: int = 0
    step_up_count: int = 0
    blocked_count: int = 0
    avg_latency_ms: float = 0.0


class FinancialImpact(BaseModel):
    """Estimated financial impact from risk decisions."""
    total_fp_cost: float = 0.0
    total_fn_cost: float = 0.0
    total_financial_impact: float = 0.0
    money_saved: float = 0.0


class RiskDistribution(BaseModel):
    """Category breakdown for charts."""
    low_risk: int = 0
    medium_risk: int = 0
    high_risk: int = 0
