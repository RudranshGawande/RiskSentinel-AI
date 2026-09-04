import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/transaction/TransactionForm';
import RiskResultCard from '../components/transaction/RiskResultCard';
import InfluentialRiskDriversCard from '../components/transaction/InfluentialRiskDriversCard';
import SecurityDossierCard from '../components/transaction/SecurityDossierCard';
import BehavioralAnalysisCard from '../components/transaction/BehavioralAnalysisCard';
import FraudRingRadar from '../components/dashboard/FraudRingRadar';
import { API_URL } from '../lib/constants';
import { ShieldCheck, Activity, Layers, Sparkles } from 'lucide-react';

export default function TransactionEval() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  const handleAssessRisk = async (formData) => {
    setLoading(true);
    setError(null);
    setPayload(formData);

    try {
      const endpoint = `${API_URL}/api/assess-risk`;
      console.log(`[TransactionEval] Submitting assessment to ${endpoint}`, formData);
      const res = await axios.post(endpoint, formData, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
      console.log("[TransactionEval] Assessment response received:", res.data);
      setResult(res.data);
    } catch (err) {
      console.error("[TransactionEval] Assessment request failed:", err);
      if (err.response) {
        console.error("[TransactionEval] Status:", err.response.status);
        console.error("[TransactionEval] Data:", err.response.data);
      }

      let errorMessage = "Network error: Failed to connect to the risk assessment backend.";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Format Pydantic 422 validation errors
          errorMessage = "Validation error: " + data.detail.map(d => `${d.loc ? d.loc.slice(1).join('.') : 'field'}: ${d.msg}`).join(', ');
        } else if (data.message) {
          errorMessage = data.message + (data.detail ? ` (${JSON.stringify(data.detail)})` : '');
        } else {
          errorMessage = JSON.stringify(data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-8 pb-12">
      {/* Header Banner */}
      <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-primary animate-pulse" />
            Transaction Risk Evaluator
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Perform manual, real-time transaction grading with dual ML scoring, smart adaptive 3DS, and intelligence matrices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            Dual ML v2.0 Active
          </span>
        </div>
      </div>

      {/* Top Section: Form on Left, Primary Verdict & Pay Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Transaction Attributes + Assess Risk Button */}
        <div className="lg:col-span-7">
          <TransactionForm onSubmit={handleAssessRisk} loading={loading} />
        </div>

        {/* Right Panel: Primary Assessment & Frictionless Pay to Payment Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs leading-relaxed mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          <RiskResultCard result={result} transactionPayload={payload} />
        </div>
      </div>

      {/* 2x2 Intelligence & Analytics Grid (Underneath the Form & Verdict) */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4 pt-4 border-t border-border/60"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary border border-primary/30 shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Risk Intelligence & Threat Attribution Matrix
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Deep multi-dimensional analysis of statistical drivers, syndicate links, behavioral anomalies, and intelligence findings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-zinc-400 px-3 py-1 bg-secondary/50 border border-border/50 rounded-lg">
                  ID: {result.transaction_id}
                </span>
              </div>
            </div>

            {/* 2x2 Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Card 1: Influential Risk Drivers (SHAP Feature Attributions) */}
              <InfluentialRiskDriversCard
                shapExplanations={result.shap_explanations}
              />

              {/* Card 2: Security Intelligence Dossier */}
              <SecurityDossierCard
                report={result.threat_report}
                riskScore={result.risk_score}
                riskCategory={result.risk_category}
                transactionId={result.transaction_id}
              />

              {/* Card 3: Behavioral Anomaly Analysis */}
              <BehavioralAnalysisCard
                result={result}
                transactionPayload={payload}
              />

              {/* Card 4: Fraud Ring Network Radar */}
              <FraudRingRadar
                networkData={result.risk_network_data}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
