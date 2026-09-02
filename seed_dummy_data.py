"""
RiskSentinel AI v2.0 -- Realistic E-Commerce Data Seeder
==========================================================
Generates a realistic, highly varied distribution of e-commerce payment transactions.
Includes diverse price tiers, authentic Indian and global payment patterns,
natural time stamps, and human-like spend behaviors.

Distribution:
  ~70% LOW_RISK    (Auto-Approve: verified accounts, valid AVS/CVV/3DS, normal geo)
  ~20% MEDIUM_RISK (Step-Up Auth: first-time buyers, elevated ticket sizes, cross-border travel)
  ~10% HIGH_RISK   (Blocked: stolen card signatures, foreign mismatch, velocity bursts)
"""
import os
import sys
import time
import uuid
import random
import argparse
import requests
import sqlite3

BASE_URL = "http://localhost:8000/api/assess-risk"
DB_PATH = os.path.join(os.path.dirname(__file__), "backend", "audit_trail.db")

INDIAN_USERS = [
    ("Aarav Sharma", "aarav_sharma"),
    ("Priya Patel", "priya_patel"),
    ("Vikram Malhotra", "vikram_m"),
    ("Neha Gupta", "neha_g"),
    ("Arjun Reddy", "arjun_reddy"),
    ("Diya Sen", "diya_sen"),
    ("Karan Mehta", "karan_mehta"),
    ("Ananya Iyer", "ananya_iyer"),
    ("Rohan Deshmukh", "rohan_d"),
    ("Meera Nambiar", "meera_n"),
    ("Siddharth Verma", "sid_verma"),
    ("Ishita Roy", "ishita_roy"),
    ("Aditya Joshi", "aditya_j"),
    ("Pooja Nair", "pooja_nair"),
    ("Rahul Kapoor", "rahul_k"),
    ("Shruti Aggarwal", "shruti_a"),
    ("Nikhil Kulkarni", "nikhil_k"),
    ("Kavya Pillai", "kavya_p"),
    ("Manish Tiwari", "manish_t"),
    ("Tanvi Bhatia", "tanvi_b"),
    ("Deepak Singhania", "deepak_s"),
    ("Ritu Saxena", "ritu_s"),
    ("Amit Chawla", "amit_c"),
    ("Simran Gill", "simran_g"),
    ("Varun Hegde", "varun_h"),
    ("Sneha Banerjee", "sneha_b"),
    ("Harish Sundaram", "harish_s"),
    ("Sakshi Goel", "sakshi_g"),
    ("Vivek Rangan", "vivek_r"),
    ("Preeti Mittal", "preeti_m"),
]

GLOBAL_USERS = [
    ("David Miller", "david_m_us"),
    ("Sarah Jenkins", "sarah_j_uk"),
    ("Marcus Weber", "marcus_w_de"),
    ("Elena Petrova", "elena_p"),
    ("Alex Chen", "alex_chen_sg"),
    ("Carlos Mendoza", "carlos_m_mx"),
    ("Fatima Al-Sayed", "fatima_uae"),
]

CATEGORIES = ["electronics", "fashion", "gaming", "grocery", "travel"]

# Realistic pricing buckets for e-commerce
REALISTIC_AMOUNTS = {
    "grocery": [189.0, 245.50, 499.0, 780.0, 1250.0, 1890.0, 2450.0, 3120.0],
    "fashion": [599.0, 899.0, 1299.0, 1799.0, 2499.0, 3999.0, 4890.0, 7499.0],
    "electronics": [1499.0, 2999.0, 5499.0, 8999.0, 14999.0, 22490.0, 34999.0],
    "gaming": [499.0, 1199.0, 2499.0, 4199.0, 6999.0, 12499.0],
    "travel": [2850.0, 4500.0, 7200.0, 12800.0, 18900.0, 26500.0, 45000.0],
}


def get_varied_amount(cat: str, risk_profile: str) -> float:
    base_pool = REALISTIC_AMOUNTS.get(cat, [500.0, 1200.0, 3500.0])
    if risk_profile == "low":
        # Realistic small-to-moderate cart values
        amt = random.choice(base_pool[:5])
        jitter = round(random.uniform(-15.0, 25.0), 2)
        return max(79.0, round(amt + jitter, 2))
    elif risk_profile == "medium":
        # Elevated ticket size or first-time purchase
        amt = random.choice(base_pool[2:])
        jitter = round(random.uniform(50.0, 350.0), 2)
        return round(amt + jitter, 2)
    else:
        # High ticket outlier / fraud attack amount
        outliers = [18500.0, 24999.0, 38900.0, 52400.0, 68000.0, 89990.0, 114500.0]
        return round(random.choice(outliers) + random.uniform(10.0, 99.0), 2)


def generate_seed_dataset(count: int = 50):
    dataset = []

    # 1. LOW RISK TRANSACTIONS (~70% = 35 items)
    low_count = int(count * 0.70)
    for _ in range(low_count):
        cat = random.choice(CATEGORIES)
        user_name, user_slug = random.choice(INDIAN_USERS)
        uid = f"{user_slug}_{random.randint(100, 999)}"
        amount = get_varied_amount(cat, "low")
        avg_spend = round(amount * random.uniform(0.75, 1.35), 2)
        age = random.randint(90, 2400)
        history_orders = max(3, int(age / random.randint(8, 25)))

        tx = {
            "transaction_id": f"TXN_{uuid.uuid4().hex[:8].upper()}",
            "user_id": uid,
            "account_age_days": age,
            "total_transactions_user": history_orders,
            "avg_amount_user": avg_spend,
            "amount": amount,
            "shipping_distance_km": round(random.uniform(1.2, 45.0), 1),
            "promo_used": random.choice([0, 0, 1]),
            "avs_match": 1,
            "cvv_result": 1,
            "three_ds_flag": 1,
            "country": "IN",
            "bin_country": "IN",
            "channel": random.choice(["web", "mobile", "mobile"]),
            "merchant_category": cat,
            "_profile": f"Trusted Shopper ({user_name})",
        }
        dataset.append(tx)

    # 2. MEDIUM RISK TRANSACTIONS (~20% = 10 items)
    med_count = int(count * 0.20)
    med_scenarios = [
        "New Account High Ticket",
        "Cross-Border International Travel",
        "Sudden Spike Above Avg Spend",
        "Geographic Delivery Deviation",
    ]
    for i in range(med_count):
        scenario = med_scenarios[i % len(med_scenarios)]
        cat = random.choice(["electronics", "travel", "gaming", "fashion"])

        if scenario == "New Account High Ticket":
            user_name, user_slug = random.choice(INDIAN_USERS)
            amount = get_varied_amount(cat, "medium")
            tx = {
                "transaction_id": f"TXN_{uuid.uuid4().hex[:8].upper()}",
                "user_id": f"{user_slug}_{random.randint(100, 999)}",
                "account_age_days": random.randint(1, 14),
                "total_transactions_user": random.choice([0, 1]),
                "avg_amount_user": round(amount * 0.3, 2),
                "amount": amount,
                "shipping_distance_km": round(random.uniform(80.0, 240.0), 1),
                "promo_used": 0,
                "avs_match": 1,
                "cvv_result": 1,
                "three_ds_flag": 1,
                "country": "IN",
                "bin_country": "IN",
                "channel": "web",
                "merchant_category": cat,
                "_profile": "New Account (Step-Up 3DS)",
            }
        elif scenario == "Cross-Border International Travel":
            user_name, user_slug = random.choice(GLOBAL_USERS)
            amount = get_varied_amount("travel", "medium")
            dest_country = random.choice(["US", "GB", "DE", "SG", "AE"])
            tx = {
                "transaction_id": f"TXN_{uuid.uuid4().hex[:8].upper()}",
                "user_id": f"{user_slug}_{random.randint(100, 999)}",
                "account_age_days": random.randint(60, 400),
                "total_transactions_user": random.randint(5, 20),
                "avg_amount_user": round(amount * 0.6, 2),
                "amount": amount,
                "shipping_distance_km": round(random.uniform(1200.0, 5500.0), 1),
                "promo_used": 0,
                "avs_match": 1,
                "cvv_result": 1,
                "three_ds_flag": 1,
                "country": dest_country,
                "bin_country": dest_country,
                "channel": "web",
                "merchant_category": "travel",
                "_profile": "International Cross-Border Travel",
            }
        elif scenario == "Sudden Spike Above Avg Spend":
            user_name, user_slug = random.choice(INDIAN_USERS)
            amount = round(random.uniform(8500.0, 19500.0), 2)
            tx = {
                "transaction_id": f"TXN_{uuid.uuid4().hex[:8].upper()}",
                "user_id": f"{user_slug}_{random.randint(100, 999)}",
                "account_age_days": random.randint(180, 800),
                "total_transactions_user": random.randint(8, 30),
                "avg_amount_user": round(random.uniform(400.0, 950.0), 2),  # Spike!
                "amount": amount,
                "shipping_distance_km": round(random.uniform(15.0, 85.0), 1),
                "promo_used": 0,
                "avs_match": 1,
                "cvv_result": 1,
                "three_ds_flag": 1,
                "country": "IN",
                "bin_country": "IN",
                "channel": "mobile",
                "merchant_category": "electronics",
                "_profile": "Volume Spike vs Average Spend",
            }
        else:
            user_name, user_slug = random.choice(INDIAN_USERS)
            amount = get_varied_amount(cat, "medium")
            tx = {
                "transaction_id": f"TXN_{uuid.uuid4().hex[:8].upper()}",
                "user_id": f"{user_slug}_{random.randint(100, 999)}",
                "account_age_days": random.randint(45, 200),
                "total_transactions_user": random.randint(2, 8),
                "avg_amount_user": round(amount * 0.8, 2),
                "amount": amount,
                "shipping_distance_km": round(random.uniform(350.0, 950.0), 1),
                "promo_used": random.choice([0, 1]),
                "avs_match": 1,
                "cvv_result": 1,
                "three_ds_flag": 1,
                "country": "IN",
                "bin_country": "IN",
                "channel": "web",
                "merchant_category": cat,
                "_profile": "Long-Distance Domestic Delivery",
            }

        dataset.append(tx)

    # 3. HIGH RISK TRANSACTIONS (~10% = 5 items)
    high_count = count - (low_count + med_count)
    high_scenarios = [
        ("Stolen Card / AVS Failure", "gaming", "US", "NG"),
        ("Zero-Day Account Hijack", "electronics", "CN", "US"),
        ("Overseas Reshipping Exploit", "electronics", "RU", "GB"),
        ("Rapid Proxy Bot Ingestion", "gaming", "RO", "US"),
        ("Massive Unauthorized Luxury Charge", "travel", "PH", "IN"),
    ]

    for i in range(high_count):
        scenario_title, cat, country, bin_country = high_scenarios[i % len(high_scenarios)]
        amount = get_varied_amount(cat, "high")
        tx = {
            "transaction_id": f"TXN_{uuid.uuid4().hex[:8].upper()}",
            "user_id": f"anon_suspect_{random.randint(1000, 9999)}",
            "account_age_days": random.randint(0, 2),
            "total_transactions_user": 0,
            "avg_amount_user": 0.0,
            "amount": amount,
            "shipping_distance_km": round(random.uniform(4500.0, 11500.0), 1),
            "promo_used": 0,
            "avs_match": 0,
            "cvv_result": 0,
            "three_ds_flag": 0,
            "country": country,
            "bin_country": bin_country,
            "channel": random.choice(["web", "mobile"]),
            "merchant_category": cat,
            "_profile": scenario_title,
        }
        dataset.append(tx)

    # Shuffle dataset so timeline displays natural mix
    random.shuffle(dataset)
    return dataset


def clean_database():
    """Wipes old duplicate test rows from the SQLite database."""
    if not os.path.exists(DB_PATH):
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("DELETE FROM risk_audit_log")
        conn.commit()
        conn.close()
        print("  [OK] Cleaned previous audit logs from database.")
    except Exception as e:
        print(f"  [WARN] DB clean skipped: {e}")


def main():
    parser = argparse.ArgumentParser(description="Seed RiskSentinel AI with diverse real-world transactions.")
    parser.add_argument("--count", type=int, default=45, help="Total transactions to generate (default: 45)")
    parser.add_argument("--no-clean", action="store_true", help="Do not wipe existing logs")
    args = parser.parse_args()

    print("=====================================================")
    print("  RISKSENTINEL AI -- REALISTIC DATA SEEDER v2.2")
    print("=====================================================")
    print(f"  Total transactions: {args.count}")
    print("  Realistic amounts, unique IDs, diverse price tiers")
    print("=====================================================\n")

    if not args.no_clean:
        clean_database()

    dataset = generate_seed_dataset(count=args.count)
    results = {"LOW_RISK": 0, "MEDIUM_RISK": 0, "HIGH_RISK": 0}
    total_sent = 0

    print("Sending transactions to Risk Engine...\n")

    for item in dataset:
        profile_name = item.pop("_profile", "E-Commerce Transaction")
        try:
            res = requests.post(BASE_URL, json=item, timeout=5)
            if res.status_code == 200:
                data = res.json()
                cat = data.get("risk_category", "LOW_RISK")
                score = data.get("risk_score", 0.0)
                results[cat] = results.get(cat, 0) + 1
                total_sent += 1

                badge = {
                    "LOW_RISK": "APPROVED",
                    "MEDIUM_RISK": "STEP-UP ",
                    "HIGH_RISK": "BLOCKED ",
                }.get(cat, cat)

                print(f"  [{badge}] {item['transaction_id']} | Rs {item['amount']:>9,.2f} | Risk: {score*100:4.1f}% | {item['user_id']:18s} | {profile_name}")
            else:
                print(f"  [ERR] HTTP {res.status_code} for {item['transaction_id']}")
        except Exception as e:
            print(f"  [ERR] Backend unreachable ({e}). Make sure the FastAPI backend is running on http://localhost:8000.")
            break

        time.sleep(0.08)

    print("\n=====================================================")
    print(f"  SEEDING SUMMARY: {total_sent} TRANSACTIONS")
    print("=====================================================")
    tot = max(1, total_sent)
    print(f"  * Approved (Low Risk):   {results.get('LOW_RISK', 0):2d} ({results.get('LOW_RISK', 0)/tot*100:4.1f}%)")
    print(f"  * Step-Up  (Med Risk):   {results.get('MEDIUM_RISK', 0):2d} ({results.get('MEDIUM_RISK', 0)/tot*100:4.1f}%)")
    print(f"  * Blocked  (High Risk):  {results.get('HIGH_RISK', 0):2d} ({results.get('HIGH_RISK', 0)/tot*100:4.1f}%)")
    print("=====================================================")
    print("  Command Center UI: http://localhost:5173\n")


if __name__ == "__main__":
    main()
