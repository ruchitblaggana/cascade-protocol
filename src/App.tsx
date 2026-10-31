import { useState, useEffect, useCallback } from 'react';
import { GameProvider, useGame } from '@/game/GameContext';
import { loadSettings, saveSettings, type GameSettings } from '@/game/persistence';
import MainMenu from '@/components/MainMenu';
import CampaignMap from '@/components/CampaignMap';
import OperationsRoom from '@/components/OperationsRoom';
import AfterActionReview from '@/components/AfterActionReview';
import OperationsArchive from '@/components/OperationsArchive';
import GameGuide from '@/components/GameGuide';
import SettingsScreen from '@/components/SettingsScreen';
import DeveloperSection from '@/components/DeveloperSection';
import ScenarioEditor from '@/components/ScenarioEditor';
import ChallengeMode from '@/components/ChallengeMode';
import MissionBriefing from '@/components/MissionBriefing';

export type Screen =
  | 'menu'
  | 'campaign'
  | 'briefing'
  | 'operations'
  | 'afterAction'
  | 'archive'
  | 'guide'
  | 'settings'
  | 'developer'
  | 'editor'
  | 'challenge';

function GameApp() {
  const { state, startMission, exitMission, refreshProgress, completeMission } = useGame();
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<import('@/game/types').MissionResult | null>(null);
  const [settings, setSettings] = useState<GameSettings>(loadSettings());

  const updateSettings = useCallback((s: GameSettings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  const navigate = useCallback((s: Screen) => {
    setScreen(s);
    if (s === 'menu') refreshProgress();
  }, [refreshProgress]);

  const handleStartMission = (missionId: string) => {
    setSelectedMission(missionId);
    setScreen('briefing');
  };

  const handleBeginMission = () => {
    if (selectedMission) {
      startMission(selectedMission);
      setScreen('operations');
    }
  };

  const handleMissionEnd = useCallback(() => {
    const result = completeMission();
    if (result) {
      setLastResult(result);
      setScreen('afterAction');
    } else {
      navigate('campaign');
    }
  }, [completeMission]);

  // Auto-detect mission completion
  useEffect(() => {
    if (state && state.phase === 'complete' && screen === 'operations') {
      handleMissionEnd();
    }
  }, [state?.phase, screen, handleMissionEnd]);

  return (
    <div className={`min-h-screen bg-midnight text-warm ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
      {screen === 'menu' && <MainMenu onNavigate={navigate} settings={settings} />}
      {screen === 'campaign' && <CampaignMap onNavigate={navigate} onStartMission={handleStartMission} />}
      {screen === 'briefing' && selectedMission && (
        <MissionBriefing
          missionId={selectedMission}
          onBegin={handleBeginMission}
          onBack={() => navigate('campaign')}
        />
      )}
      {screen === 'operations' && state && (
        <OperationsRoom
          onExit={() => { exitMission(); navigate('campaign'); }}
          onComplete={handleMissionEnd}
          settings={settings}
        />
      )}
      {screen === 'afterAction' && lastResult && (
        <AfterActionReview
          result={lastResult}
          onContinue={() => navigate('campaign')}
          onRetry={() => { if (selectedMission) { startMission(selectedMission); setScreen('operations'); } }}
          onMenu={() => navigate('menu')}
        />
      )}
      {screen === 'archive' && <OperationsArchive onNavigate={navigate} />}
      {screen === 'guide' && <GameGuide onNavigate={navigate} />}
      {screen === 'settings' && <SettingsScreen settings={settings} onUpdate={updateSettings} onNavigate={navigate} />}
      {screen === 'developer' && <DeveloperSection onNavigate={navigate} />}
      {screen === 'editor' && <ScenarioEditor onNavigate={navigate} />}
      {screen === 'challenge' && <ChallengeMode onNavigate={navigate} onStartCustom={handleStartMission} />}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}
