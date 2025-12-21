import type { TargetLanguage, MatchPlayer } from '@/generated/prisma';

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

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  newScore: number;
  isGameOver: boolean;
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
  lastResult: AnswerResult | null;
  error: string | null;
  // Answer tracking
  correctAnswer: string | null;
  selfAnswer: string | null;
  opponentAnswer: string | null;
  // selfAnswered and opponentAnswered are removed - derive from answer != null
}
