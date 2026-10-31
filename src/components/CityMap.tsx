import { useState, useMemo, useRef } from 'react';
import type { SimulationState, CityNode, CityConnection } from '@/game/types';
import { DISTRICT_INFO } from '@/game/city';
import { findShortestPath } from '@/game/pathfinding';

interface CityMapProps {
  state: SimulationState;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  showRisk?: boolean;
  routeHighlight?: string[] | null; // node path to highlight
  reducedMotion?: boolean;
}

const VIEW_W = 1000;
const VIEW_H = 620;

const STATE_COLORS: Record<string, string> = {
  operational: '#56B9A7',
  degraded: '#F2B84B',
  failed: '#E96F68',
  underRepair: '#F2B84B',
  restored: '#56B9A7',
  isolated: '#33475C',
};

const RISK_COLORS: Record<string, string> = {
  low: '#56B9A7',
  medium: '#F2B84B',
  high: '#E96F68',
  critical: '#E96F68',
};

function getNodeShape(node: CityNode): { width: number; height: number; shape: 'rect' | 'circle' } {
  switch (node.category) {
    case 'hospital':
    case 'dispatchCenter':
    case 'waterTreatment':
    case 'substation':
    case 'criticalService':
      return { width: 24, height: 24, shape: 'rect' };
    case 'commTower':
    case 'commRelay':
      return { width: 18, height: 18, shape: 'circle' };
    case 'pumpingStation':
    case 'powerDistribution':
      return { width: 20, height: 20, shape: 'rect' };
    case 'intersection':
    case 'trafficSignal':
      return { width: 16, height: 16, shape: 'rect' };
    default:
      return { width: 16, height: 16, shape: 'circle' };
  }
}

function getNodeIconPath(category: string): string | null {
  // Return SVG path for category icons drawn at origin 0,0 in 12x12 box
  switch (category) {
    case 'substation':
      return 'M6 1 L2 7 L5 7 L4 11 L10 5 L7 5 L8 1 Z';
    case 'hospital':
      return 'M5 2 H7 V5 H10 V7 H7 V10 H5 V7 H2 V5 H5 Z';
    case 'commTower':
      return 'M5 1 L7 1 L7 8 L5 8 Z M4 3 L8 3 M4 6 L8 6';
    case 'waterTreatment':
      return 'M3 2 H9 V4 L7 8 H5 L3 4 Z';
    default:
      return null;
  }
}

export default function CityMap({ state, selectedNodeId, onSelectNode, showRisk = false, routeHighlight = null, reducedMotion = false }: CityMapProps) {
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [routeFrom, setRouteFrom] = useState<string | null>(null);
  const [routeTo, setRouteTo] = useState<string | null>(null);
  const [computedRoute, setComputedRoute] = useState<{ path: string[]; totalTime: number; valid: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = Object.values(state.nodes);
  const connections = Object.values(state.connections);

  // Group nodes by district for background regions
  const districts = useMemo(() => {
    const map: Record<string, CityNode[]> = {};
    for (const n of nodes) {
      if (!map[n.district]) map[n.district] = [];
      map[n.district].push(n);
    }
    return map;
  }, [nodes]);

  // Compute district bounding boxes
  const districtBounds = useMemo(() => {
    const bounds: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {};
    for (const [district, dnodes] of Object.entries(districts)) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of dnodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
      const pad = 40;
      bounds[district] = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    }
    return bounds;
  }, [districts]);

  // Determine which nodes are on the route
  const routeSet = useMemo(() => {
    if (routeHighlight) return new Set(routeHighlight);
    if (computedRoute && computedRoute.valid) return new Set(computedRoute.path);
    return new Set<string>();
  }, [routeHighlight, computedRoute]);

  // Determine which connections are on the route
  const routeConnSet = useMemo(() => {
    if (!routeHighlight && !computedRoute) return new Set<string>();
    const path = routeHighlight || (computedRoute ? computedRoute.path : []);
    const set = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      for (const conn of connections) {
        if ((conn.source === path[i] && conn.destination === path[i + 1]) ||
            (conn.destination === path[i] && conn.source === path[i + 1])) {
          if (conn.type === 'road') set.add(conn.id);
        }
      }
    }
    return set;
  }, [routeHighlight, computedRoute, connections]);

  const handleCalculateRoute = () => {
    if (routeFrom && routeTo) {
      const result = findShortestPath(routeFrom, routeTo, state);
      setComputedRoute({ path: result.path, totalTime: result.totalTime, valid: result.valid });
    }
  };

  const handleNodeClick = (id: string) => {
    if (routeFrom && !routeTo && id !== routeFrom) {
      setRouteTo(id);
      const result = findShortestPath(routeFrom, id, state);
      setComputedRoute({ path: result.path, totalTime: result.totalTime, valid: result.valid });
      onSelectNode(id);
    } else {
      onSelectNode(id);
      setRouteFrom(null);
      setRouteTo(null);
      setComputedRoute(null);
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => { onSelectNode(null); setRouteFrom(null); setRouteTo(null); setComputedRoute(null); }}
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1B2B40" />
            <stop offset="100%" stopColor="#111B2B" />
          </radialGradient>
          <linearGradient id="districtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(27,43,64,0.3)" />
            <stop offset="100%" stopColor="rgba(17,27,43,0.15)" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#bgGrad)" />

        {/* District regions */}
        {Object.entries(districtBounds).map(([district, b]) => {
          const info = DISTRICT_INFO[district as keyof typeof DISTRICT_INFO];
          if (!info) return null;
          const w = b.maxX - b.minX;
          const h = b.maxY - b.minY;
          return (
            <g key={district}>
              <rect
                x={b.minX} y={b.minY} width={w} height={h}
                rx="12" fill="url(#districtGrad)"
                stroke={info.color} strokeOpacity="0.15" strokeWidth="1"
                strokeDasharray="6 4"
              />
              <text
                x={b.minX + 8} y={b.minY + 16}
                fill={info.color} fillOpacity="0.5"
                fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif"
                className="uppercase tracking-wider"
              >
                {info.name}
              </text>
            </g>
          );
        })}

        {/* Connections */}
        {connections.map(conn => {
          const source = state.nodes[conn.source];
          const dest = state.nodes[conn.destination];
          if (!source || !dest) return null;
          const isRoute = routeConnSet.has(conn.id);
          const isFailed = conn.state === 'failed' || conn.state === 'underRepair';
          const isDegraded = conn.state === 'degraded';

          let strokeColor = '#33475C';
          let strokeWidth = conn.type === 'road' ? 3 : 2;
          let opacity = 0.5;
          let dashArray = '';

          if (conn.type === 'road') {
            strokeColor = isFailed ? '#E96F68' : isDegraded ? '#F2B84B' : '#4a6378';
            opacity = isFailed ? 0.4 : 0.6;
            strokeWidth = isRoute ? 5 : 3;
          } else if (conn.type === 'power') {
            strokeColor = isFailed ? '#E96F68' : isDegraded ? '#F2B84B' : '#56B9A7';
            opacity = isFailed ? 0.3 : 0.35;
            strokeWidth = isRoute ? 4 : 1.5;
            dashArray = '4 2';
          } else if (conn.type === 'comm') {
            strokeColor = isFailed ? '#E96F68' : isDegraded ? '#F2B84B' : '#F2B84B';
            opacity = isFailed ? 0.3 : 0.3;
            dashArray = '2 3';
          } else if (conn.type === 'water') {
            strokeColor = isFailed ? '#E96F68' : isDegraded ? '#F2B84B' : '#3a7a9a';
            opacity = isFailed ? 0.3 : 0.35;
            dashArray = '6 2';
          }

          if (isRoute) {
            strokeColor = '#F2B84B';
            opacity = 0.9;
            dashArray = reducedMotion ? '' : '8 4';
          }

          return (
            <line
              key={conn.id}
              x1={source.x} y1={source.y}
              x2={dest.x} y2={dest.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray={dashArray || undefined}
              className={isRoute && !reducedMotion ? 'conn-active' : ''}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const { width, height, shape } = getNodeShape(node);
          const stateColor = STATE_COLORS[node.state] || '#33475C';
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoverNodeId === node.id;
          const isOnRoute = routeSet.has(node.id);
          const x = node.x - width / 2;
          const y = node.y - height / 2;

          // Risk glow
          const showRiskGlow = showRisk && (node.state === 'operational' || node.state === 'degraded');
          const criticalityColor = node.criticality === 'critical' ? '#E96F68' : node.criticality === 'high' ? '#F2B84B' : '#56B9A7';

          return (
            <g
              key={node.id}
              className="map-node"
              onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
              onMouseEnter={() => setHoverNodeId(node.id)}
              onMouseLeave={() => setHoverNodeId(null)}
            >
              {/* Selection/hover ring */}
              {(isSelected || isHovered) && (
                <circle
                  cx={node.x} cy={node.y}
                  r={Math.max(width, height) * 0.8}
                  fill="none"
                  stroke={isSelected ? '#F2B84B' : '#DDE5E9'}
                  strokeWidth="2"
                  strokeDasharray="3 2"
                  opacity="0.8"
                  className={!reducedMotion ? 'animate-spin' : ''}
                  style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '8s' }}
                />
              )}

              {/* Route highlight ring */}
              {isOnRoute && (
                <circle cx={node.x} cy={node.y} r={width * 0.7} fill="none" stroke="#F2B84B" strokeWidth="2" opacity="0.6" />
              )}

              {/* Under repair pulse */}
              {node.state === 'underRepair' && !reducedMotion && (
                <circle cx={node.x} cy={node.y} r={width * 0.6} fill="none" stroke="#F2B84B" strokeWidth="2" opacity="0.5" className="animate-pulse-slow" />
              )}

              {/* Failed pulse */}
              {node.state === 'failed' && node.criticality === 'critical' && !reducedMotion && (
                <circle cx={node.x} cy={node.y} r={width * 0.7} fill="none" stroke="#E96F68" strokeWidth="2" opacity="0.4" className="animate-pulse-slow" />
              )}

              {/* Node shape */}
              {shape === 'rect' ? (
                <rect
                  x={x} y={y} width={width} height={height}
                  rx="3"
                  fill={stateColor}
                  fillOpacity={node.state === 'operational' ? 0.7 : 0.9}
                  stroke={criticalityColor}
                  strokeWidth={node.criticality === 'critical' ? 1.5 : 1}
                  filter={node.state === 'failed' && node.criticality === 'critical' && !reducedMotion ? 'url(#glow)' : undefined}
                />
              ) : (
                <circle
                  cx={node.x} cy={node.y}
                  r={width / 2}
                  fill={stateColor}
                  fillOpacity={node.state === 'operational' ? 0.7 : 0.9}
                  stroke={criticalityColor}
                  strokeWidth={node.criticality === 'critical' ? 1.5 : 1}
                  filter={node.state === 'failed' && node.criticality === 'critical' && !reducedMotion ? 'url(#glow)' : undefined}
                />
              )}

              {/* Protection indicator */}
              {node.protected && (
                <circle cx={node.x + width / 2 - 2} cy={node.y - height / 2 + 2} r="3" fill="#56B9A7" stroke="#111B2B" strokeWidth="1" />
              )}

              {/* Investigation indicator */}
              {node.investigated && (
                <circle cx={node.x - width / 2 + 2} cy={node.y - height / 2 + 2} r="2" fill="#DDE5E9" />
              )}

              {/* Label on hover or selected */}
              {(isHovered || isSelected) && (
                <g>
                  <rect
                    x={node.x - 45} y={node.y + height / 2 + 4}
                    width="90" height="16" rx="3"
                    fill="#111B2B" fillOpacity="0.9"
                    stroke="#33475C" strokeWidth="0.5"
                  />
                  <text
                    x={node.x} y={node.y + height / 2 + 15}
                    textAnchor="middle"
                    fill="#DDE5E9" fontSize="9" fontFamily="JetBrains Mono, monospace"
                  >
                    {node.name.length > 16 ? node.name.substring(0, 14) + '..' : node.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Crew markers - show crews traveling */}
        {state.crews.filter(c => !c.available && c.currentAssignment).map(crew => {
          const job = state.repairJobs.find(j => j.id === crew.currentAssignment);
          if (!job) return null;
          const node = state.nodes[job.nodeId];
          if (!node) return null;
          // Show crew at target if repairing, or at source if traveling
          const cx = job.status === 'repairing' ? node.x : state.nodes[crew.location]?.x || 500;
          const cy = job.status === 'repairing' ? node.y : state.nodes[crew.location]?.y || 450;
          const color = crew.type === 'electrical' ? '#F2B84B' : crew.type === 'communications' ? '#56B9A7' : '#DDE5E9';
          return (
            <g key={crew.id}>
              <circle cx={cx + 12} cy={cy - 12} r="4" fill={color} stroke="#111B2B" strokeWidth="1" />
              {job.status === 'repairing' && !reducedMotion && (
                <circle cx={cx + 12} cy={cy - 12} r="6" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" className="animate-pulse-slow" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Route tool overlay */}
      {routeFrom && (
        <div className="absolute top-2 left-2 panel-dark px-3 py-2 text-xs text-fog font-mono">
          <div className="flex items-center gap-2">
            <span className="text-amber-c">ROUTE</span>
            <span>From: {state.nodes[routeFrom]?.name || '?'}</span>
            <span>→</span>
            <span>{routeTo ? state.nodes[routeTo]?.name || '?' : 'Click destination...'}</span>
          </div>
          {computedRoute && (
            <div className="mt-1">
              {computedRoute.valid ? (
                <span className="text-teal-c">✓ {Math.round(computedRoute.totalTime)} min travel</span>
              ) : (
                <span className="text-coral-c">✗ No valid route</span>
              )}
            </div>
          )}
          <button
            className="mt-1 text-xs text-coral-c hover:underline"
            onClick={(e) => { e.stopPropagation(); setRouteFrom(null); setRouteTo(null); setComputedRoute(null); }}
          >
            Cancel route
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 panel-dark px-3 py-2 text-[10px] text-fog font-mono flex flex-col gap-1">
        <div className="flex items-center gap-2"><span className="status-dot" style={{ background: '#56B9A7' }} /> Operational</div>
        <div className="flex items-center gap-2"><span className="status-dot" style={{ background: '#F2B84B' }} /> Degraded / Repair</div>
        <div className="flex items-center gap-2"><span className="status-dot" style={{ background: '#E96F68' }} /> Failed</div>
      </div>
    </div>
  );
}
