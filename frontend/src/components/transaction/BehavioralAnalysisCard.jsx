import { motion } from 'framer-motion';
import {
  Activity, User, MapPin, CreditCard, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, Shield
} from 'lucide-react';

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function BehavioralAnalysisCard({ result, transactionPayload }) {
  const anomalyScore = result?.anomaly_score || 0;
  const orderAmount = Number(transactionPayload?.amount || result?.amount || 0);
  const avgAmount = Number(transactionPayload?.avg_amount_user || result?.avg_amount_user || 0);
  const accountAge = Number(transactionPayload?.account_age_days || result?.account_age_days || 0);
  const totalTx = Number(transactionPayload?.total_transactions_user || result?.total_transactions_user || 0);
  const shipDistance = Number(transactionPayload?.shipping_distance_km || result?.shipping_distance_km || 0);

  const spendRatio = avgAmount > 0 ? (orderAmount / avgAmount).toFixed(1) : '1.0';
  const isHighAnomaly = anomalyScore >= 0.70;
  const isMedAnomaly = anomalyScore >= 0.30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-card border border-border/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">Behavioral Anomaly Analysis</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  iForest
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unsupervised anomaly detection & buyer baseline variance
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            {(anomalyScore * 100).toFixed(1)}% Shift
          </span>
        </div>

        {/* Anomaly Gauge & Key Metrics */}
        <div className="mt-5 space-y-4">
          {/* Anomaly Engine Bar */}
          <div className="p-3.5 bg-secondary/20 border border-border/40 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Statistical Behavioral Shift Index
              </span>
              <span className={`font-semibold ${isHighAnomaly ? 'text-rose-400' : isMedAnomaly ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isHighAnomaly ? 'Severe Deviation' : isMedAnomaly ? 'Moderate Deviation' : 'Normal Variance'}
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(anomalyScore * 100, 100)}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full ${
                  isHighAnomaly ? 'bg-rose-500' : isMedAnomaly ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* 4-Grid Behavioral Comparison Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-primary" />
                Spend vs History
              </div>
              <div className="font-bold text-sm text-foreground mt-1 font-mono">
                {spendRatio}x Average
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                ₹{orderAmount.toLocaleString()} vs ₹{avgAmount.toLocaleString()} avg
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                Account Maturity
              </div>
              <div className="font-bold text-sm text-foreground mt-1">
                {accountAge === 0 ? 'Newly Created' : `${accountAge} Days Old`}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {totalTx} prior transactions
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                Shipping Distance
              </div>
              <div className="font-bold text-sm text-foreground mt-1 font-mono">
                {shipDistance > 0 ? `${shipDistance} km` : 'Local / Same City'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {shipDistance > 500 ? 'Cross-region delivery' : 'Standard regional radius'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-border/40">
              <div className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-primary" />
                Channel & Method
              </div>
              <div className="font-bold text-sm text-foreground mt-1 capitalize">
                {transactionPayload?.payment_method || 'Card'} &middot; {transactionPayload?.channel || 'Web'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                {transactionPayload?.merchant_category || 'Electronics'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Isolation Forest Trees: 100</span>
        <span>Contamination: 0.05</span>
      </div>
    </motion.div>
  );
}
