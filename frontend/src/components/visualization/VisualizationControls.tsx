import './visualization.css';

interface VisualizationControlsProps {
  isPaused: boolean;
  setIsPaused: (value: boolean) => void;
}

export function VisualizationControls({ isPaused, setIsPaused }: VisualizationControlsProps) {
  return (
    <div className="visualization-controls">
      <div className="control-group">
        <button
          className={`control-button ${isPaused ? 'resume' : 'pause'}`}
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      <div className="control-group filters">
        <label>
          <input type="checkbox" defaultChecked />
          Show Director
        </label>
        <label>
          <input type="checkbox" defaultChecked />
          Show Actors
        </label>
        <label>
          <input type="checkbox" defaultChecked />
          Show Dialogues
        </label>
      </div>
    </div>
  );
}
