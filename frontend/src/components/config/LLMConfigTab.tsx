import { useState } from 'react';

type LLMProvider = 'openai' | 'anthropic' | 'ollama';

export function LLMConfigTab() {
  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  return (
    <div className="tab-content llm-config-tab">
      <div className="tab-header">
        <h2>LLM Configuration</h2>
        <p>Configure your LLM provider settings</p>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label>Provider</label>
          <div className="provider-selector">
            {(['openai', 'anthropic', 'ollama'] as LLMProvider[]).map((p) => (
              <button
                key={p}
                className={`provider-button ${provider === p ? 'active' : ''}`}
                onClick={() => setProvider(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {provider !== 'ollama' && (
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider} API key`}
            />
          </div>
        )}

        {provider === 'ollama' && (
          <div className="form-group">
            <label>Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
        )}

        <div className="form-actions">
          <button className="button primary">Save Configuration</button>
          <button className="button secondary">Test Connection</button>
        </div>
      </div>
    </div>
  );
}
