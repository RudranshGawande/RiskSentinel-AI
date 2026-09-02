"""
RiskSentinel AI v2.0 -- ML Scoring Engine
==========================================
Dual-model scoring: XGBoost (supervised) + Isolation Forest (unsupervised).
Loads the persisted preprocessor.pkl for consistent feature transformation.
Generates per-transaction SHAP feature attributions.
"""
import json
import math
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from datetime import datetime


class MLEngine:
    """Loads all model artifacts once at startup, scores transactions."""

    def __init__(self, artifacts_dir: Path):
        self.artifacts_dir = artifacts_dir
        self.xgb_model = None
        self.iso_forest = None
        self.preprocessor = None
        self.feature_names: list[str] = []
        self.numeric_features: list[str] = []
        self.categorical_features: list[str] = []
        self.shap_explainer = None

    def load_models(self) -> None:
        """Load all model artifacts. Called once at app startup."""
        self.xgb_model = joblib.load(self.artifacts_dir / "xgboost_model.pkl")
        self.iso_forest = joblib.load(self.artifacts_dir / "isolation_forest.pkl")
        self.preprocessor = joblib.load(self.artifacts_dir / "preprocessor.pkl")

        with open(self.artifacts_dir / "feature_names.json") as f:
            meta = json.load(f)
            self.feature_names = meta["feature_names"]
            self.numeric_features = meta["numeric_features"]
            self.categorical_features = meta["categorical_features"]

        # SHAP explainer (optional -- graceful if absent)
        shap_path = self.artifacts_dir / "shap_explainer.pkl"
        if shap_path.exists():
            try:
                self.shap_explainer = joblib.load(shap_path)
            except Exception:
                self.shap_explainer = None

        print(f"  ML Engine loaded: XGBoost + IsolationForest + Preprocessor")
        print(f"  Features ({len(self.feature_names)}): {self.feature_names}")
        if self.shap_explainer:
            print(f"  SHAP TreeExplainer loaded")

    # ── Feature Preparation ──────────────────────────────

    def _prepare_features(self, payload: dict) -> np.ndarray:
        """Convert raw API payload -> preprocessed feature vector."""

        # Derived features
        country_match = 1 if payload.get("country") == payload.get("bin_country") else 0

        # Use real request time instead of hardcoded values
        now = datetime.now()
        tx_time = payload.get("transaction_time")
        if tx_time:
            try:
                now = pd.to_datetime(tx_time)
            except Exception:
                pass

        raw = {
            "account_age_days": payload.get("account_age_days", 0),
            "total_transactions_user": payload.get("total_transactions_user", 0),
            "avg_amount_user": payload.get("avg_amount_user", 0.0),
            "amount": payload.get("amount", 0.0),
            "shipping_distance_km": payload.get("shipping_distance_km", 0.0),
            "promo_used": payload.get("promo_used", 0),
            "avs_match": payload.get("avs_match", 0),
            "cvv_result": payload.get("cvv_result", 0),
            "three_ds_flag": payload.get("three_ds_flag", 0),
            "country_match": country_match,
            "hour": now.hour,
            "dayofweek": now.weekday(),
            "channel": payload.get("channel", "web"),
            "merchant_category": payload.get("merchant_category", "electronics"),
        }

        # Build DataFrame in exact column order the preprocessor expects
        df = pd.DataFrame([raw])
        df_ordered = df[self.numeric_features + self.categorical_features]

        # Apply the fitted preprocessor (StandardScaler + OneHotEncoder)
        return self.preprocessor.transform(df_ordered)

    # ── Scoring ──────────────────────────────────────────

    def score(
        self,
        payload: dict,
        xgb_weight: float = 0.7,
        anomaly_weight: float = 0.3,
    ) -> dict:
        """Score a single transaction with both models + SHAP."""

        X = self._prepare_features(payload)

        # -- XGBoost fraud probability --
        xgb_proba = float(self.xgb_model.predict_proba(X)[0][1])

        # -- Isolation Forest anomaly score --
        iso_raw = float(self.iso_forest.decision_function(X)[0])
        # Sigmoid transform: negative raw -> high anomaly score
        anomaly_score = 1.0 / (1.0 + math.exp(5.0 * iso_raw))

        # -- Combined risk score --
        combined = xgb_weight * xgb_proba + anomaly_weight * anomaly_score
        combined = max(0.0, min(1.0, combined))

        # -- SHAP explanations --
        shap_dict = {}
        if self.shap_explainer is not None:
            try:
                sv = self.shap_explainer.shap_values(X)
                # Handle different SHAP output formats
                if isinstance(sv, list):
                    sv = sv[1] if len(sv) > 1 else sv[0]
                if sv.ndim == 3:
                    sv = sv[:, :, 1]
                for i, name in enumerate(self.feature_names):
                    shap_dict[name] = round(float(sv[0][i]), 4)
            except Exception:
                pass

        return {
            "xgboost_score": round(xgb_proba, 4),
            "anomaly_score": round(anomaly_score, 4),
            "combined_risk_score": round(combined, 4),
            "shap_explanations": shap_dict,
        }
