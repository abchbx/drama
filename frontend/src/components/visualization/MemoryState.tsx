import { useState, useEffect } from 'react';
import { socketService } from '../../lib/socket';
import { TokenProgress } from './TokenProgress';
import { MemoryState as MemoryStateType } from '../../lib/types';
import './visualization.css';

interface MemoryStateProps {
  isPaused: boolean;
}

export function MemoryState({ isPaused }: MemoryStateProps) {
  const [memoryState, setMemoryState] = useState<MemoryStateType>({
    core: { tokensUsed: 0, budget: 2000 },
    scenario: { tokensUsed: 0, budget: 8000 },
    semantic: { tokensUsed: 0, budget: 8000 },
    procedural: { tokensUsed: 0, budget: 4000 },
  });

  const fetchMemoryState = async () => {
    try {
      const response = await fetch('/api/blackboard/memory');
      if (response.ok) {
        const data = await response.json();
        setMemoryState(data);
      }
    } catch (error) {
      console.error('Failed to fetch memory state:', error);
    }
  };

  useEffect(() => {
    // Fetch initial memory state
    fetchMemoryState();

    const handleMemoryUpdated = (_data: unknown) => {
      if (isPaused) return;

      // Fetch complete memory state from API
      fetchMemoryState();
    };

    socketService.on('memory:updated', handleMemoryUpdated);
    return () => socketService.off('memory:updated', handleMemoryUpdated);
  }, [isPaused]);

  const layers = Object.entries(memoryState);

  return (
    <div className="memory-state">
      <div className="memory-layers">
        {layers.map(([layer, state]) => (
          <div key={layer} className="memory-layer">
            <h4 className="layer-title">{layer}</h4>
            <TokenProgress
              layer={layer}
              tokensUsed={state.tokensUsed}
              budget={state.budget}
            />
            <div className="layer-content">
              {/* Add layer content display here */}
              <p>Content preview for {layer} layer...</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
