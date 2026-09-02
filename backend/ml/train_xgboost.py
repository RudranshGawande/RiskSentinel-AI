"""
RiskSentinel AI v2.0 — XGBoost Model Training
===============================================
Replaces Decision Tree with gradient-boosted ensemble.
Creates SHAP TreeExplainer for per-transaction feature attribution.
"""
import numpy as np
import joblib
import json
from pathlib import Path
from xgboost import XGBClassifier

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ARTIFACTS_DIR = BACKEND_DIR / 'artifacts'

# ── 1. Load Preprocessed Data ──────────────────────────────
print("Loading preprocessed data...")
data = np.load(ARTIFACTS_DIR / 'processed_data.npz')
X_train, X_test = data['X_train'], data['X_test']
y_train, y_test = data['y_train'], data['y_test']

with open(ARTIFACTS_DIR / 'feature_names.json') as f:
    feature_meta = json.load(f)
    feature_names = feature_meta['feature_names']

print(f"  Train: {X_train.shape}  |  Test: {X_test.shape}")

# ── 2. Calculate Class Weight for Imbalanced Dataset ───────
n_neg = int((y_train == 0).sum())
n_pos = int((y_train == 1).sum())
scale_pos_weight = n_neg / n_pos

print(f"  Class distribution — Legit: {n_neg:,}  |  Fraud: {n_pos:,}")
print(f"  scale_pos_weight: {scale_pos_weight:.2f}")

# ── 3. Train XGBoost ──────────────────────────────────────
print("\nTraining XGBoost classifier...")
clf = XGBClassifier(
    max_depth=6,
    n_estimators=200,
    learning_rate=0.1,
    scale_pos_weight=scale_pos_weight,
    eval_metric='aucpr',
    random_state=42,
    n_jobs=-1,
)

clf.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)

# Quick score on test set
y_pred = clf.predict(X_test)
accuracy = (y_pred == y_test).mean()
print(f"  Test accuracy: {accuracy:.4f}")

# ── 4. Save Model ─────────────────────────────────────────
joblib.dump(clf, ARTIFACTS_DIR / 'xgboost_model.pkl')
print(f"\n[OK] XGBoost model saved -> artifacts/xgboost_model.pkl")

# ── 5. Create & Save SHAP TreeExplainer ────────────────────
try:
    import shap
    print("Creating SHAP TreeExplainer...")
    explainer = shap.TreeExplainer(clf)
    joblib.dump(explainer, ARTIFACTS_DIR / 'shap_explainer.pkl')
    print(f"[OK] SHAP explainer saved -> artifacts/shap_explainer.pkl")
except ImportError:
    print("[WARN] shap not installed -- skipping explainer creation")
except Exception as e:
    print(f"[WARN] SHAP explainer creation failed: {e}")
