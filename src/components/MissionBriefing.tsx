import { useState, useEffect } from 'react';
import { ChevronLeft, Zap, AlertTriangle, Clock, Wrench, Package, Play, Lock } from 'lucide-react';
import { getMission } from '@/game/missions';

interface MissionBriefingProps {
  missionId: string;
  onBegin: () => void;
  onBack: () => void;
}

export default function MissionBriefing({ missionId, onBegin, onBack }: MissionBriefingProps) {
  const mission = getMission(missionId);
  const [showHidden, setShowHidden] = useState(false);

  if (!mission) return null;

  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30">
        <button onClick={onBack} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Campaign</span>
        </button>
        <div className="text-xs font-mono text-fog opacity-50">TACTICAL BRIEFING</div>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 animate-fade-in">
        {/* Mission header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-amber-c uppercase tracking-wider">Crisis Category: {mission.crisisCategory}</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{mission.name}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-fog">
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-c" /> Difficulty: {mission.difficulty}/5</span>
            {mission.timeLimit > 0 && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {mission.timeLimit} min limit</span>}
            <span className="flex items-center gap-1.5"><Wrench className="w-4 h-4" /> {mission.availableCrews.reduce((a, c) => a + c.count, 0)} crews</span>
            <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> {mission.supplies} supplies</span>
          </div>
        </div>

        {/* Briefing text */}
        <div className="panel p-5 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-teal-c mb-3 font-mono">SITUATION REPORT</h2>
          <p className="text-fog leading-relaxed">{mission.briefing}</p>
        </div>

        {/* Primary objective */}
        <div className="panel p-5 mb-6 border-l-4 border-l-amber">
          <h2 className="text-xs uppercase tracking-wider text-amber-c mb-2 font-mono">PRIMARY OBJECTIVE</h2>
          <p className="text-warm text-lg font-medium">{mission.primaryObjective}</p>
          <div className="mt-4 space-y-2">
            {mission.objectives.filter(o => o.primary).map((obj, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-fog">
                <Zap className="w-4 h-4 text-amber-c mt-0.5 flex-shrink-0" />
                <span>{obj.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary objectives */}
        {mission.secondaryObjectiveDescriptions.length > 0 && (
          <div className="panel p-5 mb-6">
            <h2 className="text-xs uppercase tracking-wider text-teal-c mb-3 font-mono">SECONDARY OBJECTIVES</h2>
            <ul className="space-y-1.5">
              {mission.secondaryObjectiveDescriptions.map((desc, i) => (
                <li key={i} className="text-sm text-fog flex items-start gap-2">
                  <span className="text-teal-c mt-0.5">+</span> {desc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resources */}
        <div className="panel p-5 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-teal-c mb-3 font-mono">AVAILABLE RESOURCES</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-fog opacity-60 mb-1">Repair Crews</div>
              {mission.availableCrews.map((c, i) => (
                <div key={i} className="text-warm">{c.count} × {c.type}</div>
              ))}
            </div>
            <div>
              <div className="text-fog opacity-60 mb-1">Budget</div>
              <div className="text-warm">{mission.budget} credits</div>
              <div className="text-fog opacity-60 mb-1 mt-2">Supplies</div>
              <div className="text-warm">{mission.supplies} emergency units</div>
            </div>
          </div>
        </div>

        {/* Constraints */}
        {mission.constraints.length > 0 && (
          <div className="panel p-5 mb-6">
            <h2 className="text-xs uppercase tracking-wider text-coral-c mb-2 font-mono">CONSTRAINTS</h2>
            {mission.constraints.map((c, i) => (
              <p key={i} className="text-sm text-fog">{c}</p>
            ))}
          </div>
        )}

        {/* Hidden info toggle */}
        {mission.hiddenInfo.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="text-xs text-fog opacity-60 hover:text-amber-c flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              {showHidden ? 'Hide classified intel' : 'Reveal classified intel (spoilers)'}
            </button>
            {showHidden && (
              <div className="panel-dark p-4 mt-2 text-xs text-fog opacity-70 italic animate-fade-in">
                {mission.hiddenInfo.map((info, i) => (
                  <p key={i} className="mb-1">▸ {info}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Begin button */}
        <button onClick={onBegin} className="btn btn-amber w-full py-4 text-base">
          <Play className="w-5 h-5" />
          Begin Simulation
        </button>
      </div>
    </div>
  );
}
