"""
RiskSentinel AI v2.0 — Isolation Forest Anomaly Detection
==========================================================
Unsupervised model trained on normal (non-fraud) transactions only.
Catches zero-day fraud patterns the supervised model hasn't seen.
"""
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ARTIFACTS_DIR = BACKEND_DIR / 'artifacts'

# ── 1. Load Preprocessed Data ──────────────────────────────
print("Loading preprocessed data...")
data = np.load(ARTIFACTS_DIR / 'processed_data.npz')
X_train = data['X_train']
y_train = data['y_train']

# ── 2. Filter to Normal Transactions Only ──────────────────
X_normal = X_train[y_train == 0]
n_fraud_excluded = int((y_train == 1).sum())

print(f"  Training on {X_normal.shape[0]:,} normal transactions")
print(f"  Excluded {n_fraud_excluded:,} fraud transactions from training")

# ── 3. Train Isolation Forest ──────────────────────────────
print("\nTraining Isolation Forest...")
iso_forest = IsolationForest(
    n_estimators=200,
    contamination=0.022,      # ~2.2% observed fraud rate
    max_samples='auto',
    random_state=42,
    n_jobs=-1,
)

iso_forest.fit(X_normal)

# ── 4. Save Model ─────────────────────────────────────────
joblib.dump(iso_forest, ARTIFACTS_DIR / 'isolation_forest.pkl')

# ── 5. Quick Validation on Full Training Set ───────────────
predictions = iso_forest.predict(X_train)
n_anomalies = int((predictions == -1).sum())
actual_fraud = int(y_train.sum())

# How many actual frauds did IF catch?
fraud_mask = y_train == 1
fraud_caught = int((predictions[fraud_mask] == -1).sum())

print(f"\n[OK] Isolation Forest saved -> artifacts/isolation_forest.pkl")
print(f"   Anomalies in training set: {n_anomalies:,} / {len(X_train):,} "
      f"({n_anomalies/len(X_train)*100:.2f}%)")
print(f"   Actual fraud caught: {fraud_caught:,} / {actual_fraud:,} "
      f"({fraud_caught/actual_fraud*100:.1f}%)")
