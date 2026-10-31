import { useEffect, useState } from 'react';
import { Radio, Play, Map, BookOpen, Settings, User, Archive, Wrench, Trophy, ChevronRight } from 'lucide-react';
import { useGame } from '@/game/GameContext';
import { loadSettings, type GameSettings } from '@/game/persistence';
import type { Screen } from '@/App';

interface MainMenuProps {
  onNavigate: (screen: Screen) => void;
  settings: GameSettings;
}

export default function MainMenu({ onNavigate, settings }: MainMenuProps) {
  const { progress } = useGame();
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (settings.reducedMotion) return;
    const interval = setInterval(() => setTime(t => t + 1), 80);
    return () => clearInterval(interval);
  }, [settings.reducedMotion]);

  const hasSave = progress.completedMissions.length > 0 || progress.inProgressMission !== null;

  const menuItems = [
    { label: 'New Campaign', icon: Play, screen: 'campaign' as Screen, enabled: true, desc: 'Start from Mission 01' },
    { label: 'Continue Campaign', icon: ChevronRight, screen: 'campaign' as Screen, enabled: hasSave, desc: hasSave ? `Resume - ${progress.completedMissions.length} missions complete` : 'No saved progress' },
    { label: 'Scenario Selection', icon: Map, screen: 'campaign' as Screen, enabled: true, desc: 'Choose any unlocked mission' },
    { label: 'Challenge Mode', icon: Trophy, screen: 'challenge' as Screen, enabled: true, desc: 'Custom & community scenarios' },
    { label: 'Operations Archive', icon: Archive, screen: 'archive' as Screen, enabled: progress.completedMissions.length > 0, desc: `${progress.completedMissions.length} completed missions` },
    { label: 'Game Guide', icon: BookOpen, screen: 'guide' as Screen, enabled: true, desc: 'Learn the simulation mechanics' },
    { label: 'Scenario Editor', icon: Wrench, screen: 'editor' as Screen, enabled: true, desc: 'Create custom crisis scenarios' },
    { label: 'Settings', icon: Settings, screen: 'settings' as Screen, enabled: true, desc: 'Sound, motion, difficulty' },
    { label: 'Developer / About', icon: User, screen: 'developer' as Screen, enabled: true, desc: 'Ruchit Blaggana' },
  ];

  return (
    <div className="min-h-screen bg-midnight relative overflow-hidden">
      {/* Animated cityscape background */}
      <div className="absolute inset-0">
        <MeridianSkyline reducedMotion={settings.reducedMotion} time={time} />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-12 pb-8 px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-amber flex items-center justify-center">
              <Radio className="w-6 h-6 text-midnight" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-warm tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            CASCADE PROTOCOL
          </h1>
          <p className="mt-3 text-lg text-amber-c font-mono tracking-wider">
            One failure changes everything.
          </p>
          <p className="mt-2 text-sm text-fog opacity-60">
            Urban Crisis-Management Strategy Simulation
          </p>
        </header>

        {/* Menu */}
        <nav className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => item.enabled && onNavigate(item.screen)}
                  disabled={!item.enabled}
                  className="group w-full panel-dark flex items-center gap-4 px-5 py-3.5 text-left transition-all hover:scale-[1.02] hover:border-amber disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon className="w-5 h-5 text-teal-c group-hover:text-amber-c transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-warm font-medium">{item.label}</div>
                    <div className="text-xs text-fog opacity-50 truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-fog opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <footer className="px-6 py-4 text-center text-xs text-fog opacity-40">
          <p>A game by Ruchit Blaggana · Delhi Public School, Vasant Kunj</p>
        </footer>
      </div>
    </div>
  );
}

// Animated SVG skyline of Meridian
function MeridianSkyline({ reducedMotion, time }: { reducedMotion: boolean; time: number }) {
  const pulse = reducedMotion ? 0 : Math.sin(time * 0.05) * 0.3 + 0.7;
  const scanY = reducedMotion ? 100 : (time * 1.5) % 620;

  return (
    <svg viewBox="0 0 1000 620" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="skyGrad" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#1B2B40" />
          <stop offset="60%" stopColor="#111B2B" />
          <stop offset="100%" stopColor="#0a0f1a" />
        </radialGradient>
        <linearGradient id="bldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1B2B40" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#111B2B" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="1000" height="620" fill="url(#skyGrad)" />

      {/* Stars */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (i * 37) % 1000;
        const y = (i * 23) % 300;
        const opacity = reducedMotion ? 0.3 : (Math.sin(time * 0.02 + i) * 0.3 + 0.5);
        return <circle key={i} cx={x} cy={y} r="0.8" fill="#DDE5E9" opacity={opacity} />;
      })}

      {/* Moon */}
      <circle cx="800" cy="80" r="25" fill="#F4F2EB" opacity="0.15" />
      <circle cx="800" cy="80" r="18" fill="#F4F2EB" opacity="0.2" />

      {/* Distant buildings - layer 1 */}
      <g opacity="0.3">
        {Array.from({ length: 12 }).map((_, i) => {
          const x = i * 85;
          const h = 60 + (i * 17) % 80;
          return <rect key={i} x={x} y={620 - h} width="75" height={h} fill="#0f1828" />;
        })}
      </g>

      {/* Mid buildings - layer 2 */}
      <g opacity="0.5">
        {Array.from({ length: 10 }).map((_, i) => {
          const x = i * 100 + 20;
          const h = 100 + (i * 31) % 120;
          const w = 80;
          return (
            <g key={i}>
              <rect x={x} y={620 - h} width={w} height={h} fill="url(#bldGrad)" stroke="#33475C" strokeWidth="0.5" />
              {/* Windows */}
              {Array.from({ length: Math.floor(h / 15) }).map((_, j) => {
                const lit = (i + j + Math.floor(time * 0.02)) % 3 === 0;
                return (
                  <rect
                    key={j}
                    x={x + 8 + (j % 2) * 35}
                    y={620 - h + 10 + j * 15}
                    width="8" height="8"
                    fill={lit ? '#F2B84B' : '#33475C'}
                    opacity={lit ? pulse * 0.6 : 0.3}
                  />
                );
              })}
            </g>
          );
        })}
      </g>

      {/* Foreground - power towers */}
      <g opacity="0.6">
        {[100, 300, 500, 700, 900].map((x, i) => (
          <g key={i} transform={`translate(${x}, ${420})`}>
            <path d="M0 0 L-8 -40 L8 -40 Z M-12 -30 L12 -30 M-6 -40 L0 -50 L6 -40" stroke="#33475C" strokeWidth="1" fill="none" />
            <line x1="0" y1="0" x2="0" y2="80" stroke="#33475C" strokeWidth="1.5" />
            <circle cx="0" cy="-52" r="2" fill={i === 2 ? '#E96F68' : '#56B9A7'} opacity={i === 2 ? pulse : 0.5} />
          </g>
        ))}
        {/* Power lines */}
        <path d="M100 370 Q200 380 300 370 Q400 380 500 370 Q600 380 700 370 Q800 380 900 370" stroke="#33475C" strokeWidth="0.8" fill="none" opacity="0.4" />
      </g>

      {/* Scanning line effect */}
      {!reducedMotion && (
        <line x1="0" y1={scanY} x2="1000" y2={scanY} stroke="#56B9A7" strokeWidth="0.5" opacity="0.1" />
      )}

      {/* Bottom gradient */}
      <rect x="0" y="500" width="1000" height="120" fill="#111B2B" opacity="0.7" />
    </svg>
  );
}
