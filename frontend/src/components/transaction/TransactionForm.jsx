import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Play, ShieldCheck, ShieldAlert, ChevronDown, Check } from 'lucide-react';

const cleanPreset = {
  user_id: "usr_clean_99",
  account_age_days: 365,
  total_transactions_user: 48,
  avg_amount_user: 650.0,
  amount: 450.0,
  shipping_distance_km: 12.4,
  promo_used: 1,
  avs_match: 1,
  cvv_result: 1,
  three_ds_flag: 1,
  country: "IN",
  bin_country: "IN",
  channel: "web",
  merchant_category: "grocery",
  ip_address: "192.168.1.100",
  card_bin: "411111",
  device_fingerprint: "dev_fp_abc123",
  shipping_address: "123 Main St, Mumbai, IN",
  payment_method: "card",
  vpa_handle: "",
  device_binding_verified: 1,
  vpa_age_verified: 1,
};

const cleanUpiPreset = {
  user_id: "usr_upi_clean_01",
  account_age_days: 730,
  total_transactions_user: 120,
  avg_amount_user: 350.0,
  amount: 250.0,
  shipping_distance_km: 0.0,
  promo_used: 0,
  avs_match: 1,
  cvv_result: 1,
  three_ds_flag: 1,
  country: "IN",
  bin_country: "IN",
  channel: "mobile",
  merchant_category: "grocery",
  ip_address: "10.0.0.45",
  card_bin: "",
  device_fingerprint: "dev_fp_upi_789",
  shipping_address: "",
  payment_method: "upi",
  vpa_handle: "rahul.sharma@okhdfcbank",
  device_binding_verified: 1,
  vpa_age_verified: 1,
};

const suspiciousPreset = {
  user_id: "usr_suspect_01",
  account_age_days: 2,
  total_transactions_user: 1,
  avg_amount_user: 0.0,
  amount: 19500.0,
  shipping_distance_km: 1240.5,
  promo_used: 0,
  avs_match: 0,
  cvv_result: 0,
  three_ds_flag: 0,
  country: "US",
  bin_country: "NG",
  channel: "mobile",
  merchant_category: "travel",
  ip_address: "45.77.123.45",
  card_bin: "555555",
  device_fingerprint: "dev_fp_xyz789",
  shipping_address: "456 Proxy Ave, Moscow, RU",
  payment_method: "card",
  vpa_handle: "",
  device_binding_verified: 0,
  vpa_age_verified: 0,
};

const suspiciousUpiPreset = {
  user_id: "usr_upi_suspect_01",
  account_age_days: 1,
  total_transactions_user: 0,
  avg_amount_user: 0.0,
  amount: 45000.0,
  shipping_distance_km: 0.0,
  promo_used: 0,
  avs_match: 1,
  cvv_result: 1,
  three_ds_flag: 1,
  country: "IN",
  bin_country: "IN",
  channel: "mobile",
  merchant_category: "electronics",
  ip_address: "103.45.67.89",
  card_bin: "",
  device_fingerprint: "dev_fp_suspicious_001",
  shipping_address: "",
  payment_method: "upi",
  vpa_handle: "fake.user@ybl",
  device_binding_verified: 0,
  vpa_age_verified: 0,
};

function CustomSelect({ label, name, value, options, onChange, tooltip }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5 uppercase tracking-wider" title={tooltip}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-zinc-900 border text-sm text-left flex justify-between items-center px-4 py-2.5 rounded-xl transition-all duration-200 font-medium ${
          isOpen
            ? 'border-primary ring-2 ring-primary/10 text-foreground'
            : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
        }`}
      >
        <span>{selectedOption ? selectedOption.label : value}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {isOpen && (
        <ul className="absolute z-50 mt-1.5 w-full bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(name, opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${
                  value === opt.value
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TransactionForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    transaction_id: "",
    user_id: "",
    account_age_days: "",
    total_transactions_user: "",
    avg_amount_user: "",
    amount: "",
    shipping_distance_km: "",
    promo_used: 0,
    avs_match: 0,
    cvv_result: 0,
    three_ds_flag: 0,
    country: "IN",
    bin_country: "IN",
    channel: "web",
    merchant_category: "electronics",
    ip_address: "",
    card_bin: "",
    device_fingerprint: "",
    shipping_address: "",
    payment_method: "card",
    vpa_handle: "",
    device_binding_verified: 1,
    vpa_age_verified: 1,
  });

  const generateTxId = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `txn_${rand}`;
  };

  useEffect(() => {
    setFormData(prev => ({ ...prev, transaction_id: generateTxId() }));
  }, []);

  const handlePreset = (preset) => {
    setFormData({
      ...preset,
      transaction_id: generateTxId()
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;

    if (type === 'number') {
      finalValue = value === '' ? '' : parseFloat(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const sanitizedPayload = {
      ...formData,
      transaction_id: formData.transaction_id?.trim() || generateTxId(),
      user_id: formData.user_id?.trim() || "usr_anonymous",
      account_age_days: parseInt(formData.account_age_days, 10) || 0,
      total_transactions_user: parseInt(formData.total_transactions_user, 10) || 0,
      avg_amount_user: parseFloat(formData.avg_amount_user) || 0.0,
      amount: parseFloat(formData.amount) || 0.0,
      shipping_distance_km: parseFloat(formData.shipping_distance_km) || 0.0,
      promo_used: Number(formData.promo_used) || 0,
      avs_match: Number(formData.avs_match) || 0,
      cvv_result: Number(formData.cvv_result) || 0,
      three_ds_flag: Number(formData.three_ds_flag) || 0,
      country: formData.country || "IN",
      bin_country: formData.bin_country || "IN",
      channel: formData.channel || "web",
      merchant_category: formData.merchant_category || "electronics",
      ip_address: formData.ip_address || "127.0.0.1",
      card_bin: formData.card_bin || "",
      device_fingerprint: formData.device_fingerprint || "",
      shipping_address: formData.shipping_address || "",
      payment_method: formData.payment_method || "card",
      vpa_handle: formData.vpa_handle || "",
      device_binding_verified: Number(formData.device_binding_verified ?? 1),
      vpa_age_verified: Number(formData.vpa_age_verified ?? 1),
    };

    onSubmit(sanitizedPayload);
    setFormData(prev => ({
      ...prev,
      transaction_id: generateTxId()
    }));
  };

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-7 shadow-xl space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5 z-10 relative">
        <div>
          <h2 className="text-md font-bold text-foreground tracking-tight">Transaction Attributes</h2>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">Configure transaction telemetry for risk grading</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePreset(cleanPreset)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 active:scale-[0.98] transition-all"
            title="Clean Card Transaction"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Clean Card
          </button>
          <button
            type="button"
            onClick={() => handlePreset(suspiciousPreset)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 border border-rose-500/20 active:scale-[0.98] transition-all"
            title="Suspicious Card Transaction"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            Anomaly Card
          </button>
          <button
            type="button"
            onClick={() => handlePreset(cleanUpiPreset)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 border border-blue-500/20 active:scale-[0.98] transition-all"
            title="Clean UPI Transaction"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Clean UPI
          </button>
          <button
            type="button"
            onClick={() => handlePreset(suspiciousUpiPreset)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 active:scale-[0.98] transition-all"
            title="Suspicious UPI Transaction"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            Anomaly UPI
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
              Transaction ID
            </label>
            <div className="relative">
              <input
                type="text"
                name="transaction_id"
                value={formData.transaction_id}
                onChange={handleChange}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-400 focus:outline-none focus:border-primary focus:text-foreground focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, transaction_id: generateTxId() }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Regenerate ID"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
              User ID
            </label>
            <input
              type="text"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              placeholder="e.g. user_992"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
            />
          </div>
        </div>

        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary/60 pl-2 leading-none">
            User Account History
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                Account Age (Days)
              </label>
              <input
                type="number"
                name="account_age_days"
                value={formData.account_age_days}
                onChange={handleChange}
                min="0"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                Total Purchases
              </label>
              <input
                type="number"
                name="total_transactions_user"
                value={formData.total_transactions_user}
                onChange={handleChange}
                min="0"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                Avg. Purchase (₹)
              </label>
              <input
                type="number"
                name="avg_amount_user"
                value={formData.avg_amount_user}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary/60 pl-2 leading-none">
            Transaction Details
          </h3>
          
          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              label="Payment Method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleSelectChange}
              options={[
                { value: "card", label: "Credit / Debit Card" },
                { value: "upi", label: "UPI" }
              ]}
              tooltip="Select payment method to show relevant verification fields."
            />
            <div />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                Order Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                Ship Distance (KM)
              </label>
              <input
                type="number"
                name="shipping_distance_km"
                value={formData.shipping_distance_km}
                onChange={handleChange}
                min="0"
                step="0.1"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            
            <CustomSelect
              label="Promo Code"
              name="promo_used"
              value={formData.promo_used}
              onChange={handleSelectChange}
              options={[
                { value: 0, label: "No (0)" },
                { value: 1, label: "Yes (1)" }
              ]}
              tooltip="Indicates if promo discount code was applied."
            />
          </div>

          {/* Credit Card Fields - Show when payment_method is 'card' */}
          {formData.payment_method === "card" && (
            <>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-800/50">
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Customer billing country (ISO 2-letter)">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    maxLength={2}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-center uppercase text-zinc-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Card Issuer Country (ISO 2-letter)">
                    Card BIN Country
                  </label>
                  <input
                    type="text"
                    name="bin_country"
                    value={formData.bin_country}
                    onChange={handleChange}
                    maxLength={2}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-center uppercase text-zinc-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Card BIN (first 6-8 digits)">
                    Card BIN
                  </label>
                  <input
                    type="text"
                    name="card_bin"
                    value={formData.card_bin}
                    onChange={handleChange}
                    placeholder="e.g. 411111"
                    maxLength={8}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* UPI Fields - Show when payment_method is 'upi' */}
          {formData.payment_method === "upi" && (
            <>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-800/50">
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="UPI Virtual Payment Address (e.g. user@okhdfcbank)">
                    VPA Handle
                  </label>
                  <input
                    type="text"
                    name="vpa_handle"
                    value={formData.vpa_handle}
                    onChange={handleChange}
                    placeholder="e.g. rahul.sharma@okhdfcbank"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="UPI Device Binding Verification Status">
                    Device Binding Verified
                  </label>
                  <CustomSelect
                    name="device_binding_verified"
                    value={formData.device_binding_verified}
                    onChange={handleSelectChange}
                    options={[
                      { value: 1, label: "Pass (1)" },
                      { value: 0, label: "Fail (0)" }
                    ]}
                    tooltip="Indicates if UPI device binding (SIM + Device) is verified by NPCI."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="VPA Age > 30 Days Verification">
                    {"VPA Age > 30 Days"}
                  </label>
                  <CustomSelect
                    name="vpa_age_verified"
                    value={formData.vpa_age_verified}
                    onChange={handleSelectChange}
                    options={[
                      { value: 1, label: "Pass (1)" },
                      { value: 0, label: "Fail (0)" }
                    ]}
                    tooltip="Indicates if the VPA handle is older than 30 days (reduces fraud risk)."
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-800/50">
            <CustomSelect
              label="Channel"
              name="channel"
              value={formData.channel}
              onChange={handleSelectChange}
              options={[
                { value: "web", label: "Web Portal" },
                { value: "mobile", label: "Mobile App" }
              ]}
              tooltip="The source channel of the order submission."
            />

            <CustomSelect
              label="Merchant Category"
              name="merchant_category"
              value={formData.merchant_category}
              onChange={handleSelectChange}
              options={[
                { value: "electronics", label: "Electronics" },
                { value: "fashion", label: "Fashion" },
                { value: "gaming", label: "Gaming" },
                { value: "grocery", label: "Grocery" },
                { value: "travel", label: "Travel" }
              ]}
              tooltip="The product category segment."
            />
          </div>
        </div>

        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary/60 pl-2 leading-none">
            Gateway Verification Checklist
          </h3>
          
          {/* Card Payment Security Checks */}
          {formData.payment_method === "card" && (
            <div className="grid grid-cols-3 gap-4">
              <CustomSelect
                label="AVS Match"
                name="avs_match"
                value={formData.avs_match}
                onChange={handleSelectChange}
                options={[
                  { value: 0, label: "Fail (0)" },
                  { value: 1, label: "Pass (1)" }
                ]}
                tooltip="Address Verification System check results."
              />

              <CustomSelect
                label="CVV Result"
                name="cvv_result"
                value={formData.cvv_result}
                onChange={handleSelectChange}
                options={[
                  { value: 0, label: "Fail (0)" },
                  { value: 1, label: "Pass (1)" }
                ]}
                tooltip="Card Security Code check verification."
              />

              <CustomSelect
                label="3-D Secure"
                name="three_ds_flag"
                value={formData.three_ds_flag}
                onChange={handleSelectChange}
                options={[
                  { value: 0, label: "Fail / Bypass (0)" },
                  { value: 1, label: "Pass (1)" }
                ]}
                tooltip="3-D Secure Multi-factor Authentication status."
              />
            </div>
          )}

          {/* UPI Payment Security Checks */}
          {formData.payment_method === "upi" && (
            <div className="grid grid-cols-3 gap-4">
              <CustomSelect
                label="Device Binding Verified"
                name="device_binding_verified"
                value={formData.device_binding_verified}
                onChange={handleSelectChange}
                options={[
                  { value: 1, label: "Pass (1)" },
                  { value: 0, label: "Fail (0)" }
                ]}
                tooltip="NPCI UPI device binding verification (SIM + Device cryptographic binding)."
              />

              <CustomSelect
                label={"VPA Age > 30 Days"}
                name="vpa_age_verified"
                value={formData.vpa_age_verified}
                onChange={handleSelectChange}
                options={[
                  { value: 1, label: "Pass (1)" },
                  { value: 0, label: "Fail (0)" }
                ]}
                tooltip="VPA handle age verification (>30 days reduces fraud risk)."
              />

              <div />
            </div>
          )}
        </div>

        <div className="space-y-3.5 pt-4 border-t border-zinc-800/50">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary/60 pl-2 leading-none">
            Fraud Ring Detection Attributes
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Client IP Address for velocity analysis">
                IP Address
              </label>
              <input
                type="text"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                placeholder="e.g. 192.168.1.1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Card BIN (first 6-8 digits)">
                Card BIN
              </label>
              <input
                type="text"
                name="card_bin"
                value={formData.card_bin}
                onChange={handleChange}
                placeholder="e.g. 411111"
                maxLength={8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Device Fingerprint Hash">
                Device Fingerprint
              </label>
              <input
                type="text"
                name="device_fingerprint"
                value={formData.device_fingerprint}
                onChange={handleChange}
                placeholder="e.g. dev_fp_abc123"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5" title="Shipping Address for ring detection">
                Shipping Address
              </label>
              <input
                type="text"
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                placeholder="e.g. 123 Main St, City, Country"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-zinc-700/80 transition-all"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Assess Risk
            </>
          )}
        </button>
      </form>
    </div>
  );
}