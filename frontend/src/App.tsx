import { useEffect } from 'react';
import { CreateSessionForm } from './components/CreateSessionForm.js';
import { SessionsList } from './components/SessionsList.js';
import { SessionPanel } from './components/SessionPanel.js';
import { TabNavigation } from './components/TabNavigation.js';
import LLMConfigTab from './components/config/LLMConfigTab.js';
import SessionParamsTab from './components/config/SessionParamsTab.js';
import { AgentDashboardTab } from './components/dashboard/AgentDashboardTab.js';
import { TemplatesTab } from './components/templates/TemplatesTab.js';
import { VisualizationTab } from './components/visualization/VisualizationTab.js';
import { ExportTab } from './components/ExportTab.js';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { ToastContainer } from './components/Toast.js';
import { socketService } from './lib/socket.js';
import { useAppStore } from './store/appStore.js';

export default function App() {
  const { activeTab } = useAppStore();

  // Initialize socket connection on mount
  useEffect(() => {
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sessions':
        return <SessionPanel />;
      case 'llm-config':
        return <LLMConfigTab />;
      case 'session-params':
        return <SessionParamsTab />;
      case 'dashboard':
        return <AgentDashboardTab />;
      case 'templates':
        return <TemplatesTab />;
      case 'visualization':
        return <VisualizationTab />;
      case 'export':
        return <ExportTab />;
      default:
        return <SessionPanel />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="app-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill="url(#logo-gradient)"/>
              <path d="M8 14L12 10L16 14L20 10M8 18L12 14L16 18L20 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0A84FF"/>
                  <stop offset="1" stopColor="#5E5CE6"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="app-name">DramaFlow</span>
          </div>
          <CreateSessionForm />
        </div>

        <div className="sidebar-content">
          <SessionsList />
        </div>

        <nav className="sidebar-nav">
          <TabNavigation />
        </nav>
      </aside>

      <main className="main-content">
        {renderTabContent()}
      </main>

      <header className="top-bar">
        <div className="top-bar-left"></div>
        <div className="top-bar-right">
          <ConnectionStatus />
        </div>
      </header>

      <ToastContainer />
    </div>
  );
}
