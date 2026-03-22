import { useState, FormEvent } from 'react';
import { useAppStore } from '../store/appStore.js';
import './CreateSessionForm.css';

interface FormErrors {
  name?: string;
  sceneDurationMinutes?: string;
  agentCount?: string;
}

const sessionSchema = {
  name: { min: 3, max: 50 },
  sceneDurationMinutes: { min: 1, max: 120 },
  agentCount: { min: 2, max: 10 },
};

export function CreateSessionForm() {
  const { createSession, creatingSession, selectSession, lastError } = useAppStore();

  const [name, setName] = useState('');
  const [sceneDurationMinutes, setSceneDurationMinutes] = useState(10);
  const [agentCount, setAgentCount] = useState(4);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name || name.length < sessionSchema.name.min || name.length > sessionSchema.name.max) {
      newErrors.name = `Name must be ${sessionSchema.name.min}-${sessionSchema.name.max} characters`;
    }

    if (sceneDurationMinutes < sessionSchema.sceneDurationMinutes.min || sceneDurationMinutes > sessionSchema.sceneDurationMinutes.max) {
      newErrors.sceneDurationMinutes = `Duration must be ${sessionSchema.sceneDurationMinutes.min}-${sessionSchema.sceneDurationMinutes.max} minutes`;
    }

    if (agentCount < sessionSchema.agentCount.min || agentCount > sessionSchema.agentCount.max) {
      newErrors.agentCount = `Agent count must be ${sessionSchema.agentCount.min}-${sessionSchema.agentCount.max}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validate()) {
      return;
    }

    await createSession(name, sceneDurationMinutes, agentCount);

    // Check if session was created successfully by looking at the sessions array
    const updatedSessions = useAppStore.getState().sessions;
    const newSession = updatedSessions.find(s => s.name === name);

    if (newSession) {
      setSuccessMessage('Session created successfully!');
      selectSession(newSession);
      // Reset form
      setName('');
      setSceneDurationMinutes(10);
      setAgentCount(4);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="create-session-form">
      <div className="form-header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span>New Session</span>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {lastError && (
        <div className="error-message">{lastError}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="session-name">Name</label>
          <input
            id="session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My drama session..."
            disabled={creatingSession}
            autoComplete="off"
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-group form-group-compact">
            <label htmlFor="scene-duration">Duration</label>
            <input
              id="scene-duration"
              type="number"
              min={sessionSchema.sceneDurationMinutes.min}
              max={sessionSchema.sceneDurationMinutes.max}
              value={sceneDurationMinutes}
              onChange={(e) => setSceneDurationMinutes(parseInt(e.target.value) || 0)}
              disabled={creatingSession}
            />
            <span className="input-suffix">min</span>
          </div>

          <div className="form-group form-group-compact">
            <label htmlFor="agent-count">Agents</label>
            <input
              id="agent-count"
              type="number"
              min={sessionSchema.agentCount.min}
              max={sessionSchema.agentCount.max}
              value={agentCount}
              onChange={(e) => setAgentCount(parseInt(e.target.value) || 0)}
              disabled={creatingSession}
            />
            <span className="input-suffix">pcs</span>
          </div>
        </div>

        <button type="submit" className="submit-button btn btn-primary" disabled={creatingSession}>
          {creatingSession ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="spin">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3"/>
                <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Create Session
            </>
          )}
        </button>
      </form>
    </div>
  );
}
