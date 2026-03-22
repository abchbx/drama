import { useAppStore } from '../store/appStore.js';
import './TabNavigation.css';

const tabs = [
  { id: 'sessions' as const, label: 'Sessions', icon: '▣' },
  { id: 'dashboard' as const, label: 'Dashboard', icon: '▤' },
  { id: 'visualization' as const, label: 'Visualization', icon: '◉' },
  { id: 'templates' as const, label: 'Templates', icon: '◰' },
  { id: 'llm-config' as const, label: 'LLM Config', icon: '⚙' },
  { id: 'session-params' as const, label: 'Params', icon: '≡' },
  { id: 'export' as const, label: 'Export', icon: '↓' },
];

export function TabNavigation() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="tab-navigation">
      <ul className="nav-list">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
