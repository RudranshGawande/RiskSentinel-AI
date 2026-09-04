#!/usr/bin/env python3
"""
RiskSentinel AI v2.0 -- Demo Database Seeder
============================================
Seeds SQLite audit_trail.db with exact controlled mock transactions for the production demo video.
Usage: python backend/seed_demo_data.py
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timedelta

# Locate audit_trail.db (both in backend/ and root if needed)
DB_PATH = Path(__file__).resolve().parent / "audit_trail.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS risk_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_amount REAL NOT NULL,
    risk_score REAL NOT NULL,
    xgboost_score REAL NOT NULL DEFAULT 0,
    anomaly_score REAL NOT NULL DEFAULT 0,
    risk_category TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    explanation TEXT NOT NULL,
    shap_top_features TEXT DEFAULT '{}',
    threat_report TEXT,
    model_version TEXT DEFAULT 'v2.0-xgboost',
    execution_time_ms REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    account_age_days INTEGER DEFAULT 0,
    total_transactions_user INTEGER DEFAULT 0,
    avg_amount_user REAL DEFAULT 0.0,
    shipping_distance_km REAL DEFAULT 0.0,
    promo_used INTEGER DEFAULT 0,
    avs_match INTEGER DEFAULT 0,
    cvv_result INTEGER DEFAULT 0,
    three_ds_flag INTEGER DEFAULT 0,
    country TEXT DEFAULT 'IN',
    bin_country TEXT DEFAULT 'IN',
    channel TEXT DEFAULT 'web',
    merchant_category TEXT DEFAULT 'electronics',
    ip_address TEXT DEFAULT '',
    card_bin TEXT DEFAULT '',
    device_fingerprint TEXT DEFAULT '',
    shipping_address TEXT DEFAULT '',
    payment_method TEXT DEFAULT 'card',
    vpa_handle TEXT DEFAULT '',
    device_binding_verified INTEGER DEFAULT 1,
    vpa_age_verified INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_tx_id ON risk_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_risk_cat ON risk_audit_log(risk_category);
CREATE INDEX IF NOT EXISTS idx_user_id ON risk_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_address ON risk_audit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_card_bin ON risk_audit_log(card_bin);
CREATE INDEX IF NOT EXISTS idx_device_fingerprint ON risk_audit_log(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_timestamp ON risk_audit_log(timestamp);
"""

DEMO_TRANSACTIONS = [
    # ── Transaction 1 (Low Risk - Approved) ──────────────────────────────
    {
        "transaction_id": "txn_clean_001_demo",
        "user_id": "user_clean_001",
        "order_amount": 1500.0,
        "risk_score": 0.12,
        "xgboost_score": 0.05,
        "anomaly_score": 0.28,
        "risk_category": "LOW_RISK",
        "action_taken": "AUTO_APPROVE",
        "explanation": "Transaction verified safe by RiskSentinel AI. Normal consumer behavior and strong 3DS authentication.",
        "shap_top_features": json.dumps({
            "amount": -0.15,
            "account_age_days": -0.22,
            "three_ds_flag": -0.30,
            "avs_match": -0.18,
            "cvv_result": -0.20
        }),
        "threat_report": """### Executive Summary
Transaction **txn_clean_001_demo** (₹1,500.00) from verified buyer **user_clean_001** is rated **LOW RISK (12.0%)**. All biometric, AVS, and 3-D Secure credentials passed seamlessly.

### Evaluated Risk Drivers
- **AVS Address Match** — Pass (1)
- **CVV Verification** — Match (1)
- **3-D Secure Authentication** — Verified (1)
- **Order Amount** — Standard spend within typical bounds (₹1,500.00)

### Recommended Action
**AUTO-APPROVE**: Frictionless checkout approved with zero manual review friction. Confidence: 99.4%.""",
        "model_version": "v2.0-xgboost",
        "execution_time_ms": 42.5,
        "timestamp": (datetime.now() - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
        "account_age_days": 365,
        "total_transactions_user": 48,
        "avg_amount_user": 1400.0,
        "shipping_distance_km": 12.4,
        "promo_used": 1,
        "avs_match": 1,
        "cvv_result": 1,
        "three_ds_flag": 1,
        "country": "IN",
        "bin_country": "IN",
        "channel": "web",
        "merchant_category": "grocery",
        "ip_address": "103.21.14.88",
        "card_bin": "411111",
        "device_fingerprint": "dev_fp_legit_001",
        "shipping_address": "12 Bandra West, Mumbai, IN",
        "payment_method": "card",
        "vpa_handle": "",
        "device_binding_verified": 1,
        "vpa_age_verified": 1
    },

    # ── Transaction 2 (High Risk - Graph Seed) ───────────────────────────
    {
        "transaction_id": "txn_burner_002_demo",
        "user_id": "user_burner_99",
        "order_amount": 85000.0,
        "risk_score": 0.89,
        "xgboost_score": 0.92,
        "anomaly_score": 0.82,
        "risk_category": "HIGH_RISK",
        "action_taken": "BLOCK_AND_REVIEW",
        "explanation": "High fraud probability (89.0%). Cross-border BIN mismatch, foreign proxy IP, and failed AVS verification.",
        "shap_top_features": json.dumps({
            "amount": 0.38,
            "country_match": 0.25,
            "ip_address": 0.32,
            "avs_match": 0.28,
            "cvv_result": 0.22
        }),
        "threat_report": """### Executive Summary
Transaction **txn_burner_002_demo** (₹85,000.00) from **user_burner_99** is flagged **CRITICAL FRAUD RISK (89.0%)**. High-velocity order attempt routed through known proxy infrastructure.

### Evaluated Risk Drivers
- **Foreign IP Proxy** — Originating from high-risk subnet (45.77.123.45 - RU)
- **Card Security Checks** — AVS and CVV checks FAILED (0)
- **Order Amount Spike** — Order of ₹85,000.00 is 50x standard account volume
- **Syndicate Correlation** — Device fingerprint associated with 3 previous blocked velocity attempts

### Recommended Action
**BLOCK & HOLD FOR REVIEW**: Immediate block enforced to prevent chargeback loss. Alert dispatched to fraud operations.""",
        "model_version": "v2.0-xgboost",
        "execution_time_ms": 58.1,
        "timestamp": (datetime.now() - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
        "account_age_days": 2,
        "total_transactions_user": 1,
        "avg_amount_user": 1200.0,
        "shipping_distance_km": 4200.0,
        "promo_used": 0,
        "avs_match": 0,
        "cvv_result": 0,
        "three_ds_flag": 0,
        "country": "RU",
        "bin_country": "RU",
        "channel": "web",
        "merchant_category": "electronics",
        "ip_address": "45.77.123.45",
        "card_bin": "510510",
        "device_fingerprint": "dev_fp_syndicate_99",
        "shipping_address": "45 Nevsky Prospekt, St Petersburg, RU",
        "payment_method": "card",
        "vpa_handle": "",
        "device_binding_verified": 1,
        "vpa_age_verified": 1
    },

    # ── Transaction 3 (Medium Risk - Step-Up Auth) ───────────────────────
    {
        "transaction_id": "txn_traveler_003_demo",
        "user_id": "user_traveler_02",
        "order_amount": 12000.0,
        "risk_score": 0.48,
        "xgboost_score": 0.35,
        "anomaly_score": 0.65,
        "risk_category": "MEDIUM_RISK",
        "action_taken": "REQUIRE_STEP_UP_AUTH",
        "explanation": "Medium Risk (48.0%). High shipping distance (500 km) and elevated basket size triggered Smart 3DS OTP challenge.",
        "shap_top_features": json.dumps({
            "shipping_distance_km": 0.28,
            "amount": 0.20,
            "account_age_days": -0.15,
            "avs_match": -0.12,
            "cvv_result": -0.14
        }),
        "threat_report": """### Executive Summary
Transaction **txn_traveler_003_demo** (₹12,000.00) from **user_traveler_02** evaluated with **MEDIUM RISK (48.0%)**.

### Behavioral Anomaly Analysis
Customer card credentials are valid (AVS & CVV match), but cross-state shipping distance (500 km) and basket size deviate from account baseline.

### Recommended Action
**REQUIRE STEP-UP AUTHENTICATION (Smart 3DS)**: Multi-factor OTP challenge triggered to verify cardholder identity while protecting merchant conversion.""",
        "model_version": "v2.0-xgboost",
        "execution_time_ms": 46.3,
        "timestamp": (datetime.now() - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
        "account_age_days": 180,
        "total_transactions_user": 14,
        "avg_amount_user": 3500.0,
        "shipping_distance_km": 500.0,
        "promo_used": 1,
        "avs_match": 1,
        "cvv_result": 1,
        "three_ds_flag": 0,
        "country": "IN",
        "bin_country": "IN",
        "channel": "mobile_app",
        "merchant_category": "fashion",
        "ip_address": "49.204.120.15",
        "card_bin": "424242",
        "device_fingerprint": "dev_fp_travel_02",
        "shipping_address": "88 Residency Rd, Bengaluru, IN",
        "payment_method": "card",
        "vpa_handle": "",
        "device_binding_verified": 1,
        "vpa_age_verified": 1
    },

    # ── Transaction 4 (High Risk - UPI SIM Swap) ─────────────────────────
    {
        "transaction_id": "txn_upi_hacked_004_demo",
        "user_id": "user_hacked_04",
        "order_amount": 50000.0,
        "risk_score": 0.91,
        "xgboost_score": 0.88,
        "anomaly_score": 0.95,
        "risk_category": "HIGH_RISK",
        "action_taken": "BLOCK_AND_REVIEW",
        "explanation": "Critical UPI Risk (91.0%). UPI Device Binding FAILED and VPA handle age < 30 days. SIM Swap attack vector flagged.",
        "shap_top_features": json.dumps({
            "device_binding_verified": 0.45,
            "vpa_age_verified": 0.35,
            "amount": 0.25,
            "payment_method": 0.20
        }),
        "threat_report": """### Executive Summary
Transaction **txn_upi_hacked_004_demo** (₹50,000.00) via UPI (fake.user@ybl) has been flagged as **CRITICAL HIGH RISK (91.0%)**.

### UPI Security Checklist
- **Device Binding Verification** — FAILED (0) (Hardware binding / SIM mismatch)
- **VPA Handle Age** — < 30 Days (0) (Newly registered VPA handle)
- **Amount Threshold** — ₹50,000.00 high-value transfer on unverified device

### Recommended Action
**BLOCK & HOLD FOR MANUAL REVIEW**: Transaction blocked immediately to prevent UPI account takeover fraud.""",
        "model_version": "v2.0-xgboost",
        "execution_time_ms": 52.8,
        "timestamp": (datetime.now() - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
        "account_age_days": 10,
        "total_transactions_user": 2,
        "avg_amount_user": 500.0,
        "shipping_distance_km": 150.0,
        "promo_used": 0,
        "avs_match": 0,
        "cvv_result": 0,
        "three_ds_flag": 0,
        "country": "IN",
        "bin_country": "IN",
        "channel": "upi_app",
        "merchant_category": "electronics",
        "ip_address": "157.48.99.21",
        "card_bin": "",
        "device_fingerprint": "dev_fp_unbound_sim_99",
        "shipping_address": "Flat 402, Cyber Tower, Hyderabad, IN",
        "payment_method": "upi",
        "vpa_handle": "fake.user@ybl",
        "device_binding_verified": 0,
        "vpa_age_verified": 0
    }
]

def seed_database():
    """Connect to SQLite, clear audit logs, and insert 4 demo transactions."""
    print("=" * 60)
    print("  RiskSentinel AI -- Production Demo Database Seeder")
    print("=" * 60)
    print(f"Target Database: {DB_PATH.resolve()}")

    # Ensure parent directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    try:
        # 1. Ensure Schema
        cursor.executescript(SCHEMA_SQL)

        # 2. Clear Existing Records
        cursor.execute("DELETE FROM risk_audit_log")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='risk_audit_log'")
        conn.commit()
        print("\n[OK] Cleared existing records from 'risk_audit_log'. Table is reset.")

        # 3. Insert 4 Exact Demo Transactions
        insert_sql = """
            INSERT INTO risk_audit_log (
                transaction_id, user_id, order_amount, risk_score, xgboost_score,
                anomaly_score, risk_category, action_taken, explanation,
                shap_top_features, threat_report, model_version, execution_time_ms,
                timestamp, account_age_days, total_transactions_user, avg_amount_user,
                shipping_distance_km, promo_used, avs_match, cvv_result, three_ds_flag,
                country, bin_country, channel, merchant_category, ip_address,
                card_bin, device_fingerprint, shipping_address, payment_method,
                vpa_handle, device_binding_verified, vpa_age_verified
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """

        for tx in DEMO_TRANSACTIONS:
            cursor.execute(insert_sql, (
                tx["transaction_id"],
                tx["user_id"],
                tx["order_amount"],
                tx["risk_score"],
                tx["xgboost_score"],
                tx["anomaly_score"],
                tx["risk_category"],
                tx["action_taken"],
                tx["explanation"],
                tx["shap_top_features"],
                tx["threat_report"],
                tx["model_version"],
                tx["execution_time_ms"],
                tx["timestamp"],
                tx["account_age_days"],
                tx["total_transactions_user"],
                tx["avg_amount_user"],
                tx["shipping_distance_km"],
                tx["promo_used"],
                tx["avs_match"],
                tx["cvv_result"],
                tx["three_ds_flag"],
                tx["country"],
                tx["bin_country"],
                tx["channel"],
                tx["merchant_category"],
                tx["ip_address"],
                tx["card_bin"],
                tx["device_fingerprint"],
                tx["shipping_address"],
                tx["payment_method"],
                tx["vpa_handle"],
                tx["device_binding_verified"],
                tx["vpa_age_verified"]
            ))

        conn.commit()
        print(f"\n[OK] Successfully inserted {len(DEMO_TRANSACTIONS)} demo transactions:\n")

        # Verify and print seeded rows
        cursor.execute("SELECT id, transaction_id, user_id, order_amount, risk_category, action_taken, payment_method FROM risk_audit_log ORDER BY id ASC")
        rows = cursor.fetchall()
        for row in rows:
            print(f"  #{row[0]} | {row[1]:<25} | User: {row[2]:<16} | Amount: Rs.{row[3]:>8,.2f} | Tier: {row[4]:<12} | Action: {row[5]:<22} | Method: {row[6]}")

        print("\n" + "=" * 60)
        print("  DEMO DATABASE SEEDING COMPLETED (100% READY FOR DEMO VIDEO)")
        print("=" * 60 + "\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Failed to seed database: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    seed_database()
