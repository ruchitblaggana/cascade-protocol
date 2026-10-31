import { useState } from 'react';
import { ChevronLeft, Check, AlertCircle, Award, Clock, DollarSign, Package, Target, TrendingUp, RotateCcw, Home, Play, Pause } from 'lucide-react';
import { getMission } from '@/game/missions';
import type { MissionResult } from '@/game/types';

interface AfterActionReviewProps {
  result: MissionResult;
  onContinue: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export default function AfterActionReview({ result, onContinue, onRetry, onMenu }: AfterActionReviewProps) {
  const mission = getMission(result.missionId);
  const [showTimeline, setShowTimeline] = useState(true);

  if (!mission) return null;

  const outcome = result.success ? 'MISSION COMPLETE' : result.partial ? 'PARTIAL RECOVERY' : 'MISSION FAILED';
  const outcomeColor = result.success ? '#56B9A7' : result.partial ? '#F2B84B' : '#E96F68';

  // Group events by type for timeline
  const timeline = result.events.slice().sort((a, b) => a.time - b.time);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30">
        <button onClick={onMenu} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold">After-Action Review</h1>
        <div className="w-20" />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Outcome banner */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-6xl mb-3" style={{ color: outcomeColor }}>
            {result.success ? <Award className="w-16 h-16 mx-auto" /> : result.partial ? <AlertCircle className="w-16 h-16 mx-auto" /> : <AlertCircle className="w-16 h-16 mx-auto" />}
          </div>
          <h1 className="text-3xl font-bold" style={{ color: outcomeColor }}>{outcome}</h1>
          <p className="text-fog opacity-70 mt-2">{mission.name}</p>
        </div>

        {/* Score */}
        <div className="panel p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-c" /> Final Score
            </h2>
            <span className="text-4xl font-bold text-amber-c font-mono">{result.score}</span>
          </div>
          <div className="space-y-2">
            {result.scoreBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-fog">{item.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-slate-c/30 rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full" style={{ width: `${(item.value / 40) * 100}%` }} />
                  </div>
                  <span className="font-mono text-warm w-8 text-right">+{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Target} label="Objectives" value={`${result.objectivesCompleted}/${result.objectivesTotal}`} color="#56B9A7" />
          <StatCard icon={Clock} label="Time Taken" value={formatTime(result.timeTaken)} color="#F2B84B" />
          <StatCard icon={DollarSign} label="Budget Spent" value={`${result.budgetSpent}/${result.budgetSpent + result.budgetRemaining}`} color="#E96F68" />
          <StatCard icon={Package} label="Supplies Left" value={`${result.suppliesRemaining}`} color="#DDE5E9" />
        </div>

        {/* Objectives breakdown */}
        <div className="panel p-5 mb-6">
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-3">Objectives</h2>
          <div className="space-y-2">
            {mission.objectives.map((obj, i) => {
              const resultObj = result.replayData;
              const wasCompleted = result.objectivesCompleted > 0; // simplified
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {obj.primary ? <Check className="w-4 h-4 text-teal-c mt-0.5" /> : <Check className="w-4 h-4 text-teal-c mt-0.5 opacity-50" />}
                  <span className={obj.primary ? 'text-warm' : 'text-fog opacity-70'}>
                    {obj.description}
                  </span>
                  {obj.primary && <span className="text-xs text-amber-c ml-auto">PRIMARY</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="panel p-5 mb-6">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center justify-between w-full mb-3"
          >
            <h2 className="text-sm uppercase tracking-wider text-amber-c flex items-center gap-2">
              <Clock className="w-4 h-4" /> Incident Timeline
            </h2>
            <span className="text-xs text-fog opacity-50">{showTimeline ? 'Hide' : 'Show'}</span>
          </button>
          {showTimeline && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {timeline.map((event, i) => (
                <div key={i} className="flex items-start gap-3 text-xs py-1 border-b border-slate-c/20">
                  <span className="font-mono text-fog opacity-50 flex-shrink-0 w-12">T+{formatTime(event.time)}</span>
                  <span className={
                    event.severity === 'critical' ? 'text-coral-c' :
                    event.severity === 'warning' ? 'text-amber-c' :
                    event.severity === 'success' ? 'text-teal-c' : 'text-fog'
                  }>
                    {event.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Final city state */}
        <div className="panel p-5 mb-6">
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-3">Final Infrastructure State</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {Object.entries(result.finalNodeStates).map(([nodeId, nodeState]) => {
              const node = nodeId; // Just show IDs since we don't have full node data here
              const color = nodeState === 'operational' || nodeState === 'restored' ? '#56B9A7' :
                nodeState === 'failed' ? '#E96F68' : nodeState === 'degraded' ? '#F2B84B' : '#33475C';
              return (
                <div key={nodeId} className="flex items-center gap-2">
                  <span className="status-dot" style={{ background: color }} />
                  <span className="text-fog opacity-70 font-mono">{nodeId}</span>
                  <span className="text-fog opacity-50 capitalize">{nodeState}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions taken */}
        <div className="panel p-5 mb-6">
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-3">Player Actions ({result.replayData.actionHistory.length})</h2>
          {result.replayData.actionHistory.length === 0 ? (
            <p className="text-sm text-fog opacity-50">No actions recorded.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.replayData.actionHistory.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-fog opacity-50">T+{formatTime(action.time)}</span>
                  <span className="text-fog capitalize">{action.type}</span>
                  <span className="text-fog opacity-70">{action.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alternative strategies */}
        <div className="panel p-5 mb-6 border-l-4 border-l-teal">
          <h2 className="text-sm uppercase tracking-wider text-teal-c mb-2">Lessons & Alternative Strategies</h2>
          <div className="space-y-2 text-sm text-fog">
            {!result.success && (
              <p>Review which primary objectives remained incomplete. Prioritizing critical substations and dispatch centers early can prevent cascading failures.</p>
            )}
            <p>Consider investigating nodes before repairing to understand hidden dependencies. Protection actions can prevent future cascades at a lower cost than emergency repairs.</p>
            <p>Use alternative routing to maintain service to isolated facilities while primary connections are being repaired.</p>
            {result.budgetSpent > mission.budget * 0.8 && (
              <p className="text-amber-c">High budget usage — try completing secondary objectives without the emergency reserve for bonus points.</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={onRetry} className="btn btn-amber flex-1">
            <RotateCcw className="w-4 h-4" /> Retry Mission
          </button>
          <button onClick={onContinue} className="btn btn-ghost flex-1">
            <ChevronLeft className="w-4 h-4" /> Campaign Map
          </button>
          <button onClick={onMenu} className="btn btn-ghost flex-1">
            <Home className="w-4 h-4" /> Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: string; color: string }) {
  return (
    <div className="panel-dark p-3 text-center">
      <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
      <div className="text-lg font-bold font-mono text-warm">{value}</div>
      <div className="text-xs text-fog opacity-50">{label}</div>
    </div>
  );
}
