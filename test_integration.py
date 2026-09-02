import requests
import time
import json
import sys
from pprint import pprint

# Fix Windows console encoding for Unicode (₹, etc.)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000/api"

print("=========================================")
print("  RISKSENTINEL AI -- INTEGRATION TEST")
print("=========================================\n")

# 1. Health Check
print("1. Testing /health endpoint...")
try:
    res = requests.get(f"{BASE_URL}/health")
    res.raise_for_status()
    print("   [OK] Health check passed:", res.json())
except Exception as e:
    print(f"   [FAIL] Health check failed: {e}")
    print("   Is the backend server running?")
    exit(1)

print("\n-----------------------------------------")

# 2. Assess Risk - Low Risk (Legit)
print("2. Testing /assess-risk (Low Risk Transaction)...")
low_risk_payload = {
    "transaction_id": "TXN_TEST_LOW_001",
    "user_id": "USER_OLD_RELIABLE",
    "account_age_days": 1500,
    "total_transactions_user": 450,
    "avg_amount_user": 200.0,
    "amount": 150.0,
    "shipping_distance_km": 10.5,
    "promo_used": 1,
    "avs_match": 1,
    "cvv_result": 1,
    "three_ds_flag": 1,
    "country": "IN",
    "bin_country": "IN",
    "channel": "web",
    "merchant_category": "electronics"
}
start = time.time()
res_low = requests.post(f"{BASE_URL}/assess-risk", json=low_risk_payload)
elapsed = (time.time() - start) * 1000
if res_low.status_code == 200:
    data = res_low.json()
    print(f"   [OK] Success! Latency: {elapsed:.1f}ms")
    print(f"   Category: {data['risk_category']} | Action: {data['action_taken']}")
    print(f"   Score: {data['risk_score']:.4f} (XGB: {data['xgboost_score']:.4f}, IF: {data['anomaly_score']:.4f})")
else:
    print(f"   [FAIL] Expected 200, got {res_low.status_code}: {res_low.text}")

print("\n-----------------------------------------")

# 2.5 Assess Risk - Medium Risk (Adaptive Step-Up 3DS)
print("2.5 Testing /assess-risk (Medium Risk Transaction -> Step-Up 3DS)...")
med_risk_payload = {
    "transaction_id": "TXN_TEST_MED_003",
    "user_id": "USER_MODERATE_SPEND",
    "account_age_days": 15,
    "total_transactions_user": 2,
    "avg_amount_user": 2000.0,
    "amount": 12000.0,
    "shipping_distance_km": 150.0,
    "promo_used": 0,
    "avs_match": 1,
    "cvv_result": 1,
    "three_ds_flag": 0,
    "country": "IN",
    "bin_country": "IN",
    "channel": "web",
    "merchant_category": "electronics"
}
res_med = requests.post(f"{BASE_URL}/assess-risk", json=med_risk_payload)
if res_med.status_code == 200:
    data = res_med.json()
    print(f"   [OK] Success!")
    print(f"   Category: {data['risk_category']} | Recommendation: {data.get('recommendation')} | Risk Level: {data.get('risk_level')}")
    print(f"   Requires Step-Up 3DS: {data.get('requires_step_up_3ds')} | Order ID: {data.get('razorpay_order_id')}")
else:
    print(f"   [FAIL] {res_med.text}")

print("\n-----------------------------------------")

# 3. Assess Risk - High Risk (Fraudulent)
print("3. Testing /assess-risk (High Risk / Fraudulent Transaction)...")
high_risk_payload = {
    "transaction_id": "TXN_TEST_HIGH_002",
    "user_id": "USER_NEW_SKETCHY",
    "account_age_days": 0,
    "total_transactions_user": 0,
    "avg_amount_user": 0.0,
    "amount": 95000.0,
    "shipping_distance_km": 8500.0,
    "promo_used": 0,
    "avs_match": 0,
    "cvv_result": 0,
    "three_ds_flag": 0,
    "country": "RU",
    "bin_country": "US",
    "channel": "mobile",
    "merchant_category": "electronics"
}
res_high = requests.post(f"{BASE_URL}/assess-risk", json=high_risk_payload)
if res_high.status_code == 200:
    data = res_high.json()
    print(f"   [OK] Success!")
    print(f"   Category: {data['risk_category']} | Action: {data['action_taken']}")
    print(f"   Score: {data['risk_score']:.4f}")
    if data.get('threat_report'):
        print(f"   [OK] Threat Report generated! ({len(data['threat_report'])} characters)")
else:
    print(f"   [FAIL] {res_high.text}")

print("\n-----------------------------------------")

# 4. Audit Trail
print("4. Testing /audit endpoint...")
res_audit = requests.get(f"{BASE_URL}/audit?limit=5")
if res_audit.status_code == 200:
    data = res_audit.json()
    print(f"   [OK] Retrieved {len(data['data'])} recent logs (Total: {data['total']})")
    for d in data['data'][:2]:
        print(f"     - {d['transaction_id']}: {d['risk_category']}")
else:
    print(f"   [FAIL] {res_audit.text}")

print("\n-----------------------------------------")

# 5. Analytics Summary
print("5. Testing /analytics/summary endpoint...")
res_analytics = requests.get(f"{BASE_URL}/analytics/summary")
if res_analytics.status_code == 200:
    data = res_analytics.json()
    print("   [OK] Dashboard Stats:")
    print(f"     - Total Processed: {data['total_transactions']}")
    print(f"     - Approved: {data['approved_count']}")
    print(f"     - Blocked: {data['blocked_count']}")
    print(f"     - Avg Latency: {data['avg_latency_ms']:.1f}ms")
else:
    print(f"   [FAIL] {res_analytics.text}")

print("\n-----------------------------------------")

# 6. Co-Pilot Chat
print("6. Testing /copilot/chat endpoint...")
copilot_payload = {
    "message": "Why was TXN_TEST_HIGH_002 blocked?",
    "transaction_id": "TXN_TEST_HIGH_002"
}
res_copilot = requests.post(f"{BASE_URL}/copilot/chat", json=copilot_payload)
if res_copilot.status_code == 200:
    data = res_copilot.json()
    print("   [OK] Co-Pilot Response:")
    print(f"   {data['response'][:150]}...")
else:
    print(f"   [FAIL] {res_copilot.text}")

print("\n=========================================")
print("  ALL TESTS COMPLETED")
print("=========================================\n")
