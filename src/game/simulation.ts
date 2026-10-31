import type { CityNode, CityConnection, GameEvent, SimulationState } from './types';

// Deterministic simulation engine for Cascade Protocol

let eventCounter = 0;
function makeEventId(): string {
  return `evt-${++eventCounter}`;
}

export function createEvent(
  time: number,
  type: GameEvent['type'],
  message: string,
  severity: GameEvent['severity'] = 'info',
  nodeId: string | null = null,
): GameEvent {
  return { id: makeEventId(), time, type, message, severity, nodeId };
}

// Evaluate whether a node has the resources it needs to operate.
// For each dependency, check if a valid operational path exists to a source.
export function evaluateNodeSupply(
  nodeId: string,
  nodes: Record<string, CityNode>,
  connections: Record<string, CityConnection>,
  evaluated: Set<string> = new Set(),
): { power: boolean; comm: boolean; water: boolean; powerCapacity: number; commCapacity: number; waterCapacity: number } {
  if (evaluated.has(nodeId)) {
    // Cycle - treat as not supplying to avoid infinite loops
    return { power: false, comm: false, water: false, powerCapacity: 0, commCapacity: 0, waterCapacity: 0 };
  }
  evaluated.add(nodeId);

  const node = nodes[nodeId];
  if (!node) return { power: false, comm: false, water: false, powerCapacity: 0, commCapacity: 0, waterCapacity: 0 };

  // If node is a source itself
  let powerOk = node.supportsPower;
  let commOk = node.supportsComm;
  let waterOk = node.supportsWater;

  let powerCap = node.supportsPower ? node.baseCapacity : 0;
  let commCap = node.supportsComm ? node.baseCapacity : 0;
  let waterCap = node.supportsWater ? node.baseCapacity : 0;

  // Check dependency connections - incoming connections of matching type
  // A node depends on its listed dependencies; for each dependency that is a source
  // or can provide the needed utility, and the connection is operational, it counts.
  for (const depId of node.dependencies) {
    const depNode = nodes[depId];
    if (!depNode) continue;

    // Only count if dep node is operational or degraded (not failed)
    if (depNode.state === 'failed' || depNode.state === 'underRepair' || depNode.state === 'isolated') continue;

    // Find the connection from dep -> node (or node -> dep, bidirectional for utility)
    const conn = findConnection(nodeId, depId, connections);
    if (!conn) {
      // Direct dependency without a connection link - treat dependency node state as the supply
      // This handles cases where dependency is a source node directly
      const depSupply = evaluateNodeSupply(depId, nodes, connections, new Set(evaluated));
      if (depSupply.power) { powerOk = true; powerCap = Math.max(powerCap, Math.min(depSupply.powerCapacity, depNode.currentCapacity)); }
      if (depSupply.comm) { commOk = true; commCap = Math.max(commCap, Math.min(depSupply.commCapacity, depNode.currentCapacity)); }
      if (depSupply.water) { waterOk = true; waterCap = Math.max(waterCap, Math.min(depSupply.waterCapacity, depNode.currentCapacity)); }
      continue;
    }

    if (conn.state === 'failed' || conn.state === 'underRepair') continue;

    // The connection supplies based on its type
    const effectiveConnCap = conn.currentCapacity;
    const depSupply = evaluateNodeSupply(depId, nodes, connections, new Set(evaluated));

    if (conn.type === 'power' && depSupply.power) {
      powerOk = true;
      powerCap = Math.max(powerCap, Math.min(effectiveConnCap, depSupply.powerCapacity));
    }
    if (conn.type === 'comm' && depSupply.comm) {
      commOk = true;
      commCap = Math.max(commCap, Math.min(effectiveConnCap, depSupply.commCapacity));
    }
    if (conn.type === 'water' && depSupply.water) {
      waterOk = true;
      waterCap = Math.max(waterCap, Math.min(effectiveConnCap, depSupply.waterCapacity));
    }
  }

  return { power: powerOk, comm: commOk, water: waterOk, powerCapacity: powerCap, commCapacity: commCap, waterCapacity: waterCap };
}

function findConnection(a: string, b: string, connections: Record<string, CityConnection>): CityConnection | null {
  for (const conn of Object.values(connections)) {
    if ((conn.source === a && conn.destination === b) || (conn.source === b && conn.destination === a)) {
      return conn;
    }
  }
  return null;
}

// Determine what a node needs to be operational based on its category
export function getNodeRequirements(category: string): { power: boolean; comm: boolean; water: boolean } {
  switch (category) {
    case 'substation':
      return { power: false, comm: false, water: false }; // source
    case 'powerDistribution':
      return { power: true, comm: false, water: false };
    case 'commTower':
      return { power: true, comm: false, water: false }; // comm source, needs power
    case 'commRelay':
      return { power: true, comm: true, water: false };
    case 'trafficSignal':
      return { power: true, comm: false, water: false };
    case 'intersection':
      return { power: true, comm: false, water: false };
    case 'hospital':
      return { power: true, comm: true, water: true };
    case 'dispatchCenter':
      return { power: true, comm: true, water: false };
    case 'waterTreatment':
      return { power: true, comm: false, water: false };
    case 'pumpingStation':
      return { power: true, comm: false, water: true };
    case 'distributionFacility':
      return { power: true, comm: false, water: false };
    case 'emergencyShelter':
      return { power: true, comm: false, water: true };
    case 'criticalService':
      return { power: true, comm: true, water: false };
    default:
      return { power: true, comm: false, water: false };
  }
}

// Main propagation: given current failed nodes, recompute all node states
export function propagateFailures(state: SimulationState): GameEvent[] {
  const newEvents: GameEvent[] = [];
  const { nodes, connections } = state;

  // Build set of explicitly failed nodes (those set by scenario or failed connections)
  // We don't override underRepair or source-failed states
  const maxIter = 10;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    for (const node of Object.values(nodes)) {
      // Skip nodes under repair - they stay as-is until repaired
      if (node.state === 'underRepair') continue;
      // Skip explicitly failed nodes (scenario-set) - they stay failed until repaired
      if (node.state === 'failed') continue;
      // Skip isolated nodes
      if (node.state === 'isolated') continue;

      const req = getNodeRequirements(node.category);
      const supply = evaluateNodeSupply(node.id, nodes, connections);

      // Source nodes (substations, comm towers, water plants) are failed only if their own state is failed
      // Non-source nodes depend on their supply
      if (node.supportsPower && !req.power && !req.comm && !req.water) {
        // Pure source - its state is determined externally (scenario), skip
        continue;
      }
      if (node.supportsComm && req.power && !req.comm && !req.water && node.category === 'commTower') {
        // Comm tower needs power to operate as comm source
        if (!supply.power) {
          if (node.state !== 'failed') {
            recordStateChange(node, node.state, 'failed', 'Lost power supply', state.time);
            node.state = 'failed';
            node.currentCapacity = 0;
            newEvents.push(createEvent(state.time, 'propagation', `${node.name} has failed: lost power supply`, 'critical', node.id));
            changed = true;
          }
        } else {
          // Partial capacity based on power supply
          const expectedCap = Math.min(supply.powerCapacity, node.baseCapacity);
          if (expectedCap < node.baseCapacity * 0.5 && node.state === 'operational') {
            node.state = 'degraded';
            node.currentCapacity = expectedCap;
            newEvents.push(createEvent(state.time, 'propagation', `${node.name} is degraded: reduced power supply`, 'warning', node.id));
            recordStateChange(node, 'operational', 'degraded', 'Reduced power supply', state.time);
            changed = true;
          }
        }
        continue;
      }

      // Non-source nodes: check all required utilities
      let allMet = true;
      let anyDegraded = false;
      let capacityFactor = 1;

      if (req.power && !supply.power) allMet = false;
      if (req.comm && !supply.comm) allMet = false;
      if (req.water && !supply.water) allMet = false;

      if (req.power && supply.power && supply.powerCapacity < 70) { anyDegraded = true; capacityFactor = Math.min(capacityFactor, supply.powerCapacity / 100); }
      if (req.comm && supply.comm && supply.commCapacity < 70) { anyDegraded = true; capacityFactor = Math.min(capacityFactor, supply.commCapacity / 100); }
      if (req.water && supply.water && supply.waterCapacity < 70) { anyDegraded = true; capacityFactor = Math.min(capacityFactor, supply.waterCapacity / 100); }

      if (!allMet) {
        if (node.state !== 'failed') {
          const missing: string[] = [];
          if (req.power && !supply.power) missing.push('power');
          if (req.comm && !supply.comm) missing.push('communications');
          if (req.water && !supply.water) missing.push('water');
          recordStateChange(node, node.state, 'failed', `Lost ${missing.join(', ')}`, state.time);
          node.state = 'failed';
          node.currentCapacity = 0;
          newEvents.push(createEvent(state.time, 'propagation', `${node.name} has failed: lost ${missing.join(', ')} supply`, 'critical', node.id));
          changed = true;
        }
      } else if (anyDegraded) {
        if (node.state === 'operational') {
          node.state = 'degraded';
          node.currentCapacity = Math.round(node.baseCapacity * capacityFactor);
          recordStateChange(node, 'operational', 'degraded', 'Reduced utility supply', state.time);
          newEvents.push(createEvent(state.time, 'propagation', `${node.name} is degraded: reduced utility supply`, 'warning', node.id));
          changed = true;
        }
      } else {
        // All met and not degraded
        if (node.state === 'degraded') {
          node.state = 'operational';
          node.currentCapacity = node.baseCapacity;
          recordStateChange(node, 'degraded', 'operational', 'Utility supply restored', state.time);
          newEvents.push(createEvent(state.time, 'propagation', `${node.name} is operational again`, 'success', node.id));
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  return newEvents;
}

function recordStateChange(node: CityNode, from: string, to: string, reason: string, time: number) {
  node.history.push({ time, fromState: from as CityNode['state'], toState: to as CityNode['state'], reason });
}

// Apply initial scenario failures
export function applyInitialFailures(state: SimulationState): GameEvent[] {
  const events: GameEvent[] = [];
  const { mission, nodes, connections } = state;

  for (const nodeId of mission.initialFailedNodes) {
    const node = nodes[nodeId];
    if (node) {
      recordStateChange(node, node.state, 'failed', 'Initial incident', 0);
      node.state = 'failed';
      node.currentCapacity = 0;
      events.push(createEvent(0, 'incident', `${node.name} has failed: initial incident`, 'critical', node.id));
    }
  }

  for (const nodeId of mission.initialDegradedNodes) {
    const node = nodes[nodeId];
    if (node) {
      recordStateChange(node, node.state, 'degraded', 'Initial degradation', 0);
      node.state = 'degraded';
      node.currentCapacity = Math.round(node.baseCapacity * 0.5);
      events.push(createEvent(0, 'incident', `${node.name} is degraded`, 'warning', node.id));
    }
  }

  for (const connId of mission.initialFailedConnections) {
    const conn = connections[connId];
    if (conn) {
      conn.state = 'failed';
      conn.currentCapacity = 0;
      events.push(createEvent(0, 'incident', `Connection ${connId} is severed`, 'critical', null));
    }
  }

  // Propagate
  const propagated = propagateFailures(state);
  events.push(...propagated);

  return events;
}
