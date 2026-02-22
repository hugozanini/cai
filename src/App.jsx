import { useState, useEffect } from 'react';
import Wizard from './components/Wizard';
import Planner from './components/Planner';
import Insights from './components/Insights';
import './index.css';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState('planner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has completed wizard in Chrome storage
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['caiConfigured'], (result) => {
        setIsConfigured(!!result.caiConfigured);
        setIsLoading(false);
      });
    } else {
      // Mock for standard web dev environment without extension APIs
      setIsLoading(false);
    }
  }, []);

  const handleWizardComplete = () => {
    setIsConfigured(true);
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ caiConfigured: true });
    }
  };

  if (isLoading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="glass-panel" style={{ width: 'fit-content' }}>Loading...</div>
    </div>;
  }

  if (!isConfigured) {
    return (
      <div className="app-container">
        <Wizard onComplete={handleWizardComplete} />
      </div>
    );
  }

  return (
    <div className="app-container animate-fade-in">
      <div className="glass-panel">
        <h1 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>Cai</h1>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveTab('planner')}
          >
            Planner
          </button>
          <button
            className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'planner' ? <Planner /> : <Insights />}
        </div>
      </div>
    </div>
  );
}

export default App;
