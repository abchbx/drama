import { useState, useEffect } from 'react';
import { socketService } from '../../lib/socket';
import { TokenProgress } from './TokenProgress';
import type { MemoryState as MemoryStateType } from '../../lib/types';
import './visualization.css';

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

  return (
    <div className="memory-state">
      <div className="memory-layers">
        {layers.map(([layer, state]) => {
          const entries = layerEntries[layer] || [];
          const entryCount = (state as any).entryCount ?? entries.length;
          const hasContent = entries.length > 0;

          return (
            <div key={layer} className="memory-layer">
              <div className="layer-header">
                <h4 className="layer-title">{layerLabels[layer] || layer}</h4>
                <span className="layer-stats">
                  {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <p className="layer-description">{layerDescriptions[layer]}</p>
              <TokenProgress
                layer={layerLabels[layer] || layer}
                tokensUsed={state.tokensUsed}
                budget={state.budget}
              />
              <div className="layer-content">
                {hasContent ? (
                  <ul className="layer-entries">
                    {entries.map((entry) => (
                      <li key={entry.id} className="layer-entry">
                        <div className="entry-meta">
                          {entry.agentId && (
                            <span className="entry-agent">{entry.agentId}</span>
                          )}
                          <span className="entry-time">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="entry-text">
                          {entry.content.length > 150
                            ? entry.content.substring(0, 150) + '...'
                            : entry.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="layer-empty">No entries yet. Content will appear when agents write to this layer.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
