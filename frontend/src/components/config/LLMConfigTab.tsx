import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '../../store/appStore';
import type { LLMProvider } from '../../lib/types';
import './LLMConfigTab.css';

const llmConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'mock'] as const),
  apiKey: z.string().optional(),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2),
});

type LLMConfigFormData = z.infer<typeof llmConfigSchema>;

const LLMConfigTab: React.FC = () => {
  const { config, loadingConfig, updatingConfig, updateLLMConfig, fetchConfig } = useAppStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<LLMConfigFormData>({
    resolver: zodResolver(llmConfigSchema),
    defaultValues: config.llmConfig,
  });

  const watchedProvider = watch('provider');

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    reset(config.llmConfig);
  }, [config.llmConfig, reset]);

  const handleFormSubmit = async (data: LLMConfigFormData) => {
    await updateLLMConfig(data);
  };

  const providers: { value: LLMProvider; label: string; description: string }[] = [
    {
      value: 'openai',
      label: 'OpenAI',
      description: 'Use OpenAI GPT models (requires API key)',
    },
    {
      value: 'anthropic',
      label: 'Anthropic',
      description: 'Use Anthropic Claude models (requires API key)',
    },
    {
      value: 'mock',
      label: 'Mock LLM',
      description: 'Use mock responses for testing (no API key required)',
    },
  ];

  const getDefaultModel = (provider: LLMProvider): string => {
    switch (provider) {
      case 'openai':
        return 'gpt-4';
      case 'anthropic':
        return 'claude-3-opus-20240229';
      case 'mock':
        return 'mock-model';
      default:
        return 'gpt-4';
    }
  };

  return (
    <div className="llm-config-tab">
      <h2>LLM Configuration</h2>
      <p>Configure which LLM provider to use for generating dialogue and analysis.</p>

      {loadingConfig ? (
        <div className="loading">Loading configuration...</div>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="config-form">
          <div className="form-section">
            <label htmlFor="provider">LLM Provider</label>
            <div className="provider-options">
              {providers.map((provider) => (
                <label key={provider.value} className="radio-option">
                  <input
                    type="radio"
                    value={provider.value}
                    {...register('provider')}
                  />
                  <div className="radio-content">
                    <div className="radio-label">{provider.label}</div>
                    <div className="radio-description">{provider.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.provider && (
              <div className="error">{errors.provider.message}</div>
            )}
          </div>

          <div className="form-section">
            <label htmlFor="model">Model</label>
            <input
              type="text"
              id="model"
              placeholder={`e.g., ${getDefaultModel(watchedProvider || 'mock')}`}
              {...register('model')}
              className={errors.model ? 'input-error' : ''}
            />
            {errors.model && (
              <div className="error">{errors.model.message}</div>
            )}
          </div>

          {watchedProvider !== 'mock' && (
            <div className="form-section">
              <label htmlFor="apiKey">API Key</label>
              <input
                type="password"
                id="apiKey"
                placeholder={`Enter ${watchedProvider} API key`}
                {...register('apiKey')}
                className={errors.apiKey ? 'input-error' : ''}
              />
              {errors.apiKey && (
                <div className="error">{errors.apiKey.message}</div>
              )}
            </div>
          )}

          <div className="form-section">
            <label htmlFor="temperature">Temperature</label>
            <input
              type="range"
              id="temperature"
              min="0"
              max="2"
              step="0.1"
              {...register('temperature', { valueAsNumber: true })}
            />
            <div className="range-value">
              {watch('temperature')?.toFixed(1) || (config.llmConfig.temperature ?? 0.7).toFixed(1)}
            </div>
            <p className="hint">
              Lower values (0.0-0.5) produce more deterministic responses.
              Higher values (0.5-2.0) produce more creative responses.
            </p>
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

export default LLMConfigTab;
