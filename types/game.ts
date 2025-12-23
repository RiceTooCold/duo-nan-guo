import type { TargetLanguage, MatchPlayer } from '@prisma/client';

export enum GamePhase {
  IDLE = 'IDLE',
  READY = 'READY',         // 資料就緒，等待開始 (用於 Intro/Reveal/NextRound)
  PLAYING = 'PLAYING',
  RESOLVING = 'RESOLVING',
  FINISHED = 'FINISHED',
}

export interface ClientQuestion {
  id: string;
  stimulus: string;
  options: Record<string, string>; // interaction turned into options
}

export interface GameSession {
  matchId: string;
  questions: ClientQuestion[];
  correctAnswerHashes: Record<string, string>; // questionId -> hash for frontend validation
  players: MatchPlayer[];
  targetLanguage: TargetLanguage;
  rank: number;
}


export interface PlayerState {
  id: string;
  name: string;
  score: number;
  streak: number;
  maxStreak: number; // Highest streak achieved during the game
  isBot: boolean;
  avatar?: string | null;
}

export interface GameState {
  phase: GamePhase;
  currentQuestionIndex: number;
  timeLeft: number;
  session: GameSession | null;
  // Self vs Opponent structure
  self: PlayerState | null;
  opponent: PlayerState | null;
  winnerId: string | null;
  error: string | null;
  // Answer tracking
  correctAnswer: string | null;
  selfAnswer: string | null;
  opponentAnswer: string | null;
  // Immediate feedback (visible during PLAYING, before RESOLVING reveals choices)
  selfIsCorrect: boolean | null;
  opponentIsCorrect: boolean | null;
  // selfAnswered and opponentAnswered are removed - derive from answer != null
}

// ============================================
// Game Result Types (for result screen)
// ============================================

export interface PlayerResult {
  id: string;
  name: string;
  score: number;
  avatar?: string | null;
  isBot: boolean;
  // Stats
  correctAnswers: number;
  accuracy: number;
  maxStreak: number;
  avgResponseTime: number; // Average response time in seconds
}

export interface GameResult {
  matchId: string;
  outcome: 'win' | 'lose' | 'tie';
  // Symmetric player data
  self: PlayerResult;
  opponent: PlayerResult;
  // Match metadata
  match: {
    totalQuestions: number;
    language: string;
    level: string;
  };
}
