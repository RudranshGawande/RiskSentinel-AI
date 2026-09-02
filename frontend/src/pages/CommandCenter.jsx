import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Activity, ShieldAlert, CheckCircle, Search,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Info, Shield,
  Zap, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, humanizeFeature, explainImpact } from '../lib/constants';
import ThreatReportCard from '../components/transaction/ThreatReportCard';

export function StatCard({ title, value, icon, color = "blue" }) {
  const bgMap = {
    blue: "from-blue-500/10 to-transparent",
    emerald: "from-emerald-500/10 to-transparent",
    amber: "from-amber-500/10 to-transparent",
    red: "from-red-500/10 to-transparent",
    purple: "from-purple-500/10 to-transparent",
  };

  return (
    <div className="bg-[#13151B] border border-gray-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
      <div className={`absolute inset-0 bg-gradient-to-br ${bgMap[color] || bgMap.blue} opacity-50 pointer-events-none`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
          <div className="p-1.5 bg-secondary/80 rounded-lg">
            {icon}
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  );
}

export function RiskDot({ category }) {
  const colors = {
    LOW_RISK: "bg-emerald-500",
    MEDIUM_RISK: "bg-amber-500",
    HIGH_RISK: "bg-red-500",
  };
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[category] || 'bg-gray-500'}`} />;
}

export function RiskBadge({ category }) {
  const styles = {
    LOW_RISK: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    MEDIUM_RISK: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    HIGH_RISK: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const labels = {
    LOW_RISK: "Approved",
    MEDIUM_RISK: "Step-Up Auth",
    HIGH_RISK: "Blocked",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${styles[category] || 'bg-gray-500/10 text-gray-400'}`}>
      {labels[category] || category}
    </span>
  );
}

export function ScoreCard({ label, sublabel, score, tooltip, tooltipAlign = "center" }) {
  const pct = (score * 100).toFixed(1);
  const color = score > 0.7 ? 'text-red-400' : score > 0.35 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="p-3.5 bg-background rounded-xl border border-border flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="text-xs font-semibold text-foreground/90 leading-tight">{label}</div>
          {tooltip && <Tooltip text={tooltip} align={tooltipAlign} />}
        </div>
        <div className="text-[10px] text-muted-foreground mb-3 leading-tight">{sublabel}</div>
      </div>
      <div className={`text-2xl font-bold tracking-tight mt-auto ${color}`}>{pct}%</div>
    </div>
  );
}

export function Tooltip({ text, align = "center" }) {
  const [show, setShow] = useState(false);

  let positionClasses = "left-1/2 -translate-x-1/2";
  let arrowClasses = "left-1/2 -translate-x-1/2";

  if (align === "right") {
    positionClasses = "right-0 translate-x-[10%]";
    arrowClasses = "right-4";
  } else if (align === "left") {
    positionClasses = "left-0 -translate-x-[10%]";
    arrowClasses = "left-4";
  }

  return (
    <div className="relative inline-block shrink-0">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/50"
        aria-label="More information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`absolute z-50 bottom-full mb-2 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl text-xs text-gray-300 leading-relaxed pointer-events-none ${positionClasses}`}
          >
            {text}
            <div className={`absolute top-full w-2 h-2 bg-zinc-800 border-b border-r border-zinc-700 rotate-45 -mt-1 ${arrowClasses}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TransactionDetail({ tx }) {
  let shapData = {};
  try {
    shapData = typeof tx.shap_top_features === 'string'
      ? JSON.parse(tx.shap_top_features || "{}")
      : tx.shap_top_features || {};
  } catch (e) { /* graceful fallback */ }

  const sortedShap = Object.entries(shapData)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 6);

  const actionLabels = {
    AUTO_APPROVE: "Auto-Approved",
    REQUIRE_STEP_UP_AUTH: "Requires Step-Up Authentication",
    BLOCK_AND_REVIEW: "Blocked for Manual Review",
  };

  return (
    <div className="p-6 space-y-7">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Transaction Analysis</h2>
          <RiskBadge category={tx.risk_category} />
        </div>
        <p className="font-mono text-xs text-muted-foreground">{tx.transaction_id}</p>
        <p className="text-sm text-muted-foreground mt-1">
          ₹{Number(tx.order_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} &middot; User: {tx.user_id}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">AI Engine Scores</h3>
          <Tooltip text="Two independent AI engines score every transaction. The Pattern Recognition Engine learns from historical fraud data, while the Anomaly Detection Engine identifies unusual behavior never seen before." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard
            label="Primary Risk Engine (Pattern Recognition)"
            sublabel="Historical fraud patterns"
            score={tx.xgboost_score}
            tooltip="Analyzes historical data to find hidden fraud patterns."
            tooltipAlign="left"
          />
          <ScoreCard
            label="Behavioral Anomaly Engine (Anomaly Detection)"
            sublabel="Unusual behavior detection"
            score={tx.anomaly_score}
            tooltip="Identifies unusual transactional behavior that deviates from standard patterns."
            tooltipAlign="right"
          />
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${
        tx.risk_category === 'HIGH_RISK' ? 'bg-red-500/5 border-red-500/20' :
        tx.risk_category === 'MEDIUM_RISK' ? 'bg-amber-500/5 border-amber-500/20' :
        'bg-emerald-500/5 border-emerald-500/20'
      }`}>
        <div className="font-semibold text-sm mb-1 flex items-center gap-2">
          {tx.risk_category === 'LOW_RISK' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {tx.risk_category === 'MEDIUM_RISK' && <Shield className="w-4 h-4 text-amber-400" />}
          {tx.risk_category === 'HIGH_RISK' && <ShieldAlert className="w-4 h-4 text-red-400" />}
          {actionLabels[tx.action_taken] || tx.action_taken.replace(/_/g, ' ')}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{tx.explanation}</p>
      </div>

      {sortedShap.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Key Risk Drivers</h3>
            <Tooltip text="These are the specific data points that most influenced the AI's final decision for this transaction." />
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            These are the specific data points that influenced the AI's final decision. Sorted by impact strength.
          </p>
          <div className="space-y-3">
            {sortedShap.map(([feature, impact]) => {
              const isRisk = impact > 0;
              const strength = explainImpact(impact);
              const pct = Math.abs(impact * 100);
              const barWidth = Math.min(pct * 3, 100);

              return (
                <div key={feature} className="p-2.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 border border-border/40 transition-colors">
                  <div className="flex justify-between items-start text-xs mb-1">
                    <div>
                      <span className="font-medium text-foreground/90 block">
                        {humanizeFeature(feature)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {isRisk 
                          ? `Contributed ${strength.toLowerCase()}ly to fraud risk` 
                          : `Helped lower the overall risk score`
                        }
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded shrink-0 ${isRisk ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                      {isRisk
                        ? <ArrowUpRight className="w-3.5 h-3.5" />
                        : <ArrowDownRight className="w-3.5 h-3.5" />
                      }
                      {isRisk ? '+' : '-'}{pct.toFixed(1)}% ({isRisk ? 'Increases Risk' : 'Reduces Risk'})
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${isRisk ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ThreatReportCard
        report={tx.threat_report || `### Risk Summary
Transaction **${tx.transaction_id}** from user **${tx.user_id || 'verified shopper'}** evaluated with a combined risk score of **${(Number(tx.risk_score || 0) * 100).toFixed(1)}%** (${tx.risk_category === 'LOW_RISK' ? 'APPROVED' : tx.risk_category === 'MEDIUM_RISK' ? 'STEP-UP AUTH' : 'BLOCKED'}) for an order amount of **₹${Number(tx.order_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}**.

### Key Risk Indicators
${sortedShap.length > 0 ? sortedShap.map(([feat, impact]) => {
  const isRisk = impact > 0;
  return `- **${humanizeFeature(feat)}** (${isRisk ? '+' : '-'}${Math.abs(impact * 100).toFixed(1)}% impact) — ${isRisk ? 'Contributed to risk score' : 'Positive trust factor verifying legitimate cardholder identity'}`;
}).join('\n') : '- **Standard Security Checks** — Address verification (AVS), CVV security code, and 3DS parameters matched verified buyer profile.'}

### Behavioral Anomaly Analysis
RiskSentinel's Anomaly Detection Engine scored this purchase behavior at **${(Number(tx.anomaly_score || 0) * 100).toFixed(1)}%**, ${Number(tx.anomaly_score || 0) > 0.5 ? 'detecting statistical deviations in buyer spend and channel velocity' : 'confirming standard legitimate purchasing behavior within normal variance'}.

### Recommended Action
${tx.risk_category === 'LOW_RISK' 
  ? '**AUTO-APPROVE** — Transaction metrics are verified safe within normal behavioral parameters. Frictionless checkout approved.' 
  : tx.risk_category === 'MEDIUM_RISK' 
  ? '**REQUIRE STEP-UP AUTHENTICATION (Smart 3DS)** — Elevated risk score (30%–75%). Step-Up Authentication (3DS OTP challenge) triggered to protect merchant revenue while verifying card ownership.' 
  : '**BLOCK & HOLD FOR MANUAL REVIEW** — High fraud probability (>= 75%). Transaction blocked to prevent chargeback loss.'}

### Confidence Level
RiskSentinel AI Confidence: **${tx.risk_category === 'LOW_RISK' ? 'HIGH (Approved)' : tx.risk_category === 'MEDIUM_RISK' ? 'MEDIUM (Step-Up Challenge)' : 'HIGH (Blocked)'}**`}
        riskScore={tx.risk_score}
        riskCategory={tx.risk_category}
        transactionId={tx.transaction_id}
        txData={tx}
      />
    </div>
  );
}

export default function CommandCenter() {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [selectedItemKey, setSelectedItemKey] = useState(null);
  const [txDetails, setTxDetails] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, timeRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/summary`),
        axios.get(`${API_URL}/api/analytics/timeline?limit=15`)
      ]);
      setSummary(sumRes.data);
      setTimeline(timeRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  const fetchTxDetails = async (tx, itemKey) => {
    try {
      setSelectedItemKey(itemKey);
      const queryParam = tx.id != null ? tx.id : tx.transaction_id;
      const res = await axios.get(`${API_URL}/api/audit/${queryParam}`);
      setTxDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch transaction details", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full mb-6">
        <StatCard
          title="Total Assessed"
          value={summary?.total_transactions || 0}
          icon={<Activity className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="Approved"
          value={summary?.approved_count || 0}
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          title="Step-Up Auth"
          value={summary?.step_up_count || 0}
          icon={<Shield className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
        <StatCard
          title="Blocked"
          value={summary?.blocked_count || 0}
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          color="red"
        />
        <StatCard
          title="Avg. Response"
          value={`${summary?.avg_latency_ms != null ? summary.avg_latency_ms.toFixed(1) : '0.0'}ms`}
          icon={<Clock className="w-5 h-5 text-purple-400" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#13151B] border border-gray-800 rounded-2xl flex flex-col overflow-hidden p-5 h-[calc(100vh-16rem)] min-h-[560px]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Live Transaction Feed
              </h2>
              <span className="text-xs text-muted-foreground">
                Showing latest {timeline.length} transactions
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <AnimatePresence>
                {timeline.map((tx, idx) => {
                  const itemKey = tx.id != null ? `tx-${tx.id}` : `tx-${tx.transaction_id}-${tx.timestamp || idx}`;
                  const isSelected = selectedItemKey === itemKey;

                  return (
                    <motion.div
                      key={itemKey}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => fetchTxDetails(tx, itemKey)}
                      className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-sm shadow-blue-500/20 ring-1 ring-blue-500/50'
                          : 'border-border bg-background/50 hover:bg-secondary/40 hover:border-border/80'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <RiskDot category={tx.risk_category} />
                          <div>
                            <div className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                              {tx.transaction_id}
                            </div>
                            <div className="font-semibold mt-0.5">
                              ₹{Number(tx.order_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <RiskBadge category={tx.risk_category} />
                            <div className="text-xs text-muted-foreground mt-1.5">
                              Risk: {(tx.risk_score * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {timeline.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No transactions yet.</p>
                  <p className="text-xs mt-1">Send requests to the API to see live data.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-[#13151B] border border-gray-800 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-16rem)] min-h-[560px] overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {txDetails ? (
                <TransactionDetail tx={txDetails} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                    <Search className="w-7 h-7 opacity-30" />
                  </div>
                  <p className="font-medium text-foreground/60">No Transaction Selected</p>
                  <p className="text-xs mt-2 max-w-[200px]">Click any transaction from the feed to view its AI-powered risk analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
