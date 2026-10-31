import type { CityNode, CityConnection, SimulationState, RiskAssessment, Criticality } from './types';

// Dijkstra's shortest-path algorithm for emergency routing
// Uses road connections; cost = travel time, respects road state & congestion

export interface PathResult {
  path: string[];        // node ids
  connections: string[]; // connection ids
  totalTime: number;
  valid: boolean;
  reason?: string;
}

interface DijkstraNode {
  id: string;
  dist: number;
  prev: string | null;
  prevConn: string | null;
  visited: boolean;
}

// Get all road neighbors of a node
function getRoadNeighbors(nodeId: string, connections: Record<string, CityConnection>): { neighbor: string; conn: CityConnection; cost: number }[] {
  const neighbors: { neighbor: string; conn: CityConnection; cost: number }[] = [];
  for (const conn of Object.values(connections)) {
    if (conn.type !== 'road') continue;
    if (conn.state === 'failed' || conn.state === 'underRepair') continue;

    let other: string | null = null;
    if (conn.source === nodeId) other = conn.destination;
    else if (conn.destination === nodeId) other = conn.source;

    if (!other) continue;

    // Cost = base travel time, scaled by capacity (degraded = slower)
    const capFactor = conn.currentCapacity > 0 ? Math.max(0.5, 100 / conn.currentCapacity) : 4;
    const cost = conn.travelTime * capFactor;
    neighbors.push({ neighbor: other, conn, cost });
  }
  return neighbors;
}

export function findShortestPath(
  from: string,
  to: string,
  state: SimulationState,
): PathResult {
  const { connections } = state;
  if (from === to) return { path: [from], connections: [], totalTime: 0, valid: true };

  const nodes: Record<string, DijkstraNode> = {};
  for (const nodeId of Object.keys(state.nodes)) {
    nodes[nodeId] = { id: nodeId, dist: Infinity, prev: null, prevConn: null, visited: false };
  }
  nodes[from].dist = 0;

  const queue = Object.values(nodes);

  while (queue.length > 0) {
    // Find min unvisited
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].dist < queue[minIdx].dist) minIdx = i;
    }
    const current = queue[minIdx];
    if (current.dist === Infinity) break;
    if (current.id === to) break;

    queue.splice(minIdx, 1);
    current.visited = true;

    const neighbors = getRoadNeighbors(current.id, connections);
    for (const { neighbor, conn, cost } of neighbors) {
      const n = nodes[neighbor];
      if (n.visited) continue;
      const alt = current.dist + cost;
      if (alt < n.dist) {
        n.dist = alt;
        n.prev = current.id;
        n.prevConn = conn.id;
      }
    }
  }

  if (nodes[to].dist === Infinity) {
    return { path: [], connections: [], totalTime: 0, valid: false, reason: 'No valid road route available' };
  }

  // Reconstruct path
  const path: string[] = [];
  const connIds: string[] = [];
  let current: string | null = to;
  while (current) {
    path.unshift(current);
    const n = nodes[current];
    if (n.prevConn) connIds.unshift(n.prevConn);
    current = n.prev;
  }

  return { path, connections: connIds, totalTime: nodes[to].dist, valid: true };
}

// Check if a node is reachable from any road-accessible hub
export function isRoadReachable(target: string, state: SimulationState, hub: string = 'hub-transit'): boolean {
  const result = findShortestPath(hub, target, state);
  return result.valid;
}

// Risk assessment: deterministic factors based on current state
export function assessRisk(nodeId: string, state: SimulationState): RiskAssessment {
  const node = state.nodes[nodeId];
  if (!node) return { nodeId, level: 'low', score: 0, factors: [] };

  const factors: { label: string; weight: number; value: number }[] = [];
  let score = 0;

  // Factor 1: Current degradation (weight 30)
  const degradation = node.state === 'failed' ? 100 : node.state === 'degraded' ? 50 : node.state === 'isolated' ? 80 : 0;
  factors.push({ label: 'Current degradation', weight: 30, value: degradation });
  score += (degradation / 100) * 30;

  // Factor 2: Load relative to capacity (weight 20)
  const loadFactor = node.baseCapacity > 0 ? ((node.baseCapacity - node.currentCapacity) / node.baseCapacity) * 100 : 0;
  factors.push({ label: 'Load vs capacity', weight: 20, value: loadFactor });
  score += (loadFactor / 100) * 20;

  // Factor 3: Number of dependent services (weight 25)
  const dependentCount = countDependents(nodeId, state);
  const depScore = Math.min(100, dependentCount * 20);
  factors.push({ label: 'Dependent services', weight: 25, value: depScore });
  score += (depScore / 100) * 25;

  // Factor 4: Redundancy availability (weight 15) - less redundancy = higher risk
  const redundancyScore = node.redundancy > 0 ? 0 : 50;
  factors.push({ label: 'No redundancy', weight: 15, value: redundancyScore });
  score += (redundancyScore / 100) * 15;

  // Factor 5: Dependency health (weight 10)
  let unhealthyDeps = 0;
  for (const depId of node.dependencies) {
    const dep = state.nodes[depId];
    if (!dep || dep.state === 'failed' || dep.state === 'degraded') unhealthyDeps++;
  }
  const depHealth = node.dependencies.length > 0 ? (unhealthyDeps / node.dependencies.length) * 100 : 0;
  factors.push({ label: 'Unhealthy dependencies', weight: 10, value: depHealth });
  score += (depHealth / 100) * 10;

  let level: Criticality;
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else level = 'low';

  return { nodeId, level, score: Math.round(score), factors };
}

function countDependents(nodeId: string, state: SimulationState): number {
  let count = 0;
  for (const node of Object.values(state.nodes)) {
    if (node.dependencies.includes(nodeId)) count++;
  }
  return count;
}

export function assessAllRisks(state: SimulationState): RiskAssessment[] {
  return Object.keys(state.nodes).map(id => assessRisk(id, state));
}

// Scoring: transparent, documented, based on mission state
export interface ScoreBreakdown {
  label: string;
  value: number;
}

export function calculateScore(state: SimulationState): { score: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = [];
  let total = 0;

  // 1. Essential services restored (40 points)
  const essentialCats = ['hospital', 'dispatchCenter', 'waterTreatment', 'substation'];
  let essentialOk = 0;
  let essentialTotal = 0;
  for (const node of Object.values(state.nodes)) {
    if (essentialCats.includes(node.category) && node.criticality === 'critical') {
      essentialTotal++;
      if (node.state === 'operational' || node.state === 'restored') essentialOk++;
    }
  }
  const essentialScore = essentialTotal > 0 ? Math.round((essentialOk / essentialTotal) * 40) : 40;
  breakdown.push({ label: 'Essential services operational', value: essentialScore });
  total += essentialScore;

  // 2. Overall city recovery (25 points)
  let operationalCount = 0;
  let totalCount = 0;
  for (const node of Object.values(state.nodes)) {
    if (node.repairCost > 0 || node.dependencies.length > 0) {
      totalCount++;
      if (node.state === 'operational' || node.state === 'restored') operationalCount++;
    }
  }
  const recoveryScore = totalCount > 0 ? Math.round((operationalCount / totalCount) * 25) : 25;
  breakdown.push({ label: 'Citywide recovery', value: recoveryScore });
  total += recoveryScore;

  // 3. Budget efficiency (15 points) - less spent = more points
  const initialBudget = state.mission.budget;
  if (initialBudget > 0) {
    const budgetRatio = state.budget / initialBudget;
    const budgetScore = Math.round(budgetRatio * 15);
    breakdown.push({ label: 'Budget efficiency', value: budgetScore });
    total += budgetScore;
  }

  // 4. Recovery time (10 points)
  if (state.mission.timeLimit > 0) {
    const timeRatio = Math.max(0, 1 - state.time / state.mission.timeLimit);
    const timeScore = Math.round(timeRatio * 10);
    breakdown.push({ label: 'Recovery speed', value: timeScore });
    total += timeScore;
  } else {
    breakdown.push({ label: 'Recovery speed', value: 10 });
    total += 10;
  }

  // 5. Secondary objectives (10 points)
  const secondaryObjs = state.objectives.filter(o => !o.primary);
  const secCompleted = secondaryObjs.filter(o => o.completed).length;
  const secScore = secondaryObjs.length > 0 ? Math.round((secCompleted / secondaryObjs.length) * 10) : 10;
  breakdown.push({ label: 'Secondary objectives', value: secScore });
  total += secScore;

  return { score: total, breakdown };
}
