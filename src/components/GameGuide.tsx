import { ChevronLeft, BookOpen, Network, Wrench, Route, AlertTriangle, Target, Award, Clock, Package, Shield, Search, Zap } from 'lucide-react';
import type { Screen } from '@/App';

interface GameGuideProps {
  onNavigate: (screen: Screen) => void;
}

const SECTIONS = [
  {
    title: 'How the Simulation Works',
    icon: Network,
    color: '#56B9A7',
    content: [
      'Meridian is modeled as a network graph. Each infrastructure node (substations, hospitals, communication towers, etc.) has dependencies on other nodes through power, communication, water, and road connections.',
      'When a node fails, the simulation evaluates which downstream nodes lose their required utilities. A hospital needs power, communications, and water — if any is cut off, the hospital fails too.',
      'Failures cascade through the network following real dependency rules, not random chance. The same starting state and actions will always produce the same result.',
      'Each node has a capacity. A degraded connection provides reduced capacity rather than immediately shutting down dependent services. This means partial failures are possible.',
    ],
  },
  {
    title: 'The Core Gameplay Loop',
    icon: Target,
    color: '#F2B84B',
    content: [
      'Observe → Prioritize → Act → Simulate → Adapt → Recover',
      'During the Planning Phase, the simulation is paused. Inspect infrastructure, review objectives, and dispatch initial crews.',
      'During the Active Phase, the simulation runs in real-time (or at 2x/3x speed). Monitor new incidents, redirect crews, and adapt your strategy.',
      'Pause at any time to make careful decisions. The simulation freezes completely when paused — no hidden timers.',
      'Complete primary objectives to win. Secondary objectives provide bonus score.',
    ],
  },
  {
    title: 'Repair Crews & Resources',
    icon: Wrench,
    color: '#F2B84B',
    content: [
      'Three crew types: Electrical (substations, power lines), Communications (towers, relays), and Civil Works (roads, intersections).',
      'A crew must match the repair type — you cannot send a civil crew to fix a substation.',
      'Crews travel to the repair site (using road pathfinding), then spend time repairing. A crew cannot work on two jobs at once.',
      'Repairs cost credits. Cancel a job for a partial refund (50% during travel, 25% during repair).',
      'Emergency supplies can accelerate an ongoing repair or provide a temporary capacity boost.',
    ],
  },
  {
    title: 'Emergency Routing & Pathfinding',
    icon: Route,
    color: '#56B9A7',
    content: [
      'The game uses Dijkstra\'s shortest-path algorithm to calculate routes through the road network.',
      'Route cost is based on travel time, adjusted for road capacity — degraded roads are slower.',
      'When a road fails, routes automatically recalculate using available alternatives. If no route exists, this is shown explicitly.',
      'Use the Route tool to calculate paths between any two nodes and see the estimated travel time.',
    ],
  },
  {
    title: 'Strategic Decisions',
    icon: AlertTriangle,
    color: '#E96F68',
    content: [
      'Repair vs Investigate: Investigating a node reveals hidden dependencies but costs time. Sometimes an obvious repair is wrong.',
      'Protect vs Recover: Spending resources to protect a node reduces future cascade risk but doesn\'t restore current failures.',
      'Backup vs Primary: Activating backup power is quick but temporary. Repairing the primary source takes longer but is permanent.',
      'Spend vs Reserve: Emergency supplies can save a crisis now, but keeping reserves is valuable if another incident occurs.',
      'Isolate: You can isolate a failing node to prevent its failure from cascading, but it stops providing service.',
    ],
  },
  {
    title: 'Risk Assessment',
    icon: Shield,
    color: '#DDE5E9',
    content: [
      'Each node has a deterministic risk score based on: current degradation, load vs capacity, number of dependent services, redundancy availability, and dependency health.',
      'Risk levels: Low (0-24), Medium (25-49), High (50-74), Critical (75+).',
      'The risk formula is transparent: Score = Σ(weight × value/100) for each factor.',
      'Risk indicators are calculated from the current simulation state, not invented probabilities.',
    ],
  },
  {
    title: 'Scoring System',
    icon: Award,
    color: '#F2B84B',
    content: [
      'Essential services operational: 40 points (hospitals, dispatch centers, water plants, substations)',
      'Citywide recovery: 25 points (percentage of all repairable nodes operational)',
      'Budget efficiency: 15 points (proportion of budget remaining)',
      'Recovery speed: 10 points (proportion of time limit remaining)',
      'Secondary objectives: 10 points (proportion completed)',
      'Total: 100 points. Scores are transparent and reproducible.',
    ],
  },
  {
    title: 'Mission Progression',
    icon: Clock,
    color: '#56B9A7',
    content: [
      'Six missions with increasing complexity. Each mission must be unlocked by completing the previous one.',
      'Mission 01 (The First Blackout) introduces power dependencies and crew dispatch.',
      'Mission 02 (Silent City) adds communication failures and dispatch center dependencies.',
      'Mission 03 (The Broken Lifeline) focuses on pathfinding and emergency routing.',
      'Mission 04 (Waterline) introduces water utilities and capacity constraints.',
      'Mission 05 (Crossfire) combines multiple simultaneous failure types.',
      'Mission 06 (Cascade Protocol) is the compound final crisis across all systems.',
    ],
  },
];

export default function GameGuide({ onNavigate }: GameGuideProps) {
  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30 sticky top-0 bg-midnight/95 backdrop-blur z-10">
        <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-c" /> Game Guide
        </h1>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${section.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>
              <div className="panel p-5 space-y-3">
                {section.content.map((para, i) => (
                  <p key={i} className="text-sm text-fog leading-relaxed">{para}</p>
                ))}
              </div>
            </div>
          );
        })}

        {/* Controls reference */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber/20">
              <Zap className="w-5 h-5 text-amber-c" />
            </div>
            <h2 className="text-xl font-semibold">Controls Reference</h2>
          </div>
          <div className="panel p-5 space-y-2 text-sm text-fog">
            <div className="flex items-start gap-2"><Search className="w-4 h-4 text-teal-c mt-0.5" /> <span><strong>Click a node</strong> to inspect its status, dependencies, and risk.</span></div>
            <div className="flex items-start gap-2"><Wrench className="w-4 h-4 text-amber-c mt-0.5" /> <span><strong>Actions tab</strong> to dispatch crews, protect, activate backup, or deploy supplies.</span></div>
            <div className="flex items-start gap-2"><Route className="w-4 h-4 text-teal-c mt-0.5" /> <span><strong>Route tool</strong> to calculate shortest paths between nodes.</span></div>
            <div className="flex items-start gap-2"><Package className="w-4 h-4 text-amber-c mt-0.5" /> <span><strong>Speed controls</strong> pause, resume, or accelerate simulation (1x/2x/3x).</span></div>
            <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-fog mt-0.5" /> <span><strong>+1m button</strong> advances the simulation one minute at a time.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
