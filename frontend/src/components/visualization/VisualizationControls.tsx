import './visualization.css';

export interface VisualizationFilters {
  showDirector: boolean;
  showActors: boolean;
  showDialogues: boolean;
}

interface VisualizationControlsProps {
  isPaused: boolean;
  setIsPaused: (value: boolean) => void;
  filters: VisualizationFilters;
  setFilters: (filters: VisualizationFilters) => void;
}

export function VisualizationControls({ isPaused, setIsPaused, filters, setFilters }: VisualizationControlsProps) {
  const handleToggle = () => {
    const newValue = !isPaused;
    setIsPaused(newValue);
    console.log(`[VisualizationControls] ${newValue ? 'Paused' : 'Resumed'}`);
  };

  const handleFilterChange = (key: keyof typeof filters) => {
    setFilters({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="visualization-controls">
      {/* 播放控制区域 */}
      <div className="control-section playback-section">
        <button
          className={`control-button ${isPaused ? 'resume' : 'pause'}`}
          onClick={handleToggle}
          type="button"
          aria-label={isPaused ? 'Resume visualization' : 'Pause visualization'}
        >
          <span className="button-icon">{isPaused ? '▶' : '⏸'}</span>
          <span className="button-text">{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
      </div>

      {/* 视觉分隔线 */}
      <div className="control-divider" />

      {/* 过滤器区域 */}
      <div className="control-section filters-section">
        <span className="filters-label">Display Options:</span>
        <div className="filters-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showDirector}
              onChange={() => handleFilterChange('showDirector')}
            />
            <span className="checkmark" />
            <span className="label-text">Show Director</span>
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showActors}
              onChange={() => handleFilterChange('showActors')}
            />
            <span className="checkmark" />
            <span className="label-text">Show Actors</span>
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showDialogues}
              onChange={() => handleFilterChange('showDialogues')}
            />
            <span className="checkmark" />
            <span className="label-text">Show Dialogues</span>
          </label>
        </div>
      </div>
    </div>
  );
}
