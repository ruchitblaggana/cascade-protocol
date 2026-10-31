import { useState, useEffect, useRef } from 'react';
import {
  Pause, Play, FastForward, ChevronLeft, X, Wrench, Package, DollarSign,
  Radio, Search, Shield, Zap, Scissors, Send, Clock, Users, AlertTriangle,
  Check, AlertCircle, Route as RouteIcon
} from 'lucide-react';
import { useGame } from '@/game/GameContext';
import CityMap from './CityMap';
import type { GameSettings } from '@/game/persistence';
import type { Screen } from '@/App';
import { DISTRICT_INFO } from '@/game/city';
import { assessRisk } from '@/game/pathfinding';

interface OperationsRoomProps {
  onExit: () => void;
  onComplete: () => void;
  settings: GameSettings;
}

export default function OperationsRoom({ onExit, onComplete, settings }: OperationsRoomProps) {
  const game = useGame();
  const { state } = game;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showEventFeed, setShowEventFeed] = useState(true);
  const [activeTab, setActiveTab] = useState<'inspect' | 'actions' | 'crew' | 'objectives'>('inspect');
  const [showRouteMode, setShowRouteMode] = useState(false);
  const eventFeedRef = useRef<HTMLDivElement>(null);

  if (!state) return null;

  // Auto-scroll event feed
  useEffect(() => {
    if (eventFeedRef.current) {
      eventFeedRef.current.scrollTop = eventFeedRef.current.scrollHeight;
    }
  }, [state.events.length]);

  // Check for mission completion
  useEffect(() => {
    if (state.phase === 'complete') {
      onComplete();
    }
  }, [state.phase, onComplete]);

  const selectedNode = selectedNodeId ? state.nodes[selectedNodeId] : null;
  const recentEvents = state.events.slice(-20);

  const showMsg = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleAction = (fn: () => { success: boolean; message: string }) => {
    const result = fn();
    showMsg(result.message);
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const availableCrews = state.crews.filter(c => c.available);
  const activeJobs = state.repairJobs.filter(j => j.status !== 'complete' && j.status !== 'cancelled');

  const primaryObjs = state.objectives.filter(o => o.primary);
  const secondaryObjs = state.objectives.filter(o => !o.primary);

  return (
    <div className="h-screen bg-midnight text-warm flex flex-col overflow-hidden">
      {/* Top HUD bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-c/30 bg-deep-blue/50">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="text-fog hover:text-coral-c transition-colors text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Exit
          </button>
          <div className="h-4 w-px bg-slate-c/40" />
          <span className="text-sm font-semibold text-amber-c">{state.mission.name}</span>
        </div>

        {/* Central status */}
        <div className="flex items-center gap-4 text-sm font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-fog opacity-60" />
            <span className="text-fog">T+{formatTime(state.time)}</span>
            {state.mission.timeLimit > 0 && (
              <span className="text-fog opacity-50 text-xs">
                / {formatTime(state.mission.timeLimit)}
              </span>
            )}
          </div>
          <div className="h-4 w-px bg-slate-c/40" />
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-teal-c" />
            <span className="text-fog">{state.budget}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-amber-c" />
            <span className="text-fog">{state.supplies}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-fog opacity-60" />
            <span className="text-fog">{availableCrews.length}/{state.crews.length}</span>
          </div>
        </div>

        {/* Sim controls */}
        <div className="flex items-center gap-2">
          {state.phase === 'planning' ? (
            <button onClick={() => game.startSimulation()} className="btn btn-amber text-xs">
              <Play className="w-3.5 h-3.5" /> Start Simulation
            </button>
          ) : (
            <>
              <button
                onClick={() => game.togglePause()}
                className="btn btn-ghost text-xs px-2"
                title={state.phase === 'paused' ? 'Resume' : 'Pause'}
              >
                {state.phase === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => game.setSpeed(state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1)}
                className="btn btn-ghost text-xs px-2"
                title="Speed"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{state.speed}x</span>
              </button>
              <button onClick={() => game.advanceStep()} className="btn btn-ghost text-xs px-2" title="Advance 1 step">
                <span className="font-mono">+1m</span>
              </button>
            </>
          )}
          <button onClick={onComplete} className="btn btn-ghost text-xs">
            End Mission
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - node details & actions */}
        <aside className="w-80 border-r border-slate-c/30 flex flex-col bg-deep-blue/30">
          {/* Tabs */}
          <div className="flex border-b border-slate-c/30">
            {(['inspect', 'actions', 'crew', 'objectives'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab ? 'text-amber-c border-b-2 border-amber' : 'text-fog opacity-50 hover:opacity-80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Inspect tab */}
            {activeTab === 'inspect' && (
              <div className="p-4 space-y-3">
                {selectedNode ? (
                  <NodeInspector node={selectedNode} state={state} onInvestigate={() => handleAction(() => game.investigateNode(selectedNode.id))} />
                ) : (
                  <div className="text-center text-fog opacity-50 text-sm py-8">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Select a node on the map to inspect its status, dependencies, and risk factors.
                  </div>
                )}

                {/* Risk assessment for selected node */}
                {selectedNode && (
                  <RiskPanel nodeId={selectedNode.id} state={state} />
                )}
              </div>
            )}

            {/* Actions tab */}
            {activeTab === 'actions' && (
              <div className="p-4 space-y-3">
                {selectedNode ? (
                  <NodeActions
                    nodeId={selectedNode.id}
                    state={state}
                    onDispatch={(crewId) => handleAction(() => game.dispatchCrew(selectedNode.id, crewId))}
                    onProtect={() => handleAction(() => game.protectNode(selectedNode.id))}
                    onBackup={() => handleAction(() => game.activateBackup(selectedNode.id))}
                    onIsolate={() => handleAction(() => game.isolateNode(selectedNode.id))}
                    onSupply={() => handleAction(() => game.deploySupply(selectedNode.id))}
                    onRoute={() => setShowRouteMode(true)}
                  />
                ) : (
                  <div className="text-center text-fog opacity-50 text-sm py-8">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Select a node to perform actions: dispatch crews, protect infrastructure, activate backups, or deploy emergency supplies.
                  </div>
                )}
              </div>
            )}

            {/* Crew tab */}
            {activeTab === 'crew' && (
              <div className="p-4 space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-fog opacity-60 mb-2">Repair Crews</h3>
                {state.crews.map(crew => {
                  const job = state.repairJobs.find(j => j.id === crew.currentAssignment);
                  const jobNode = job ? state.nodes[job.nodeId] : null;
                  return (
                    <div key={crew.id} className="panel-dark p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${crew.available ? 'bg-teal' : 'bg-amber'}`} style={{ background: crew.available ? '#56B9A7' : '#F2B84B' }} />
                          <span className="text-sm font-medium capitalize">{crew.type} Crew</span>
                        </div>
                        <span className="text-xs font-mono text-fog opacity-50">
                          {crew.available ? 'Available' : job?.status === 'traveling' ? 'Traveling' : 'Repairing'}
                        </span>
                      </div>
                      {job && jobNode && (
                        <div className="mt-2 text-xs text-fog opacity-70">
                          <div>Target: {jobNode.name}</div>
                          {job.status === 'traveling' && (
                            <div className="mt-1">
                              <div className="text-amber-c">Traveling: {Math.round(job.travelProgress)}%</div>
                              <ProgressBar value={job.travelProgress} color="#F2B84B" />
                            </div>
                          )}
                          {job.status === 'repairing' && (
                            <div className="mt-1">
                              <div className="text-teal-c">Repairing: {Math.round(job.progress)}%</div>
                              <ProgressBar value={job.progress} color="#56B9A7" />
                              <button
                                onClick={() => handleAction(() => game.cancelRepair(job.id))}
                                className="text-xs text-coral-c hover:underline mt-1"
                              >
                                Cancel (partial refund)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Active jobs summary */}
                {activeJobs.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs uppercase tracking-wider text-fog opacity-60 mb-2">Active Repair Queue ({activeJobs.length})</h3>
                    {activeJobs.map(job => {
                      const node = state.nodes[job.nodeId];
                      return (
                        <div key={job.id} className="text-xs text-fog opacity-70 py-1 border-b border-slate-c/20">
                          <span className="text-amber-c">{job.status}</span> - {node?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Objectives tab */}
            {activeTab === 'objectives' && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-amber-c mb-2">Primary Objectives</h3>
                  {primaryObjs.map((obj, i) => (
                    <ObjectiveItem key={i} obj={obj} />
                  ))}
                </div>
                {secondaryObjs.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-teal-c mb-2">Secondary Objectives</h3>
                    {secondaryObjs.map((obj, i) => (
                      <ObjectiveItem key={i} obj={obj} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center - city map */}
        <main className="flex-1 relative overflow-hidden">
          <CityMap
            state={state}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            showRisk={true}
            reducedMotion={settings.reducedMotion}
          />

          {/* Phase indicator */}
          {state.phase === 'planning' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 panel-dark px-4 py-2 text-sm text-amber-c animate-fade-in">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Planning Phase — Inspect infrastructure and dispatch crews. Click "Start Simulation" to begin.
            </div>
          )}
          {state.phase === 'paused' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 panel-dark px-4 py-2 text-sm text-fog animate-fade-in">
              <Pause className="w-4 h-4 inline mr-1" />
              Simulation Paused
            </div>
          )}

          {/* Action message */}
          {actionMessage && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 panel px-4 py-2 text-sm text-warm animate-slide-up">
              {actionMessage}
            </div>
          )}

          {/* Route mode indicator */}
          {showRouteMode && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 panel-dark px-4 py-2 text-sm text-amber-c">
              <RouteIcon className="w-4 h-4 inline mr-1" />
              Route Mode: Click a source node, then a destination to calculate the shortest path.
              <button onClick={() => setShowRouteMode(false)} className="ml-2 text-coral-c text-xs hover:underline">Cancel</button>
            </div>
          )}
        </main>

        {/* Right panel - event feed */}
        {showEventFeed && (
          <aside className="w-72 border-l border-slate-c/30 bg-deep-blue/30 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-c/30">
              <h3 className="text-xs uppercase tracking-wider text-fog opacity-60">Event Feed</h3>
              <button onClick={() => setShowEventFeed(false)} className="text-fog opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div ref={eventFeedRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              {recentEvents.length === 0 ? (
                <div className="text-center text-fog opacity-40 py-4">No events yet</div>
              ) : (
                recentEvents.map(event => (
                  <div key={event.id} className="p-1.5 rounded animate-fade-in">
                    <div className="flex items-start gap-1.5">
                      <span className="text-fog opacity-40 flex-shrink-0">[{formatTime(event.time)}]</span>
                      <span className={
                        event.severity === 'critical' ? 'text-coral-c' :
                        event.severity === 'warning' ? 'text-amber-c' :
                        event.severity === 'success' ? 'text-teal-c' :
                        'text-fog'
                      }>
                        {event.message}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
        {!showEventFeed && (
          <button
            onClick={() => setShowEventFeed(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 panel-dark px-2 py-3 text-xs text-fog hover:text-amber-c"
          >
            <Radio className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Node inspector panel
function NodeInspector({ node, state, onInvestigate }: { node: any; state: any; onInvestigate: () => void }) {
  const stateColor = node.state === 'operational' ? '#56B9A7' : node.state === 'failed' ? '#E96F68' : node.state === 'degraded' ? '#F2B84B' : '#F2B84B';
  const district = DISTRICT_INFO[node.district as keyof typeof DISTRICT_INFO];

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="status-dot" style={{ background: stateColor }} />
          <h2 className="text-sm font-semibold text-warm">{node.name}</h2>
        </div>
        <div className="text-xs text-fog opacity-60 font-mono">
          {district?.name} · {node.category}
        </div>
        <div className="text-xs text-fog opacity-70 mt-2">{node.serviceImpact}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="panel-dark p-2">
          <div className="text-fog opacity-50">Status</div>
          <div className="text-warm capitalize">{node.state}</div>
        </div>
        <div className="panel-dark p-2">
          <div className="text-fog opacity-50">Criticality</div>
          <div className="text-warm capitalize">{node.criticality}</div>
        </div>
        <div className="panel-dark p-2">
          <div className="text-fog opacity-50">Capacity</div>
          <div className="text-warm font-mono">{node.currentCapacity}/{node.baseCapacity}</div>
        </div>
        <div className="panel-dark p-2">
          <div className="text-fog opacity-50">Redundancy</div>
          <div className="text-warm font-mono">{node.redundancy} path(s)</div>
        </div>
      </div>

      {/* Dependencies */}
      {node.dependencies.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-fog opacity-50 mb-1">Dependencies</h4>
          <div className="space-y-1">
            {node.dependencies.map((depId: string) => {
              const dep = state.nodes[depId];
              if (!dep) return null;
              const depColor = dep.state === 'operational' ? '#56B9A7' : dep.state === 'failed' ? '#E96F68' : '#F2B84B';
              return (
                <div key={depId} className="flex items-center gap-2 text-xs">
                  <span className="status-dot" style={{ background: depColor }} />
                  <span className="text-fog">{dep.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investigation */}
      <button
        onClick={onInvestigate}
        disabled={node.investigated}
        className="btn btn-ghost w-full text-xs"
      >
        <Search className="w-3.5 h-3.5" />
        {node.investigated ? 'Already Investigated' : 'Investigate (reveals dependencies)'}
      </button>

      {/* History */}
      {node.history.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-fog opacity-50 mb-1">State History</h4>
          <div className="space-y-1 text-xs font-mono text-fog opacity-70">
            {node.history.slice(-4).map((h: any, i: number) => (
              <div key={i}>
                T+{String(Math.floor(h.time / 60)).padStart(2, '0')}:{String(h.time % 60).padStart(2, '0')} {h.fromState} → {h.toState} ({h.reason})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Risk panel
function RiskPanel({ nodeId, state }: { nodeId: string; state: any }) {
  const risk = assessRisk(nodeId, state);
  const riskColor = risk.level === 'critical' ? '#E96F68' : risk.level === 'high' ? '#E96F68' : risk.level === 'medium' ? '#F2B84B' : '#56B9A7';

  return (
    <div className="panel-dark p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs uppercase tracking-wider text-fog opacity-60">Risk Assessment</h4>
        <span className="text-xs font-mono font-bold" style={{ color: riskColor }}>
          {risk.level.toUpperCase()} ({risk.score})
        </span>
      </div>
      <div className="space-y-1">
        {risk.factors.map((f: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-fog opacity-70">{f.label}</span>
            <span className="font-mono text-fog opacity-50">w{f.weight} · v{f.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-fog opacity-40 italic">
        Score = Σ(weight × value/100)
      </div>
    </div>
  );
}

// Node actions
function NodeActions({ nodeId, state, onDispatch, onProtect, onBackup, onIsolate, onSupply, onRoute }: any) {
  const node = state.nodes[nodeId];
  const compatibleCrews = state.crews.filter(c => c.available && c.type === node.requiredCrew);
  const needsRepair = node.state === 'failed' || node.state === 'degraded' || node.state === 'isolated';

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-warm mb-1">{node.name}</h3>
        <p className="text-xs text-fog opacity-60">{node.serviceImpact}</p>
      </div>

      {/* Dispatch crew */}
      {needsRepair && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-amber-c mb-2 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" /> Dispatch Repair Crew
          </h4>
          <div className="text-xs text-fog opacity-60 mb-2">
            Requires: {node.requiredCrew} crew · Cost: {node.repairCost} credits · Duration: {node.repairDuration} min
          </div>
          {compatibleCrews.length > 0 ? (
            compatibleCrews.map((crew: any) => (
              <button
                key={crew.id}
                onClick={() => onDispatch(crew.id)}
                disabled={state.budget < node.repairCost}
                className="btn btn-amber w-full text-xs mb-1"
              >
                Dispatch {crew.type} crew (from {state.nodes[crew.location]?.name || 'base'})
              </button>
            ))
          ) : (
            <div className="text-xs text-coral-c">
              No available {node.requiredCrew} crew. {state.crews.filter((c: any) => c.type === node.requiredCrew && !c.available).length} currently busy.
            </div>
          )}
          {state.budget < node.repairCost && (
            <div className="text-xs text-coral-c mt-1">Insufficient budget (need {node.repairCost})</div>
          )}
        </div>
      )}

      {/* Protect */}
      {!node.protected && (
        <button onClick={onProtect} disabled={state.budget < 50 || state.supplies < 1} className="btn btn-ghost w-full text-xs">
          <Shield className="w-3.5 h-3.5" /> Protect (50 credits, 1 supply)
        </button>
      )}

      {/* Backup power */}
      <button onClick={onBackup} disabled={state.budget < 40} className="btn btn-ghost w-full text-xs">
        <Zap className="w-3.5 h-3.5" /> Activate Backup Power (40 credits)
      </button>

      {/* Deploy supply */}
      <button onClick={onSupply} disabled={state.supplies < 1} className="btn btn-ghost w-full text-xs">
        <Send className="w-3.5 h-3.5" /> Deploy Emergency Supply (1 unit)
      </button>

      {/* Isolate */}
      {node.state !== 'isolated' && node.state !== 'failed' && (
        <button onClick={onIsolate} className="btn btn-ghost w-full text-xs text-coral-c">
          <Scissors className="w-3.5 h-3.5" /> Isolate Node (prevent cascade)
        </button>
      )}

      {/* Route */}
      <button onClick={onRoute} className="btn btn-ghost w-full text-xs">
        <RouteIcon className="w-3.5 h-3.5" /> Calculate Route to/from this node
      </button>
    </div>
  );
}

// Objective item
function ObjectiveItem({ obj }: { obj: any }) {
  const icon = obj.completed ? <Check className="w-3.5 h-3.5 text-teal-c" /> : obj.failed ? <AlertCircle className="w-3.5 h-3.5 text-coral-c" /> : <div className="w-3.5 h-3.5 rounded-full border border-fog opacity-40" />;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${obj.completed ? 'text-teal-c' : obj.failed ? 'text-coral-c' : 'text-fog'}`}>
          {obj.description}
        </div>
        <div className="text-xs text-fog opacity-50 font-mono">
          {obj.completed ? 'COMPLETE' : obj.failed ? 'FAILED' : 'IN PROGRESS'}
        </div>
      </div>
    </div>
  );
}

// Progress bar
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-c/30 rounded-full overflow-hidden mt-0.5">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}
