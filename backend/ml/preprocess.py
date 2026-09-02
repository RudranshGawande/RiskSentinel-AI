"""
RiskSentinel AI v2.0 — Enhanced Data Preprocessing Pipeline
============================================================
Persists the fitted ColumnTransformer to artifacts/preprocessor.pkl
so the API applies identical transformations at inference time.
Fixes the v1.0 bug where app.py did manual (inconsistent) feature encoding.
"""
import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent          # backend/ml/
BACKEND_DIR = SCRIPT_DIR.parent                       # backend/
PROJECT_ROOT = BACKEND_DIR.parent                     # razorpay-risk-sentinel/
ARTIFACTS_DIR = BACKEND_DIR / 'artifacts'
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

DATA_PATH = PROJECT_ROOT / 'transactions.csv'

# ── 1. Load Raw Data ────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"  Loaded {len(df):,} transactions "
      f"({df['is_fraud'].sum():,} fraud, {df['is_fraud'].mean():.2%} rate)")

# ── 2. Feature Engineering ──────────────────────────────────
# Country / BIN country match — strong fraud signal
df['country_match'] = (df['country'] == df['bin_country']).astype(int)

# Temporal features from ISO timestamp
df['transaction_time'] = pd.to_datetime(df['transaction_time'])
df['hour'] = df['transaction_time'].dt.hour
df['dayofweek'] = df['transaction_time'].dt.dayofweek

# ── 3. Define Feature Groups ───────────────────────────────
NUMERIC_FEATURES = [
    'account_age_days', 'total_transactions_user', 'avg_amount_user',
    'amount', 'shipping_distance_km', 'promo_used', 'avs_match',
    'cvv_result', 'three_ds_flag', 'country_match', 'hour', 'dayofweek'
]
CATEGORICAL_FEATURES = ['channel', 'merchant_category']
TARGET = 'is_fraud'

X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
y = df[TARGET]

# ── 4. Stratified 80/20 Split (same seed as v1.0) ──────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"  Split -> Train: {len(X_train):,}  |  Test: {len(X_test):,}")

# -- 5. Build & Fit Preprocessing Pipeline -------------------
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), NUMERIC_FEATURES),
        ('cat', OneHotEncoder(drop='first', handle_unknown='ignore',
                              sparse_output=False), CATEGORICAL_FEATURES)
    ]
)

# Fit on training data ONLY to prevent data leakage
X_train_processed = preprocessor.fit_transform(X_train)
X_test_processed = preprocessor.transform(X_test)

# -- 6. Extract Feature Names --------------------------------
cat_encoder = preprocessor.named_transformers_['cat']
cat_feature_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
feature_names = NUMERIC_FEATURES + cat_feature_names

# -- 7. Save All Artifacts -----------------------------------
np.savez(
    ARTIFACTS_DIR / 'processed_data.npz',
    X_train=X_train_processed,
    X_test=X_test_processed,
    y_train=y_train.to_numpy(),
    y_test=y_test.to_numpy()
)

joblib.dump(preprocessor, ARTIFACTS_DIR / 'preprocessor.pkl')

with open(ARTIFACTS_DIR / 'feature_names.json', 'w') as f:
    json.dump({
        'feature_names': feature_names,
        'numeric_features': NUMERIC_FEATURES,
        'categorical_features': CATEGORICAL_FEATURES
    }, f, indent=2)

print(f"\n[OK] Preprocessing complete")
print(f"   Train: {X_train_processed.shape}  |  Test: {X_test_processed.shape}")
print(f"   Features ({len(feature_names)}): {feature_names}")
print(f"   Saved -> preprocessor.pkl, processed_data.npz, feature_names.json")
