import { useEffect } from 'react';
import { CreateSessionForm } from './components/CreateSessionForm.js';
import { SessionsList } from './components/SessionsList.js';
import { SessionPanel } from './components/SessionPanel.js';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { ToastContainer } from './components/Toast.js';
import { socketService } from './lib/socket.js';

export default function App() {
  // Initialize socket connection on mount
  useEffect(() => {
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="app-container">
      <div className="sidebar">
        <CreateSessionForm />
        <SessionsList />
      </div>
      <SessionPanel />
      <div className="app-header">
        <ConnectionStatus />
      </div>
      <ToastContainer />
    </div>
  );
}
