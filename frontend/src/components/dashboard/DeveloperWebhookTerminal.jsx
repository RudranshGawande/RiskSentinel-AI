import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Copy, Check, Play, RefreshCw,
  Send, ShieldAlert, CheckCircle2, AlertTriangle,
  Code2, ExternalLink, Zap
} from 'lucide-react';

export default function DeveloperWebhookTerminal({ latestTransaction }) {
  const [logs, setLogs] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('payload'); // 'payload' | 'headers' | 'curl'

  // Generate webhook whenever latestTransaction changes
  useEffect(() => {
    if (!latestTransaction) return;

    const txId = latestTransaction.transaction_id || `txn_${Date.now()}`;
    const riskScore = latestTransaction.risk_score || 0;
    const isHigh = riskScore >= 0.7 || latestTransaction.risk_category === 'HIGH_RISK' || latestTransaction.action_taken === 'BLOCK';
    const isMedium = riskScore >= 0.3 || latestTransaction.risk_category === 'MEDIUM_RISK';

    const eventName = isHigh
      ? 'risk.threat.detected'
      : isMedium
      ? 'payment.step_up_3ds.required'
      : 'payment.risk.cleared';

    const webhookEvent = {
      id: `evt_${Math.random().toString(36).substring(2, 11)}`,
      event: eventName,
      timestamp: new Date().toISOString(),
      status: 200,
      latency: Math.floor(Math.random() * 40 + 20),
      payload: {
        entity: "event",
        account_id: "acc_rzp_sentinel_enterprise",
        event: eventName,
        contains: ["payment", "risk_assessment"],
        payload: {
          payment: {
            entity: {
              id: latestTransaction.transaction_id || "pay_test_123456",
              amount: Math.round((latestTransaction.order_amount || latestTransaction.amount || 2500) * 100),
              currency: "INR",
              status: isHigh ? "failed" : isMedium ? "step_up_auth" : "captured",
              method: latestTransaction.payment_method || "card",
              created_at: Math.floor(Date.now() / 1000)
            }
          },
          risk_assessment: {
            risk_score: Number(riskScore.toFixed(4)),
            risk_category: latestTransaction.risk_category || (isHigh ? "HIGH_RISK" : isMedium ? "MEDIUM_RISK" : "LOW_RISK"),
            action_taken: latestTransaction.action_taken || (isHigh ? "BLOCK_AND_REVIEW" : isMedium ? "STEP_UP_AUTH" : "AUTO_APPROVE"),
            decision_engine: "Razorpay RiskSentinel AI v2.0",
            evaluated_at: new Date().toISOString()
          }
        }
      }
    };

    setLogs((prev) => [webhookEvent, ...prev.slice(0, 19)]);
  }, [latestTransaction]);

  // Initial seed logs if empty
  useEffect(() => {
    if (logs.length === 0) {
      const initialEvent = {
        id: "evt_init_ready_001",
        event: "risk.system.ready",
        timestamp: new Date().toISOString(),
        status: 200,
        latency: 18,
        payload: {
          entity: "event",
          event: "risk.system.ready",
          message: "RiskSentinel AI Webhook Gateway listening for assessment triggers.",
          version: "2.0.0"
        }
      };
      setLogs([initialEvent]);
    }
  }, []);

  const currentLog = logs[0] || null;

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerSampleWebhook = () => {
    const isBlocked = Math.random() > 0.5;
    const sample = {
      transaction_id: `txn_sim_${Math.random().toString(36).substring(2, 8)}`,
      order_amount: Math.floor(Math.random() * 80000 + 1000),
      risk_score: isBlocked ? 0.89 : 0.12,
      risk_category: isBlocked ? 'HIGH_RISK' : 'LOW_RISK',
      action_taken: isBlocked ? 'BLOCK_AND_REVIEW' : 'AUTO_APPROVE',
      payment_method: 'card'
    };
    // Trigger effect
    setLogs((prev) => {
      const evt = {
        id: `evt_sim_${Math.random().toString(36).substring(2, 11)}`,
        event: isBlocked ? 'risk.threat.detected' : 'payment.risk.cleared',
        timestamp: new Date().toISOString(),
        status: 200,
        latency: Math.floor(Math.random() * 30 + 15),
        payload: {
          event: isBlocked ? 'risk.threat.detected' : 'payment.risk.cleared',
          transaction_id: sample.transaction_id,
          amount_inr: sample.order_amount,
          risk_score: sample.risk_score,
          recommendation: sample.action_taken
        }
      };
      return [evt, ...prev.slice(0, 19)];
    });
  };

  return (
    <div className="bg-zinc-950 border border-border/80 rounded-2xl overflow-hidden shadow-2xl mt-8">
      {/* Terminal Title Bar */}
      <div className="bg-zinc-900/90 px-5 py-3.5 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-[1px] bg-border/60 mx-1" />
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-zinc-200">
              Razorpay Webhook Stream (Developer Console)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerSampleWebhook}
            className="px-3 py-1 text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>Simulate Delivery</span>
          </button>
          <button
            onClick={() => setLogs([])}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Clear Terminal Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* Event List Sidebar */}
        <div className="lg:col-span-4 border-r border-border/40 bg-zinc-900/40 p-3 space-y-2 overflow-y-auto max-h-[420px]">
          <div className="text-[10px] font-mono uppercase text-zinc-500 px-2 py-1 flex justify-between items-center">
            <span>Delivered Webhook Events</span>
            <span>{logs.length} logged</span>
          </div>

          {logs.map((log) => {
            const isDanger = log.event.includes('threat') || log.event.includes('fail');
            const isWarn = log.event.includes('step_up');
            return (
              <div
                key={log.id}
                className="p-2.5 rounded-xl border border-border/30 bg-zinc-900/60 hover:border-primary/40 transition-all font-mono text-xs cursor-pointer group"
                onClick={() => handleCopy(log.payload, log.id)}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`font-semibold flex items-center gap-1.5 text-[11px] ${
                    isDanger ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {isDanger ? <ShieldAlert className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {log.event}
                  </span>
                  <span className="text-[10px] text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800">
                    {log.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-zinc-400">{log.latency}ms</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* JSON Payload Inspector */}
        <div className="lg:col-span-8 p-5 bg-zinc-950 flex flex-col justify-between overflow-hidden">
          {currentLog ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/30 mb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs text-zinc-300 font-semibold">{currentLog.id}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                    HTTP 200 OK
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(currentLog.payload, 'current')}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-border/50"
                >
                  {copiedId === 'current' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Payload</span>
                    </>
                  )}
                </button>
              </div>

              {/* Signature & Target Headers Info */}
              <div className="p-2.5 mb-3 rounded-lg bg-zinc-900/80 border border-border/40 font-mono text-[11px] text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">POST Target:</span>
                  <span className="text-zinc-300">https://merchant-api.example.com/webhooks/razorpay</span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-zinc-500">X-Razorpay-Signature:</span>
                  <span className="text-amber-400 font-mono text-[10px]">sha256=d7a8fbb92384a1e2...</span>
                </div>
              </div>

              {/* Pretty JSON View */}
              <div className="overflow-auto max-h-[260px] rounded-xl bg-zinc-900/50 p-4 border border-border/30 font-mono text-xs text-emerald-300">
                <pre>{JSON.stringify(currentLog.payload, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <Terminal className="w-10 h-10 opacity-30 mb-2" />
              <p className="text-xs">No active webhook payload to display</p>
            </div>
          )}

          <div className="pt-3 mt-3 border-t border-border/20 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Webhook Security: HMAC SHA256 Verified</span>
            <span>Retry Strategy: 3x Exponential Backoff</span>
          </div>
        </div>
      </div>
    </div>
  );
}
