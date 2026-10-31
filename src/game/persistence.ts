// Persistence layer: localStorage for settings, IndexedDB for campaign data

const SETTINGS_KEY = 'cascade-protocol-settings';
const CAMPAIGN_DB = 'cascade-protocol-db';
const CAMPAIGN_STORE = 'campaign';
const RESULTS_STORE = 'results';
const SCENARIOS_STORE = 'scenarios';

export interface GameSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  tutorialCompleted: boolean;
  difficulty: 'normal' | 'hard';
}

export interface CampaignProgress {
  unlockedMissions: string[];
  completedMissions: string[];
  bestScores: Record<string, number>;
  inProgressMission: string | null;
  lastPlayed: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  description: string;
  mission: import('./types').Mission;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: false,
  reducedMotion: false,
  tutorialCompleted: false,
  difficulty: 'normal',
};

const DEFAULT_PROGRESS: CampaignProgress = {
  unlockedMissions: ['m01-first-blackout'],
  completedMissions: [],
  bestScores: {},
  inProgressMission: null,
  lastPlayed: 0,
};

// --- localStorage settings ---

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

// --- IndexedDB for campaign data ---

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(CAMPAIGN_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CAMPAIGN_STORE)) db.createObjectStore(CAMPAIGN_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(RESULTS_STORE)) db.createObjectStore(RESULTS_STORE, { keyPath: 'missionId' });
      if (!db.objectStoreNames.contains(SCENARIOS_STORE)) db.createObjectStore(SCENARIOS_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function loadCampaignProgress(): Promise<CampaignProgress> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CAMPAIGN_STORE, 'readonly');
      const store = tx.objectStore(CAMPAIGN_STORE);
      const req = store.get('progress');
      req.onsuccess = () => {
        if (req.result) resolve({ ...DEFAULT_PROGRESS, ...req.result.value });
        else resolve({ ...DEFAULT_PROGRESS });
      };
      req.onerror = () => resolve({ ...DEFAULT_PROGRESS });
    });
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveCampaignProgress(progress: CampaignProgress): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CAMPAIGN_STORE, 'readwrite');
      const store = tx.objectStore(CAMPAIGN_STORE);
      store.put({ key: 'progress', value: progress });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function saveMissionResult(result: import('./types').MissionResult): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(RESULTS_STORE, 'readwrite');
      const store = tx.objectStore(RESULTS_STORE);
      // Only save if better than existing or no existing
      const getReq = store.get(result.missionId);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing || result.score > existing.score) {
          store.put(result);
        }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function loadMissionResult(missionId: string): Promise<import('./types').MissionResult | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(RESULTS_STORE, 'readonly');
      const store = tx.objectStore(RESULTS_STORE);
      const req = store.get(missionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function loadAllResults(): Promise<import('./types').MissionResult[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(RESULTS_STORE, 'readonly');
      const store = tx.objectStore(RESULTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCustomScenario(scenario: SavedScenario): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SCENARIOS_STORE, 'readwrite');
      const store = tx.objectStore(SCENARIOS_STORE);
      store.put(scenario);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function loadCustomScenarios(): Promise<SavedScenario[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SCENARIOS_STORE, 'readonly');
      const store = tx.objectStore(SCENARIOS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteCustomScenario(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SCENARIOS_STORE, 'readwrite');
      const store = tx.objectStore(SCENARIOS_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function exportAllData(): Promise<string> {
  const progress = await loadCampaignProgress();
  const results = await loadAllResults();
  const scenarios = await loadCustomScenarios();
  return JSON.stringify({ progress, results, scenarios, exportedAt: Date.now() }, null, 2);
}

export async function importAllData(json: string): Promise<boolean> {
  try {
    const data = JSON.parse(json);
    if (data.progress) await saveCampaignProgress(data.progress);
    if (data.results && Array.isArray(data.results)) {
      for (const r of data.results) await saveMissionResult(r);
    }
    if (data.scenarios && Array.isArray(data.scenarios)) {
      for (const s of data.scenarios) await saveCustomScenario(s);
    }
    return true;
  } catch {
    return false;
  }
}

export async function resetAllData(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([CAMPAIGN_STORE, RESULTS_STORE, SCENARIOS_STORE], 'readwrite');
      tx.objectStore(CAMPAIGN_STORE).clear();
      tx.objectStore(RESULTS_STORE).clear();
      tx.objectStore(SCENARIOS_STORE).clear();
      tx.oncomplete = () => {
        localStorage.removeItem(SETTINGS_KEY);
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
