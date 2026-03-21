import { useAppStore } from '../store/appStore';
import './SceneControls.css';

/**
 * SceneControls - Start/Stop scene buttons
 *
 * Buttons are placed in the session panel header.
 * Enabled/disabled states based on session status and loading states.
 */
export function SceneControls() {
  const {
    selectedSession,
    startingScene,
    stoppingScene,
    connectionStatus,
    startScene,
    stopScene,
  } = useAppStore();

  // Determine button states
  const isIdle = selectedSession?.status === 'idle' || selectedSession?.status === 'created';
  const isRunning = selectedSession?.status === 'running';
  const isDisabled = !selectedSession || connectionStatus !== 'connected';
  const isStarting = startingScene;
  const isStopping = stoppingScene;

  const handleStart = async () => {
    // For now, start with empty scene config - full form will come in later phase
    try {
      await startScene('', '', '', []);
    } catch (error) {
      // Error handled by store's lastError
    }
  };

  const handleStop = async () => {
    try {
      await stopScene();
    } catch (error) {
      // Error handled by store's lastError
    }
  };

  return (
    <div className="scene-controls">
      <button
        className="scene-controls__button scene-controls__button--start"
        onClick={handleStart}
        disabled={isDisabled || isStarting || !isIdle}
        title={
          isDisabled
            ? 'Select a session and connect to enable'
            : isStarting
            ? 'Starting scene...'
            : 'Start the scene'
        }
      >
        {isStarting ? (
          <>
            <span className="spinner" /> Starting...
          </>
        ) : (
          'Start Scene'
        )}
      </button>

      <button
        className="scene-controls__button scene-controls__button--stop"
        onClick={handleStop}
        disabled={isDisabled || isStopping || !isRunning}
        title={
          isDisabled
            ? 'Select a session and connect to enable'
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
