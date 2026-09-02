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
  merchant_category: "grocery"
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
  merchant_category: "travel"
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
    merchant_category: "electronics"
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
    onSubmit(formData);
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
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => handlePreset(cleanPreset)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Clean Preset
          </button>
          <button
            type="button"
            onClick={() => handlePreset(suspiciousPreset)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 border border-rose-500/20 active:scale-[0.98] transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            Anomaly Preset
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

          <div className="grid grid-cols-3 gap-4">
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

            <div className="grid grid-cols-2 gap-2.5">
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
                  Card BIN
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
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-l-2 border-primary/60 pl-2 leading-none">
            Gateway Verification Checklist
          </h3>
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
