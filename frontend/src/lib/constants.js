export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const FEATURE_LABELS = {
  account_age_days: "Account Age",
  total_transactions_user: "Purchase History",
  avg_amount_user: "Average Spend",
  amount: "Order Amount",
  shipping_distance_km: "Shipping Distance",
  promo_used: "Promo Code Used",
  avs_match: "Address Verification (AVS)",
  cvv_result: "CVV Match",
  three_ds_flag: "3-D Secure Auth",
  country_match: "Country Match",
  hour: "Time of Day",
  dayofweek: "Day of Week",
  channel_web: "Web Channel",
  merchant_category_fashion: "Fashion Category",
  merchant_category_gaming: "Gaming Category",
  merchant_category_grocery: "Grocery Category",
  merchant_category_travel: "Travel Category",
  // UPI & Advanced Security Features
  vpa_age_verified: "VPA Handle Age Verified (>30d)",
  device_binding_verified: "UPI Device Binding Verified",
  vpa_handle: "UPI VPA Handle",
  payment_method: "Payment Method",
  ip_address: "Client IP Address",
  card_bin: "Card Issuer / BIN",
  device_fingerprint: "Device Fingerprint",
  shipping_address: "Shipping Address",
};

export function humanizeFeature(raw) {
  return FEATURE_LABELS[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function explainImpact(impact) {
  const pct = Math.abs(impact * 100);
  if (pct > 15) return "Very Strong";
  if (pct > 8) return "Strong";
  if (pct > 3) return "Moderate";
  return "Mild";
}
