import { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Shield, AlertTriangle, 
  CheckCircle2, FileText, Sparkles, Activity, Clock, BadgeCheck,
  CreditCard, MapPin, UserCheck, Lock, ChevronRight, Layers, LayoutGrid
} from 'lucide-react';

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-foreground">
          {inner}
        </strong>
      );
    }
    return part;
  });
}

function parseReportSections(rawText) {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const sections = [];
  let currentSection = { title: 'Executive Summary', icon: 'summary', lines: [] };

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      const rawTitle = trimmed.replace(/^#{2,3}\s+/, '').trim();
      let icon = 'info';
      
      const lower = rawTitle.toLowerCase();
      if (lower.includes('summary') || lower.includes('overview') || lower.includes('risk summary')) icon = 'summary';
      else if (lower.includes('indicator') || lower.includes('driver') || lower.includes('key')) icon = 'indicator';
      else if (lower.includes('anomaly') || lower.includes('behavior')) icon = 'anomaly';
      else if (lower.includes('history') || lower.includes('historical') || lower.includes('context')) icon = 'history';
      else if (lower.includes('action') || lower.includes('recommend')) icon = 'action';
      else if (lower.includes('confidence')) icon = 'confidence';

      currentSection = { title: rawTitle, icon, lines: [] };
    } else {
      currentSection.lines.push(trimmed);
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

export default function ThreatReportCard({ 
  report, 
  riskScore = null, 
  riskCategory = null, 
  transactionId = null,
  txData = null 
}) {
  const [activeTab, setActiveTab] = useState('all');
  const sections = useMemo(() => parseReportSections(report), [report]);

  const tier = (riskCategory || (riskScore >= 0.75 ? 'HIGH_RISK' : riskScore >= 0.30 ? 'MEDIUM_RISK' : 'LOW_RISK')).toUpperCase();
  const isHigh = tier === 'HIGH_RISK' || tier.includes('BLOCK');
  const isMed = tier === 'MEDIUM_RISK' || tier.includes('STEP');
  const isLow = tier === 'LOW_RISK' || tier.includes('APPROV');

  const tierStyles = {
    LOW_RISK: {
      border: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accentText: 'text-emerald-400',
      badgeLabel: 'APPROVED (LOW RISK)',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />
    },
    MEDIUM_RISK: {
      border: 'border-amber-500/30',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      accentText: 'text-amber-400',
      badgeLabel: 'STEP-UP AUTH (SMART 3DS)',
      icon: <Shield className="w-4 h-4 text-amber-400" />
    },
    HIGH_RISK: {
      border: 'border-rose-500/30',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      accentText: 'text-rose-400',
      badgeLabel: 'BLOCKED (HIGH RISK)',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />
    }
  };

  const currentStyle = tierStyles[isHigh ? 'HIGH_RISK' : isMed ? 'MEDIUM_RISK' : 'LOW_RISK'];

  const summarySec = sections.find(s => s.icon === 'summary') || sections[0];
  const indicatorsSec = sections.find(s => s.icon === 'indicator');
  const anomalySec = sections.find(s => s.icon === 'anomaly');
  const historySec = sections.find(s => s.icon === 'history');
  const actionSec = sections.find(s => s.icon === 'action');
  const confidenceSec = sections.find(s => s.icon === 'confidence');

  return (
    <div className={`bg-[#111318] border ${currentStyle.border} rounded-2xl overflow-hidden shadow-2xl space-y-0 transition-all duration-300`}>
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border-b border-gray-800/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Security Intelligence Dossier
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${currentStyle.badgeBg}`}>
                {currentStyle.badgeLabel}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {transactionId ? `Assessment #${transactionId}` : "Autonomous Security Assessment"} &middot; RiskSentinel AI Investigator
            </p>
          </div>
        </div>

        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'all' 
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Full Dossier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signals')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'signals' 
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Security Signals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reasoning')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'reasoning' 
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            AI Reasoning
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {(activeTab === 'all' || activeTab === 'reasoning') && summarySec && (
          <div className="p-4 bg-zinc-900/70 border border-zinc-800/90 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-400">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Executive Risk Summary</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Live Assessment</span>
            </div>
            <div className="text-xs leading-relaxed text-zinc-200 space-y-1.5 pt-1">
              {summarySec.lines.map((line, lIdx) => (
                <p key={lIdx} className="leading-relaxed">
                  {renderFormattedText(line.replace(/^[-*]\s+/, ''))}
                </p>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'signals') && indicatorsSec && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                Evaluated Risk Drivers & Signals
              </span>
              <span className="text-[10px] text-muted-foreground">
                {indicatorsSec.lines.length} factors analyzed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {indicatorsSec.lines.map((line, lIdx) => {
                const isBullet = line.startsWith('- ') || line.startsWith('* ');
                const cleanLine = line.replace(/^[-*]\s+/, '');
                const isNegative = cleanLine.toLowerCase().includes('failed') || 
                                   cleanLine.toLowerCase().includes('mismatch') ||
                                   cleanLine.toLowerCase().includes('increased') ||
                                   cleanLine.toLowerCase().includes('not authenticated') ||
                                   cleanLine.toLowerCase().includes('newly created');

                return (
                  <div 
                    key={lIdx}
                    className={`p-3 rounded-xl border transition-all text-xs leading-relaxed flex items-start gap-2.5 ${
                      isNegative 
                        ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-zinc-200' 
                        : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-zinc-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isNegative ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {renderFormattedText(cleanLine)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'reasoning') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {anomalySec && (
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Behavioral Analysis</span>
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed space-y-1">
                  {anomalySec.lines.map((l, idx) => (
                    <p key={idx}>{renderFormattedText(l.replace(/^[-*]\s+/, ''))}</p>
                  ))}
                </div>
              </div>
            )}

            {historySec && (
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Historical Record</span>
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed space-y-1">
                  {historySec.lines.map((l, idx) => (
                    <p key={idx}>{renderFormattedText(l.replace(/^[-*]\s+/, ''))}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'reasoning') && actionSec && (
          <div className={`p-4 rounded-xl border space-y-2 ${
            isHigh 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
              : isMed 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground">
                {currentStyle.icon}
                <span>Enforcement Recommendation</span>
              </div>
              {confidenceSec && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700 text-zinc-300">
                  {confidenceSec.lines.join(' ').replace(/.*:\s*/, '') || "High Confidence"}
                </span>
              )}
            </div>
            <div className="text-xs leading-relaxed pl-6 text-zinc-200">
              {actionSec.lines.map((line, lIdx) => (
                <p key={lIdx} className="mb-1 last:mb-0">
                  {renderFormattedText(line.replace(/^[-*]\s+/, ''))}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
