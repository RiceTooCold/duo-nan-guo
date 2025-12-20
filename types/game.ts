import type { TargetLanguage, MatchPlayer } from '@/generated/prisma';

export enum GamePhase {
  IDLE = 'IDLE',
  COUNTDOWN = 'COUNTDOWN',
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
  players: MatchPlayer[];
  targetLanguage: TargetLanguage;
  rank: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  newScore: number;
  newHealth: number;
  isGameOver: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  health: number;
  streak: number;
  isBot: boolean;
  avatar?: string | null;
}

export interface GameState {
  phase: GamePhase;
  currentQuestionIndex: number;
  timeLeft: number;
  session: GameSession | null;
  players: Record<string, PlayerState>; // playerId -> PlayerState
  winnerId: string | null;
  lastResult: AnswerResult | null; // For immediate feedback
  error: string | null;
}
