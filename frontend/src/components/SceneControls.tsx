import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import './SceneControls.css';

interface SceneConfig {
  location: string;
  description: string;
  tone: string;
}

const defaultSceneConfig: SceneConfig = {
  location: 'Default Location',
  description: 'A dramatic scene begins',
  tone: 'dramatic',
};

const toneOptions = ['dramatic', 'comedic', 'romantic', 'suspenseful', 'melancholic', 'triumphant'];

/**
 * SceneControls - Start/Stop scene buttons
 *
 * Buttons are placed in the session panel header.
 * Start Scene opens an inline config form for scene parameters.
 * Stop Scene uses HTTP API, not WebSocket.
 */
export function SceneControls() {
  const {
    selectedSession,
    startingScene,
    stoppingScene,
    startScene,
    stopScene,
    lastError,
  } = useAppStore();

  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<SceneConfig>(defaultSceneConfig);
  const [localError, setLocalError] = useState<string | null>(null);

  // Determine button states
  const isIdle = selectedSession?.status === 'idle' || selectedSession?.status === 'created';
  const isRunning = selectedSession?.status === 'running';
  const isDisabled = !selectedSession;
  const isStarting = startingScene;
  const isStopping = stoppingScene;
  const error = localError || lastError;

  const handleStartClick = () => {
    setShowConfig(true);
    setConfig(defaultSceneConfig);
  };

  const handleConfirmStart = async () => {
    console.log('[SceneControls] Starting scene with config:', config);
    setShowConfig(false);
    try {
      // Don't pass actorIds - backend will use all actors from session by default
      await startScene(config.location, config.description, config.tone);
      console.log('[SceneControls] Scene started successfully');
    } catch (error) {
      console.error('[SceneControls] Failed to start scene:', error);
    }
  };

  const handleCancelStart = () => {
    setShowConfig(false);
  };

  const handleStop = async () => {
    console.log('[SceneControls] Stopping scene...');
    try {
      await stopScene('completed');
      console.log('[SceneControls] Scene stopped successfully');
    } catch (error) {
      console.error('[SceneControls] Failed to stop scene:', error);
    }
  };

  return (
    <div className="scene-controls">
      {error && (
        <div className="scene-error-message">
          <span className="error-icon">⚠</span>
          {error}
        </div>
      )}
      <button
        className="scene-controls__button scene-controls__button--start"
        onClick={showConfig ? handleConfirmStart : handleStartClick}
        disabled={isDisabled || isStarting || (!isIdle && !showConfig)}
        title={
          showConfig
            ? 'Confirm and start'
            : isDisabled
            ? 'Select a session to enable'
            : !isIdle
            ? 'Scene can only be started when idle or created'
            : isStarting
            ? 'Starting scene...'
            : 'Configure and start the scene'
        }
      >
        {isStarting ? (
          <>
            <span className="spinner" /> Starting...
          </>
        ) : showConfig ? (
          'Confirm Start'
        ) : (
          'Start Scene'
        )}
      </button>

      {showConfig && (
        <div className="scene-config-overlay">
          <div className="scene-config-panel">
            <h4>Scene Configuration</h4>
            <div className="scene-config-fields">
              <label>
                <span>Location</span>
                <input
                  type="text"
                  value={config.location}
                  onChange={e => setConfig(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Verona, A balcony"
                  autoFocus
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={config.description}
                  onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the scene setup..."
                  rows={2}
                />
              </label>
              <label>
                <span>Tone</span>
                <select
                  value={config.tone}
                  onChange={e => setConfig(prev => ({ ...prev, tone: e.target.value }))}
                >
                  {toneOptions.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="scene-config-actions">
              <button
                className="scene-controls__button scene-controls__button--start"
                onClick={handleConfirmStart}
                disabled={isStarting}
              >
                {isStarting ? (
                  <>
                    <span className="spinner" /> Starting...
                  </>
                ) : (
                  'Confirm Start'
                )}
              </button>
              <button
                className="scene-controls__button scene-controls__button--cancel"
                onClick={handleCancelStart}
                disabled={isStarting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="scene-controls__button scene-controls__button--stop"
        onClick={handleStop}
        disabled={isDisabled || isStopping || !isRunning || showConfig}
        title={
          isDisabled
            ? 'Select a session to enable'
            : !isRunning
            ? 'Scene can only be stopped when running'
            : isStopping
            ? 'Stopping scene...'
            : 'Stop the scene'
        }
      >
        {isStopping ? (
          <>
            <span className="spinner" /> Stopping...
          </>
        ) : (
          'Stop Scene'
        )}
      </button>
    </div>
  );
}
