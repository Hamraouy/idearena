// Game modes
export type GameMode = 'User vs User' | 'User vs AI' | 'AI vs AI';

// Difficulty levels
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

// Debate flow types
export type DebateFlow = 'Synchronous' | 'Asynchronous';

// Player roles
export type PlayerRole = 'WITH' | 'AGAINST';

// Player types
export type PlayerType = 'User' | 'AI';

// Player structure
export interface Player {
  id: number;
  name: string;
  type: PlayerType;
  role: PlayerRole;
  score: number;
}

// Argument structure
export interface Argument {
  id: string;
  content: string;
  player: number; // Player ID
  stance: PlayerRole;
  timestamp: number;
}

// Claim structure
export interface Claim {
  id: string;
  content: string;
  parentId: string | null;
  arguments: Argument[];
  resolved: boolean;
  winner: PlayerRole | null;
}

// Debate structure
export interface Debate {
  id: string;
  mainClaim: Claim;
  claims: Record<string, Claim>;
  currentClaimId: string;
  currentTurn: number; // Player ID
  passes: number;
  gameMode: GameMode;
  difficulty: DifficultyLevel;
  turnTimeLimit: number;
  debateFlow: DebateFlow;
  players: [Player, Player];
  status: 'setup' | 'active' | 'paused' | 'ended';
  winner: number | null; // Player ID
}

// Graph node types
export type NodeType = 'claim' | 'argument' | 'return' | 'virtual';

// Graph node structure
export interface GraphNode {
  id: string;
  label?: string;
  type: NodeType;
  stance?: PlayerRole;
  parentId?: string | null;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  renderLabel?: boolean;
}

// Graph link structure
export interface GraphLink {
  source: string;
  target: string;
  stance: PlayerRole | 'return';
  label?: string;
  id?: string;
  player?: number;
}

// Graph data structure
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Suggestion structure
export interface Suggestion {
  id: string;
  content: string;
}

// Topic structure
export interface Topic {
  id: string;
  title: string;
  description: string;
}

// AI Suggestion structure for arguments
export interface ArgumentSuggestion {
  id: string;
  content: string;
  stance: PlayerRole;
}

// Jury Decision structure
export interface JuryDecision {
  id: string;
  claimId: string;
  decision: 'WITH' | 'AGAINST' | 'TIE';
  reasoning: string;
  timestamp: number;
}