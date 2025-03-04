import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { GameMode, DifficultyLevel, Topic, DebateFlow } from '../types';
import { Trophy, Users, Notebook as Robot, Brain, Clock, MessageSquare, Loader, AlertCircle, GitBranch, BarChart2, Wifi } from 'lucide-react';
import Logo from './Logo';

interface AdminPanelProps {
  apiKeyMissing: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ apiKeyMissing }) => {
  const { 
    gameMode, 
    difficulty, 
    turnTimeLimit,
    debateFlow,
    mainClaimInput,
    errorMessage,
    suggestions,
    trendingTopics,
    loadingTopics,
    isLoading,
    setGameMode,
    setDifficulty,
    setTurnTimeLimit,
    setDebateFlow,
    setMainClaimInput,
    validateAndStartDebate,
    selectTrendingTopic,
    loadTrendingTopics
  } = useGameStore();
  
  const [showTopics, setShowTopics] = useState(true);
  
  // Load trending topics on component mount
  useEffect(() => {
    loadTrendingTopics();
  }, [loadTrendingTopics]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await validateAndStartDebate();
  };
  
  return (
    <div className="admin-panel slide-in">
      <div className="flex justify-center mb-4 relative">
        <Logo size="large" className="mx-auto" />
        <div className="absolute right-0 top-0">
          <div className={`api-status flex items-center px-2 py-0.5 rounded-full text-xs ${apiKeyMissing ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            <Wifi size={12} className={`mr-1 ${apiKeyMissing ? 'text-red-500' : 'text-green-500'}`} />
            <span>{apiKeyMissing ? 'API Disconnected' : 'API Connected'}</span>
          </div>
        </div>
      </div>
      <h2 className="text-xl font-bold mb-4 text-center">Change the Narrative!</h2>
      
      {apiKeyMissing && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 rounded">
          <div className="flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <p className="font-medium">API Key Not Configured</p>
          </div>
          <p className="mt-2">
            OpenAI API key is missing or using the default value. The app will use fallback options instead of AI-powered features.
          </p>
          <p className="mt-2 text-sm">
            To enable AI features, add your OpenAI API key to the .env file.
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label flex items-center">
            <Users size={18} className="mr-2" />
            Game Mode
          </label>
          <select 
            className="form-select"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as GameMode)}
            disabled={isLoading}
          >
            <option value="User vs User">User vs User</option>
            <option value="User vs AI">User vs AI</option>
            <option value="AI vs AI">AI vs AI</option>
          </select>
        </div>
        
        {gameMode !== 'AI vs AI' && (
          <>
            <div className="form-group">
              <label className="form-label flex items-center">
                <Brain size={18} className="mr-2" />
                Difficulty
              </label>
              <select 
                className="form-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                disabled={isLoading}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            
            {/* Only show Turn Time Limit when Debate Flow is Synchronous */}
            {debateFlow === 'Synchronous' && (
              <div className="form-group">
                <label className="form-label flex items-center">
                  <Clock size={18} className="mr-2" />
                  Turn Time Limit (seconds)
                </label>
                <input 
                  type="number" 
                  className="form-input"
                  min={10}
                  max={300}
                  value={turnTimeLimit}
                  onChange={(e) => setTurnTimeLimit(parseInt(e.target.value))}
                  disabled={isLoading}
                />
              </div>
            )}
          </>
        )}
        
        <div className="form-group">
          <label className="form-label flex items-center">
            <GitBranch size={18} className="mr-2" />
            Debate Flow
          </label>
          <select 
            className="form-select"
            value={debateFlow}
            onChange={(e) => setDebateFlow(e.target.value as DebateFlow)}
            disabled={isLoading}
          >
            <option value="Synchronous">Synchronous (Turn-based)</option>
            <option value="Asynchronous">Asynchronous (Free-form)</option>
          </select>
          <div className="text-sm text-gray-600 mt-1">
            {debateFlow === 'Synchronous' ? 
              'Players take turns in order, following each branch to completion.' : 
              'Players can contribute at any time to any part of the debate.'}
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label flex items-center">
            <MessageSquare size={18} className="mr-2" />
            Main Claim
          </label>
          <textarea 
            className="form-input"
            rows={3}
            placeholder="Enter a debatable claim (e.g., 'Social media has a positive impact on society')"
            value={mainClaimInput}
            onChange={(e) => setMainClaimInput(e.target.value)}
            disabled={isLoading}
          />
          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}
        </div>
        
        {suggestions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2">Suggested Claims:</h3>
            <div className="suggestion-bubbles">
              {suggestions.map(suggestion => (
                <div 
                  key={suggestion.id}
                  className="suggestion-bubble"
                  onClick={() => setMainClaimInput(suggestion.content)}
                >
                  {suggestion.content}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <button 
          type="submit"
          className="btn btn-gold w-full py-3 text-lg font-bold flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader size={20} className="mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Trophy size={20} className="mr-2" />
              Settle This!
            </>
          )}
        </button>
      </form>
      
      {showTopics && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Trending Debate Topics</h3>
          {loadingTopics ? (
            <div className="flex justify-center items-center py-4">
              <Loader size={24} className="animate-spin mr-2" />
              <span>Loading trending topics...</span>
            </div>
          ) : (
            <div className="topic-bubbles">
              {trendingTopics.map(topic => (
                <div 
                  key={topic.id} 
                  className="topic-bubble"
                  onClick={() => selectTrendingTopic(topic.id)}
                >
                  {topic.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;