import { useState } from 'react';

export function SessionParamsTab() {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="tab-content session-params-tab">
      <div className="tab-header">
        <h2>Session Parameters</h2>
        <p>Configure default session settings</p>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label>Default Scene Duration (minutes)</label>
          <input type="number" min="1" max="60" value="30" />
        </div>

        <div className="form-group">
          <label>Default Agent Count</label>
          <input type="number" min="1" max="10" value="3" />
        </div>

        <div className="form-group">
          <label>Memory Folding Strategy</label>
          <select value="semantic">
            <option value="semantic">Semantic Folding</option>
            <option value="procedural">Procedural Folding</option>
            <option value="hybrid">Hybrid Folding</option>
          </select>
        </div>

        <div className="advanced-section">
          <button
            className="advanced-toggle"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            Advanced Settings {isAdvancedOpen ? '▲' : '▼'}
          </button>

          {isAdvancedOpen && (
            <div className="advanced-content">
              <div className="form-group">
                <label>Maximum Token Limit</label>
                <input type="number" min="1000" max="100000" value="4000" />
              </div>

              <div className="form-group">
                <label>Temperature</label>
                <input type="number" step="0.1" min="0" max="2" value="0.7" />
              </div>

              <div className="form-group">
                <label>Context Window Size</label>
                <input type="number" min="1000" max="100000" value="8000" />
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="button primary">Save Settings</button>
          <button className="button secondary">Reset to Defaults</button>
        </div>
      </div>
    </div>
  );
}
