import { useState } from 'react';
import { MessageStream } from './MessageStream';
import { CommunicationGraph } from './CommunicationGraph';
import { MemoryState } from './MemoryState';
import { VisualizationControls } from './VisualizationControls';
import './visualization.css';

export function VisualizationTab() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="tab-content visualization-tab">
      <div className="tab-header">
        <h2>Real-Time Visualization</h2>
        <p>Monitor agent communication and memory state</p>
      </div>

      <VisualizationControls isPaused={isPaused} setIsPaused={setIsPaused} />

      <div className="visualization-layout">
        <section className="message-stream-section">
          <h3>Message Stream</h3>
          <MessageStream isPaused={isPaused} />
        </section>

        <section className="communication-graph-section">
          <h3>Communication Graph</h3>
          <CommunicationGraph isPaused={isPaused} />
        </section>

        <section className="memory-state-section">
          <h3>Memory State</h3>
          <MemoryState isPaused={isPaused} />
        </section>
      </div>
    </div>
  );
}
