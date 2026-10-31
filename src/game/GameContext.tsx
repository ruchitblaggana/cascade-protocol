import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { SimulationState, Mission, CityNode, CityConnection, Crew, RepairJob, GameEvent, PlayerAction, MissionResult, SimulationPhase } from '@/game/types';
import { createCityNodes, createCityConnections } from '@/game/city';
import { applyInitialFailures, propagateFailures, createEvent } from '@/game/simulation';
import { calculateScore, findShortestPath } from '@/game/pathfinding';
import { MISSIONS, getMission } from '@/game/missions';
import {
  loadCampaignProgress, saveCampaignProgress, saveMissionResult,
} from '@/game/persistence';
import type { CampaignProgress } from '@/game/persistence';
import { resetAllData } from '@/game/persistence';

let jobIdCounter = 0;
let actionIdCounter = 0;

export interface GameContextValue {
  state: SimulationState | null;
  progress: CampaignProgress;
  startMission: (missionId: string, customMission?: Mission) => void;
  dispatchCrew: (nodeId: string, crewId: string) => { success: boolean; message: string };
  cancelRepair: (jobId: string) => { success: boolean; message: string };
  investigateNode: (nodeId: string) => { success: boolean; message: string };
  protectNode: (nodeId: string) => { success: boolean; message: string };
  activateBackup: (nodeId: string) => { success: boolean; message: string };
  isolateNode: (nodeId: string) => { success: boolean; message: string };
  deploySupply: (nodeId: string) => { success: boolean; message: string };
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  advanceStep: () => void;
  startSimulation: () => void;
  endMission: () => MissionResult | null;
  completeMission: () => MissionResult | null;
  exitMission: () => void;
  resetProgress: () => void;
  refreshProgress: () => void;
  routeRequest: (from: string, to: string) => ReturnType<typeof findShortestPath> | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState | null>(null);
  const [progress, setProgress] = useState<CampaignProgress>({
    unlockedMissions: ['m01-first-blackout'],
    completedMissions: [],
    bestScores: {},
    inProgressMission: null,
    lastPlayed: 0,
  });
  const stateRef = useRef<SimulationState | null>(null);
  const actionHistoryRef = useRef<PlayerAction[]>([]);
  const tickAccumulator = useRef<number>(0);

  stateRef.current = state;

  const refreshProgress = useCallback(async () => {
    const p = await loadCampaignProgress();
    setProgress(p);
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  // Build initial state for a mission
  const startMission = useCallback((missionId: string, customMission?: Mission) => {
    eventCounterReset();
    const mission = customMission || getMission(missionId);
    if (!mission) return;

    const nodes = createCityNodes();
    const connections = createCityConnections();

    // Create crews
    const crews: Crew[] = [];
    let crewIdx = 0;
    for (const crewSpec of mission.availableCrews) {
      for (let i = 0; i < crewSpec.count; i++) {
        crews.push({
          id: `crew-${crewSpec.type}-${crewIdx++}`,
          type: crewSpec.type,
          available: true,
          currentAssignment: null,
          location: 'hub-transit',
          travelSpeed: 1,
        });
      }
    }

    const newState: SimulationState = {
      nodes,
      connections,
      crews,
      repairJobs: [],
      events: [],
      objectives: JSON.parse(JSON.stringify(mission.objectives)),
      time: 0,
      budget: mission.budget,
      supplies: mission.supplies,
      phase: 'planning',
      speed: 0,
      seed: 42,
      mission,
    };

    // Apply initial failures
    const initEvents = applyInitialFailures(newState);
    newState.events = initEvents;

    actionHistoryRef.current = [];
    setState(newState);
  }, []);

  // Dispatch a crew to repair a node
  const dispatchCrew = useCallback((nodeId: string, crewId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };
    if (currentState.phase === 'paused') return { success: false, message: 'Game is paused' };

    const node = currentState.nodes[nodeId];
    const crew = currentState.crews.find(c => c.id === crewId);
    if (!node || !crew) return { success: false, message: 'Invalid target or crew' };

    // Check if node needs repair
    if (node.state === 'operational' || node.state === 'restored') {
      return { success: false, message: `${node.name} is already operational` };
    }

    // Check crew type compatibility
    if (crew.type !== node.requiredCrew) {
      return { success: false, message: `${crew.type} crew cannot repair ${node.category} (requires ${node.requiredCrew})` };
    }

    // Check crew availability
    if (!crew.available) return { success: false, message: 'Crew is already assigned' };

    // Check budget
    if (currentState.budget < node.repairCost) {
      return { success: false, message: `Insufficient budget (need ${node.repairCost}, have ${currentState.budget})` };
    }

    // Find path for travel time
    const path = findShortestPath(crew.location, nodeId, currentState);
    const travelTime = path.valid ? path.totalTime : 10;

    // Create repair job
    const job: RepairJob = {
      id: `job-${++jobIdCounter}`,
      nodeId,
      connectionId: null,
      crewId: crew.id,
      crewType: crew.type,
      status: 'traveling',
      progress: 0,
      travelProgress: 0,
      startedAt: currentState.time,
      completedAt: null,
      cost: node.repairCost,
    };

    // Deduct budget
    currentState.budget -= node.repairCost;
    node.state = 'underRepair';
    crew.available = false;
    crew.currentAssignment = job.id;
    currentState.repairJobs.push(job);

    const event = createEvent(currentState.time, 'action',
      `${crew.type} crew dispatched to ${node.name} (travel: ${Math.round(travelTime)}min, repair: ${node.repairDuration}min)`,
      'info', nodeId);
    currentState.events.push(event);

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'dispatch',
      target: nodeId,
      crewId: crew.id,
      details: `Dispatch ${crew.type} crew to ${node.name}`,
    });

    // Store travel time on the job via a custom property
    (job as RepairJob & { _travelTime: number })._travelTime = travelTime;

    setState({ ...currentState });
    return { success: true, message: `Crew dispatched to ${node.name}` };
  }, []);

  const cancelRepair = useCallback((jobId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };

    const job = currentState.repairJobs.find(j => j.id === jobId);
    if (!job) return { success: false, message: 'Repair job not found' };
    if (job.status === 'complete') return { success: false, message: 'Job already complete' };

    const crew = currentState.crews.find(c => c.id === job.crewId);
    const node = currentState.nodes[job.nodeId];

    // Refund 50% if cancelled during travel, 25% if during repair
    let refund = 0;
    if (job.status === 'traveling') refund = Math.round(job.cost * 0.5);
    else if (job.status === 'repairing') refund = Math.round(job.cost * 0.25);

    currentState.budget += refund;

    if (crew) {
      crew.available = true;
      crew.currentAssignment = null;
    }
    if (node && node.state === 'underRepair') {
      node.state = 'failed'; // revert to failed state
    }

    job.status = 'cancelled';
    currentState.events.push(createEvent(currentState.time, 'action',
      `Repair at ${node?.name || 'node'} cancelled (refund: ${refund} credits)`, 'warning', job.nodeId));

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'cancel',
      target: job.nodeId,
      details: `Cancel repair at ${node?.name}`,
    });

    // Re-propagate
    propagateFailures(currentState);
    setState({ ...currentState });
    return { success: true, message: `Repair cancelled, ${refund} credits refunded` };
  }, []);

  const investigateNode = useCallback((nodeId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };

    const node = currentState.nodes[nodeId];
    if (!node) return { success: false, message: 'Node not found' };
    if (node.investigated) return { success: false, message: 'Already investigated' };

    node.investigated = true;
    const deps = node.dependencies.map(d => currentState.nodes[d]?.name || d).join(', ');
    currentState.events.push(createEvent(currentState.time, 'action',
      `Investigation of ${node.name} complete. Dependencies: ${deps || 'none'}. Redundancy: ${node.redundancy}`, 'info', nodeId));

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'investigate',
      target: nodeId,
      details: `Investigated ${node.name}`,
    });

    setState({ ...currentState });
    return { success: true, message: `Investigation complete. Dependencies: ${deps || 'none'}` };
  }, []);

  const protectNode = useCallback((nodeId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };

    const node = currentState.nodes[nodeId];
    if (!node) return { success: false, message: 'Node not found' };
    if (node.protected) return { success: false, message: 'Already protected' };

    const cost = 50;
    if (currentState.budget < cost) return { success: false, message: `Need ${cost} credits` };
    if (currentState.supplies < 1) return { success: false, message: 'Need 1 emergency supply' };

    currentState.budget -= cost;
    currentState.supplies -= 1;
    node.protected = true;
    // Protection reduces risk - increases effective redundancy
    node.redundancy = Math.max(node.redundancy, 1);

    currentState.events.push(createEvent(currentState.time, 'action',
      `${node.name} has been protected against cascading failure`, 'success', nodeId));

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'protect',
      target: nodeId,
      details: `Protected ${node.name}`,
    });

    setState({ ...currentState });
    return { success: true, message: `${node.name} is now protected` };
  }, []);

  const activateBackup = useCallback((nodeId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };

    const node = currentState.nodes[nodeId];
    if (!node) return { success: false, message: 'Node not found' };

    const cost = 40;
    if (currentState.budget < cost) return { success: false, message: `Need ${cost} credits` };

    // Try to find an alternative power source through cross-district connections
    let foundBackup = false;
    for (const conn of Object.values(currentState.connections)) {
      if (conn.type !== 'power') continue;
      if (conn.state === 'failed' || conn.state === 'underRepair') continue;
      const otherId = conn.source === nodeId ? conn.destination : conn.destination === nodeId ? conn.source : null;
      if (!otherId) continue;
      const other = currentState.nodes[otherId];
      if (other && other.supportsPower && other.state === 'operational') {
        foundBackup = true;
        break;
      }
    }

    if (!foundBackup) return { success: false, message: 'No backup power source available for this node' };

    currentState.budget -= cost;
    // Temporarily boost capacity
    if (node.state === 'failed') {
      node.state = 'degraded';
      node.currentCapacity = Math.round(node.baseCapacity * 0.5);
    } else if (node.state === 'degraded') {
      node.currentCapacity = Math.min(node.baseCapacity, node.currentCapacity + 30);
    }

    currentState.events.push(createEvent(currentState.time, 'action',
      `Backup power activated for ${node.name}`, 'success', nodeId));

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'activateBackup',
      target: nodeId,
      details: `Activated backup power for ${node.name}`,
    });

    propagateFailures(currentState);
    setState({ ...currentState });
    return { success: true, message: `Backup power activated for ${node.name}` };
  }, []);

  const isolateNode = useCallback((nodeId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };

    const node = currentState.nodes[nodeId];
    if (!node) return { success: false, message: 'Node not found' };

    node.state = 'isolated';
    node.currentCapacity = 0;
    currentState.events.push(createEvent(currentState.time, 'action',
      `${node.name} has been isolated to prevent cascade`, 'warning', nodeId));

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'isolate',
      target: nodeId,
      details: `Isolated ${node.name}`,
    });

    propagateFailures(currentState);
    setState({ ...currentState });
    return { success: true, message: `${node.name} isolated` };
  }, []);

  const deploySupply = useCallback((nodeId: string): { success: boolean; message: string } => {
    const currentState = stateRef.current;
    if (!currentState) return { success: false, message: 'No active mission' };

    if (currentState.supplies < 1) return { success: false, message: 'No emergency supplies available' };

    const node = currentState.nodes[nodeId];
    if (!node) return { success: false, message: 'Node not found' };

    currentState.supplies -= 1;
    // Emergency supply accelerates ongoing repair at this node
    const job = currentState.repairJobs.find(j => j.nodeId === nodeId && j.status === 'repairing');
    if (job) {
      job.progress = Math.min(100, job.progress + 40);
      currentState.events.push(createEvent(currentState.time, 'action',
        `Emergency supply deployed to accelerate repair at ${node.name}`, 'success', nodeId));
    } else {
      // Temporary capacity boost
      node.currentCapacity = Math.min(node.baseCapacity, node.currentCapacity + 40);
      currentState.events.push(createEvent(currentState.time, 'action',
        `Emergency supply deployed to ${node.name}`, 'info', nodeId));
    }

    actionHistoryRef.current.push({
      time: currentState.time,
      type: 'deploySupply',
      target: nodeId,
      details: `Deployed emergency supply to ${node.name}`,
    });

    setState({ ...currentState });
    return { success: true, message: `Supply deployed to ${node.name}` };
  }, []);

  const startSimulation = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState || currentState.phase !== 'planning') return;
    currentState.phase = 'active';
    currentState.speed = 1;
    currentState.events.push(createEvent(currentState.time, 'system', 'Simulation started', 'info'));
    setState({ ...currentState });
  }, []);

  const togglePause = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState) return;
    if (currentState.phase === 'active') {
      currentState.phase = 'paused';
      currentState.speed = 0;
    } else if (currentState.phase === 'paused') {
      currentState.phase = 'active';
      currentState.speed = 1;
    }
    setState({ ...currentState });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const currentState = stateRef.current;
    if (!currentState) return;
    currentState.speed = speed;
    if (speed > 0) currentState.phase = 'active';
    else currentState.phase = 'paused';
    setState({ ...currentState });
  }, []);

  // Process a single simulation step (1 sim-minute)
  const processStep = useCallback((s: SimulationState) => {
    s.time += 1;

    // Process repair jobs
    for (const job of s.repairJobs) {
      if (job.status === 'cancelled' || job.status === 'complete') continue;

      const jobExt = job as RepairJob & { _travelTime: number };
      const node = s.nodes[job.nodeId];
      if (!node) { job.status = 'cancelled'; continue; }

      if (job.status === 'traveling') {
        const travelTime = jobExt._travelTime || 10;
        job.travelProgress = Math.min(100, job.travelProgress + (100 / Math.max(1, travelTime)));
        if (job.travelProgress >= 100) {
          job.status = 'repairing';
          job.startedAt = s.time;
          s.events.push(createEvent(s.time, 'repair',
            `Crew arrived at ${node.name}, repair in progress`, 'info', job.nodeId));
          // Update crew location
          const crew = s.crews.find(c => c.id === job.crewId);
          if (crew) crew.location = job.nodeId;
        }
      } else if (job.status === 'repairing') {
        const repairDuration = Math.max(1, node.repairDuration);
        job.progress = Math.min(100, job.progress + (100 / repairDuration));
        if (job.progress >= 100) {
          job.status = 'complete';
          job.completedAt = s.time;
          node.state = 'restored';
          node.currentCapacity = node.baseCapacity;
          const crew = s.crews.find(c => c.id === job.crewId);
          if (crew) {
            crew.available = true;
            crew.currentAssignment = null;
          }
          s.events.push(createEvent(s.time, 'repair',
            `${node.name} has been restored to operational`, 'success', job.nodeId));
        }
      }
    }

    // Re-evaluate failures and recovery
    propagateFailures(s);

    // Evaluate objectives
    evaluateObjectives(s);

    // Check for failure conditions
    checkFailureConditions(s);
  }, []);

  const advanceStep = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState || currentState.phase === 'planning' || currentState.phase === 'complete') return;
    processStep(currentState);
    setState({ ...currentState });
  }, [processStep]);

  // Auto-tick based on speed
  useEffect(() => {
    if (!state || state.phase !== 'active' || state.speed === 0) return;

    const intervalMs = state.speed === 1 ? 1000 : state.speed === 2 ? 500 : 250;
    const tickFn = () => {
      const currentState = stateRef.current;
      if (!currentState || currentState.phase !== 'active') return;
      processStep(currentState);
      setState({ ...currentState });
    };

    const interval = setInterval(tickFn, intervalMs);
    return () => clearInterval(interval);
  }, [state?.phase, state?.speed, processStep]);

  // Pause when tab is hidden
  useEffect(() => {
    const handler = () => {
      if (document.hidden && stateRef.current && stateRef.current.phase === 'active') {
        const s = stateRef.current;
        s.phase = 'paused';
        s.speed = 0;
        s.events.push(createEvent(s.time, 'system', 'Simulation paused (tab inactive)', 'info'));
        setState({ ...s });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const routeRequest = useCallback((from: string, to: string) => {
    const currentState = stateRef.current;
    if (!currentState) return null;
    return findShortestPath(from, to, currentState);
  }, []);

  const evaluateObjectives = (s: SimulationState) => {
    for (const obj of s.objectives) {
      if (obj.completed || obj.failed) continue;

      if (obj.type === 'restoreNode') {
        const node = s.nodes[obj.target];
        if (node && (node.state === 'operational' || node.state === 'restored')) {
          obj.completed = true;
          s.events.push(createEvent(s.time, 'objective',
            `Objective complete: ${obj.description}`, 'success', obj.target));
        }
      } else if (obj.type === 'maintainService') {
        const node = s.nodes[obj.target];
        if (node && (node.state === 'operational' || node.state === 'restored' || node.state === 'degraded')) {
          // Still maintained - check at end
        } else if (node && node.state === 'failed') {
          obj.failed = true;
          s.events.push(createEvent(s.time, 'objective',
            `Objective failed: ${obj.description}`, 'critical', obj.target));
        }
      } else if (obj.type === 'timeLimit') {
        if (s.time <= obj.threshold) {
          // Still within time - check at end
        }
      } else if (obj.type === 'budgetLimit') {
        const spent = s.mission.budget - s.budget;
        if (spent <= obj.threshold) {
          // Within budget - check at end
        }
      } else if (obj.type === 'custom') {
        if (obj.target === 'both-pumps') {
          const pn = s.nodes['pump-north'];
          const ps = s.nodes['pump-south'];
          if (pn && ps && (pn.state === 'operational' || pn.state === 'restored') && (ps.state === 'operational' || ps.state === 'restored')) {
            obj.completed = true;
            s.events.push(createEvent(s.time, 'objective', `Objective complete: ${obj.description}`, 'success'));
          }
        } else if (obj.target === 'industrial-all') {
          const all = ['sub-industrial', 'pdc-industrial', 'factory-alpha', 'warehouse-dock', 'intersection-industrial'].every(id => {
            const n = s.nodes[id];
            return n && (n.state === 'operational' || n.state === 'restored');
          });
          if (all) {
            obj.completed = true;
            s.events.push(createEvent(s.time, 'objective', `Objective complete: ${obj.description}`, 'success'));
          }
        } else if (obj.target === 'all-substations') {
          const all = ['sub-central', 'sub-medical', 'sub-industrial', 'sub-residential', 'sub-waterworks'].every(id => {
            const n = s.nodes[id];
            return n && (n.state === 'operational' || n.state === 'restored');
          });
          if (all) {
            obj.completed = true;
            s.events.push(createEvent(s.time, 'objective', `Objective complete: ${obj.description}`, 'success'));
          }
        } else if (obj.target === 'alt-route') {
          // Check if player has calculated a route (tracked via action history)
          // This is checked at mission end
        }
      }
    }
  };

  const checkFailureConditions = (s: SimulationState) => {
    // Time limit exceeded
    if (s.mission.timeLimit > 0 && s.time >= s.mission.timeLimit) {
      // Check if all primary objectives are done
      const primaryObjs = s.objectives.filter(o => o.primary);
      const allPrimary = primaryObjs.every(o => o.completed);
      if (!allPrimary) {
        s.phase = 'complete';
      }
    }

    // Budget exhausted with essential services still failed
    if (s.budget <= 0) {
      const essentialFailed = Object.values(s.nodes).some(n =>
        n.criticality === 'critical' && n.state === 'failed' && n.repairCost > 0
      );
      if (essentialFailed && s.crews.every(c => !c.available || !c.currentAssignment)) {
        // Can't continue - no budget and no active repairs for critical nodes
        // This is a soft check, don't force complete
      }
    }
  };

  const completeMission = useCallback((): MissionResult | null => {
    const currentState = stateRef.current;
    if (!currentState) return null;

    currentState.phase = 'complete';
    evaluateObjectives(currentState);

    // Final objective evaluation
    for (const obj of currentState.objectives) {
      if (obj.type === 'timeLimit' && !obj.completed && !obj.failed) {
        if (currentState.time <= obj.threshold) obj.completed = true;
        else obj.failed = true;
      }
      if (obj.type === 'budgetLimit' && !obj.completed && !obj.failed) {
        const spent = currentState.mission.budget - currentState.budget;
        if (spent <= obj.threshold) obj.completed = true;
        else obj.failed = true;
      }
      if (obj.type === 'maintainService' && !obj.completed && !obj.failed) {
        const node = currentState.nodes[obj.target];
        if (node && (node.state === 'operational' || node.state === 'restored' || node.state === 'degraded')) {
          obj.completed = true;
        } else {
          obj.failed = true;
        }
      }
    }

    const primaryObjs = currentState.objectives.filter(o => o.primary);
    const primaryComplete = primaryObjs.every(o => o.completed);
    const somePrimary = primaryObjs.some(o => o.completed);
    const success = primaryComplete;
    const partial = !success && somePrimary;

    const { score, breakdown } = calculateScore(currentState);
    const budgetSpent = currentState.mission.budget - currentState.budget;

    const result: MissionResult = {
      missionId: currentState.mission.id,
      success,
      partial,
      score,
      scoreBreakdown: breakdown,
      objectivesCompleted: currentState.objectives.filter(o => o.completed).length,
      objectivesTotal: currentState.objectives.length,
      timeTaken: currentState.time,
      budgetRemaining: currentState.budget,
      budgetSpent,
      suppliesRemaining: currentState.supplies,
      events: [...currentState.events],
      finalNodeStates: Object.fromEntries(Object.entries(currentState.nodes).map(([k, v]) => [k, v.state])),
      timestamp: Date.now(),
      replayData: {
        initialEvents: currentState.events.slice(0, 10),
        actionHistory: [...actionHistoryRef.current],
        finalState: {
          nodes: Object.fromEntries(Object.entries(currentState.nodes).map(([k, v]) => [k, v.state])),
          connections: Object.fromEntries(Object.entries(currentState.connections).map(([k, v]) => [k, v.state])),
          time: currentState.time,
        },
      },
    };

    // Persist
    saveMissionResult(result).then(() => {
      const newProgress = { ...progress };
      if (success && !newProgress.completedMissions.includes(currentState.mission.id)) {
        newProgress.completedMissions.push(currentState.mission.id);
      }
      if (success) {
        const prevBest = newProgress.bestScores[currentState.mission.id] || 0;
        if (score > prevBest) newProgress.bestScores[currentState.mission.id] = score;
        // Unlock next mission
        const nextMission = MISSIONS.find(m => m.unlockAfter === currentState.mission.id);
        if (nextMission && !newProgress.unlockedMissions.includes(nextMission.id)) {
          newProgress.unlockedMissions.push(nextMission.id);
        }
      }
      newProgress.lastPlayed = Date.now();
      saveCampaignProgress(newProgress).then(() => setProgress(newProgress));
    });

    setState({ ...currentState });
    return result;
  }, [progress]);

  const endMission = useCallback((): MissionResult | null => {
    return completeMission();
  }, [completeMission]);

  const exitMission = useCallback(() => {
    setState(null);
    actionHistoryRef.current = [];
  }, []);

  const resetProgress = useCallback(async () => {
    await resetAllData();
    setProgress({
      unlockedMissions: ['m01-first-blackout'],
      completedMissions: [],
      bestScores: {},
      inProgressMission: null,
      lastPlayed: 0,
    });
  }, []);

  const value: GameContextValue = {
    state,
    progress,
    startMission,
    dispatchCrew,
    cancelRepair,
    investigateNode,
    protectNode,
    activateBackup,
    isolateNode,
    deploySupply,
    togglePause,
    setSpeed,
    advanceStep,
    startSimulation,
    endMission,
    completeMission,
    exitMission,
    resetProgress,
    refreshProgress,
    routeRequest,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

let eventCounter = 0;
function eventCounterReset() {
  eventCounter = 0;
}
