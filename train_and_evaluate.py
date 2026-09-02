import numpy as np
import joblib
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, confusion_matrix

# 1. Load Preprocessed Data
data = np.load('processed_data.npz')
X_train, X_test = data['X_train'], data['X_test']
y_train, y_test = data['y_train'], data['y_test']

# 2. Train Explainable Decision Tree Model
clf = DecisionTreeClassifier(max_depth=6, class_weight='balanced', random_state=42)
clf.fit(X_train, y_train)

# 3. Predict on Held-Out Test Set
y_pred = clf.predict(X_test)

# 4. Calculate Honest Financial Metrics & False-Positive Cost
cm = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = cm.ravel()

# Define financial impact metrics (in INR / ₹)
fp_friction_cost = 1500  # Cost of alienating a good customer
fn_fraud_loss = 4000     # Direct loss from undetected fraud

total_fp_cost = fp * fp_friction_cost
total_fn_cost = fn * fn_fraud_loss
total_financial_loss = total_fp_cost + total_fn_cost

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall = tp / (tp + fn) if (tp + fn) > 0 else 0

print("=== MODEL PERFORMANCE ON HELD-OUT TEST SET ===")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"\nConfusion Matrix:\n{cm}")
print("\n=== FINANCIAL IMPACT ANALYSIS (TRACK 02 REQUIREMENT) ===")
print(f"False Positives (Legitimate flagged as fraud): {fp} -> Total Cost: ₹{total_fp_cost:,}")
print(f"False Negatives (Fraud missed):               {fn} -> Total Loss: ₹{total_fn_cost:,}")
print(f"Total Model Financial Risk Impact:             ₹{total_financial_loss:,}")

# 5. Save Model Artifact
joblib.dump(clf, 'model.pkl')
print("\nModel saved to model.pkl successfully.")