import { useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldCheck, Lock, Search, Info,
  Link2, Zap, Users, Eye, EyeOff, Maximize2
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

const GROUP_COLORS = {
  central: { node: '#6366f1', border: '#818cf8', glow: 'rgba(99, 102, 241, 0.6)', label: 'Current Transaction' },
  blocked: { node: '#f43f5e', border: '#fb7185', glow: 'rgba(244, 63, 94, 0.5)', label: 'Blocked' },
  step_up: { node: '#f59e0b', border: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)', label: 'Step-Up Auth' },
  approved: { node: '#10b981', border: '#34d399', glow: 'rgba(16, 185, 129, 0.5)', label: 'Approved' },
};

const ATTRIBUTE_COLORS = {
  ip_address: '#6366f1',
  card_bin: '#10b981',
  device_fingerprint: '#f59e0b',
  shipping_address: '#ec4899',
};

const ATTRIBUTE_LABELS = {
  ip_address: 'IP Address',
  card_bin: 'Card BIN',
  device_fingerprint: 'Device Fingerprint',
  shipping_address: 'Shipping Address',
};

const ATTRIBUTE_ICONS = {
  ip_address: '🌐',
  card_bin: '💳',
  device_fingerprint: '📱',
  shipping_address: '📦',
};

export default function FraudRingRadar({ networkData, isExpanded = false, onToggleExpand }) {
  const graphRef = useRef(null);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [showLegend, setShowLegend] = useState(true);

  if (!networkData || (!networkData.nodes?.length && !networkData.links?.length)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border border-border/60 rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
          <Search className="w-7 h-7 opacity-30" />
        </div>
        <h3 className="font-semibold text-foreground/60 mb-1">No Network Connections Detected</h3>
        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          This transaction has no shared fraud attributes (IP, Card BIN, Device, Shipping) with historical transactions in the velocity window.
        </p>
        {networkData?.metadata && (
          <div className="mt-4 p-3 bg-secondary/30 border border-border/40 rounded-lg text-left text-[10px] text-muted-foreground">
            <div className="font-medium text-foreground/75 mb-1">Velocity Window: {networkData.metadata.velocity_window_hours || 24}h</div>
            <div>Total connections checked: {networkData.metadata.total_connections || 0}</div>
          </div>
        )}
      </motion.div>
    );
  }

  const { nodes, links, clusters, metadata } = networkData;

  const centralNode = useMemo(() => nodes.find(n => n.group === 'central'), [nodes]);
  const historicalNodes = useMemo(() => nodes.filter(n => n.group !== 'central'), [nodes]);
  const blockedCount = historicalNodes.filter(n => n.group === 'blocked').length;
  const stepUpCount = historicalNodes.filter(n => n.group === 'step_up').length;
  const approvedCount = historicalNodes.filter(n => n.group === 'approved').length;

  const attributeFilter = useMemo(() => {
    if (!selectedAttribute) return null;
    const attrNodes = new Set();
    links.forEach(link => {
      if (link.attribute === selectedAttribute) {
        attrNodes.add(link.source);
        attrNodes.add(link.target);
      }
    });
    return attrNodes;
  }, [links, selectedAttribute]);

  const processedNodes = useMemo(() => {
    return nodes.map(node => {
      const groupConfig = GROUP_COLORS[node.group] || GROUP_COLORS.approved;
      const isCentral = node.group === 'central';
      const isFiltered = attributeFilter && !attributeFilter.has(node.id);
      const isHighlighted = highlightedNode === node.id;

      return {
        ...node,
        color: isFiltered ? '#3f3f46' : (isHighlighted ? groupConfig.border : groupConfig.node),
        borderColor: isFiltered ? '#27272a' : groupConfig.border,
        size: isCentral ? (isExpanded ? 30 : 25) : (isExpanded ? 16 : 12),
        opacity: isFiltered ? 0.3 : 1,
        glow: isCentral && !isFiltered ? groupConfig.glow : 'transparent',
        fontSize: isCentral ? (isExpanded ? 11 : 9) : (isExpanded ? 9 : 8),
        label: isCentral ? 'CURRENT' : node.id.slice(0, 12) + (node.id.length > 12 ? '...' : ''),
        fullLabel: node.id,
        riskScore: node.risk_score,
        riskCategory: node.risk_category,
        actionTaken: node.action_taken,
        amount: node.amount,
        timestamp: node.timestamp,
        sharedAttributes: node.shared_attributes || [],
      };
    });
  }, [nodes, highlightedNode, attributeFilter, isExpanded]);

  const processedLinks = useMemo(() => {
    return links.map(link => {
      const isFiltered = selectedAttribute && link.attribute !== selectedAttribute;
      const attrColor = ATTRIBUTE_COLORS[link.attribute] || '#71717a';

      return {
        ...link,
        source: link.source,
        target: link.target,
        color: isFiltered ? '#27272a' : attrColor,
        width: isFiltered ? 0.5 : (isExpanded ? link.width * 1.5 : link.width),
        opacity: isFiltered ? 0.15 : 0.8,
        dash: isFiltered ? [5, 5] : undefined,
        label: link.label,
        attribute: link.attribute,
        value: link.value,
        correlationStrength: link.correlation_strength,
      };
    });
  }, [links, selectedAttribute, isExpanded]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current
        .nodeAutoColorBy('group')
        .linkDirectionalParticles(links.length > 0 ? 2 : 0)
        .linkDirectionalParticleSpeed(0.005)
        .linkDirectionalParticleWidth(1.5)
        .linkDirectionalParticleColor(link => {
          const attrColor = ATTRIBUTE_COLORS[link.attribute] || '#71717a';
          return attrColor;
        })
        .onNodeHover(node => {
          setHighlightedNode(node?.id || null);
          graphRef.current?.nodeThreeObjectExtend(true);
        })
        .onLinkHover(link => {
          setHighlightedNode(link ? [link.source, link.target] : null);
        })
        .backgroundColor('#13151B')
        .zoomToFit(300, 50, 20);
    }
  }, [graphRef.current, nodes, links, isExpanded]);

  const handleNodeClick = (node) => {
    if (node.group !== 'central') {
      console.log('Navigate to transaction:', node.id);
    }
  };

  const getNodeTooltip = (node) => {
    if (!node) return null;
    const groupConfig = GROUP_COLORS[node.group] || GROUP_COLORS.approved;
    const isCentral = node.group === 'central';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 rounded-xl border shadow-xl min-w-[220px] ${isCentral ? 'border-primary/30 bg-primary/5' : `border-${node.group === 'blocked' ? 'rose' : node.group === 'step_up' ? 'amber' : 'emerald'}-500/30`}`}
        style={{ backgroundColor: '#13151B' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${isCentral ? 'animate-pulse' : ''}`} style={{ backgroundColor: groupConfig.node }} />
          <span className="font-bold text-xs text-foreground">{isCentral ? 'CURRENT TRANSACTION' : node.fullLabel}</span>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Risk Score</span>
            <span className="font-mono font-semibold" style={{ color: node.riskScore > 0.75 ? '#f43f5e' : node.riskScore > 0.3 ? '#f59e0b' : '#10b981' }}>
              {(node.riskScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-semibold text-foreground">{node.riskCategory?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Action</span>
            <span className="font-semibold text-foreground">{node.actionTaken?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-mono font-semibold text-foreground">₹{Number(node.amount || 0).toLocaleString('en-IN')}</span>
          </div>
          {node.sharedAttributes && node.sharedAttributes.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <div className="text-muted-foreground mb-1">Shared Attributes:</div>
              <div className="flex flex-wrap gap-1">
                {node.sharedAttributes.map(([attr, val]) => (
                  <span
                    key={attr}
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium border"
                    style={{
                      backgroundColor: `${ATTRIBUTE_COLORS[attr] || '#71717a'}20`,
                      borderColor: `${ATTRIBUTE_COLORS[attr] || '#71717a'}60`,
                      color: ATTRIBUTE_COLORS[attr] || '#a1a1aa'
                    }}
                  >
                    {ATTRIBUTE_ICONS[attr] || ''} {ATTRIBUTE_LABELS[attr] || attr}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const getLinkTooltip = (link) => {
    if (!link) return null;
    const attrColor = ATTRIBUTE_COLORS[link.attribute] || '#71717a';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-3 rounded-xl border shadow-xl min-w-[200px]"
        style={{ backgroundColor: '#13151B', borderColor: `${attrColor}60` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: attrColor }}>{ATTRIBUTE_ICONS[link.attribute] || '🔗'}</span>
          <span className="font-bold text-xs text-foreground">{ATTRIBUTE_LABELS[link.attribute] || link.attribute}</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shared Value</span>
            <span className="font-mono font-semibold text-foreground">{link.value || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Correlation Strength</span>
            <span className="font-semibold" style={{ color: attrColor }}>
              {link.correlationStrength} shared attribute{link.correlationStrength > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Link Weight</span>
            <span className="font-mono font-semibold text-foreground">{link.width}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col h-full"
      style={{ minHeight: isExpanded ? '600px' : '400px' }}
    >
      <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Fraud Ring Radar (Network Analysis)</h3>
            <p className="text-[10px] text-muted-foreground">
              {metadata?.total_connections || historicalNodes.length} connection{historicalNodes.length !== 1 ? 's' : ''} detected in {metadata?.velocity_window_hours || 24}h window
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AnimatePresence mode="wait">
            {showLegend && (
              <motion.div
                key="legend"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/40"
              >
                {Object.entries(GROUP_COLORS).map(([key, config]) => {
                  const count = key === 'central' ? 1 :
                    key === 'blocked' ? blockedCount :
                    key === 'step_up' ? stepUpCount : approvedCount;
                  if (count === 0 && key !== 'central') return null;
                  return (
                    <span
                      key={key}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${config.node}20`,
                        borderColor: `${config.border}40`,
                        color: config.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.node }} />
                      {config.label} ({count})
                    </span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1">
            {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => {
              const count = links.filter(l => l.attribute === key).length;
              if (count === 0) return null;
              const isActive = selectedAttribute === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedAttribute(isActive ? null : key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                  style={{ borderColor: isActive ? attrColor + '60' : undefined }}
                  title={`Filter by ${label} (${count} links)`}
                >
                  <span style={{ color: ATTRIBUTE_COLORS[key] }}>{ATTRIBUTE_ICONS[key]}</span>
                  <span>{label.slice(0, 3)}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: isActive ? 'transparent' : `${ATTRIBUTE_COLORS[key]}30`,
                      color: isActive ? ATTRIBUTE_COLORS[key] : ATTRIBUTE_COLORS[key],
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onToggleExpand?.(!isExpanded)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-foreground hover:border-zinc-700/80 active:scale-[0.98] transition-all"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <Maximize2 className={`w-3.5 h-3.5 ${isExpanded ? 'rotate-45' : ''}`} />
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: processedNodes, links: processedLinks }}
          nodeId="id"
          nodeLabel="label"
          nodeColor="color"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isCentral = node.group === 'central';
            const isFiltered = node.opacity < 1;

            ctx.globalAlpha = node.opacity;

            if (isCentral) {
              const time = Date.now() / 500;
              const pulseSize = node.size + Math.sin(time) * 4;
              const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
              gradient.addColorStop(0, node.glow);
              gradient.addColorStop(1, 'transparent');
              ctx.beginPath();
              ctx.arc(0, 0, pulseSize, 0, 2 * Math.PI);
              ctx.fillStyle = gradient;
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(0, 0, node.size, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();

            ctx.lineWidth = isCentral ? 3 : 2;
            ctx.strokeStyle = node.borderColor;
            ctx.stroke();

            if (node.label && globalScale > 0.5) {
              ctx.font = `${node.fontSize}px 'JetBrains Mono', monospace`;
              ctx.fillStyle = isFiltered ? '#71717a' : '#fafafa';
              ctx.textAlign = 'center';
              ctx.fillText(node.label, 0, node.size + 12);
            }
          }}
          linkSource="source"
          linkTarget="target"
          linkColor="color"
          linkWidth="width"
          linkLineDash="dash"
          linkOpacity="opacity"
          linkCurvature={0.15}
          linkCanvasObject={(link, ctx) => {
            if (link.opacity < 0.3) return;

            const attrColor = ATTRIBUTE_COLORS[link.attribute] || '#71717a';
            ctx.strokeStyle = attrColor;
            ctx.lineWidth = link.width;
            ctx.globalAlpha = link.opacity;
            ctx.setLineDash(link.dash || []);
          }}
          linkLabel="label"
          linkFont={isExpanded ? 10 : 9}
          linkFontColor={link => ATTRIBUTE_COLORS[link.attribute] || '#71717a'}
          onNodeClick={handleNodeClick}
          nodeHoverTooltip={getNodeTooltip}
          linkHoverTooltip={getLinkTooltip}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.4}
          warmupTicks={isExpanded ? 100 : 50}
          cooldownTicks={isExpanded ? 200 : 100}
          cooldownTime={isExpanded ? 15000 : 8000}
        />

        {clusters && clusters.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            <AnimatePresence>
              {clusters.map((cluster, i) => (
                <motion.div
                  key={cluster.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.1 }}
                  className="pointer-events-auto mb-2"
                >
                  <div
                    className="px-3 py-2 rounded-lg text-[10px] font-medium border shadow-lg backdrop-blur-sm"
                    style={{
                      backgroundColor: cluster.severity === 'HIGH' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      borderColor: cluster.severity === 'HIGH' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                      color: cluster.severity === 'HIGH' ? '#fb7185' : '#fbbf24',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-bold">FRAUD CLUSTER DETECTED</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{
                          backgroundColor: cluster.severity === 'HIGH' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {cluster.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] opacity-90">{cluster.description}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {cluster.shared_attributes.map(attr => (
                        <span
                          key={attr.attribute}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium border"
                          style={{
                            backgroundColor: `${ATTRIBUTE_COLORS[attr.attribute] || '#71717a'}20`,
                            borderColor: `${ATTRIBUTE_COLORS[attr.attribute] || '#71717a'}60`,
                            color: ATTRIBUTE_COLORS[attr.attribute] || '#a1a1aa'
                          }}
                        >
                          {ATTRIBUTE_ICONS[attr.attribute] || ''} {attr.display}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="absolute bottom-4 right-4 pointer-events-none z-10">
          <div className="p-2 rounded-lg text-[10px] text-muted-foreground bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-sm text-right pointer-events-auto">
            <div className="font-medium text-foreground mb-1">Graph Controls</div>
            <div className="space-y-1 text-[9px] opacity-70 font-mono">
              <div>Drag: Pan</div>
              <div>Scroll: Zoom</div>
              <div>Click Node: Select</div>
              <div>Hover: Details</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border/40 bg-secondary/20">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="text-2xl font-bold font-mono text-rose-400">{blockedCount}</div>
            <div className="text-[10px] text-muted-foreground">Blocked</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-2xl font-bold font-mono text-amber-400">{stepUpCount}</div>
            <div className="text-[10px] text-muted-foreground">Step-Up Auth</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-2xl font-bold font-mono text-emerald-400">{approvedCount}</div>
            <div className="text-[10px] text-muted-foreground">Approved</div>
          </div>
        </div>

        {metadata?.is_velocity_attack && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 rounded-lg border bg-rose-500/10 border-rose-500/30 flex items-center gap-2 animate-pulse"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div className="text-xs text-rose-300">
              <span className="font-bold">VELOCITY ATTACK DETECTED:</span>{' '}
              {metadata.last_hour_count || 0} transactions in last hour, {blockedCount} blocked — coordinated carding pattern.
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}