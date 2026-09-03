import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Terminal, Minimize2, Maximize2, AlertCircle, CheckCircle2, ShieldAlert, Zap, X } from 'lucide-react';

const ACTION_MAP = {
  AUTO_APPROVE: { label: 'PAYMENT_APPROVED', icon: CheckCircle2, color: '#10b981' },
  REQUIRE_STEP_UP_AUTH: { label: 'STEP_UP_AUTH_REQUIRED', icon: ShieldAlert, color: '#f59e0b' },
  BLOCK_AND_REVIEW: { label: 'PAYMENT_BLOCKED', icon: AlertCircle, color: '#f43f5e' },
  STEP_UP_AUTH: { label: 'STEP_UP_AUTH_REQUIRED', icon: ShieldAlert, color: '#f59e0b' },
  BLOCK: { label: 'PAYMENT_BLOCKED', icon: AlertCircle, color: '#f43f5e' },
};

const RISK_LEVEL_MAP = {
  LOW_RISK: { label: 'LOW_RISK', color: '#10b981' },
  MEDIUM_RISK: { label: 'MEDIUM_RISK', color: '#f59e0b' },
  HIGH_RISK: { label: 'HIGH_RISK', color: '#f43f5e' },
};

function getReason(tx) {
  const riskCategory = tx.risk_category || tx.risk_level || 'LOW_RISK';
  const networkData = tx.risk_network_data;
  
  if (networkData?.metadata?.is_velocity_attack) {
    return 'Velocity Attack Detected (Shared IP)';
  }
  if (networkData?.metadata?.blocked_connections > 0) {
    return `Linked to ${networkData.metadata.blocked_connections} Blocked Transaction(s)`;
  }
  if (riskCategory === 'HIGH_RISK') {
    return 'High Fraud Probability (ML Score >= 75%)';
  }
  if (riskCategory === 'MEDIUM_RISK') {
    return 'Elevated Risk - Step-Up Authentication Required';
  }
  return 'Transaction Verified Safe';
}

export default function DeveloperWebhookTerminal({ latestTransaction }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  const webhookPayload = useMemo(() => {
    if (!latestTransaction) return null;

    const tx = latestTransaction;
    const riskCategory = tx.risk_category || tx.risk_level || 'LOW_RISK';
    const actionTaken = tx.action_taken || tx.recommendation || 'AUTO_APPROVE';
    
    const actionInfo = ACTION_MAP[actionTaken] || ACTION_MAP.AUTO_APPROVE;
    const riskInfo = RISK_LEVEL_MAP[riskCategory] || RISK_LEVEL_MAP.LOW_RISK;

    return {
      event: 'risk.assessment.completed',
      timestamp: new Date().toISOString(),
      data: {
        transaction_id: tx.transaction_id || 'txn_unknown',
        risk_level: riskInfo.label,
        action_taken: actionInfo.label,
        reason: getReason(tx),
        risk_score: Math.round((tx.risk_score || 0) * 100),
        xgboost_score: Math.round((tx.xgboost_score || 0) * 100),
        anomaly_score: Math.round((tx.anomaly_score || 0) * 100),
        amount_inr: tx.order_amount || tx.amount || 0,
        user_id: tx.user_id || 'unknown',
        requires_step_up_3ds: actionTaken === 'REQUIRE_STEP_UP_AUTH' || riskCategory === 'MEDIUM_RISK',
        network_analysis: tx.risk_network_data?.metadata ? {
          connections_found: tx.risk_network_data.metadata.total_connections || 0,
          blocked_connections: tx.risk_network_data.metadata.blocked_connections || 0,
          velocity_attack: tx.risk_network_data.metadata.is_velocity_attack || false,
          clusters_detected: tx.risk_network_data.clusters?.length || 0,
        } : null,
        razorpay_order_id: tx.razorpay_order_id || null,
      },
    };
  }, [latestTransaction]);

  const jsonString = useMemo(() => 
    webhookPayload ? JSON.stringify(webhookPayload, null, 2) : '{}', 
  [webhookPayload]);

  const handleCopy = async () => {
    if (!jsonString || jsonString === '{}') return;
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initialize riskCategory FIRST to avoid TDZ
  const riskCategory = latestTransaction?.risk_category || latestTransaction?.risk_level || 'LOW_RISK';
  const actionInfo = ACTION_MAP[latestTransaction?.action_taken || latestTransaction?.recommendation || 'AUTO_APPROVE'] || ACTION_MAP.AUTO_APPROVE;
  const riskInfo = RISK_LEVEL_MAP[riskCategory] || RISK_LEVEL_MAP.LOW_RISK;
  const ActionIcon = actionInfo.icon;
  const RiskIcon = riskCategory === 'HIGH_RISK' ? AlertCircle : riskCategory === 'MEDIUM_RISK' ? ShieldAlert : CheckCircle2;

  if (!webhookPayload) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden h-64"
      >
        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
          <Terminal className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm font-mono text-zinc-500">No transaction selected</p>
          <p className="text-xs mt-1 text-zinc-600">Click a transaction in the Live Feed to see its webhook payload</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: isMinimized ? '56px' : '320px' }}
    >
      {/* macOS-style Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-zinc-800 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 shadow-[0_0_4px_rgba(244,63,94,0.6)]" />
            <span className="w-3 h-3 rounded-full bg-amber-500/90 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
          </div>
          <span className="font-mono text-xs text-zinc-500 ml-1">POST /webhooks/risksentinel</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-emerald-400 transition-all flex items-center gap-1.5"
            title={copied ? 'Copied!' : 'Copy JSON'}
          >
            <Copy className="w-4 h-4" />
            <span className="text-[10px] font-mono hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
            title={isMinimized ? 'Expand' : 'Collapse'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4 bg-black" style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", monospace' }}>
          <pre className="m-0 text-sm leading-relaxed whitespace-pre-wrap break-words text-emerald-300">
            <code className="language-json">{jsonString}</code>
          </pre>
        </div>
      )}

      {/* Status Bar */}
      <div className="px-4 py-2.5 border-t border-zinc-800 bg-slate-900/50 flex items-center justify-between text-[10px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary" />
            Event: <span className="font-mono text-zinc-300">risk.assessment.completed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ActionIcon className="w-3 h-3" style={{ color: actionInfo.color }} />
            Action: <span className="font-mono" style={{ color: actionInfo.color }}>{actionInfo.label}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiskIcon className="w-3 h-3" style={{ color: riskInfo.color }} />
            Risk: <span className="font-mono" style={{ color: riskInfo.color }}>{riskInfo.label}</span>
          </span>
        </div>
        <span className="font-mono text-zinc-400">Timestamp: {new Date().toLocaleTimeString()}</span>
      </div>
    </motion.div>
  );
}