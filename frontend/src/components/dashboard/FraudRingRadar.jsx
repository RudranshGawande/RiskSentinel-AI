import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Network, Users, AlertTriangle, ShieldCheck,
  Globe, CreditCard, Smartphone, MapPin, CheckCircle2,
  Activity, Share2, Layers, ShieldAlert, Zap, Info, Eye
} from 'lucide-react';

export default function FraudRingRadar({ networkData }) {
  const nodes = networkData?.nodes || [];
  const links = networkData?.links || [];
  const clusters = networkData?.clusters || [];

  // Default to current transaction or first node
  const [selectedNodeId, setSelectedNodeId] = useState(
    nodes.find((n) => n.is_current)?.id || nodes[0]?.id || 'current_tx'
  );
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'TRANSACTION' | 'IDENTITY'

  // If selectedNodeId not found, fallback
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;
  }, [nodes, selectedNodeId]);

  const stats = useMemo(() => {
    const total = nodes.length;
    const blocked = nodes.filter(
      (n) => n.risk_category === 'HIGH_RISK' || n.risk_score >= 0.75 || n.action === 'BLOCK'
    ).length;
    const medium = nodes.filter(
      (n) => (n.risk_category === 'MEDIUM_RISK' || n.risk_score >= 0.3) && n.risk_score < 0.75
    ).length;
    const clean = total - blocked - medium;
    return { total: total || 1, blocked, medium, clean };
  }, [nodes]);

  // Node position mapper in a 300x300 radar coordinate system
  const nodePositions = useMemo(() => {
    const positions = {};
    const center = { x: 150, y: 150 };

    // Find current node
    const currentNode = nodes.find((n) => n.is_current) || nodes[0];
    if (currentNode) {
      positions[currentNode.id] = { x: center.x, y: center.y, radius: 0, angle: 0 };
    }

    const otherNodes = nodes.filter((n) => n.id !== currentNode?.id);
    const count = otherNodes.length;

    otherNodes.forEach((node, idx) => {
      // Spread nodes evenly around orbit rings
      const angle = (idx / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
      // Distance based on risk or index
      const distance = 55 + ((idx % 3) + 1) * 26;
      const x = center.x + distance * Math.cos(angle);
      const y = center.y + distance * Math.sin(angle);
      positions[node.id] = { x, y, radius: distance, angle };
    });

    return positions;
  }, [nodes]);

  const getNodeColor = (node) => {
    if (node?.is_current) return { stroke: '#3b82f6', fill: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.5)', text: 'text-blue-400' };
    if (node?.risk_category === 'HIGH_RISK' || (node?.risk_score || 0) >= 0.75) {
      return { stroke: '#f43f5e', fill: '#be123c', glow: 'rgba(244, 63, 94, 0.5)', text: 'text-rose-400' };
    }
    if (node?.risk_category === 'MEDIUM_RISK' || (node?.risk_score || 0) >= 0.3) {
      return { stroke: '#f59e0b', fill: '#b45309', glow: 'rgba(245, 158, 11, 0.5)', text: 'text-amber-400' };
    }
    return { stroke: '#10b981', fill: '#047857', glow: 'rgba(16, 185, 129, 0.5)', text: 'text-emerald-400' };
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'ip_address':
        return <Globe className="w-3.5 h-3.5" />;
      case 'card_bin':
        return <CreditCard className="w-3.5 h-3.5" />;
      case 'device_fingerprint':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'shipping_address':
        return <MapPin className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="bg-card border border-border/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">Fraud Ring Network Radar</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Graph Topology
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Velocity link analysis & connected syndicate correlation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground bg-secondary/60 border border-border/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              <span>{stats.total} Nodes</span>
            </span>
          </div>
        </div>

        {/* Main Radar + Inspector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5 items-center">
          {/* Radar Constellation Screen */}
          <div className="md:col-span-7 bg-zinc-950 border border-border/50 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden aspect-square max-h-[300px] w-full">
            {/* SVG Interactive Radar Canvas */}
            <svg viewBox="0 0 300 300" className="w-full h-full max-w-[280px] max-h-[280px]">
              <defs>
                {/* Radar Sweep Gradient */}
                <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>

                {/* Node Glow Filters */}
                <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-rose" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Concentric Polar Range Circles */}
              <circle cx="150" cy="150" r="35" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx="150" cy="150" r="70" fill="none" stroke="#27272a" strokeWidth="1" />
              <circle cx="150" cy="150" r="105" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="150" cy="150" r="135" fill="none" stroke="#3f3f46" strokeWidth="1.2" />

              {/* Crosshair Lines */}
              <line x1="15" y1="150" x2="285" y2="150" stroke="#27272a" strokeWidth="1" />
              <line x1="150" y1="15" x2="150" y2="285" stroke="#27272a" strokeWidth="1" />

              {/* Distance Labels */}
              <text x="153" y="48" fill="#71717a" fontSize="8" fontFamily="monospace">75%</text>
              <text x="153" y="83" fill="#71717a" fontSize="8" fontFamily="monospace">50%</text>
              <text x="153" y="118" fill="#71717a" fontSize="8" fontFamily="monospace">25%</text>

              {/* Rotating Sweep Beam */}
              <g className="origin-center" style={{ transformOrigin: '150px 150px' }}>
                <circle
                  cx="150"
                  cy="150"
                  r="135"
                  fill="url(#radarSweep)"
                  className="animate-spin"
                  style={{ animationDuration: '6s', transformOrigin: '150px 150px' }}
                />
              </g>

              {/* Connection Vector Links */}
              {nodes.map((node) => {
                if (node.is_current) return null;
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const color = getNodeColor(node);

                return (
                  <line
                    key={`link-${node.id}`}
                    x1="150"
                    y1="150"
                    x2={pos.x}
                    y2={pos.y}
                    stroke={color.stroke}
                    strokeWidth="1.5"
                    strokeDasharray={node.risk_score >= 0.7 ? "none" : "3,3"}
                    strokeOpacity="0.6"
                  />
                );
              })}

              {/* Pulsing Central Ripple Ring */}
              <circle cx="150" cy="150" r="18" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5" className="animate-ping" style={{ transformOrigin: '150px 150px', animationDuration: '3s' }} />

              {/* Render Nodes as Interactive Circles */}
              {nodes.map((node) => {
                const pos = nodePositions[node.id] || { x: 150, y: 150 };
                const isSelected = selectedNode?.id === node.id;
                const color = getNodeColor(node);
                const isCenter = node.is_current;
                const radius = isCenter ? 14 : 11;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  >
                    {/* Active Selection Glow Ring */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={radius + 6}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth="2"
                        strokeOpacity="0.8"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Core */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius}
                      fill={color.fill}
                      stroke={isSelected ? '#ffffff' : color.stroke}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      filter={node.risk_score >= 0.7 ? "url(#glow-rose)" : "url(#glow-blue)"}
                    />

                    {/* Node Label Chip */}
                    <text
                      x={pos.x}
                      y={pos.y + radius + 10}
                      textAnchor="middle"
                      fill="#e4e4e7"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isCenter ? "CURRENT" : (node.label || node.id).substring(0, 10)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Radar Bottom Legend */}
            <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground pt-1 px-2 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Current Tx
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Clean
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Blocked
              </span>
            </div>
          </div>

          {/* Right Entity Inspector Panel */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3">
            <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>Entity Inspector</span>
                </div>
                {selectedNode?.is_current && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                    Focused Node
                  </span>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-2.5 text-xs">
                  {/* Node ID */}
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-border/40 font-mono">
                    <div className="text-[10px] text-muted-foreground uppercase font-sans">Identifier</div>
                    <div className="font-bold text-foreground truncate mt-0.5">
                      {selectedNode.id}
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-zinc-950/80 border border-border/40">
                      <div className="text-[9px] text-muted-foreground uppercase font-sans">Node Type</div>
                      <div className="font-semibold text-foreground capitalize mt-0.5 flex items-center gap-1">
                        {getNodeIcon(selectedNode.type)}
                        <span>{selectedNode.type?.replace('_', ' ') || 'Transaction'}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-950/80 border border-border/40">
                      <div className="text-[9px] text-muted-foreground uppercase font-sans">Risk Grade</div>
                      <div
                        className={`font-bold mt-0.5 ${
                          (selectedNode.risk_score || 0) >= 0.75
                            ? 'text-rose-400'
                            : (selectedNode.risk_score || 0) >= 0.3
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {selectedNode.risk_category || `${((selectedNode.risk_score || 0) * 100).toFixed(0)}% Score`}
                      </div>
                    </div>
                  </div>

                  {selectedNode.amount !== undefined && selectedNode.amount > 0 && (
                    <div className="p-2 rounded-lg bg-zinc-950/80 border border-border/40 flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">Order Value</span>
                      <span className="font-mono font-bold text-foreground">
                        ₹{Number(selectedNode.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  Click any node on the radar to inspect entity links.
                </div>
              )}
            </div>

            {/* Syndicate Cluster Indicator */}
            {clusters.length > 0 ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Syndicate Ring Alert</div>
                  <div className="text-[10px] text-rose-200/80 mt-0.5">
                    {clusters.length} shared device/IP identity ring(s) detected across recent checkout attempts.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <strong>Isolated Context</strong> &middot; No velocity attack links detected.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Window: 24h Velocity Correlation</span>
        <span>Entity Links: {nodes.length > 1 ? `${nodes.length - 1} Associated` : 'None'}</span>
      </div>
    </motion.div>
  );
}
