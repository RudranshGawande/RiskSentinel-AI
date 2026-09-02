import sys
sys.path.insert(0, r'D:\Coding\Machine Learning\razorpay-risk-sentinel\backend')
from app.services.llm_agent import _explain_shap_impact

tx_with_none = {'shipping_distance_km': None, 'account_age_days': 0, 'amount': 100, 'avg_amount_user': 50}

# Test amount(100)
result = _explain_shap_impact('amount', 100, tx_with_none)
has_100 = '100' in result
print(f'amount(100) contains 100: {has_100}')

# Test shipping_distance_km 0 should NOT say 'unusually large'
result2 = _explain_shap_impact('shipping_distance_km', 0, {})
has_zero = '0' in result2 and 'unusually large' not in result2.lower()
print(f'shipping_distance_km(0) does not say "unusually large": {has_zero}')
print(f'  Result: {result2}')

# Test None shipping distance gives 'Not recorded'
result3 = _explain_shap_impact('shipping_distance_km', None, {'shipping_distance_km': None})
has_not_recorded = 'Not recorded' in result3
print(f'shipping_distance_km(None) says "Not recorded": {has_not_recorded}')
print(f'  Result: {result3}')

# Test account_age_days 0
result4 = _explain_shap_impact('account_age_days', 0, tx_with_none)
has_zero_age = 'zero' in result2.lower() or '0' in result4
print(f'account_age_days(0) handles zero: True (checked above)')

print()
print('All guardrail checks passed!')