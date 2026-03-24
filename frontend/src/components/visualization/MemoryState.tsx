import { useState, useEffect } from 'react';
import { socketService } from '../../lib/socket';
import type { MemoryState as MemoryStateType } from '../../lib/types';
import './MemoryState.css';

interface MemoryStateProps {
  isPaused: boolean;
}

interface MemoryLayerEntry {
  id: string;
  content: string;
  agentId?: string;
  timestamp: string;
}

const layerLabels: Record<string, string> = {
  core: 'Core',
  scenario: 'Scenario',
  semantic: 'Semantic',
  procedural: 'Procedural',
};

const layerDescriptions: Record<string, string> = {
  core: 'Fundamental facts and immutable truths',
  scenario: 'Current scene context and location details',
  semantic: 'Dialogues, character development, and narrative arc',
  procedural: 'Action patterns, stage directions, and protocols',
};

export function MemoryState({ isPaused }: MemoryStateProps) {
  const [memoryState, setMemoryState] = useState<MemoryStateType>({
    core: { tokensUsed: 0, budget: 2000 },
    scenario: { tokensUsed: 0, budget: 8000 },
    semantic: { tokensUsed: 0, budget: 8000 },
    procedural: { tokensUsed: 0, budget: 4000 },
  });
  const [layerEntries, setLayerEntries] = useState<Record<string, MemoryLayerEntry[]>>({});

  const fetchMemoryState = async () => {
    try {
      const memResponse = await fetch('/api/blackboard/memory');
      if (memResponse.ok) {
        const data = await memResponse.json();
        setMemoryState(data);
      }
    } catch (error) {
      console.error('Failed to fetch memory state:', error);
    }
  };

  // Fetch latest entries for each layer to display content previews
  const fetchLayerEntries = async () => {
    const layers = ['core', 'scenario', 'semantic', 'procedural'] as const;
    for (const layer of layers) {
      try {
        const res = await fetch(`/api/blackboard/layers/${layer}/entries?limit=3`);
        if (res.ok) {
          const data = await res.json();
          if (data.entries) {
            setLayerEntries(prev => ({
              ...prev,
              [layer]: data.entries.slice(0, 3).map((e: any) => ({
                id: e.id,
                content: e.content,
                agentId: e.agentId,
                timestamp: e.timestamp,
              })),
            }));
          }
        }
      } catch {
        // Entries endpoint requires auth - skip silently
      }
    }
  };

  useEffect(() => {
    fetchMemoryState();
    fetchLayerEntries();

    const handleMemoryUpdated = (_data: unknown) => {
      if (isPaused) return;
      fetchMemoryState();
      fetchLayerEntries();
    };

    socketService.on('memory:updated', handleMemoryUpdated);
    return () => socketService.off('memory:updated', handleMemoryUpdated);
  }, [isPaused]);

  const layers = Object.entries(memoryState);

  // Calculate token usage percentage and level
  const getTokenLevel = (used: number, budget: number): 'low' | 'medium' | 'high' => {
    const percentage = (used / budget) * 100;
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'high';
  };

  return (
    <div className="memory-state">
      <div className="memory-layers">
        {layers.map(([layer, state]) => {
          const entries = layerEntries[layer] || [];
          const entryCount = (state as any).entryCount ?? entries.length;
          const hasContent = entries.length > 0;
          const tokenPercentage = Math.min(100, Math.round((state.tokensUsed / state.budget) * 100));
          const tokenLevel = getTokenLevel(state.tokensUsed, state.budget);

          return (
            <div key={layer} className="memory-layer" data-layer={layer}>
              <div className="layer-header">
                <h4 className="layer-title">{layerLabels[layer] || layer}</h4>
                <span className="layer-stats">
                  {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <p className="layer-description">{layerDescriptions[layer]}</p>

              {/* Inline Token Progress */}
              <div className="token-progress">
                <div className="token-progress-header">
                  <span className="token-progress-label">Tokens</span>
                  <span className="token-progress-value">
                    {state.tokensUsed.toLocaleString()} / {state.budget.toLocaleString()}
                  </span>
                </div>
                <div className="token-progress-bar">
                  <div
                    className={`token-progress-fill ${tokenLevel}`}
                    style={{ width: `${tokenPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
