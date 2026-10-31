import { useState, useEffect } from 'react';
import { ChevronLeft, Lock, Check, Star, Zap, Radio, Route, Droplet, AlertTriangle } from 'lucide-react';
import { useGame } from '@/game/GameContext';
import { MISSIONS, getUnlockedMissions } from '@/game/missions';
import { loadMissionResult } from '@/game/persistence';
import type { Screen } from '@/App';

interface CampaignMapProps {
  onNavigate: (screen: Screen) => void;
  onStartMission: (missionId: string) => void;
}

const CRISIS_ICONS: Record<string, typeof Zap> = {
  'Power Outage': Zap,
  'Communications Failure': Radio,
  'Infrastructure & Routing': Route,
  'Utility Failure': Droplet,
  'Compound Crisis': AlertTriangle,
  'Compound System Crisis': AlertTriangle,
};

const DIFFICULTY_LABELS = ['', 'Introductory', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

export default function CampaignMap({ onNavigate, onStartMission }: CampaignMapProps) {
  const { progress } = useGame();
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  useEffect(() => {
    // Load best scores for all missions
    Promise.all(MISSIONS.map(async m => {
      const result = await loadMissionResult(m.id);
      return result ? [m.id, result.score] : null;
    })).then(results => {
      const scores: Record<string, number> = {};
      for (const r of results) {
        if (r) scores[r[0] as string] = r[1] as number;
      }
      setBestScores(scores);
    });
  }, []);

  const missionStates = getUnlockedMissions(progress.completedMissions);

  return (
    <div className="min-h-screen bg-midnight text-warm">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30">
        <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold tracking-wide">Campaign Map</h1>
        <div className="text-xs font-mono text-fog opacity-60">
          {progress.completedMissions.length} / {MISSIONS.length} missions complete
        </div>
      </header>

      {/* Campaign tree */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {missionStates.map(({ mission, unlocked }, idx) => {
            const Icon = CRISIS_ICONS[mission.crisisCategory] || Zap;
            const isCompleted = progress.completedMissions.includes(mission.id);
            const bestScore = bestScores[mission.id];
            const isSelected = selectedMission === mission.id;
            const nextMission = MISSIONS[idx + 1];

            return (
              <div key={mission.id}>
                <div
                  className={`panel transition-all cursor-pointer ${unlocked ? 'hover:border-amber' : 'opacity-50 cursor-not-allowed'} ${isSelected ? 'border-amber' : ''}`}
                  onClick={() => unlocked && setSelectedMission(isSelected ? null : mission.id)}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Status icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${unlocked ? (isCompleted ? 'bg-teal/20' : 'bg-amber/15') : 'bg-slate/20'}`}>
                      {!unlocked ? (
                        <Lock className="w-5 h-5 text-fog opacity-50" />
                      ) : isCompleted ? (
                        <Check className="w-5 h-5 text-teal-c" />
                      ) : (
                        <Icon className="w-5 h-5 text-amber-c" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-fog opacity-50">MISSION {String(idx + 1).padStart(2, '0')}</span>
                        {isCompleted && bestScore !== undefined && (
                          <span className="flex items-center gap-1 text-xs font-mono text-amber-c">
                            <Star className="w-3 h-3" /> Best: {bestScore}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mt-0.5">{mission.name}</h3>
                      <p className="text-sm text-fog opacity-70 mt-1 line-clamp-2">{mission.primaryObjective}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-c/30 text-fog">{mission.crisisCategory}</span>
                        <span className="text-fog opacity-60">Difficulty: {DIFFICULTY_LABELS[mission.difficulty]}</span>
                        <span className="text-fog opacity-60">Budget: {mission.budget}</span>
                      </div>
                    </div>

                    {/* Lock reason */}
                    {!unlocked && mission.unlockAfter && (
                      <div className="text-xs text-fog opacity-50 text-right">
                        <div>Locked</div>
                        <div>Complete Mission {MISSIONS.findIndex(m => m.id === mission.unlockAfter) + 1} to unlock</div>
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isSelected && unlocked && (
                    <div className="border-t border-slate-c/30 px-4 py-3 animate-slide-up">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-amber-c mb-2">Primary Objectives</h4>
                          <ul className="space-y-1">
                            {mission.objectives.filter(o => o.primary).map((obj, i) => (
                              <li key={i} className="text-sm text-fog flex items-start gap-2">
                                <span className="text-teal-c mt-0.5">▸</span> {obj.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-amber-c mb-2">Resources</h4>
                          <div className="text-sm text-fog space-y-1">
                            <div>Crews: {mission.availableCrews.map(c => `${c.count} ${c.type}`).join(', ')}</div>
                            <div>Budget: {mission.budget} credits</div>
                            <div>Supplies: {mission.supplies} emergency units</div>
                            {mission.timeLimit > 0 && <div>Time limit: {mission.timeLimit} minutes</div>}
                          </div>
                        </div>
                      </div>
                      {mission.constraints.length > 0 && (
                        <div className="mt-3 text-xs text-coral-c">
                          <span className="font-semibold">Constraints: </span>{mission.constraints.join('; ')}
                        </div>
                      )}
                      <button
                        className="btn btn-amber mt-4 w-full"
                        onClick={(e) => { e.stopPropagation(); onStartMission(mission.id); }}
                      >
                        Begin Mission
                      </button>
                    </div>
                  )}
                </div>

                {/* Connector line */}
                {nextMission && (
                  <div className="flex justify-center py-1">
                    <div className={`w-0.5 h-6 ${unlocked && isCompleted ? 'bg-teal' : 'bg-slate-c/30'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
