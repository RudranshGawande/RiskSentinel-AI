"""
RiskSentinel AI v2.0 — Application Configuration
==================================================
Pydantic-settings based config. Reads from .env file and environment variables.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration for the RiskSentinel backend."""

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    ARTIFACTS_DIR: Path = Path("")
    DB_PATH: Path = Path("")

    AIML_API_KEY: str = ""
    LLM_MODEL_NAME: str = "anthropic/claude-3-opus-20240229"

    RAZORPAY_KEY_ID: str = "rzp_test_TVDhd488H3P2Sb"
    RAZORPAY_KEY_SECRET: str = "aV1EV4ADw1jahTXyPmep3gpP"

    LOW_RISK_CEILING: float = 0.30
    HIGH_RISK_FLOOR: float = 0.75

    FP_FRICTION_COST: int = 1500
    FN_FRAUD_LOSS: int = 4000

    CACHE_TTL_SECONDS: int = 300
    CACHE_MAX_SIZE: int = 10_000

    XGBOOST_WEIGHT: float = 0.7
    ANOMALY_WEIGHT: float = 0.3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def model_post_init(self, __context) -> None:
        if str(self.ARTIFACTS_DIR) == ".":
            object.__setattr__(self, "ARTIFACTS_DIR", self.BASE_DIR / "artifacts")
        if str(self.DB_PATH) == ".":
            object.__setattr__(self, "DB_PATH", self.BASE_DIR / "audit_trail.db")


settings = Settings()
