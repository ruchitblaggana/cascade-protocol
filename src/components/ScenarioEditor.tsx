import { useState, useEffect } from 'react';
import { ChevronLeft, Wrench, Plus, Trash2, Save, Play, AlertTriangle, Check } from 'lucide-react';
import type { Screen } from '@/App';
import type { Mission, MissionObjective, CrewType } from '@/game/types';
import { createCityNodes } from '@/game/city';
import { loadCustomScenarios, saveCustomScenario, deleteCustomScenario, type SavedScenario } from '@/game/persistence';
import { useGame } from '@/game/GameContext';

interface ScenarioEditorProps {
  onNavigate: (screen: Screen) => void;
}

const NODE_CATEGORIES = ['substation', 'hospital', 'commTower', 'intersection', 'waterTreatment', 'pumpingStation', 'dispatchCenter', 'powerDistribution', 'criticalService'];

export default function ScenarioEditor({ onNavigate }: ScenarioEditorProps) {
  const { startMission } = useGame();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [name, setName] = useState('Custom Crisis');
  const [description, setDescription] = useState('');
  const [failedNodes, setFailedNodes] = useState<string[]>([]);
  const [degradedNodes, setDegradedNodes] = useState<string[]>([]);
  const [budget, setBudget] = useState(300);
  const [supplies, setSupplies] = useState(2);
  const [timeLimit, setTimeLimit] = useState(120);
  const [crews, setCrews] = useState<{ type: CrewType; count: number }[]>([
    { type: 'electrical', count: 2 },
    { type: 'communications', count: 1 },
    { type: 'civil', count: 2 },
  ]);
  const [validation, setValidation] = useState<string[]>([]);

  const allNodes = Object.values(createCityNodes());

  useEffect(() => {
    loadCustomScenarios().then(setScenarios);
  }, []);

  const validateScenario = (): string[] => {
    const errors: string[] = [];
    if (name.trim().length === 0) errors.push('Scenario must have a name.');
    if (failedNodes.length === 0) errors.push('At least one node must be initially failed.');
    if (budget < 50) errors.push('Budget too low (minimum 50).');
    if (crews.every(c => c.count === 0)) errors.push('At least one crew must be available.');
    // Check if any crew can repair the failed nodes
    for (const nodeId of failedNodes) {
      const node = allNodes.find(n => n.id === nodeId);
      if (node && node.repairCost > 0) {
        const hasCrew = crews.some(c => c.type === node.requiredCrew && c.count > 0);
        if (!hasCrew) errors.push(`No ${node.requiredCrew} crew available to repair ${node.name}.`);
      }
    }
    // Check budget sufficiency
    const totalRepairCost = failedNodes.reduce((sum, id) => {
      const n = allNodes.find(node => node.id === id);
      return sum + (n?.repairCost || 0);
    }, 0);
    if (totalRepairCost > budget) errors.push(`Budget (${budget}) may be insufficient for all repairs (estimated ${totalRepairCost}).`);
    return errors;
  };

  const handleSave = async () => {
    const errors = validateScenario();
    setValidation(errors);
    if (errors.length > 0) return;

    const objective: MissionObjective = {
      id: 'obj-custom-1',
      description: `Restore all ${failedNodes.length} initially failed nodes`,
      type: 'restoreNode',
      target: failedNodes[0],
      threshold: 100,
      primary: true,
      completed: false,
      failed: false,
    };

    const mission: Mission = {
      id: `custom-${Date.now()}`,
      name: name,
      crisisCategory: 'Custom Scenario',
      difficulty: 3,
      briefing: description || `Custom crisis scenario. ${failedNodes.length} infrastructure nodes have failed. Restore essential services with the available resources.`,
      primaryObjective: 'Restore all initially failed nodes to operational status',
      objectives: [
        objective,
        ...failedNodes.slice(1).map((id, i) => ({
          id: `obj-custom-${i + 2}`,
          description: `Restore ${allNodes.find(n => n.id === id)?.name || id}`,
          type: 'restoreNode' as const,
          target: id,
          threshold: 100,
          primary: true,
          completed: false,
          failed: false,
        })),
      ],
      initialFailedNodes: failedNodes,
      initialFailedConnections: [],
      initialDegradedNodes: degradedNodes,
      availableCrews: crews,
      budget,
      supplies,
      timeLimit,
      hiddenInfo: [],
      unlockAfter: null,
      constraints: ['Custom scenario'],
      secondaryObjectiveDescriptions: timeLimit > 0 ? [`Complete within ${timeLimit} minutes`] : [],
    };

    const saved: SavedScenario = {
      id: mission.id,
      name,
      description,
      mission,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveCustomScenario(saved);
    const fresh = await loadCustomScenarios();
    setScenarios(fresh);
    setValidation([]);
  };

  const handlePlay = async (scenario: SavedScenario) => {
    // Reload the latest scenario data to get the full mission
    const allScenarios = await loadCustomScenarios();
    const fresh = allScenarios.find(s => s.id === scenario.id);
    if (fresh) {
      startMission(fresh.mission.id, fresh.mission);
      onNavigate('operations');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCustomScenario(id);
    const fresh = await loadCustomScenarios();
    setScenarios(fresh);
  };

  const toggleNode = (id: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(id)) setter(list.filter(n => n !== id));
    else setter([...list, id]);
  };

  return (
    <div className="min-h-screen bg-midnight text-warm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-c/30">
        <button onClick={() => onNavigate('menu')} className="flex items-center gap-2 text-fog hover:text-amber-c transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Main Menu</span>
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-c" /> Scenario Editor
        </h1>
        <div className="w-20" />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-amber-c">Scenario Details</h2>
            <div>
              <label className="text-xs text-fog opacity-60 block mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-deep-blue border border-slate-c rounded px-3 py-1.5 text-sm text-warm focus:border-amber outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-fog opacity-60 block mb-1">Description / Briefing</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-deep-blue border border-slate-c rounded px-3 py-1.5 text-sm text-warm focus:border-amber outline-none resize-none"
                placeholder="Describe the crisis scenario..."
              />
            </div>
          </div>

          {/* Failed nodes */}
          <div className="panel p-4 space-y-2">
            <h2 className="text-sm uppercase tracking-wider text-coral-c">Initially Failed Nodes</h2>
            <p className="text-xs text-fog opacity-50">Select which infrastructure nodes start in a failed state.</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allNodes.map(node => (
                <label key={node.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-c/20 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={failedNodes.includes(node.id)}
                    onChange={() => toggleNode(node.id, failedNodes, setFailedNodes)}
                    className="accent-coral"
                  />
                  <span className="text-fog">{node.name}</span>
                  <span className="text-fog opacity-40 ml-auto">{node.district}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Degraded nodes */}
          <div className="panel p-4 space-y-2">
            <h2 className="text-sm uppercase tracking-wider text-amber-c">Degraded Nodes (Optional)</h2>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {allNodes.map(node => (
                <label key={node.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-c/20 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={degradedNodes.includes(node.id)}
                    onChange={() => toggleNode(node.id, degradedNodes, setDegradedNodes)}
                    className="accent-amber"
                  />
                  <span className="text-fog">{node.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-amber-c">Resources</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-fog opacity-60 block mb-1">Budget</label>
                <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} min={50} max={1000}
                  className="w-full bg-deep-blue border border-slate-c rounded px-2 py-1 text-sm text-warm focus:border-amber outline-none" />
              </div>
              <div>
                <label className="text-xs text-fog opacity-60 block mb-1">Supplies</label>
                <input type="number" value={supplies} onChange={e => setSupplies(Number(e.target.value))} min={0} max={10}
                  className="w-full bg-deep-blue border border-slate-c rounded px-2 py-1 text-sm text-warm focus:border-amber outline-none" />
              </div>
              <div>
                <label className="text-xs text-fog opacity-60 block mb-1">Time Limit</label>
                <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} min={0} max={300}
                  className="w-full bg-deep-blue border border-slate-c rounded px-2 py-1 text-sm text-warm focus:border-amber outline-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-fog opacity-60">Crews</label>
              {crews.map((crew, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-fog capitalize w-28">{crew.type}</span>
                  <input type="number" value={crew.count} min={0} max={5}
                    onChange={e => { const newCrews = [...crews]; newCrews[i] = { ...crew, count: Number(e.target.value) }; setCrews(newCrews); }}
                    className="w-16 bg-deep-blue border border-slate-c rounded px-2 py-1 text-sm text-warm focus:border-amber outline-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Validation */}
          {validation.length > 0 && (
            <div className="panel p-4 border-l-4 border-l-coral">
              <h3 className="text-sm text-coral-c flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Validation Issues</h3>
              <ul className="space-y-1 text-xs text-fog">
                {validation.map((v, i) => <li key={i}>• {v}</li>)}
              </ul>
            </div>
          )}

          <button onClick={handleSave} className="btn btn-amber w-full">
            <Save className="w-4 h-4" /> Save Scenario
          </button>
        </div>

        {/* Saved scenarios */}
        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-amber-c">Saved Scenarios ({scenarios.length})</h2>
          {scenarios.length === 0 ? (
            <div className="panel-dark p-6 text-center text-fog opacity-50 text-sm">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No saved scenarios yet. Create one using the editor.
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios.map(sc => (
                <div key={sc.id} className="panel p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-warm">{sc.name}</h3>
                      <p className="text-xs text-fog opacity-50 truncate">{sc.description || sc.mission.briefing.substring(0, 60)}</p>
                      <div className="text-xs text-fog opacity-40 mt-1">
                        {sc.mission.initialFailedNodes.length} failed · {sc.mission.budget} credits · {sc.mission.timeLimit > 0 ? `${sc.mission.timeLimit}min` : 'no limit'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handlePlay(sc)} className="btn btn-ghost text-xs px-2" title="Play">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(sc.id)} className="btn btn-ghost text-xs px-2 text-coral-c" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
