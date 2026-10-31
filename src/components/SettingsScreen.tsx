import { ChevronLeft, Settings as SettingsIcon, Volume2, VolumeX, Eye, EyeOff, RotateCcw, Download, Upload } from 'lucide-react';
import type { Screen } from '@/App';
import type { GameSettings } from '@/game/persistence';
import { exportAllData, importAllData, resetAllData } from '@/game/persistence';
import { useGame } from '@/game/GameContext';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onNavigate: (screen: Screen) => void;
}

export default function SettingsScreen({ settings, onUpdate, onNavigate }: SettingsScreenProps) {
  const { resetProgress } = useGame();

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
      if (success) window.location.reload();
    };
    input.click();
  };

  const handleReset = async () => {
    if (confirm('Delete ALL progress, results, and custom scenarios? This cannot be undone.')) {
      await resetAllData();
      await resetProgress();
      window.location.reload();
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
          <SettingsIcon className="w-5 h-5 text-teal-c" /> Settings
        </h1>
        <div className="w-20" />
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* Sound */}
        <div className="panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-4">Audio</h2>
          <button
            onClick={() => onUpdate({ ...settings, soundEnabled: !settings.soundEnabled })}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-teal-c" /> : <VolumeX className="w-5 h-5 text-fog opacity-50" />}
              <div className="text-left">
                <div className="text-warm">{settings.soundEnabled ? 'Sound Enabled' : 'Sound Disabled'}</div>
                <div className="text-xs text-fog opacity-50">Sound cues for incidents, repairs, and objectives</div>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${settings.soundEnabled ? 'bg-teal' : 'bg-slate-c'}`}>
              <div className={`w-5 h-5 rounded-full bg-warm transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ transform: settings.soundEnabled ? 'translateX(20px)' : 'translateX(2px)', marginTop: '2px' }} />
            </div>
          </button>
        </div>

        {/* Motion */}
        <div className="panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-4">Accessibility</h2>
          <button
            onClick={() => onUpdate({ ...settings, reducedMotion: !settings.reducedMotion })}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              {settings.reducedMotion ? <EyeOff className="w-5 h-5 text-teal-c" /> : <Eye className="w-5 h-5 text-fog opacity-50" />}
              <div className="text-left">
                <div className="text-warm">{settings.reducedMotion ? 'Reduced Motion On' : 'Reduced Motion Off'}</div>
                <div className="text-xs text-fog opacity-50">Disable animations and pulsing effects</div>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${settings.reducedMotion ? 'bg-teal' : 'bg-slate-c'}`}>
              <div className="w-5 h-5 rounded-full bg-warm" style={{ transform: settings.reducedMotion ? 'translateX(20px)' : 'translateX(2px)', marginTop: '2px' }} />
            </div>
          </button>
        </div>

        {/* Data management */}
        <div className="panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-amber-c mb-4">Data Management</h2>
          <div className="space-y-2">
            <button onClick={handleExport} className="btn btn-ghost w-full text-sm justify-start">
              <Download className="w-4 h-4" /> Export all save data
            </button>
            <button onClick={handleImport} className="btn btn-ghost w-full text-sm justify-start">
              <Upload className="w-4 h-4" /> Import save data
            </button>
            <button onClick={handleReset} className="btn btn-ghost w-full text-sm justify-start text-coral-c">
              <RotateCcw className="w-4 h-4" /> Reset all progress (cannot undo)
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-xs text-fog opacity-40 py-4">
          <p>Cascade Protocol · One failure changes everything.</p>
          <p className="mt-1">A game by Ruchit Blaggana · Delhi Public School, Vasant Kunj</p>
          <p className="mt-1">All data stored locally in your browser. No accounts, no cloud sync.</p>
        </div>
      </div>
    </div>
  );
}
