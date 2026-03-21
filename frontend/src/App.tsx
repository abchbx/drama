import { useEffect } from 'react';
import { CreateSessionForm } from './components/CreateSessionForm.js';
import { SessionsList } from './components/SessionsList.js';
import { SessionPanel } from './components/SessionPanel.js';
import { TabNavigation } from './components/TabNavigation.js';
import { LLMConfigTab } from './components/config/LLMConfigTab.js';
import { SessionParamsTab } from './components/config/SessionParamsTab.js';
import { AgentDashboardTab } from './components/dashboard/AgentDashboardTab.js';
import { TemplatesTab } from './components/templates/TemplatesTab.js';
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
      default:
        return <SessionPanel />;
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <CreateSessionForm />
        <SessionsList />
        <TabNavigation />
      </div>
      {renderTabContent()}
      <div className="app-header">
        <ConnectionStatus />
      </div>
      <ToastContainer />
    </div>
  );
}
