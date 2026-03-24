import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CreateSessionForm } from './components/CreateSessionForm.js';
import { SessionTabs } from './components/SessionTabs.js';
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

// Import debug utility for diagnostics (remove in production)
import './lib/socket-debug.js';

// Sidebar collapse state key for localStorage
const SIDEBAR_COLLAPSED_KEY = 'dramaflow_sidebar_collapsed';

export default function App() {
  const { activeTab } = useAppStore();
  // Sidebar collapse state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newState));
  };

  // Initialize socket connection on mount
  useEffect(() => {
    socketService.connect();
    
    // Debug: Listen for all messages
    const unsubscribe = socketService.on('message:received', (data: unknown) => {
      const msg = data as { type?: string; from?: string; payload?: unknown };
      console.log('[App] Global message received:', {
        type: msg?.type,
        from: msg?.from,
        hasPayload: !!msg?.payload,
        fullData: data
      });
    });
    
    // Expose socketService to window for debugging
    (window as any).socketService = socketService;
    
    return () => {
      unsubscribe();
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
    <ErrorBoundary>
      <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
              {!sidebarCollapsed && <span className="app-name">DramaFlow</span>}
            </div>
            {!sidebarCollapsed && <CreateSessionForm />}
          </div>

          <nav className="sidebar-nav">
            <TabNavigation collapsed={sidebarCollapsed} />
          </nav>

          {/* Sidebar collapse toggle button */}
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
            </svg>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </aside>

        <main className="main-content">
          {renderTabContent()}
        </main>

        <header className="top-bar">
          <div className="top-bar-left">
            <SessionTabs />
          </div>
          <div className="top-bar-right">
            <ConnectionStatus />
          </div>
        </header>

        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}
