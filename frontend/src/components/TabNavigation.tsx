import { useAppStore } from '../store/appStore.js';

const tabs = [
  { id: 'sessions' as const, label: 'Sessions' },
  { id: 'llm-config' as const, label: 'LLM Config' },
  { id: 'session-params' as const, label: 'Session Params' },
  { id: 'dashboard' as const, label: 'Dashboard' },
  { id: 'templates' as const, label: 'Templates' },
];

export function TabNavigation() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
