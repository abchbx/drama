import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '../../store/appStore';

const sessionParamsSchema = z.object({
  sceneDurationMinutes: z.number().min(1).max(60),
  agentCount: z.number().min(1).max(10),
  maxTokens: z.number().min(1000).max(100000).optional(),
  maxTurns: z.number().min(1).max(100).optional(),
  heartbeatInterval: z.number().min(5).max(60).optional(),
  timeoutSeconds: z.number().min(30).max(600).optional(),
});

type SessionParamsFormData = z.infer<typeof sessionParamsSchema>;

const SessionParamsTab: React.FC = () => {
  const { config, loadingConfig, updatingConfig, updateSessionParams, fetchConfig } = useAppStore();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SessionParamsFormData>({
    resolver: zodResolver(sessionParamsSchema),
    defaultValues: config.sessionParams,
  });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    reset(config.sessionParams);
  }, [config.sessionParams, reset]);

  const handleFormSubmit = async (data: SessionParamsFormData) => {
    await updateSessionParams(data);
  };

  return (
    <div className="session-params-tab">
      <h2>Session Parameters</h2>
      <p>Configure default settings for new drama sessions.</p>

      {loadingConfig ? (
        <div className="loading">Loading configuration...</div>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="config-form">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="sceneDurationMinutes">Default Scene Duration (minutes)</label>
              <input
                type="number"
                id="sceneDurationMinutes"
                min="1"
                max="60"
                {...register('sceneDurationMinutes', { valueAsNumber: true })}
                className={errors.sceneDurationMinutes ? 'input-error' : ''}
              />
              {errors.sceneDurationMinutes && (
                <div className="error">{errors.sceneDurationMinutes.message}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="agentCount">Default Agent Count</label>
              <input
                type="number"
                id="agentCount"
                min="1"
                max="10"
                {...register('agentCount', { valueAsNumber: true })}
                className={errors.agentCount ? 'input-error' : ''}
              />
              {errors.agentCount && (
                <div className="error">{errors.agentCount.message}</div>
              )}
            </div>
          </div>

          <div className="advanced-section">
            <button
              type="button"
              className="advanced-toggle"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              Advanced Settings {isAdvancedOpen ? '▲' : '▼'}
            </button>

            {isAdvancedOpen && (
              <div className="advanced-content">
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="maxTokens">Maximum Token Limit</label>
                    <input
                      type="number"
                      id="maxTokens"
                      min="1000"
                      max="100000"
                      {...register('maxTokens', { valueAsNumber: true })}
                      className={errors.maxTokens ? 'input-error' : ''}
                    />
                    {errors.maxTokens && (
                      <div className="error">{errors.maxTokens.message}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxTurns">Maximum Turns per Scene</label>
                    <input
                      type="number"
                      id="maxTurns"
                      min="1"
                      max="100"
                      {...register('maxTurns', { valueAsNumber: true })}
                      className={errors.maxTurns ? 'input-error' : ''}
                    />
                    {errors.maxTurns && (
                      <div className="error">{errors.maxTurns.message}</div>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="heartbeatInterval">Heartbeat Interval (seconds)</label>
                    <input
                      type="number"
                      id="heartbeatInterval"
                      min="5"
                      max="60"
                      {...register('heartbeatInterval', { valueAsNumber: true })}
                      className={errors.heartbeatInterval ? 'input-error' : ''}
                    />
                    {errors.heartbeatInterval && (
                      <div className="error">{errors.heartbeatInterval.message}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="timeoutSeconds">Scene Timeout (seconds)</label>
                    <input
                      type="number"
                      id="timeoutSeconds"
                      min="30"
                      max="600"
                      {...register('timeoutSeconds', { valueAsNumber: true })}
                      className={errors.timeoutSeconds ? 'input-error' : ''}
                    />
                    {errors.timeoutSeconds && (
                      <div className="error">{errors.timeoutSeconds.message}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => reset()} className="btn btn-secondary">
              Reset to Defaults
            </button>
            <button type="submit" disabled={updatingConfig} className="btn btn-primary">
              {updatingConfig ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SessionParamsTab;
