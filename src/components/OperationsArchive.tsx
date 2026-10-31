import { useState, useEffect } from 'react';
import { ChevronLeft, Archive, Star, Clock, Award, FileText, Download, Upload, Trash2 } from 'lucide-react';
import { loadAllResults, exportAllData, importAllData, resetAllData } from '@/game/persistence';
import { MISSIONS, getMission } from '@/game/missions';
import { useGame } from '@/game/GameContext';
import type { MissionResult } from '@/game/types';
import type { Screen } from '@/App';

interface OperationsArchiveProps {
  onNavigate: (screen: Screen) => void;
}

export default function OperationsArchive({ onNavigate }: OperationsArchiveProps) {
  const { progress, resetProgress } = useGame();
  const [results, setResults] = useState<MissionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<MissionResult | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    loadAllResults().then(setResults);
  }, []);

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cascade-protocol-save-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        const fresh = await loadAllResults();
        setResults(fresh);
        window.location.reload();
      }
    };
    input.click();
  };

  const handleReset = async () => {
    await resetAllData();
    await resetProgress();
    setResults([]);
    setShowConfirmReset(false);
    onNavigate('menu');
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30">
        <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Archive className="w-5 h-5 text-amber-c" /> Operations Archive
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-ghost text-xs" title="Export all data">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={handleImport} className="btn btn-ghost text-xs" title="Import data">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button onClick={() => setShowConfirmReset(true)} className="btn btn-ghost text-xs text-coral-c" title="Reset all data">
            <Trash2 className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Campaign overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="panel p-4 text-center">
            <Award className="w-6 h-6 mx-auto text-teal-c mb-1" />
            <div className="text-2xl font-bold font-mono">{progress.completedMissions.length}</div>
            <div className="text-xs text-fog opacity-50">Missions Complete</div>
          </div>
          <div className="panel p-4 text-center">
            <Star className="w-6 h-6 mx-auto text-amber-c mb-1" />
            <div className="text-2xl font-bold font-mono">
              {Object.values(progress.bestScores).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-fog opacity-50">Total Score</div>
          </div>
          <div className="panel p-4 text-center">
            <FileText className="w-6 h-6 mx-auto text-fog opacity-60 mb-1" />
            <div className="text-2xl font-bold font-mono">{results.length}</div>
            <div className="text-xs text-fog opacity-50">Saved Reports</div>
          </div>
        </div>

        {/* Mission results list */}
        <div className="space-y-3">
          {MISSIONS.map((mission, idx) => {
            const result = results.find(r => r.missionId === mission.id);
            const bestScore = progress.bestScores[mission.id];
            const isCompleted = progress.completedMissions.includes(mission.id);

            return (
              <div
                key={mission.id}
                className={`panel p-4 cursor-pointer transition-all ${result ? 'hover:border-amber' : 'opacity-60'}`}
                onClick={() => result && setSelectedResult(result)}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-teal/20' : 'bg-slate-c/20'}`}>
                    {isCompleted ? <Award className="w-5 h-5 text-teal-c" /> : <span className="text-fog opacity-50 font-mono text-sm">{String(idx + 1).padStart(2, '0')}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{mission.name}</h3>
                    <p className="text-xs text-fog opacity-60">{mission.crisisCategory} · Difficulty {mission.difficulty}/5</p>
                  </div>
                  {bestScore !== undefined && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-c">
                        <Star className="w-3.5 h-3.5" />
                        <span className="font-mono font-bold">{bestScore}</span>
                      </div>
                      {result && (
                        <div className="text-xs text-fog opacity-50 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(result.timeTaken)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={() => setSelectedResult(null)}>
            <div className="panel-dark p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {getMission(selectedResult.missionId)?.name}
                </h2>
                <button onClick={() => setSelectedResult(null)} className="text-fog opacity-50 hover:opacity-100">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className={`text-center py-2 rounded ${selectedResult.success ? 'bg-teal/20 text-teal-c' : selectedResult.partial ? 'bg-amber/20 text-amber-c' : 'bg-coral/20 text-coral-c'}`}>
                  {selectedResult.success ? 'MISSION COMPLETE' : selectedResult.partial ? 'PARTIAL RECOVERY' : 'MISSION FAILED'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="panel-dark p-2">
                    <div className="text-xs text-fog opacity-50">Score</div>
                    <div className="font-mono font-bold text-amber-c">{selectedResult.score}</div>
                  </div>
                  <div className="panel-dark p-2">
                    <div className="text-xs text-fog opacity-50">Objectives</div>
                    <div className="font-mono">{selectedResult.objectivesCompleted}/{selectedResult.objectivesTotal}</div>
                  </div>
                  <div className="panel-dark p-2">
                    <div className="text-xs text-fog opacity-50">Time</div>
                    <div className="font-mono">{formatTime(selectedResult.timeTaken)}</div>
                  </div>
                  <div className="panel-dark p-2">
                    <div className="text-xs text-fog opacity-50">Budget Used</div>
                    <div className="font-mono">{selectedResult.budgetSpent}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-fog opacity-50 mb-1">Score Breakdown</h4>
                  {selectedResult.scoreBreakdown.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-fog">{item.label}</span>
                      <span className="font-mono text-warm">+{item.value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-fog opacity-50 mb-1">Recent Events</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selectedResult.events.slice(-10).map((e, i) => (
                      <div key={i} className="text-xs text-fog opacity-70">
                        <span className="font-mono opacity-50">[{formatTime(e.time)}]</span> {e.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset confirmation */}
        {showConfirmReset && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={() => setShowConfirmReset(false)}>
            <div className="panel-dark p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-coral-c mb-3">Reset All Data?</h2>
              <p className="text-sm text-fog mb-4">
                This will permanently delete all campaign progress, mission results, and custom scenarios. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={handleReset} className="btn btn-coral flex-1">Yes, Delete Everything</button>
                <button onClick={() => setShowConfirmReset(false)} className="btn btn-ghost flex-1">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
