import { useState } from 'react';
import axios from 'axios';
import TransactionForm from '../components/transaction/TransactionForm';
import RiskResultCard from '../components/transaction/RiskResultCard';
import { API_URL } from '../lib/constants';
import { ShieldCheck } from 'lucide-react';

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
      const res = await axios.post(`${API_URL}/api/assess-risk`, formData);
      setResult(res.data);
    } catch (err) {
      console.error("Assessment request failed", err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        "Network error: Failed to connect to the risk assessment backend."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5.5 h-5.5 text-primary animate-pulse" />
          Transaction Risk Evaluator
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Perform a manual, real-time transaction test. This simulates an API assessment trigger.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <TransactionForm onSubmit={handleAssessRisk} loading={loading} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs leading-relaxed mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          <RiskResultCard result={result} transactionPayload={payload} />
        </div>
      </div>
    </div>
  );
}
