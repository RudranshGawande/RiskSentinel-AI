"""
RiskSentinel AI v2.0 — Unified Model Evaluation
=================================================
Evaluates XGBoost, Isolation Forest, and combined dual-model scoring
on the held-out 20% test set. Reports financial impact metrics.
"""
import numpy as np
import joblib
import json
from pathlib import Path
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, precision_recall_curve, auc,
)

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ARTIFACTS_DIR = BACKEND_DIR / 'artifacts'

# ── Financial Constants (Track 02 Requirement) ──────────────
FP_FRICTION_COST = 1500   # ₹ per false positive (customer friction)
FN_FRAUD_LOSS = 4000      # ₹ per false negative (undetected fraud)


def financial_impact(y_true, y_pred):
    """Calculate confusion matrix and financial costs."""
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()
    return {
        'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp),
        'fp_cost': int(fp * FP_FRICTION_COST),
        'fn_cost': int(fn * FN_FRAUD_LOSS),
        'total': int(fp * FP_FRICTION_COST + fn * FN_FRAUD_LOSS),
    }


# ── 1. Load Data & Models ──────────────────────────────────
data = np.load(ARTIFACTS_DIR / 'processed_data.npz')
X_test, y_test = data['X_test'], data['y_test']

xgb_model = joblib.load(ARTIFACTS_DIR / 'xgboost_model.pkl')
iso_forest = joblib.load(ARTIFACTS_DIR / 'isolation_forest.pkl')

with open(ARTIFACTS_DIR / 'feature_names.json') as f:
    feature_names = json.load(f)['feature_names']

print(f"Test set: {X_test.shape[0]:,} transactions | "
      f"{int(y_test.sum()):,} fraud ({y_test.mean():.2%})")

# ════════════════════════════════════════════════════════════
#  XGBOOST EVALUATION
# ════════════════════════════════════════════════════════════
print("\n" + "=" * 65)
print("  XGBOOST MODEL — HELD-OUT TEST SET")
print("=" * 65)

y_proba = xgb_model.predict_proba(X_test)[:, 1]
y_pred = (y_proba >= 0.5).astype(int)

print(classification_report(y_test, y_pred,
                            target_names=['Legitimate', 'Fraud']))

roc = roc_auc_score(y_test, y_proba)
prec_vals, rec_vals, _ = precision_recall_curve(y_test, y_proba)
pr_auc_val = auc(rec_vals, prec_vals)

print(f"  AUC-ROC : {roc:.4f}")
print(f"  AUC-PR  : {pr_auc_val:.4f}")

fi_xgb = financial_impact(y_test, y_pred)
print(f"\n  --- Financial Impact (XGBoost) ---")
print(f"  False Positives: {fi_xgb['fp']:,}  -> Friction Cost : Rs.{fi_xgb['fp_cost']:,}")
print(f"  False Negatives: {fi_xgb['fn']:,}  -> Fraud Loss    : Rs.{fi_xgb['fn_cost']:,}")
print(f"  Total Financial Risk Impact       : Rs.{fi_xgb['total']:,}")

# ==============================================================
#  ISOLATION FOREST EVALUATION
# ==============================================================
print("\n" + "=" * 65)
print("  ISOLATION FOREST -- ANOMALY DETECTION ON TEST SET")
print("=" * 65)

iso_pred = iso_forest.predict(X_test)
iso_binary = (iso_pred == -1).astype(int)
iso_scores = iso_forest.decision_function(X_test)

print(f"  Anomalies flagged: {iso_binary.sum():,} / {len(y_test):,}")
print(classification_report(y_test, iso_binary,
                            target_names=['Legitimate', 'Fraud']))

# ==============================================================
#  COMBINED DUAL-MODEL SCORING
# ==============================================================
print("=" * 65)
print("  COMBINED SCORING  (0.7 x XGBoost  +  0.3 x IsolationForest)")
print("=" * 65)

# Normalize IF scores -> [0, 1], higher = more anomalous
iso_anomaly = np.clip(0.5 - iso_scores, 0.0, 1.0)

combined = 0.7 * y_proba + 0.3 * iso_anomaly
y_combined = (combined >= 0.5).astype(int)

print(classification_report(y_test, y_combined,
                            target_names=['Legitimate', 'Fraud']))

fi_comb = financial_impact(y_test, y_combined)
print(f"  --- Financial Impact (Combined) ---")
print(f"  False Positives: {fi_comb['fp']:,}  -> Friction Cost : Rs.{fi_comb['fp_cost']:,}")
print(f"  False Negatives: {fi_comb['fn']:,}  -> Fraud Loss    : Rs.{fi_comb['fn_cost']:,}")
print(f"  Total Financial Risk Impact       : Rs.{fi_comb['total']:,}")

delta = fi_xgb['total'] - fi_comb['total']
direction = "SAVING" if delta > 0 else "INCREASE"
print(f"\n  Combined vs XGBoost-only: Rs.{abs(delta):,} {direction}")

print(f"\n{'=' * 65}")
print("  [OK] EVALUATION COMPLETE")
print("=" * 65)
