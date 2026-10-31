// Core type definitions for Cascade Protocol simulation engine

export type District =
  | 'central'
  | 'medical'
  | 'industrial'
  | 'residential'
  | 'transit'
  | 'waterworks';

export type NodeCategory =
  | 'substation'
  | 'powerDistribution'
  | 'commTower'
  | 'commRelay'
  | 'trafficSignal'
  | 'intersection'
  | 'hospital'
  | 'dispatchCenter'
  | 'waterTreatment'
  | 'pumpingStation'
  | 'distributionFacility'
  | 'emergencyShelter'
  | 'criticalService';

export type NodeState =
  | 'operational'
  | 'degraded'
  | 'failed'
  | 'underRepair'
  | 'restored'
  | 'isolated';

export type Criticality = 'low' | 'medium' | 'high' | 'critical';

export type ConnectionType = 'power' | 'road' | 'comm' | 'water';

export type CrewType = 'electrical' | 'communications' | 'civil';

export type SimulationPhase = 'planning' | 'active' | 'paused' | 'complete';

export interface CityNode {
  id: string;
  name: string;
  category: NodeCategory;
  district: District;
  x: number;
  y: number;
  state: NodeState;
  criticality: Criticality;
  baseCapacity: number;       // 0-100
  currentCapacity: number;    // 0-100
  repairCost: number;
  repairDuration: number;     // simulation minutes
  requiredCrew: CrewType;
  dependencies: string[];     // node ids this node depends on
  supportsPower: boolean;     // can act as power source
  supportsComm: boolean;      // can act as comm source
  supportsWater: boolean;     // can act as water source
  redundancy: number;          // number of redundant paths available
  serviceImpact: string;      // human-readable description
  history: NodeHistoryEntry[];
  investigated: boolean;
  protected: boolean;          // player has spent resources to protect
}

export interface NodeHistoryEntry {
  time: number;               // simulation minutes
  fromState: NodeState;
  toState: NodeState;
  reason: string;
}

export interface CityConnection {
  id: string;
  source: string;
  destination: string;
  type: ConnectionType;
  state: 'operational' | 'degraded' | 'failed' | 'underRepair';
  capacity: number;           // 0-100
  currentCapacity: number;
  travelTime: number;          // base travel minutes (roads)
  repairCost: number;
  repairDuration: number;
  requiredCrew: CrewType;
}

export interface Crew {
  id: string;
  type: CrewType;
  available: boolean;
  currentAssignment: string | null; // repair job id
  location: string;                 // node id
  travelSpeed: number;               // nodes per simulation minute
}

export interface RepairJob {
  id: string;
  nodeId: string;
  connectionId: string | null;
  crewId: string;
  crewType: CrewType;
  status: 'queued' | 'traveling' | 'repairing' | 'complete' | 'cancelled';
  progress: number;        // 0-100
  travelProgress: number;  // 0-100
  startedAt: number | null;
  completedAt: number | null;
  cost: number;
}

export interface GameEvent {
  id: string;
  time: number;            // simulation minutes
  type: 'incident' | 'propagation' | 'repair' | 'action' | 'objective' | 'system' | 'warning' | 'info';
  nodeId: string | null;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface MissionObjective {
  id: string;
  description: string;
  type: 'restoreNode' | 'restoreService' | 'restoreCapacity' | 'maintainService' | 'timeLimit' | 'budgetLimit' | 'custom';
  target: string;          // node id or service key
  threshold: number;        // capacity threshold or time
  primary: boolean;
  completed: boolean;
  failed: boolean;
}

export interface Mission {
  id: string;
  name: string;
  crisisCategory: string;
  difficulty: number;       // 1-5
  briefing: string;
  primaryObjective: string;
  objectives: MissionObjective[];
  initialFailedNodes: string[];
  initialFailedConnections: string[];
  initialDegradedNodes: string[];
  availableCrews: { type: CrewType; count: number }[];
  budget: number;
  supplies: number;
  timeLimit: number;       // simulation minutes, 0 = unlimited
  hiddenInfo: string[];
  unlockAfter: string | null; // mission id that must be completed first
  constraints: string[];
  secondaryObjectiveDescriptions: string[];
}

export interface MissionResult {
  missionId: string;
  success: boolean;
  partial: boolean;
  score: number;
  scoreBreakdown: { label: string; value: number }[];
  objectivesCompleted: number;
  objectivesTotal: number;
  timeTaken: number;
  budgetRemaining: number;
  budgetSpent: number;
  suppliesRemaining: number;
  events: GameEvent[];
  finalNodeStates: Record<string, NodeState>;
  timestamp: number;
  replayData: ReplayData;
}

export interface ReplayData {
  initialEvents: GameEvent[];
  actionHistory: PlayerAction[];
  finalState: {
    nodes: Record<string, NodeState>;
    connections: Record<string, string>;
    time: number;
  };
}

export interface PlayerAction {
  time: number;
  type: 'dispatch' | 'cancel' | 'investigate' | 'protect' | 'reroute' | 'activateBackup' | 'isolate' | 'deploySupply' | 'reallocate';
  target: string;
  crewId?: string;
  details?: string;
}

export interface RiskAssessment {
  nodeId: string;
  level: Criticality;
  score: number;
  factors: { label: string; weight: number; value: number }[];
}

export interface SimulationState {
  nodes: Record<string, CityNode>;
  connections: Record<string, CityConnection>;
  crews: Crew[];
  repairJobs: RepairJob[];
  events: GameEvent[];
  objectives: MissionObjective[];
  time: number;            // simulation minutes elapsed
  budget: number;
  supplies: number;
  phase: SimulationPhase;
  speed: number;           // 0 = paused, 1x, 2x, 3x
  seed: number;
  mission: Mission;
}
