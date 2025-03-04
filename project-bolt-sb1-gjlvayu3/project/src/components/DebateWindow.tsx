import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { formatTime } from '../utils';
import { Trophy, Send, SkipForward, FilePlus, Pause, Play, Home, ExternalLink, X, BarChart2, Check, MessageCircle, Gavel, Lightbulb, Loader, RefreshCw } from 'lucide-react';
import useSound from 'use-sound';
import ArgumentTable from './ArgumentTable';
import { Link } from 'react-router-dom';
import ArgumentSuggestions from './ArgumentSuggestions';
import BranchArgumentModal from './BranchArgumentModal';
import ArgumentValidationModal from './ArgumentValidationModal';

const DebateWindow: React.FC = () => {
  const { 
    debate,
    currentTimer,
    timerActive,
    decrementTimer,
    submitArgument,
    pass,
    pauseDebate,
    resumeDebate,
    resetGame,
    exportToPDF,
    argumentSuggestions,
    loadingArgumentSuggestions,
    loadArgumentSuggestions,
    requestJuryDecision,
    validateUserArgument
  } = useGameStore();
  
  const [argumentInput, setArgumentInput] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [selectedArgument, setSelectedArgument] = useState<string | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [playBuzzer] = useSound('/sounds/buzzer.mp3', { volume: 0.5 });
  const [playApplause] = useSound('/sounds/applause.mp3', { volume: 0.5 });
  const [playClick] = useSound('/sounds/click.mp3', { volume: 0.3 });
  
  // Timer effect
  useEffect(() => {
    let interval: number | null = null;
    
    if (timerActive && debate?.status === 'active') {
      interval = window.setInterval(() => {
        decrementTimer();
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, debate?.status, decrementTimer]);
  
  // Sound effects
  useEffect(() => {
    if (currentTimer === 0) {
      playBuzzer();
    }
    
    if (debate?.status === 'ended') {
      playApplause();
    }
  }, [currentTimer, debate?.status, playBuzzer, playApplause]);
  
  // Load argument suggestions when needed
  useEffect(() => {
    if (debate?.status === 'active' && 
        debate.players[debate.currentTurn - 1].type === 'User') {
      loadArgumentSuggestions();
    }
  }, [debate?.currentTurn, debate?.status, loadArgumentSuggestions]);
  
  if (!debate) return null;
  
  const currentPlayer = debate.players[debate.currentTurn - 1];
  const currentClaim = debate.claims[debate.currentClaimId];
  const timerPercentage = (currentTimer / debate.turnTimeLimit) * 100;
  const isAIvsAI = debate.gameMode === 'AI vs AI';
  const isSynchronous = debate.debateFlow === 'Synchronous';
  const isUserTurn = currentPlayer.type === 'User';
  
  const handleSubmitArgument = async () => {
    if (argumentInput.trim()) {
      // Check for duplicate arguments
      const isDuplicate = currentClaim.arguments.some(arg => 
        arg.stance === currentPlayer.role && 
        arg.content.toLowerCase() === argumentInput.toLowerCase()
      );
      
      if (isDuplicate) {
        setDuplicateError("This argument has already been made. Please provide a different argument.");
        return;
      }
      
      // Clear any previous error
      setDuplicateError(null);
      
      // Validate the argument
      const stance = currentPlayer.id === 1 ? 'WITH' : 'AGAINST';
      const validation = await validateUserArgument(
        argumentInput, 
        currentClaim.content, 
        stance
      );
      
      if (!validation.valid) {
        setValidationResult(validation);
        setShowValidationModal(true);
        return;
      }
      
      // Submit the argument
      submitArgument(argumentInput);
      setArgumentInput('');
      playClick();
    }
  };
  
  const handleAcceptSuggestion = (suggestionId: string) => {
    const suggestion = argumentSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      submitArgument(suggestion.content);
      playClick();
    }
  };
  
  const handleRegenerateSuggestions = () => {
    loadArgumentSuggestions();
    playClick();
  };
  
  const handleAcceptValidationSuggestion = (suggestion: string) => {
    setArgumentInput(suggestion);
    setShowValidationModal(false);
    playClick();
  };
  
  const handleSubmitAnyway = () => {
    submitArgument(argumentInput);
    setArgumentInput('');
    setShowValidationModal(false);
    playClick();
  };
  
  const handleBranchArgument = () => {
    if (!selectedArgument) return;
    
    setShowBranchModal(true);
    playClick();
  };
  
  const handleJuryDecision = () => {
    requestJuryDecision(debate.currentClaimId);
    playClick();
  };
  
  const renderGameStatus = () => {
    if (debate.status === 'ended') {
      const winner = debate.winner 
        ? debate.players.find(p => p.id === debate.winner)
        : null;
        
      return (
        <div className="bg-gray-800 text-white p-4 rounded-lg text-center mb-4">
          <h3 className="text-xl font-bold mb-2">Debate Ended</h3>
          {winner ? (
            <p className="text-lg">
              Winner: {winner.name} ({winner.role === 'WITH' ? 'Supporting' : 'Opposing'})
            </p>
          ) : (
            <p className="text-lg">Result: Tie</p>
          )}
          <button 
            className="btn btn-gold mt-3"
            onClick={resetGame}
          >
            <Home size={18} className="mr-2" />
            New Debate
          </button>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="debate-window fade-in">
      <div className="flex justify-between items-center mb-4">
        <div className="score-display flex-1">
          <div className={`score-player score-player-with ${currentPlayer.id === 1 ? 'pulse' : ''}`}>
            <span className="score-name">{debate.players[0].name}</span>
            <span className="score-role">Supporting</span>
            <span className="score-value">{debate.players[0].score}</span>
          </div>
          <span className="score-vs">VS</span>
          <div className={`score-player score-player-against ${currentPlayer.id === 2 ? 'pulse' : ''}`}>
            <span className="score-name">{debate.players[1].name}</span>
            <span className="score-role">Opposing</span>
            <span className="score-value">{debate.players[1].score}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to="/graph"
            className="btn btn-sm btn-primary flex items-center justify-center"
            target="_blank"
            title="Open Debate Graph in New Window"
          >
            <BarChart2 size={16} />
          </Link>
          <button 
            className="btn btn-secondary flex items-center justify-center"
            onClick={resetGame}
          >
            <X size={18} className="mr-2" />
            Exit
          </button>
        </div>
      </div>
      
      {renderGameStatus()}
      
      <div className="turn-indicator">
        Turn: {currentPlayer.name} ({currentPlayer.role === 'WITH' ? 'Supporting' : 'Opposing'})
      </div>
      
      <div className="claim-display">
        <div className="claim-content">{currentClaim.content}</div>
      </div>
      
      {!isAIvsAI && isSynchronous && (
        <div className="timer-container mb-4">
          <div 
            className="timer-bar" 
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      )}
      
      {!isAIvsAI && isSynchronous && (
        <div className="text-center mb-4">
          Time Remaining: {formatTime(currentTimer)}
        </div>
      )}
      
      <ArgumentTable 
        onSelectArgument={setSelectedArgument}
        selectedArgument={selectedArgument}
      />
      
      {debate.status !== 'ended' && !isAIvsAI && isUserTurn && (
        <ArgumentSuggestions 
          suggestions={argumentSuggestions}
          loading={loadingArgumentSuggestions}
          onAccept={handleAcceptSuggestion}
          difficulty={debate.difficulty}
          onRegenerate={handleRegenerateSuggestions}
        />
      )}
      
      {debate.status !== 'ended' && !isAIvsAI && (
        <div className="mt-4">
          {currentPlayer.type !== 'AI' && (
            <div className="form-group">
              <label className="form-label">Your Argument</label>
              <textarea 
                className="form-input"
                rows={3}
                placeholder="Enter your argument..."
                value={argumentInput}
                onChange={(e) => setArgumentInput(e.target.value)}
                disabled={
                  debate.status !== 'active' || 
                  currentPlayer.type === 'AI' ||
                  (isSynchronous && currentTimer === 0)
                }
              />
              {duplicateError && (
                <div className="error-message">{duplicateError}</div>
              )}
            </div>
          )}
          
          <div className="controls-container">
            {currentPlayer.type !== 'AI' && (
              <>
                <button 
                  className="btn btn-success flex-1 flex items-center justify-center"
                  onClick={handleSubmitArgument}
                  disabled={
                    !argumentInput.trim() || 
                    debate.status !== 'active' || 
                    currentPlayer.type === 'AI' ||
                    (isSynchronous && currentTimer === 0)
                  }
                >
                  <Send size={18} className="mr-2" />
                  Submit
                </button>
                
                <button 
                  className="btn btn-danger flex-1 flex items-center justify-center"
                  onClick={pass}
                  disabled={
                    debate.status !== 'active' || 
                    currentPlayer.type === 'AI' ||
                    (isSynchronous && currentTimer === 0)
                  }
                >
                  <SkipForward size={18} className="mr-2" />
                  Pass
                </button>
              </>
            )}
            
            {debate.status === 'active' ? (
              <button 
                className="btn btn-secondary flex items-center justify-center"
                onClick={pauseDebate}
              >
                <Pause size={18} className="mr-2" />
                Pause
              </button>
            ) : (
              <button 
                className="btn btn-secondary flex items-center justify-center"
                onClick={resumeDebate}
              >
                <Play size={18} className="mr-2" />
                Resume
              </button>
            )}
            
            <button 
              className="btn btn-primary flex items-center justify-center"
              onClick={exportToPDF}
            >
              <FilePlus size={18} className="mr-2" />
              Export
            </button>
          </div>
          
          {/* Additional debate controls for branching and jury decision */}
          {currentPlayer.type !== 'AI' && currentClaim.arguments.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-md font-semibold mb-3 flex items-center">
                <BarChart2 size={18} className="mr-2" />
                Advanced Debate Options
              </h3>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={handleJuryDecision}
                >
                  <Gavel size={18} className="mr-2" />
                  Request Jury Decision
                </button>
                
                <button 
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={handleBranchArgument}
                  disabled={!selectedArgument}
                >
                  <MessageCircle size={18} className="mr-2" />
                  Branch Argument
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {isAIvsAI && debate.status !== 'ended' && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">AI vs AI Debate in Progress</h3>
          <p className="mb-3">The AI debaters are automatically generating arguments. Watch as they debate the topic!</p>
          
          <div className="controls-container">
            {debate.status === 'active' ? (
              <button 
                className="btn btn-secondary flex items-center justify-center"
                onClick={pauseDebate}
              >
                <Pause size={18} className="mr-2" />
                Pause Debate
              </button>
            ) : (
              <button 
                className="btn btn-secondary flex items-center justify-center"
                onClick={resumeDebate}
              >
                <Play size={18} className="mr-2" />
                Resume Debate
              </button>
            )}
            
            <button 
              className="btn btn-primary flex items-center justify-center"
              onClick={exportToPDF}
            >
              <FilePlus size={18} className="mr-2" />
              Export
            </button>
            
            <button 
              className="btn btn-secondary flex items-center justify-center"
              onClick={handleJuryDecision}
            >
              <Gavel size={18} className="mr-2" />
              Request Jury Decision
            </button>
          </div>
        </div>
      )}
      
      {/* Branch Argument Modal */}
      {showBranchModal && selectedArgument && (
        <BranchArgumentModal 
          argumentId={selectedArgument}
          onClose={() => setShowBranchModal(false)}
        />
      )}
      
      {/* Argument Validation Modal */}
      {showValidationModal && validationResult && (
        <ArgumentValidationModal
          validationResult={validationResult}
          onClose={() => setShowValidationModal(false)}
          onAcceptSuggestion={handleAcceptValidationSuggestion}
          onSubmitAnyway={handleSubmitAnyway}
        />
      )}
    </div>
  );
};

export default DebateWindow;