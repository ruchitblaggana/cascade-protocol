import { useState, useEffect } from 'react';
import { ChevronLeft, Trophy, Play, Trash2, Clock, Zap } from 'lucide-react';
import type { Screen } from '@/App';
import { loadCustomScenarios, deleteCustomScenario, type SavedScenario } from '@/game/persistence';
import { useGame } from '@/game/GameContext';

interface ChallengeModeProps {
  onNavigate: (screen: Screen) => void;
  onStartCustom: (missionId: string) => void;
}

const CHALLENGE_PRESETS = [
  {
    name: 'Blackout Surge',
    description: 'Two substations fail simultaneously. Limited crews, tight budget.',
    missionId: 'm01-first-blackout',
    modifier: 'Two simultaneous substation failures',
    difficulty: 4,
  },
  {
    name: 'Communication Collapse',
    description: 'All communication infrastructure goes dark.',
    missionId: 'm02-silent-city',
    modifier: 'Full comm network failure',
    difficulty: 5,
  },
  {
    name: 'Total Grid Failure',
    description: 'Every substation in Meridian fails. Ultimate recovery test.',
    missionId: 'm06-cascade-protocol',
    modifier: 'All substations failed',
    difficulty: 5,
  },
  {
    name: 'Water Crisis + Road Block',
    description: 'Water infrastructure fails with roads to hospitals blocked.',
    missionId: 'm04-waterline',
    modifier: 'Compound water + road failure',
    difficulty: 4,
  },
];

export default function ChallengeMode({ onNavigate, onStartCustom }: ChallengeModeProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const { startMission } = useGame();

  useEffect(() => {
    loadCustomScenarios().then(setScenarios);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteCustomScenario(id);
    const fresh = await loadCustomScenarios();
    setScenarios(fresh);
  };

  const handlePlayCustom = async (sc: SavedScenario) => {
    const allScenarios = await loadCustomScenarios();
    const fresh = allScenarios.find(s => s.id === sc.id);
    if (fresh) {
      startMission(fresh.mission.id, fresh.mission);
      onNavigate('operations');
    }
  };

  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30">
        <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-c" /> Challenge Mode
        </h1>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Preset challenges */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-4">Preset Challenges</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {CHALLENGE_PRESETS.map((preset, i) => (
              <div key={i} className="panel p-4 hover:border-amber transition-all cursor-pointer" onClick={() => onStartCustom(preset.missionId)}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-c" />
                  <h3 className="text-sm font-semibold">{preset.name}</h3>
                  <span className="ml-auto text-xs font-mono text-fog opacity-50">DIFF {preset.difficulty}</span>
                </div>
                <p className="text-xs text-fog opacity-70">{preset.description}</p>
                <div className="text-xs text-amber-c mt-2 font-mono">{preset.modifier}</div>
                <button className="btn btn-amber w-full mt-3 text-xs">
                  <Play className="w-3.5 h-3.5" /> Start Challenge
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom scenarios */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-4">Your Custom Scenarios</h2>
          {scenarios.length === 0 ? (
            <div className="panel-dark p-6 text-center text-fog opacity-50 text-sm">
              No custom scenarios yet. Use the Scenario Editor to create your own crisis.
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios.map(sc => (
                <div key={sc.id} className="panel p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">{sc.name}</h3>
                    <p className="text-xs text-fog opacity-60 truncate">{sc.description || sc.mission.briefing.substring(0, 80)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-fog opacity-50">
                      <span>{sc.mission.initialFailedNodes.length} failed nodes</span>
                      <span>{sc.mission.budget} credits</span>
                      {sc.mission.timeLimit > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {sc.mission.timeLimit}min</span>}
                    </div>
                  </div>
                  <button onClick={() => handlePlayCustom(sc)} className="btn btn-amber text-xs">
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                  <button onClick={() => handleDelete(sc.id)} className="btn btn-ghost text-xs text-coral-c">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('editor')} className="btn btn-ghost w-full mt-3 text-sm">
            Open Scenario Editor
          </button>
        </div>
      </div>
    </div>
  );
}
