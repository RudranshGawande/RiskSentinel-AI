import sys
sys.path.insert(0, r'D:\Coding\Machine Learning\razorpay-risk-sentinel\backend')

from app.routers.copilot import sanitize_transaction_record
from app.services.llm_agent import _sanitize_llm_value, _explain_shap_impact

print('=== _sanitize_llm_value tests ===')
result = _sanitize_llm_value(0, 'shipping_distance_km')
assert '0 (' in result, f'Expected 0 (something), got: {result}'
print(f'  shipping_distance_km zero: {result}')

result = _sanitize_llm_value(0, 'account_age_days')
assert '0 (' in result, f'Expected 0 (something), got: {result}'
print(f'  account_age_days zero: {result}')

result = _sanitize_llm_value(42.5, 'shipping_distance_km')
assert '42.50' in result, f'Expected float format, got: {result}'
print(f'  shipping_distance_km float: {result}')

result = _sanitize_llm_value(None, 'shipping_distance_km')
assert result == 'Not recorded', f'Expected Not recorded, got: {result}'
print(f'  shipping_distance_km None: {result}')

result = _sanitize_llm_value('Not recorded', 'shipping_distance_km')
assert result == 'Not recorded', f'Expected Not recorded, got: {result}'
print(f'  shipping_distance_km Not recorded string: {result}')

print()
print('=== sanitize_transaction_record tests ===')
tx = {
    'transaction_id': 'tx123',
    'user_id': 'u1', 
    'amount': 100,
    'shipping_distance_km': None,
    'account_age_days': 0,
    'risk_score': None,
    'xgboost_score': 0,  # Changed from 0.75 to 0 to test Digital Item fallback
    'anomaly_score': 0.2,
    'risk_category': 'LOW_RISK',
    'action_taken': 'AUTO_APPROVE',
}
sanitized = sanitize_transaction_record(tx)
sd = sanitized['shipping_distance_km']
assert 'Digital Item' in sd and '0' in sd, f'Expected 0 and Digital Item in, got: {sd}'
aa = sanitized['account_age_days']
assert 'Newly Created' in aa and '0' in aa, f'Got: {aa}'
rs = sanitized['risk_score']
assert 'Not Scored' in rs and '0' in rs, f'Expected Not Scored and 0 in, got: {rs}'
xbs = sanitized['xgboost_score']
assert 'Not Scored' in xbs and '0' in xbs, f'Got: {xbs}'
assert sanitized['transaction_id'] == 'tx123'
assert sanitized['user_id'] == 'u1'
assert sanitized['risk_category'] == 'LOW_RISK'
assert sanitized['action_taken'] == 'AUTO_APPROVE'
print('  All sanitize_transaction_record tests PASSED')

print()
print('=== _explain_shap_impact guardrail tests ===')
tx_with_none = {'shipping_distance_km': None, 'account_age_days': 0, 'amount': 100, 'avg_amount_user': 50}
result = _explain_shap_impact('shipping_distance_km', None, tx_with_none)
assert 'Not recorded' in result, f'shipping_distance_km with None should say Not recorded, got: {result}'
print(f"  shipping_distance_km(None): {result.strip().replace('₹', 'Rs.')}")

result = _explain_shap_impact('account_age_days', 0, tx_with_none)
has_note = 'Not recorded' in result or 'zero' in result.lower() or '0 (' in result or '0 days old' in result or 'newly created' in result.lower()
assert has_note, f'account_age_days with 0 should note it, got: {result}'
print(f"  account_age_days(0): {result.strip().replace('₹', 'Rs.')}")

result = _explain_shap_impact('amount', 100, tx_with_none)
assert '100.00' in result, f'amount 100 should format properly, got: {result}'
print(f"  amount(100): {result.strip().replace('₹', 'Rs.')}")

print()
print('=== ALL SMOKE TESTS PASSED ===')