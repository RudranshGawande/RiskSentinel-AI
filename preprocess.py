import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

# 1. Load Data
df = pd.read_csv('transactions.csv')

# 2. Feature Engineering
# Check if issuance country matches transaction country
df['country_match'] = (df['country'] == df['bin_country']).astype(int)

# Extract temporal features from timestamp
df['transaction_time'] = pd.to_datetime(df['transaction_time'])
df['hour'] = df['transaction_time'].dt.hour
df['dayofweek'] = df['transaction_time'].dt.dayofweek

# 3. Define Feature Groups
numeric_features = [
    'account_age_days', 'total_transactions_user', 'avg_amount_user',
    'amount', 'shipping_distance_km', 'promo_used', 'avs_match',
    'cvv_result', 'three_ds_flag', 'country_match', 'hour', 'dayofweek'
]
categorical_features = ['channel', 'merchant_category']
target = 'is_fraud'

X = df[numeric_features + categorical_features]
y = df[target]

# 4. Stratified Split (80% Train, 20% Held-out Test Set)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

# 5. Build Preprocessing Pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), categorical_features)
    ]
)

# Fit on training data ONLY to prevent data leakage
X_train_processed = preprocessor.fit_transform(X_train)
X_test_processed = preprocessor.transform(X_test)

# Save processed arrays for model training
np.savez('processed_data.npz', 
         X_train=X_train_processed, 
         X_test=X_test_processed, 
         y_train=y_train.to_numpy(), 
         y_test=y_test.to_numpy())

print(f"Preprocessed successfully:")
print(f"Training set: {X_train_processed.shape}")
print(f"Held-out test set: {X_test_processed.shape}")