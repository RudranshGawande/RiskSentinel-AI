import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertOctagon, HelpCircle,
  ArrowUpRight, ArrowDownRight, Zap, ShieldAlert, CreditCard, Lock,
  Users, Search, AlertTriangle
} from 'lucide-react';
import { humanizeFeature, explainImpact } from '../../lib/constants';
import ThreatReportCard from './ThreatReportCard';
import FraudRingRadar from '../dashboard/FraudRingRadar';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TVDhd488H3P2Sb";

export default function RiskResultCard({ result, transactionPayload }) {
  const [paymentStatus, setPaymentStatus] = useState(null);

  if (!result) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full min-h-[400px]">
        <HelpCircle className="w-12 h-12 opacity-25 mb-4 text-primary animate-pulse" />
        <h3 className="font-semibold text-foreground/75">Awaiting Assessment</h3>
        <p className="text-xs mt-2 max-w-[260px] leading-relaxed">
          Submit transaction attributes on the left to trigger the dual-model scoring engine.
        </p>
      </div>
    );
  }

  const {
    risk_score,
    xgboost_score,
    anomaly_score,
    risk_category,
    risk_level = result.risk_category || "LOW_RISK",
    recommendation = result.action_taken || "AUTO_APPROVE",
    action_taken,
    requires_step_up_3ds = (result.risk_category === "MEDIUM_RISK" || result.risk_level === "MEDIUM_RISK"),
    explanation,
    shap_explanations,
    threat_report,
    razorpay_order_id,
    execution_time_ms,
    risk_network_data
  } = result;

  const currentRiskLevel = risk_level || risk_category || "LOW_RISK";
  const scorePct = Math.round(risk_score * 100);

  const categoryStyles = {
    LOW_RISK: {
      border: "border-emerald-500/20 bg-emerald-500/5",
      text: "text-emerald-400",
      bg: "bg-emerald-500",
      shadow: "shadow-emerald-500/10",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      badgeLabel: "LOW RISK (Approved)",
      gaugeColor: "#10b981", // Emerald-500
      icon: CheckCircle2
    },
    MEDIUM_RISK: {
      border: "border-amber-500/20 bg-amber-500/5",
      text: "text-amber-400",
      bg: "bg-amber-500",
      shadow: "shadow-amber-500/10",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      badgeLabel: "STEP-UP AUTH REQUIRED (Medium Risk)",
      gaugeColor: "#f59e0b", // Amber-500
      icon: ShieldAlert
    },
    HIGH_RISK: {
      border: "border-rose-500/20 bg-rose-500/5",
      text: "text-rose-400",
      bg: "bg-rose-500",
      shadow: "shadow-rose-500/10",
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/20",
      badgeLabel: "HIGH RISK (Blocked)",
      gaugeColor: "#f43f5e", // Rose-500
      icon: AlertOctagon
    }
  };

  const style = categoryStyles[currentRiskLevel] || categoryStyles.LOW_RISK;
  const CategoryIcon = style.icon;

  const sortedShap = Object.entries(shap_explanations || {})
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 6);

  const triggerRazorpayCheckout = (isStepUp = false) => {
    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Please verify your index.html or internet connection.");
      return;
    }

    const orderAmount = transactionPayload?.amount || 0;
    const isMedium = currentRiskLevel === "MEDIUM_RISK" || isStepUp || requires_step_up_3ds;

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: Math.round(orderAmount * 100), // convert to paise
      currency: "INR",
      name: "RiskSentinel AI Portal",
      description: isMedium
        ? "3-D Secure OTP verification is required to complete this high-value/medium-risk transaction."
        : "Standard Transaction Assessment Checkout",
      order_id: razorpay_order_id || undefined,
      handler: function (response) {
        setPaymentStatus({
          success: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id || razorpay_order_id,
          isStepUp: isMedium
        });
      },
      prefill: {
        name: "RiskSentinel Verified Buyer",
        email: "buyer@risksentinel.ai",
        contact: "9999999999"
      },
      notes: {
        transaction_id: result.transaction_id,
        risk_score: String(risk_score),
        risk_level: currentRiskLevel,
        requires_step_up_3ds: isMedium ? "true" : "false",
        recommendation: recommendation,
        auth_challenge_notice: isMedium
          ? "3-D Secure OTP verification is required to complete the high-value/medium-risk transaction."
          : "Standard auto-approved flow"
      },
      theme: {
        color: isMedium ? "#F59E0B" : "#3B82F6" // Amber for 3DS Step-Up, Blue for Standard
      },
      modal: {
        confirm_close: true,
        ondismiss: function () {
          console.log("Razorpay payment modal closed by user.");
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-2xl border ${style.border} ${style.shadow} shadow-lg relative overflow-hidden transition-all duration-300`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.badge}`}>
              {style.badgeLabel}
            </span>
            <h2 className="text-xl font-bold flex items-center gap-2 mt-2">
              <CategoryIcon className={`w-5.5 h-5.5 ${style.text}`} />
              {(action_taken === "AUTO_APPROVE" || recommendation === "AUTO_APPROVE") && "Approved"}
              {(action_taken === "REQUIRE_STEP_UP_AUTH" || recommendation === "STEP_UP_AUTH" || currentRiskLevel === "MEDIUM_RISK") && "Step-Up Auth Required"}
              {(action_taken === "BLOCK_AND_REVIEW" || recommendation === "BLOCK" || currentRiskLevel === "HIGH_RISK") && "Transaction Blocked"}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
              {explanation}
            </p>
          </div>

          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center z-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-zinc-800"
                strokeWidth="7"
                fill="transparent"
              />
              <motion.circle
                cx="56"
                cy="56"
                r="46"
                stroke={style.gaugeColor}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 46}
                initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 46 * (1 - risk_score) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono leading-none">{scorePct}%</span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Risk</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 mt-5 pt-4 text-[11px] text-muted-foreground">
          <span>Engine Response: <strong>{execution_time_ms}ms</strong></span>
          <span>ID: <strong className="font-mono">{result.transaction_id}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-secondary/15 border border-border/60 rounded-xl space-y-1">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Pattern Engine (XGBoost)
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-lg font-bold font-mono">{(xgboost_score * 100).toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">Fraud Pattern</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full ${xgboost_score >= 0.75 ? 'bg-rose-500' : xgboost_score >= 0.30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${xgboost_score * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-secondary/15 border border-border/60 rounded-xl space-y-1">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Anomaly Engine (iForest)
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-lg font-bold font-mono">{(anomaly_score * 100).toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">Behavior Shift</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full ${anomaly_score >= 0.75 ? 'bg-rose-500' : anomaly_score >= 0.30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${anomaly_score * 100}%` }}
            />
          </div>
        </div>
      </div>

      {currentRiskLevel === "LOW_RISK" && (
        <div className="p-5 bg-card border border-border rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-foreground/90">Frictionless Checkout Approved</h4>
              <p className="text-xs text-muted-foreground">
                This transaction has been verified safe by RiskSentinel AI. Proceed with instant payment capture.
              </p>
            </div>
          </div>

          {razorpay_order_id ? (
            <div className="space-y-3">
              <div className="bg-background border border-border px-3 py-2 rounded-lg flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Razorpay Order ID:</span>
                <span className="font-mono font-bold text-foreground">{razorpay_order_id}</span>
              </div>

              {!paymentStatus ? (
                <button
                  type="button"
                  onClick={() => triggerRazorpayCheckout(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/15 transition-all text-sm active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  Proceed to Pay (₹{transactionPayload?.amount || 0})
                </button>
              ) : (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg space-y-2">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Payment Confirmed (Test Mode)
                  </div>
                  <div className="text-[10px] space-y-0.5 leading-none">
                    <div>Payment ID: <span className="font-mono font-semibold text-foreground">{paymentStatus.paymentId}</span></div>
                    <div className="mt-1">Order ID: <span className="font-mono font-semibold text-foreground">{paymentStatus.orderId}</span></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-secondary/20 border border-border/80 rounded-lg text-xs text-muted-foreground leading-normal">
              Razorpay Order ID was not generated because credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are not set in the backend environment.
            </div>
          )}
        </div>
      )}

      {currentRiskLevel === "MEDIUM_RISK" && (
        <div className="p-5 bg-card border border-amber-500/30 rounded-xl space-y-4 bg-gradient-to-b from-amber-500/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/15 rounded-lg shrink-0 text-amber-400">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-400">Smart 3DS Step-Up Authentication Required</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Adaptive
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This transaction fell into the Medium Risk category (30-75%), so instead of blocking the buyer, RiskSentinel triggered Step-Up Authentication (3DS OTP challenge) to protect merchant revenue while verifying card ownership.
              </p>
            </div>
          </div>

          {razorpay_order_id ? (
            <div className="space-y-3">
              <div className="bg-background border border-amber-500/20 px-3 py-2 rounded-lg flex items-center justify-between text-xs">
                <span className="text-muted-foreground">3DS Order ID:</span>
                <span className="font-mono font-bold text-amber-300">{razorpay_order_id}</span>
              </div>

              {!paymentStatus ? (
                <button
                  type="button"
                  onClick={() => triggerRazorpayCheckout(true)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all text-sm active:scale-[0.98]"
                >
                  <ShieldAlert className="w-4 h-4 text-zinc-950" />
                  Launch 3DS Verification Checkout
                </button>
              ) : (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg space-y-2">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    3DS Step-Up Verification Passed & Payment Captured!
                  </div>
                  <div className="text-[10px] space-y-0.5 leading-none">
                    <div>Payment ID: <span className="font-mono font-semibold text-foreground">{paymentStatus.paymentId}</span></div>
                    <div className="mt-1">Order ID: <span className="font-mono font-semibold text-foreground">{paymentStatus.orderId}</span></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-secondary/20 border border-border/80 rounded-lg text-xs text-muted-foreground leading-normal">
              Razorpay Order ID was not generated because credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are not set in the backend environment.
            </div>
          )}

          <div className="border-t border-amber-500/20 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Authentication Challenge: <strong>3-D Secure OTP</strong></span>
            <span>Policy: <strong>Zero Merchant Loss</strong></span>
          </div>
        </div>
      )}

      {sortedShap.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground/90">Influential Risk Drivers</h4>
          </div>
          <div className="space-y-3">
            {sortedShap.map(([feature, impact]) => {
              const isRisk = impact > 0;
              const strength = explainImpact(impact);
              const pct = Math.abs(impact * 100);
              const barWidth = Math.min(pct * 3, 100);

              return (
                <div key={feature} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-medium text-foreground/80">{humanizeFeature(feature)}</span>
                    <span className={`font-mono font-semibold flex items-center gap-0.5 ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isRisk ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isRisk ? '+' : '-'}{pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground leading-none">
                    <span>{isRisk ? `${strength} Fraud Risk Signal` : `Lowers Fraud Risk Score`}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {threat_report && (
        <ThreatReportCard
          report={threat_report}
          riskScore={risk_score}
          riskCategory={currentRiskLevel}
          transactionId={result.transaction_id}
        />
      )}

      {risk_network_data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <FraudRingRadar networkData={risk_network_data} />
        </motion.div>
      )}
    </div>
  );
}
