import { motion } from 'framer-motion';
import { Zap, ArrowUpRight, ArrowDownRight, Layers, HelpCircle } from 'lucide-react';
import { humanizeFeature, explainImpact } from '../../lib/constants';

export default function InfluentialRiskDriversCard({ shapExplanations }) {
  const sortedShap = Object.entries(shapExplanations || {})
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">Influential Risk Drivers</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
                  SHAP ML
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top feature attributions influencing the XGBoost decision
              </p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {sortedShap.length} Factors
          </span>
        </div>

        {/* Factors List */}
        <div className="mt-5 space-y-4">
          {sortedShap.length > 0 ? (
            sortedShap.map(([feature, impact], idx) => {
              const isRisk = impact > 0;
              const strength = explainImpact(impact);
              const pct = Math.abs(impact * 100);
              const barWidth = Math.min(pct * 2.5, 100);

              return (
                <div
                  key={feature}
                  className="p-3.5 rounded-xl bg-secondary/20 border border-border/40 hover:border-border/80 transition-all space-y-2"
                >
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground/90">
                        {humanizeFeature(feature)}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                        isRisk
                          ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                          : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      }`}
                    >
                      {isRisk ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isRisk ? '+' : '-'}{pct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>{isRisk ? `${strength} Fraud Risk Signal` : `Legitimate Factor (Lowers Risk)`}</span>
                    <span className="font-mono text-[10px]">Impact: {impact > 0 ? `+${impact.toFixed(3)}` : impact.toFixed(3)}</span>
                  </div>

                  {/* Visual Impact Bar */}
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${isRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Layers className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs">No significant SHAP feature shifts detected for this baseline transaction.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Reduces Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Increases Risk
        </span>
        <span>TreeExplainer Kernel</span>
      </div>
    </motion.div>
  );
}
