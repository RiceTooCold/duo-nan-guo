/**
 * GameStore - Abstract storage layer for game state
 * Uses MongoDB (Match.liveState), can migrate to Vercel KV later
 * 
 * DESIGN: Player-agnostic state
 * - Server stores playerStates keyed by playerId (e.g., "player_1", "bot_1")
 * - Client transforms to self/opponent based on current user
 */

import { prisma } from '@/lib/prisma';
import type { GamePhase } from '@/types/game';

// ============================================
// Server-side game state (stored in Match.liveState)
// Player-agnostic: uses playerId as key
// ============================================

export interface LiveGameState {
    phase: GamePhase;
    currentQuestionIndex: number;
    endTime: number;  // Unix timestamp (ms) when round ends

    // Player states keyed by playerId
    playerStates: {
        [playerId: string]: PlayerGameState;
    };

    // Correct answer (only set during RESOLVING)
    correctAnswer: string | null;

    // Winner playerId (only set when FINISHED)
    winnerId: string | null;
}

export interface PlayerGameState {
    score: number;
    streak: number;
    maxStreak: number;
    answer: string | null;
    isCorrect: boolean | null;
    lastScoreChange: number;  // Score delta from last answer (for animation)
}

// ============================================
// Client-side view (transformed by useGameClient)
// Perspective-aware: self vs opponent
// ============================================

export interface ClientGameView {
    phase: GamePhase;
    currentQuestionIndex: number;
    timeLeft: number;  // Calculated from endTime

    // Self state
    self: {
        playerId: string;
        name: string;
        avatar: string | null;
        isBot: boolean;
        score: number;
        streak: number;
        maxStreak: number;
        answer: string | null;
        isCorrect: boolean | null;
        lastScoreChange: number;
    };

    // Opponent state
    opponent: {
        playerId: string;
        name: string;
        avatar: string | null;
        isBot: boolean;
        score: number;
        streak: number;
        maxStreak: number;
        answer: string | null;
        isCorrect: boolean | null;
        lastScoreChange: number;
    };

    correctAnswer: string | null;
    winnerId: string | null;
}

// ============================================
// Storage functions
// ============================================

/**
 * Get current game state from MongoDB
 */
export async function getGameState(matchId: string): Promise<LiveGameState | null> {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { liveState: true },
    });

    if (!match?.liveState) return null;
    return match.liveState as unknown as LiveGameState;
}

/**
 * Save game state to MongoDB
 */
export async function setGameState(matchId: string, state: LiveGameState): Promise<void> {
    await prisma.match.update({
        where: { id: matchId },
        data: { liveState: state as unknown as object },
    });
}

/**
 * Clear game state (after game ends)
 */
export async function clearGameState(matchId: string): Promise<void> {
    await prisma.match.update({
        where: { id: matchId },
        data: { liveState: null },
    });
}

// ============================================
// Helper: Create initial player state
// ============================================

export function createInitialPlayerState(): PlayerGameState {
    return {
        score: 0,
        streak: 0,
        maxStreak: 0,
        answer: null,
        isCorrect: null,
        lastScoreChange: 0,
    };
}
