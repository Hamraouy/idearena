import { create } from 'zustand';
import { 
  Debate, 
  GameMode, 
  DifficultyLevel,
  DebateFlow,
  Player, 
  Claim, 
  Argument, 
  GraphData,
  Suggestion,
  Topic,
  ArgumentSuggestion,
  JuryDecision
} from './types';
import { generateId, validateClaim, generateSuggestions, generateAIArgument, containsMultipleClaims, splitArgument, generateArgumentSuggestions, validateArgument, validateUserArgument, formatTime } from './utils';
import { generateTopicSuggestions } from './services/openai';
import { persist } from 'zustand/middleware';

interface GameState {
  // Game settings
  gameMode: GameMode;
  difficulty: DifficultyLevel;
  turnTimeLimit: number;
  debateFlow: DebateFlow;
  mainClaimInput: string;
  
  // Game state
  debate: Debate | null;
  currentTimer: number;
  timerActive: boolean;
  suggestions: Suggestion[];
  argumentSuggestions: ArgumentSuggestion[];
  loadingArgumentSuggestions: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  
  // UI state
  showAdminPanel: boolean;
  showDebateWindow: boolean;
  
  // Trending topics
  trendingTopics: Topic[];
  loadingTopics: boolean;
  
  // Jury decisions
  juryDecisions: JuryDecision[];
  
  // Actions
  setGameMode: (mode: GameMode) => void;
  setDifficulty: (level: DifficultyLevel) => void;
  setTurnTimeLimit: (seconds: number) => void;
  setDebateFlow: (flow: DebateFlow) => void;
  setMainClaimInput: (claim: string) => void;
  validateAndStartDebate: () => Promise<boolean>;
  submitArgument: (content: string) => void;
  pass: () => void;
  resetTimer: () => void;
  decrementTimer: () => void;
  pauseDebate: () => void;
  resumeDebate: () => void;
  endDebate: () => void;
  resetGame: () => void;
  selectTrendingTopic: (topicId: string) => void;
  getGraphData: () => GraphData;
  exportToPDF: () => void;
  loadTrendingTopics: () => Promise<void>;
  loadArgumentSuggestions: () => Promise<void>;
  acceptArgumentSuggestion: (suggestionId: string) => void;
  branchArgument: (argumentId: string, newClaim: string) => void;
  requestJuryDecision: (claimId: string) => Promise<void>;
  validateUserArgument: (argument: string, claim: string, stance: string) => Promise<any>;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial game settings
      gameMode: 'User vs User',
      difficulty: 'Easy',
      turnTimeLimit: 60,
      debateFlow: 'Synchronous',
      mainClaimInput: '',
      
      // Initial game state
      debate: null,
      currentTimer: 60,
      timerActive: false,
      suggestions: [],
      argumentSuggestions: [],
      loadingArgumentSuggestions: false,
      errorMessage: null,
      isLoading: false,
      
      // Initial UI state
      showAdminPanel: true,
      showDebateWindow: false,
      
      // Sample trending topics (will be replaced with AI-generated ones)
      trendingTopics: [
        {
          id: '1',
          title: 'Social media benefits society',
          description: 'Debate whether social media platforms have a net positive impact on society.'
        },
        {
          id: '2',
          title: 'Remote work is better',
          description: 'Discuss if remote work is superior to traditional office environments.'
        }
      ],
      loadingTopics: false,
      
      // Jury decisions
      juryDecisions: [],
      
      // Actions
      setGameMode: (mode) => set({ gameMode: mode }),
      
      setDifficulty: (level) => set({ difficulty: level }),
      
      setTurnTimeLimit: (seconds) => set({ 
        turnTimeLimit: seconds,
        currentTimer: seconds
      }),
      
      setDebateFlow: (flow) => set({ debateFlow: flow }),
      
      setMainClaimInput: (claim) => set({ mainClaimInput: claim }),
      
      validateAndStartDebate: async () => {
        const { mainClaimInput, gameMode, difficulty, turnTimeLimit, debateFlow } = get();
        
        set({ isLoading: true, errorMessage: null });
        
        try {
          // Validate the main claim using AI
          const validation = await validateClaim(mainClaimInput);
          
          if (!validation.valid) {
            const suggestions = await generateSuggestions(mainClaimInput);
            set({ 
              errorMessage: validation.message,
              suggestions,
              isLoading: false
            });
            return false;
          }
          
          // Create players based on game mode
          const players: [Player, Player] = [
            {
              id: 1,
              name: gameMode === 'AI vs AI' ? 'AI 1' : 'Player 1',
              type: gameMode === 'AI vs AI' ? 'AI' : 'User',
              role: 'WITH',
              score: 0
            },
            {
              id: 2,
              name: gameMode === 'User vs User' ? 'Player 2' : 'AI 2',
              type: gameMode === 'User vs User' ? 'User' : 'AI',
              role: 'AGAINST',
              score: 0
            }
          ];
          
          // Create main claim
          const mainClaimId = generateId();
          const mainClaim: Claim = {
            id: mainClaimId,
            content: mainClaimInput,
            parentId: null,
            arguments: [],
            resolved: false,
            winner: null
          };
          
          // For AI vs AI mode, use a fixed time limit that's not shown to the user
          const effectiveTurnTimeLimit = gameMode === 'AI vs AI' ? 5 : turnTimeLimit;
          
          // Create debate
          const debate: Debate = {
            id: generateId(),
            mainClaim,
            claims: { [mainClaimId]: mainClaim },
            currentClaimId: mainClaimId,
            currentTurn: 1, // Player 1 starts
            passes: 0,
            gameMode,
            difficulty,
            turnTimeLimit: effectiveTurnTimeLimit,
            debateFlow,
            players,
            status: 'active',
            winner: null
          };
          
          set({ 
            debate,
            currentTimer: effectiveTurnTimeLimit,
            timerActive: true,
            errorMessage: null,
            suggestions: [],
            argumentSuggestions: [],
            showAdminPanel: false,
            showDebateWindow: true,
            isLoading: false
          });
          
          // If AI starts, generate an argument
          if (players[0].type === 'AI') {
            setTimeout(async () => {
              const aiArgument = await generateAIArgument(debate, 'WITH');
              get().submitArgument(aiArgument);
            }, 2000);
          } else {
            // If user starts, load argument suggestions
            get().loadArgumentSuggestions();
          }
          
          return true;
        } catch (error) {
          console.error('Error starting debate:', error);
          set({ 
            errorMessage: 'An error occurred while starting the debate. Please try again.',
            isLoading: false
          });
          return false;
        }
      },
      
      submitArgument: (content) => {
        const { debate, currentTimer } = get();
        
        if (!debate || (debate.debateFlow === 'Synchronous' && currentTimer <= 0)) return;
        
        const currentPlayer = debate.players[debate.currentTurn - 1];
        const currentClaim = debate.claims[debate.currentClaimId];
        
        // CRITICAL FIX: Always use the correct stance based on player ID
        // Player 1 always uses WITH stance, Player 2 always uses AGAINST stance
        const stance = currentPlayer.id === 1 ? 'WITH' : 'AGAINST';
        
        // Check if this argument is a duplicate
        const isDuplicate = currentClaim.arguments.some(arg => 
          arg.stance === stance && 
          arg.content.toLowerCase() === content.toLowerCase()
        );
        
        if (isDuplicate) {
          console.warn('Duplicate argument detected and prevented');
          // For AI, try to generate a new argument
          if (currentPlayer.type === 'AI') {
            setTimeout(async () => {
              const newAiArgument = await generateAIArgument(debate, stance);
              // Recursive call, but with a new argument
              get().submitArgument(newAiArgument);
            }, 1000);
          }
          return;
        }
        
        // Validate that the argument is relevant to the claim and has a clear stance
        if (!validateArgument(content, currentClaim.content, stance)) {
          console.warn('Invalid argument detected: not relevant or unclear stance');
          
          // For AI, try to generate a new argument
          if (currentPlayer.type === 'AI') {
            setTimeout(async () => {
              const newAiArgument = await generateAIArgument(debate, stance);
              // Recursive call, but with a new argument
              get().submitArgument(newAiArgument);
            }, 1000);
          }
          
          // For users, we could show an error message, but for now we'll just accept it
          // In a real implementation, we would return here and show an error message
          if (currentPlayer.type === 'User') {
            // We'll still accept user arguments for now, but in a real implementation
            // we would return here and show an error message
            console.log('User submitted an argument that may not be relevant or have a clear stance');
          }
        }
        
        // Check if the argument contains multiple claims (simple heuristic)
        if (containsMultipleClaims(content) && currentPlayer.type === 'AI') {
          // Extract the first part before commas or semicolons
          const simplifiedContent = splitArgument(content);
          if (simplifiedContent.length > 10) {
            content = simplifiedContent;
          }
        }
        
        // Create new argument
        const newArgument: Argument = {
          id: generateId(),
          content,
          player: currentPlayer.id,
          stance,
          timestamp: Date.now()
        };
        
        // Update claim with new argument
        const updatedClaim = {
          ...currentClaim,
          arguments: [...currentClaim.arguments, newArgument]
        };
        
        // Update player score
        const updatedPlayers = [...debate.players] as [Player, Player];
        updatedPlayers[debate.currentTurn - 1].score += 1;
        
        // Switch turns
        const nextTurn = debate.currentTurn === 1 ? 2 : 1;
        
        // Reset passes counter
        const updatedDebate = {
          ...debate,
          claims: {
            ...debate.claims,
            [currentClaim.id]: updatedClaim
          },
          currentTurn: nextTurn,
          passes: 0,
          players: updatedPlayers
        };
        
        set({ 
          debate: updatedDebate,
          currentTimer: debate.turnTimeLimit,
          suggestions: [],
          argumentSuggestions: []
        });
        
        // If next turn is AI, generate an argument
        const nextPlayer = updatedPlayers[nextTurn - 1];
        if (nextPlayer.type === 'AI') {
          // For AI vs AI, add a random delay between 2-4 seconds to make it feel more natural
          const delay = debate.gameMode === 'AI vs AI' ? 2000 + Math.random() * 2000 : 2000;
          
          setTimeout(async () => {
            // CRITICAL FIX: Use the correct stance based on player ID
            const aiStance = nextPlayer.id === 1 ? 'WITH' : 'AGAINST';
            const aiArgument = await generateAIArgument(updatedDebate, aiStance);
            get().submitArgument(aiArgument);
          }, delay);
        } else {
          // If next turn is a user, load argument suggestions
          get().loadArgumentSuggestions();
        }
      },
      
      pass: () => {
        const { debate } = get();
        
        if (!debate) return;
        
        // Increment passes counter
        const passes = debate.passes + 1;
        
        // Check if debate should end (2 consecutive passes)
        if (passes >= 2) {
          // Resolve current claim
          const currentClaim = debate.claims[debate.currentClaimId];
          const updatedClaim = {
            ...currentClaim,
            resolved: true
          };
          
          // Update debate
          const updatedDebate = {
            ...debate,
            claims: {
              ...debate.claims,
              [currentClaim.id]: updatedClaim
            },
            status: currentClaim.parentId === null ? 'ended' : debate.status,
            passes: 0
          };
          
          set({ 
            debate: updatedDebate,
            currentTimer: debate.turnTimeLimit,
            timerActive: currentClaim.parentId !== null
          });
          
          // If main claim is resolved, end the debate
          if (currentClaim.parentId === null) {
            // Determine winner based on scores
            const winner = debate.players[0].score > debate.players[1].score 
              ? debate.players[0].id 
              : debate.players[0].score < debate.players[1].score 
                ? debate.players[1].id 
                : null;
                
            set({
              debate: {
                ...updatedDebate,
                winner
              }
            });
          }
        } else {
          // Switch turns
          const nextTurn = debate.currentTurn === 1 ? 2 : 1;
          
          // Update debate
          const updatedDebate = {
            ...debate,
            currentTurn: nextTurn,
            passes
          };
          
          set({ 
            debate: updatedDebate,
            currentTimer: debate.turnTimeLimit,
            argumentSuggestions: []
          });
          
          // If next turn is AI, generate an argument or pass
          const nextPlayer = debate.players[nextTurn - 1];
          if (nextPlayer.type === 'AI') {
            setTimeout(async () => {
              // 50% chance to pass if already one pass
              if (passes === 1 && Math.random() > 0.5) {
                get().pass();
              } else {
                // CRITICAL FIX: Use the correct stance based on player ID
                const aiStance = nextPlayer.id === 1 ? 'WITH' : 'AGAINST';
                const aiArgument = await generateAIArgument(updatedDebate, aiStance);
                get().submitArgument(aiArgument);
              }
            }, 2000);
          } else {
            // If next turn is a user, load argument suggestions
            get().loadArgumentSuggestions();
          }
        }
      },
      
      resetTimer: () => set({ currentTimer: get().debate?.turnTimeLimit || 60 }),
      
      decrementTimer: () => {
        const { currentTimer, timerActive, debate } = get();
        
        if (!timerActive || !debate || debate.status !== 'active') return;
        
        if (currentTimer <= 1) {
          set({ currentTimer: 0, timerActive: false });
          // Auto-pass when timer reaches zero
          get().pass();
        } else {
          set({ currentTimer: currentTimer - 1 });
        }
      },
      
      pauseDebate: () => {
        const { debate } = get();
        
        if (!debate) return;
        
        set({
          debate: { ...debate, status: 'paused' },
          timerActive: false
        });
      },
      
      resumeDebate: () => {
        const { debate } = get();
        
        if (!debate) return;
        
        set({
          debate: { ...debate, status: 'active' },
          timerActive: true
        });
      },
      
      endDebate: () => {
        const { debate } = get();
        
        if (!debate) return;
        
        // Determine winner based on scores
        const winner = debate.players[0].score > debate.players[1].score 
          ? debate.players[0].id 
          : debate.players[0].score < debate.players[1].score 
            ? debate.players[1].id 
            : null;
            
        set({
          debate: {
            ...debate,
            status: 'ended',
            winner
          },
          timerActive: false
        });
      },
      
      resetGame: () => set({
        debate: null,
        currentTimer: get().turnTimeLimit,
        timerActive: false,
        suggestions: [],
        argumentSuggestions: [],
        errorMessage: null,
        showAdminPanel: true,
        showDebateWindow: false
      }),
      
      selectTrendingTopic: (topicId) => {
        const topic = get().trendingTopics.find(t => t.id === topicId);
        
        if (topic) {
          set({ mainClaimInput: topic.title });
        }
      },
      
      getGraphData: () => {
        const { debate } = get();
        
        if (!debate) return { nodes: [], links: [] };
        
        const nodes = [];
        const links = [];
        
        // Add main claim node
        nodes.push({
          id: debate.mainClaim.id,
          label: debate.mainClaim.content,
          type: 'claim',
          parentId: null
        });
        
        // Add argument nodes and links
        Object.values(debate.claims).forEach(claim => {
          // Add WITH arguments (Player 1)
          const withArgs = claim.arguments.filter(arg => arg.stance === 'WITH');
          withArgs.forEach((arg, index) => {
            // For the new representation, we don't add nodes for arguments
            // Instead, we add the argument content as a label on the link
            links.push({
              source: claim.id,
              target: `${claim.id}_with_${index}`, // Virtual target for the arrow
              stance: 'WITH',
              label: arg.content,
              id: arg.id,
              player: arg.player,
              index: index // Add index for vertical positioning
            });
          });
          
          // Add AGAINST arguments (Player 2)
          const againstArgs = claim.arguments.filter(arg => arg.stance === 'AGAINST');
          againstArgs.forEach((arg, index) => {
            // For the new representation, we don't add nodes for arguments
            // Instead, we add the argument content as a label on the link
            links.push({
              source: claim.id,
              target: `${claim.id}_against_${index}`, // Virtual target for the arrow
              stance: 'AGAINST',
              label: arg.content,
              id: arg.id,
              player: arg.player,
              index: index // Add index for vertical positioning
            });
          });
          
          // Add links for sub-claims
          if (claim.parentId) {
            links.push({
              source: claim.parentId,
              target: claim.id,
              stance: 'return'
            });
          }
        });
        
        // Add virtual nodes for arrow endpoints
        links.forEach(link => {
          if (typeof link.target === 'string' && 
              (link.target.includes('_with_') || link.target.includes('_against_'))) {
            const [claimId, stance, indexStr] = link.target.split('_');
            const index = parseInt(indexStr);
            const direction = stance === 'with' ? -1 : 1; // Left for WITH, right for AGAINST
            
            // Find the source claim node
            const sourceNode = nodes.find(n => n.id === claimId);
            if (sourceNode) {
              // Add a virtual node for the arrow endpoint
              nodes.push({
                id: link.target,
                type: 'virtual',
                stance: stance.toUpperCase(),
                fx: (sourceNode.fx || 0) + direction * 150, // Position left or right
                fy: (sourceNode.fy || 0) + 100 + index * 50, // Position below with spacing
                renderLabel: false // Don't render this node
              });
            }
          }
        });
        
        return { nodes, links };
      },
      
      exportToPDF: () => {
        // Implementation of PDF export functionality
        // This would generate a PDF with the debate structure
        alert('PDF export functionality would be implemented here');
      },
      
      loadTrendingTopics: async () => {
        set({ loadingTopics: true });
        
        try {
          const topics = await generateTopicSuggestions();
          set({ 
            trendingTopics: topics,
            loadingTopics: false
          });
        } catch (error) {
          console.error('Error loading trending topics:', error);
          set({ loadingTopics: false });
        }
      },
      
      loadArgumentSuggestions: async () => {
        const { debate } = get();
        
        if (!debate || debate.status !== 'active') return;
        
        const currentPlayer = debate.players[debate.currentTurn - 1];
        
        // Only generate suggestions for user turns
        if (currentPlayer.type === 'AI') return;
        
        set({ loadingArgumentSuggestions: true });
        
        try {
          // Generate argument suggestions based on difficulty
          const stance = currentPlayer.id === 1 ? 'WITH' : 'AGAINST';
          const suggestions = await generateArgumentSuggestions(
            debate.claims[debate.currentClaimId].content, 
            stance, 
            debate.difficulty
          );
          
          set({ 
            argumentSuggestions: suggestions,
            loadingArgumentSuggestions: false
          });
        } catch (error) {
          console.error('Error loading argument suggestions:', error);
          set({ loadingArgumentSuggestions: false });
        }
      },
      
      acceptArgumentSuggestion: (suggestionId) => {
        const { argumentSuggestions } = get();
        const suggestion = argumentSuggestions.find(s => s.id === suggestionId);
        
        if (suggestion) {
          get().submitArgument(suggestion.content);
        }
      },
      
      branchArgument: (argumentId, newClaim) => {
        const { debate } = get();
        
        if (!debate) return;
        
        // Find the argument in the current claim
        const currentClaim = debate.claims[debate.currentClaimId];
        const argument = currentClaim.arguments.find(arg => arg.id === argumentId);
        
        if (!argument) return;
        
        // Create a new claim based on the argument
        const newClaimId = generateId();
        const newClaimObj: Claim = {
          id: newClaimId,
          content: newClaim || argument.content,
          parentId: currentClaim.id,
          arguments: [],
          resolved: false,
          winner: null
        };
        
        // Update the debate with the new claim
        const updatedDebate = {
          ...debate,
          claims: {
            ...debate.claims,
            [newClaimId]: newClaimObj
          },
          currentClaimId: newClaimId,
          passes: 0
        };
        
        set({ 
          debate: updatedDebate,
          currentTimer: debate.turnTimeLimit
        });
        
        // If current player is AI, generate an argument for the new claim
        const currentPlayer = debate.players[debate.currentTurn - 1];
        if (currentPlayer.type === 'AI') {
          setTimeout(async () => {
            const stance = currentPlayer.id === 1 ? 'WITH' : 'AGAINST';
            const aiArgument = await generateAIArgument(updatedDebate, stance);
            get().submitArgument(aiArgument);
          }, 2000);
        } else {
          // If current player is user, load argument suggestions
          get().loadArgumentSuggestions();
        }
      },
      
      requestJuryDecision: async (claimId) => {
        const { debate, juryDecisions } = get();
        
        if (!debate) return;
        
        // Check if we already have a jury decision for this claim
        const existingDecision = juryDecisions.find(d => d.claimId === claimId);
        if (existingDecision) {
          // Just show the existing decision
          alert(`Jury Decision: ${existingDecision.decision === 'WITH' ? 'Supporting' : existingDecision.decision === 'AGAINST' ? 'Opposing' : 'Tie'}\n\nReasoning: ${existingDecision.reasoning}`);
          return;
        }
        
        // Get the claim
        const claim = debate.claims[claimId];
        if (!claim) return;
        
        // Count arguments for each side
        const withArgs = claim.arguments.filter(arg => arg.stance === 'WITH').length;
        const againstArgs = claim.arguments.filter(arg => arg.stance === 'AGAINST').length;
        
        // Simple jury decision based on argument count
        let decision: 'WITH' | 'AGAINST' | 'TIE';
        let reasoning: string;
        
        if (withArgs > againstArgs) {
          decision = 'WITH';
          reasoning = `The supporting side presented ${withArgs} compelling arguments compared to ${againstArgs} from the opposing side. The jury finds the supporting arguments more convincing.`;
        } else if (againstArgs > withArgs) {
          decision = 'AGAINST';
          reasoning = `The opposing side presented ${againstArgs} compelling arguments compared to ${withArgs} from the supporting side. The jury finds the opposing arguments more convincing.`;
        } else {
          decision = 'TIE';
          reasoning = `Both sides presented an equal number of arguments (${withArgs}). The jury finds both sides equally convincing.`;
        }
        
        // Create jury decision
        const juryDecision: JuryDecision = {
          id: generateId(),
          claimId,
          decision,
          reasoning,
          timestamp: Date.now()
        };
        
        // Update claim with winner
        const updatedClaim = {
          ...claim,
          resolved: true,
          winner: decision === 'TIE' ? null : decision
        };
        
        // Update debate
        const updatedDebate = {
          ...debate,
          claims: {
            ...debate.claims,
            [claimId]: updatedClaim
          }
        };
        
        // If this is the main claim, end the debate
        if (claimId === debate.mainClaim.id) {
          updatedDebate.status = 'ended';
          updatedDebate.winner = decision === 'WITH' ? 1 : decision === 'AGAINST' ? 2 : null;
        }
        
        set({
          debate: updatedDebate,
          juryDecisions: [...juryDecisions, juryDecision]
        });
        
        // Show the jury decision
        alert(`Jury Decision: ${decision === 'WITH' ? 'Supporting' : decision === 'AGAINST' ? 'Opposing' : 'Tie'}\n\nReasoning: ${reasoning}`);
      },
      
      validateUserArgument: async (argument, claim, stance) => {
        try {
          return await validateUserArgument(argument, claim, stance);
        } catch (error) {
          console.error('Error validating user argument:', error);
          return { valid: true, message: "Valid argument." };
        }
      }
    }),
    {
      name: 'ideArena-storage',
      partialize: (state) => ({
        debate: state.debate,
        showAdminPanel: state.showAdminPanel,
        showDebateWindow: state.showDebateWindow,
        currentTimer: state.currentTimer,
        timerActive: state.timerActive,
        juryDecisions: state.juryDecisions
      })
    }
  )
);