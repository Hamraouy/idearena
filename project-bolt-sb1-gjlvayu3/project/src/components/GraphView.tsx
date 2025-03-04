import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import DebateGraph from './DebateGraph';
import { ArrowLeft, Download, Share2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

const GraphView: React.FC = () => {
  const { debate, getGraphData } = useGameStore();
  const navigate = useNavigate();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [graphData, setGraphData] = useState(getGraphData());
  
  // Auto-refresh graph data every second if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      const newData = getGraphData();
      setGraphData(newData);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, getGraphData]);
  
  if (!debate) {
    return (
      <div className="graph-view-container">
        <div className="no-debate-message">
          <Logo size="large" />
          <h2 className="mt-4">No Active Debate</h2>
          <p>Return to the main application to start a debate.</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Return to ideArena
          </button>
        </div>
      </div>
    );
  }
  
  const nodeCount = graphData.nodes.length;
  const linkCount = graphData.links.length;
  
  // Calculate statistics
  const supportingArgs = graphData.links.filter(link => link.stance === 'WITH').length;
  const opposingArgs = graphData.links.filter(link => link.stance === 'AGAINST').length;
  
  // Get player information
  const player1 = debate.players[0];
  const player2 = debate.players[1];
  
  return (
    <div className="graph-view-container">
      <div className="graph-view-header">
        <div className="flex items-center">
          <button 
            className="btn btn-secondary mr-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Return
          </button>
          <Logo size="medium" />
        </div>
        
        <div className="graph-controls">
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
          >
            <ZoomOut size={16} />
          </button>
          <span className="zoom-level">{zoomLevel}%</span>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
          >
            <ZoomIn size={16} />
          </button>
          <button 
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}
          >
            <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
          </button>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => window.print()}
            title="Print or save as PDF"
          >
            <Download size={16} />
          </button>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Graph URL copied to clipboard!');
            }}
            title="Share graph URL"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="graph-view-content">
        <div className="graph-container-fullscreen" style={{ transform: `scale(${zoomLevel / 100})` }}>
          <DebateGraph fullscreen={true} />
        </div>
        
        <div className="graph-sidebar">
          <div className="graph-info-card">
            <h2 className="text-xl font-bold mb-4">Debate Information</h2>
            
            <div className="info-section">
              <h3 className="text-lg font-semibold">Main Claim</h3>
              <p className="claim-text">{debate.mainClaim.content}</p>
            </div>
            
            <div className="info-section">
              <h3 className="text-lg font-semibold">Debate Flow</h3>
              <p>{debate.debateFlow}</p>
              <p className="text-sm text-gray-600 mt-1">
                {debate.debateFlow === 'Synchronous' 
                  ? 'Players take turns in order, following each branch to completion.' 
                  : 'Players can contribute at any time to any part of the debate.'}
              </p>
            </div>
            
            <div className="info-section">
              <h3 className="text-lg font-semibold">Status</h3>
              <p className={`status-badge status-${debate.status.toLowerCase()}`}>
                {debate.status.charAt(0).toUpperCase() + debate.status.slice(1)}
              </p>
            </div>
            
            <div className="info-section">
              <h3 className="text-lg font-semibold">Players</h3>
              <div className="player-info">
                <div className="player with-player">
                  <span className="player-name">{player1.name}</span>
                  <span className="player-role">Supporting</span>
                  <span className="player-score">Score: {player1.score}</span>
                </div>
                <div className="player against-player">
                  <span className="player-name">{player2.name}</span>
                  <span className="player-role">Opposing</span>
                  <span className="player-score">Score: {player2.score}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="graph-info-card">
            <h2 className="text-xl font-bold mb-4">Graph Statistics</h2>
            
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Claims</span>
                <span className="stat-value">{nodeCount - graphData.nodes.filter(n => n.type === 'virtual').length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Arguments</span>
                <span className="stat-value">{supportingArgs + opposingArgs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Supporting Args</span>
                <span className="stat-value with-color">{supportingArgs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Opposing Args</span>
                <span className="stat-value against-color">{opposingArgs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Ratio</span>
                <span className="stat-value">
                  {supportingArgs}:{opposingArgs}
                </span>
              </div>
            </div>
          </div>
          
          <div className="graph-legend-card">
            <h2 className="text-xl font-bold mb-4">Legend</h2>
            
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color claim-color-box"></div>
                <div>
                  <span className="legend-label">Main Claim (Blue Circle)</span>
                  <span className="legend-desc">The central debatable statement</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-color with-color-box"></div>
                <div>
                  <span className="legend-label">Supporting Argument (Green Arrow)</span>
                  <span className="legend-desc">Player 1's arguments in favor of the claim</span>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-color against-color-box"></div>
                <div>
                  <span className="legend-label">Opposing Argument (Red Arrow)</span>
                  <span className="legend-desc">Player 2's arguments against the claim</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2">How to Read the Graph</h3>
              <ul className="list-disc pl-5 text-sm">
                <li>Circles represent claims or opinions</li>
                <li>Arrows represent arguments</li>
                <li>Hover over an arrow to see the argument text</li>
                <li>Green arrows point left (Player 1's supporting arguments)</li>
                <li>Red arrows point right (Player 2's opposing arguments)</li>
                <li>The main claim stays at the top center</li>
                <li>Each claim has its own vertical line to show position</li>
                <li>If a player debates an argument, it becomes a new circle</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphView;