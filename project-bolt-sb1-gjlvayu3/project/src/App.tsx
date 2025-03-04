import React, { useEffect, useState } from 'react';
import { useGameStore } from './store';
import AdminPanel from './components/AdminPanel';
import DebateWindow from './components/DebateWindow';
import GraphView from './components/GraphView';
import { Routes, Route } from 'react-router-dom';
import { Wifi } from 'lucide-react';

function App() {
  const { 
    showAdminPanel, 
    showDebateWindow, 
    debate, 
    decrementTimer 
  } = useGameStore();
  
  // Check if API key is properly configured
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const apiKeyMissing = !apiKey || apiKey === 'your_openai_api_key_here';
  
  // Set up timer interval
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (debate?.status === 'active') {
        decrementTimer();
      }
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [debate, decrementTimer]);
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={
          <div className="game-container">
            {showAdminPanel && <AdminPanel apiKeyMissing={apiKeyMissing} />}
            {showDebateWindow && <DebateWindow />}
          </div>
        } />
        <Route path="/graph" element={<GraphView />} />
      </Routes>
    </div>
  );
}

export default App;