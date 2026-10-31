import type { CityNode, CityConnection, District, NodeCategory, CrewType } from './types';

// City of Meridian - 36 interconnected infrastructure nodes across 6 districts
// Coordinates on a 1000x620 viewBox

interface NodeDef {
  id: string;
  name: string;
  category: NodeCategory;
  district: District;
  x: number;
  y: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  capacity?: number;
  repairCost?: number;
  repairDuration?: number;
  requiredCrew?: CrewType;
  dependencies?: string[];
  supportsPower?: boolean;
  supportsComm?: boolean;
  supportsWater?: boolean;
  redundancy?: number;
  serviceImpact?: string;
}

const NODE_DEFS: NodeDef[] = [
  // === Central District ===
  { id: 'sub-central', name: 'Central Substation', category: 'substation', district: 'central', x: 500, y: 200, criticality: 'critical', capacity: 100, supportsPower: true, repairCost: 120, repairDuration: 40, requiredCrew: 'electrical', serviceImpact: 'Powers central district & communications hub' },
  { id: 'pdc-central', name: 'Central Power Distribution', category: 'powerDistribution', district: 'central', x: 430, y: 240, criticality: 'high', capacity: 80, repairCost: 60, repairDuration: 25, requiredCrew: 'electrical', dependencies: ['sub-central'], serviceImpact: 'Distributes power across central district' },
  { id: 'tower-central', name: 'Central Comm Tower', category: 'commTower', district: 'central', x: 560, y: 170, criticality: 'critical', capacity: 100, supportsComm: true, repairCost: 100, repairDuration: 35, requiredCrew: 'communications', dependencies: ['sub-central'], serviceImpact: 'Primary citywide communications backbone' },
  { id: 'relay-central', name: 'Central Comm Relay', category: 'commRelay', district: 'central', x: 610, y: 220, criticality: 'high', capacity: 80, repairCost: 50, repairDuration: 20, requiredCrew: 'communications', dependencies: ['tower-central'], serviceImpact: 'Relays communications to eastern districts' },
  { id: 'signal-junction-a', name: 'Central Junction A', category: 'trafficSignal', district: 'central', x: 470, y: 290, criticality: 'medium', capacity: 100, repairCost: 30, repairDuration: 15, requiredCrew: 'civil', dependencies: ['pdc-central'], serviceImpact: 'Controls central traffic flow' },
  { id: 'signal-junction-b', name: 'Central Junction B', category: 'trafficSignal', district: 'central', x: 540, y: 310, criticality: 'medium', capacity: 100, repairCost: 30, repairDuration: 15, requiredCrew: 'civil', dependencies: ['pdc-central'], serviceImpact: 'Controls central traffic flow' },
  { id: 'dispatch-central', name: 'Central Dispatch Center', category: 'dispatchCenter', district: 'central', x: 500, y: 350, criticality: 'critical', capacity: 100, repairCost: 90, repairDuration: 30, requiredCrew: 'communications', dependencies: ['sub-central', 'tower-central'], redundancy: 1, serviceImpact: 'Coordinates all emergency response' },
  { id: 'critical-cityhall', name: 'City Hall', category: 'criticalService', district: 'central', x: 430, y: 330, criticality: 'high', capacity: 100, repairCost: 70, repairDuration: 25, requiredCrew: 'electrical', dependencies: ['pdc-central', 'relay-central'], serviceImpact: 'Civic administration & emergency coordination' },

  // === Medical Quarter ===
  { id: 'hospital-main', name: 'Meridian General Hospital', category: 'hospital', district: 'medical', x: 280, y: 150, criticality: 'critical', capacity: 100, repairCost: 0, repairDuration: 0, requiredCrew: 'electrical', dependencies: ['sub-medical', 'relay-medical'], redundancy: 1, serviceImpact: 'Primary trauma & emergency care' },
  { id: 'hospital-stmary', name: "St. Mary's Medical Center", category: 'hospital', district: 'medical', x: 200, y: 220, criticality: 'critical', capacity: 100, repairCost: 0, repairDuration: 0, requiredCrew: 'electrical', dependencies: ['sub-medical'], serviceImpact: 'Secondary emergency care facility' },
  { id: 'sub-medical', name: 'Medical Substation', category: 'substation', district: 'medical', x: 250, y: 100, criticality: 'critical', capacity: 90, supportsPower: true, repairCost: 100, repairDuration: 35, requiredCrew: 'electrical', serviceImpact: 'Powers all medical facilities' },
  { id: 'relay-medical', name: 'Medical Comm Relay', category: 'commRelay', district: 'medical', x: 320, y: 100, criticality: 'high', capacity: 80, repairCost: 50, repairDuration: 20, requiredCrew: 'communications', dependencies: ['tower-central'], serviceImpact: 'Provides medical emergency communications' },
  { id: 'shelter-medical', name: 'Medical Emergency Shelter', category: 'emergencyShelter', district: 'medical', x: 240, y: 270, criticality: 'medium', capacity: 60, repairCost: 40, repairDuration: 18, requiredCrew: 'civil', dependencies: ['sub-medical'], serviceImpact: 'Temporary medical triage capacity' },

  // === Industrial Zone ===
  { id: 'sub-industrial', name: 'Industrial Substation', category: 'substation', district: 'industrial', x: 780, y: 130, criticality: 'critical', capacity: 100, supportsPower: true, repairCost: 110, repairDuration: 35, requiredCrew: 'electrical', serviceImpact: 'Powers all industrial facilities' },
  { id: 'pdc-industrial', name: 'Industrial Power Dist.', category: 'powerDistribution', district: 'industrial', x: 850, y: 170, criticality: 'high', capacity: 80, repairCost: 60, repairDuration: 25, requiredCrew: 'electrical', dependencies: ['sub-industrial'], serviceImpact: 'Distributes industrial power' },
  { id: 'factory-alpha', name: 'Factory Alpha', category: 'criticalService', district: 'industrial', x: 820, y: 100, criticality: 'medium', capacity: 100, repairCost: 50, repairDuration: 20, requiredCrew: 'electrical', dependencies: ['pdc-industrial'], serviceImpact: 'Manufacturing - non-essential' },
  { id: 'warehouse-dock', name: 'Dock Warehouse', category: 'distributionFacility', district: 'industrial', x: 900, y: 120, criticality: 'low', capacity: 100, repairCost: 30, repairDuration: 15, requiredCrew: 'civil', dependencies: ['pdc-industrial'], serviceImpact: 'Emergency supply storage' },
  { id: 'intersection-industrial', name: 'Industrial Intersection', category: 'intersection', district: 'industrial', x: 750, y: 200, criticality: 'medium', capacity: 100, repairCost: 35, repairDuration: 18, requiredCrew: 'civil', dependencies: ['pdc-industrial'], serviceImpact: 'Industrial road junction' },

  // === Residential East ===
  { id: 'sub-residential', name: 'Residential Substation', category: 'substation', district: 'residential', x: 820, y: 420, criticality: 'high', capacity: 90, supportsPower: true, repairCost: 90, repairDuration: 30, requiredCrew: 'electrical', serviceImpact: 'Powers residential east' },
  { id: 'pdc-residential', name: 'Residential Power Dist.', category: 'powerDistribution', district: 'residential', x: 750, y: 380, criticality: 'medium', capacity: 70, repairCost: 50, repairDuration: 20, requiredCrew: 'electrical', dependencies: ['sub-residential'], serviceImpact: 'Distributes residential power' },
  { id: 'shelter-residential', name: 'East Emergency Shelter', category: 'emergencyShelter', district: 'residential', x: 870, y: 480, criticality: 'medium', capacity: 60, repairCost: 40, repairDuration: 18, requiredCrew: 'civil', dependencies: ['sub-residential'], serviceImpact: 'Residential emergency shelter' },
  { id: 'signal-residential', name: 'Residential Signals', category: 'trafficSignal', district: 'residential', x: 780, y: 450, criticality: 'low', capacity: 100, repairCost: 25, repairDuration: 12, requiredCrew: 'civil', dependencies: ['pdc-residential'], serviceImpact: 'Residential traffic control' },

  // === Transit Corridor ===
  { id: 'hub-transit', name: 'Transit Hub', category: 'intersection', district: 'transit', x: 500, y: 450, criticality: 'critical', capacity: 100, repairCost: 70, repairDuration: 30, requiredCrew: 'civil', dependencies: ['sub-central'], serviceImpact: 'Major city road junction & transport hub' },
  { id: 'intersection-north', name: 'North Transit Interchange', category: 'intersection', district: 'transit', x: 400, y: 380, criticality: 'high', capacity: 100, repairCost: 50, repairDuration: 22, requiredCrew: 'civil', dependencies: ['pdc-central'], serviceImpact: 'North-south road connection' },
  { id: 'intersection-south', name: 'South Transit Interchange', category: 'intersection', district: 'transit', x: 600, y: 500, criticality: 'high', capacity: 100, repairCost: 50, repairDuration: 22, requiredCrew: 'civil', dependencies: ['pdc-central'], serviceImpact: 'South-east road connection' },
  { id: 'intersection-east', name: 'East Transit Interchange', category: 'intersection', district: 'transit', x: 680, y: 400, criticality: 'high', capacity: 100, repairCost: 50, repairDuration: 22, requiredCrew: 'civil', dependencies: ['pdc-central'], serviceImpact: 'East-west road connection' },
  { id: 'relay-transit', name: 'Transit Comm Relay', category: 'commRelay', district: 'transit', x: 560, y: 400, criticality: 'medium', capacity: 70, repairCost: 45, repairDuration: 18, requiredCrew: 'communications', dependencies: ['tower-central'], serviceImpact: 'Transit system communications' },

  // === Waterworks District ===
  { id: 'wtplant-main', name: 'Main Water Treatment Plant', category: 'waterTreatment', district: 'waterworks', x: 150, y: 450, criticality: 'critical', capacity: 100, supportsWater: true, repairCost: 120, repairDuration: 40, requiredCrew: 'electrical', dependencies: ['sub-waterworks'], serviceImpact: 'Treats all city water supply' },
  { id: 'pump-north', name: 'North Pumping Station', category: 'pumpingStation', district: 'waterworks', x: 220, y: 380, criticality: 'high', capacity: 80, repairCost: 70, repairDuration: 28, requiredCrew: 'electrical', dependencies: ['wtplant-main', 'sub-waterworks'], serviceImpact: 'Pumps water to northern districts' },
  { id: 'pump-south', name: 'South Pumping Station', category: 'pumpingStation', district: 'waterworks', x: 100, y: 520, criticality: 'high', capacity: 80, repairCost: 70, repairDuration: 28, requiredCrew: 'electrical', dependencies: ['wtplant-main', 'sub-waterworks'], redundancy: 1, serviceImpact: 'Pumps water to southern districts' },
  { id: 'sub-waterworks', name: 'Waterworks Substation', category: 'substation', district: 'waterworks', x: 120, y: 390, criticality: 'critical', capacity: 90, supportsPower: true, repairCost: 100, repairDuration: 30, requiredCrew: 'electrical', serviceImpact: 'Powers water infrastructure' },
  { id: 'dist-water-a', name: 'Water Distribution A', category: 'distributionFacility', district: 'waterworks', x: 200, y: 500, criticality: 'medium', capacity: 70, repairCost: 45, repairDuration: 20, requiredCrew: 'civil', dependencies: ['pump-south'], serviceImpact: 'Distributes water to central/south' },
  { id: 'dist-water-b', name: 'Water Distribution B', category: 'distributionFacility', district: 'waterworks', x: 280, y: 430, criticality: 'medium', capacity: 70, repairCost: 45, repairDuration: 20, requiredCrew: 'civil', dependencies: ['pump-north'], serviceImpact: 'Distributes water to north/east' },
];

// Connections: power, road, comm, water links
interface ConnDef {
  id: string;
  source: string;
  destination: string;
  type: 'power' | 'road' | 'comm' | 'water';
  travelTime?: number;
  capacity?: number;
  repairCost?: number;
  repairDuration?: number;
}

const CONNECTION_DEFS: ConnDef[] = [
  // Power connections
  { id: 'pw-sub-central-pdc', source: 'sub-central', destination: 'pdc-central', type: 'power', capacity: 100 },
  { id: 'pw-sub-central-tower', source: 'sub-central', destination: 'tower-central', type: 'power', capacity: 100 },
  { id: 'pw-pdc-central-signalA', source: 'pdc-central', destination: 'signal-junction-a', type: 'power', capacity: 60 },
  { id: 'pw-pdc-central-signalB', source: 'pdc-central', destination: 'signal-junction-b', type: 'power', capacity: 60 },
  { id: 'pw-pdc-central-dispatch', source: 'pdc-central', destination: 'dispatch-central', type: 'power', capacity: 80 },
  { id: 'pw-pdc-central-cityhall', source: 'pdc-central', destination: 'critical-cityhall', type: 'power', capacity: 70 },
  { id: 'pw-sub-medical-hospMain', source: 'sub-medical', destination: 'hospital-main', type: 'power', capacity: 100 },
  { id: 'pw-sub-medical-hospStMary', source: 'sub-medical', destination: 'hospital-stmary', type: 'power', capacity: 90 },
  { id: 'pw-sub-medical-shelter', source: 'sub-medical', destination: 'shelter-medical', type: 'power', capacity: 60 },
  { id: 'pw-sub-industrial-pdc', source: 'sub-industrial', destination: 'pdc-industrial', type: 'power', capacity: 100 },
  { id: 'pw-pdc-industrial-factory', source: 'pdc-industrial', destination: 'factory-alpha', type: 'power', capacity: 80 },
  { id: 'pw-pdc-industrial-warehouse', source: 'pdc-industrial', destination: 'warehouse-dock', type: 'power', capacity: 70 },
  { id: 'pw-pdc-industrial-intersect', source: 'pdc-industrial', destination: 'intersection-industrial', type: 'power', capacity: 60 },
  { id: 'pw-sub-residential-pdc', source: 'sub-residential', destination: 'pdc-residential', type: 'power', capacity: 80 },
  { id: 'pw-pdc-residential-shelter', source: 'pdc-residential', destination: 'shelter-residential', type: 'power', capacity: 60 },
  { id: 'pw-pdc-residential-signal', source: 'pdc-residential', destination: 'signal-residential', type: 'power', capacity: 50 },
  { id: 'pw-sub-central-hub', source: 'sub-central', destination: 'hub-transit', type: 'power', capacity: 70 },
  { id: 'pw-pdc-central-northInt', source: 'pdc-central', destination: 'intersection-north', type: 'power', capacity: 60 },
  { id: 'pw-pdc-central-southInt', source: 'pdc-central', destination: 'intersection-south', type: 'power', capacity: 60 },
  { id: 'pw-pdc-central-eastInt', source: 'pdc-central', destination: 'intersection-east', type: 'power', capacity: 60 },
  { id: 'pw-sub-waterworks-wtplant', source: 'sub-waterworks', destination: 'wtplant-main', type: 'power', capacity: 100 },
  { id: 'pw-sub-waterworks-pumpN', source: 'sub-waterworks', destination: 'pump-north', type: 'power', capacity: 80 },
  { id: 'pw-sub-waterworks-pumpS', source: 'sub-waterworks', destination: 'pump-south', type: 'power', capacity: 80 },
  // Cross-district power backup
  { id: 'pw-sub-central-sub-medical', source: 'sub-central', destination: 'sub-medical', type: 'power', capacity: 50 },
  { id: 'pw-sub-industrial-sub-residential', source: 'sub-industrial', destination: 'sub-residential', type: 'power', capacity: 50 },

  // Comm connections
  { id: 'cm-tower-relay-central', source: 'tower-central', destination: 'relay-central', type: 'comm', capacity: 100 },
  { id: 'cm-tower-relay-medical', source: 'tower-central', destination: 'relay-medical', type: 'comm', capacity: 80 },
  { id: 'cm-tower-relay-transit', source: 'tower-central', destination: 'relay-transit', type: 'comm', capacity: 70 },
  { id: 'cm-tower-dispatch', source: 'tower-central', destination: 'dispatch-central', type: 'comm', capacity: 100 },
  { id: 'cm-relay-central-cityhall', source: 'relay-central', destination: 'critical-cityhall', type: 'comm', capacity: 70 },

  // Water connections
  { id: 'wt-wtplant-pumpN', source: 'wtplant-main', destination: 'pump-north', type: 'water', capacity: 80 },
  { id: 'wt-wtplant-pumpS', source: 'wtplant-main', destination: 'pump-south', type: 'water', capacity: 80 },
  { id: 'wt-pumpN-distB', source: 'pump-north', destination: 'dist-water-b', type: 'water', capacity: 70 },
  { id: 'wt-pumpS-distA', source: 'pump-south', destination: 'dist-water-a', type: 'water', capacity: 70 },

  // Road connections
  { id: 'rd-hub-northInt', source: 'hub-transit', destination: 'intersection-north', type: 'road', travelTime: 5, capacity: 100 },
  { id: 'rd-hub-southInt', source: 'hub-transit', destination: 'intersection-south', type: 'road', travelTime: 5, capacity: 100 },
  { id: 'rd-hub-eastInt', source: 'hub-transit', destination: 'intersection-east', type: 'road', travelTime: 5, capacity: 100 },
  { id: 'rd-northInt-signalA', source: 'intersection-north', destination: 'signal-junction-a', type: 'road', travelTime: 4, capacity: 100 },
  { id: 'rd-signalA-signalB', source: 'signal-junction-a', destination: 'signal-junction-b', type: 'road', travelTime: 3, capacity: 100 },
  { id: 'rd-signalB-southInt', source: 'signal-junction-b', destination: 'intersection-south', type: 'road', travelTime: 4, capacity: 100 },
  { id: 'rd-eastInt-signalB', source: 'intersection-east', destination: 'signal-junction-b', type: 'road', travelTime: 4, capacity: 100 },
  { id: 'rd-eastInt-industrialInt', source: 'intersection-east', destination: 'intersection-industrial', type: 'road', travelTime: 6, capacity: 100 },
  { id: 'rd-industrialInt-factory', source: 'intersection-industrial', destination: 'factory-alpha', type: 'road', travelTime: 4, capacity: 100 },
  { id: 'rd-northInt-hospMain', source: 'intersection-north', destination: 'hospital-main', type: 'road', travelTime: 5, capacity: 100 },
  { id: 'rd-hospMain-hospStMary', source: 'hospital-main', destination: 'hospital-stmary', type: 'road', travelTime: 3, capacity: 100 },
  { id: 'rd-southInt-distA', source: 'intersection-south', destination: 'dist-water-a', type: 'road', travelTime: 5, capacity: 100 },
  { id: 'rd-distA-wtplant', source: 'dist-water-a', destination: 'wtplant-main', type: 'road', travelTime: 3, capacity: 100 },
  { id: 'rd-eastInt-shelterRes', source: 'intersection-east', destination: 'shelter-residential', type: 'road', travelTime: 6, capacity: 100 },
  { id: 'rd-signalB-dispatch', source: 'signal-junction-b', destination: 'dispatch-central', type: 'road', travelTime: 3, capacity: 100 },
  { id: 'rd-northInt-cityhall', source: 'intersection-north', destination: 'critical-cityhall', type: 'road', travelTime: 4, capacity: 100 },
  { id: 'rd-southInt-pumpS', source: 'intersection-south', destination: 'pump-south', type: 'road', travelTime: 6, capacity: 100 },
];

export function createCityNodes(): Record<string, CityNode> {
  const nodes: Record<string, CityNode> = {};
  for (const def of NODE_DEFS) {
    nodes[def.id] = {
      id: def.id,
      name: def.name,
      category: def.category,
      district: def.district,
      x: def.x,
      y: def.y,
      state: 'operational',
      criticality: def.criticality,
      baseCapacity: def.capacity ?? 100,
      currentCapacity: def.capacity ?? 100,
      repairCost: def.repairCost ?? 0,
      repairDuration: def.repairDuration ?? 0,
      requiredCrew: def.requiredCrew ?? 'civil',
      dependencies: def.dependencies ?? [],
      supportsPower: def.supportsPower ?? false,
      supportsComm: def.supportsComm ?? false,
      supportsWater: def.supportsWater ?? false,
      redundancy: def.redundancy ?? 0,
      serviceImpact: def.serviceImpact ?? '',
      history: [],
      investigated: false,
      protected: false,
    };
  }
  return nodes;
}

export function createCityConnections(): Record<string, CityConnection> {
  const conns: Record<string, CityConnection> = {};
  for (const def of CONNECTION_DEFS) {
    conns[def.id] = {
      id: def.id,
      source: def.source,
      destination: def.destination,
      type: def.type,
      state: 'operational',
      capacity: def.capacity ?? 100,
      currentCapacity: def.capacity ?? 100,
      travelTime: def.travelTime ?? 0,
      repairCost: def.repairCost ?? (def.type === 'road' ? 40 : 50),
      repairDuration: def.repairDuration ?? (def.type === 'road' ? 20 : 25),
      requiredCrew: def.type === 'road' ? 'civil' : def.type === 'power' ? 'electrical' : def.type === 'comm' ? 'communications' : 'civil',
    };
  }
  return conns;
}

export const DISTRICT_INFO: Record<District, { name: string; color: string; description: string }> = {
  central: { name: 'Central District', color: '#56B9A7', description: 'Administrative & commercial center' },
  medical: { name: 'Medical Quarter', color: '#E96F68', description: 'Hospitals & emergency medical' },
  industrial: { name: 'Industrial Zone', color: '#F2B84B', description: 'Factories & power-intensive facilities' },
  residential: { name: 'Residential East', color: '#DDE5E9', description: 'Residential neighborhoods' },
  transit: { name: 'Transit Corridor', color: '#33475C', description: 'Major roads & transport hubs' },
  waterworks: { name: 'Waterworks District', color: '#1B2B40', description: 'Water treatment & distribution' },
};

export const CATEGORY_INFO: Record<NodeCategory, { icon: string; label: string }> = {
  substation: { icon: 'zap', label: 'Substation' },
  powerDistribution: { icon: 'spline', label: 'Power Distribution' },
  commTower: { icon: 'radio-tower', label: 'Comm Tower' },
  commRelay: { icon: 'satellite-dish', label: 'Comm Relay' },
  trafficSignal: { icon: 'traffic-cone', label: 'Traffic Signal' },
  intersection: { icon: 'cross', label: 'Intersection' },
  hospital: { icon: 'plus-square', label: 'Hospital' },
  dispatchCenter: { icon: 'radio', label: 'Dispatch Center' },
  waterTreatment: { icon: 'droplets', label: 'Water Treatment' },
  pumpingStation: { icon: 'droplet', label: 'Pumping Station' },
  distributionFacility: { icon: 'warehouse', label: 'Distribution' },
  emergencyShelter: { icon: 'tent', label: 'Emergency Shelter' },
  criticalService: { icon: 'building', label: 'Critical Service' },
};

export function getDistrictColor(district: District): string {
  return DISTRICT_INFO[district].color;
}
