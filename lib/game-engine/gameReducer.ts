import { GamePhase, type GameState, type GameSession, type PlayerState, type AnswerResult } from '@/types/game';

/** Simple hash function for answer validation */
function hashAnswer(answer: string): string {
    let hash = 0;
    for (let i = 0; i < answer.length; i++) {
        const char = answer.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

/** Find correct answer key by comparing hashes */
function findCorrectAnswerKey(
    options: Record<string, string>,
    correctHash: string
): string | null {
    for (const key of Object.keys(options)) {
        if (hashAnswer(key) === correctHash) return key;
    }
    return null;
}

// Action Types - Simplified payloads where reducer can calculate
export type GameAction =
    | { type: 'INIT_GAME'; payload: { session: GameSession; self: PlayerState; opponent: PlayerState } }
    | { type: 'START_ROUND' }
    | { type: 'TICK' }
    | { type: 'SUBMIT_ANSWER'; payload: { playerId: 'self' | 'opponent'; answer: string } }
    | { type: 'PREPARE_NEXT_ROUND' }
    | { type: 'FINISH_GAME' } // No payload - reducer calculates winner
    | { type: 'TIME_UP' } // Handle timeout in reducer
    | { type: 'SET_ERROR'; payload: string };

// Initial State
export const initialGameState: GameState = {
    phase: GamePhase.IDLE,
    currentQuestionIndex: 0,
    timeLeft: 15,
    session: null,
    self: null,
    opponent: null,
    winnerId: null,
    lastResult: null,
    error: null,
    correctAnswer: null,
    selfAnswer: null,
    opponentAnswer: null,
};

// Helper: Validate answer against hash
function validateAnswer(state: GameState, answer: string): boolean {
    if (!state.session || !answer) return false;
    const question = state.session.questions[state.currentQuestionIndex];
    const correctHash = state.session.correctAnswerHashes[question.id];
    return hashAnswer(answer) === correctHash;
}

// Helper: Get correct answer for current question
function getCorrectAnswer(state: GameState): string | null {
    if (!state.session) return null;
    const question = state.session.questions[state.currentQuestionIndex];
    const correctHash = state.session.correctAnswerHashes[question.id];
    return findCorrectAnswerKey(question.options, correctHash);
}

// Helper: Calculate winner
function calculateWinner(state: GameState): string | null {
    if (!state.self || !state.opponent) return null;
    if (state.self.score > state.opponent.score) return 'self';
    if (state.opponent.score > state.self.score) return 'opponent';
    return null; // tie
}

// Helper: Check if last question
function isLastQuestion(state: GameState): boolean {
    if (!state.session) return true;
    return state.currentQuestionIndex >= state.session.questions.length - 1;
}

// Reducer Function
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'INIT_GAME':
            return {
                ...initialGameState,
                session: action.payload.session,
                self: action.payload.self,
                opponent: action.payload.opponent,
                phase: GamePhase.READY,
                timeLeft: 15,
            };

        case 'START_ROUND':
            return { ...state, phase: GamePhase.PLAYING, timeLeft: 15 };

        case 'TICK': {
            if (state.timeLeft <= 1) {
                // Time's up - let TIME_UP action handle the timeout logic
                return { ...state, timeLeft: 0 };
            }
            return { ...state, timeLeft: state.timeLeft - 1 };
        }

        case 'TIME_UP': {
            // Auto-fail for self if not answered
            if (state.selfAnswer !== null) return state; // Already answered

            const correctAnswer = getCorrectAnswer(state);
            return {
                ...state,
                selfAnswer: '', // Empty string = timeout/no answer
                correctAnswer,
                phase: GamePhase.RESOLVING,
            };
        }

        case 'SUBMIT_ANSWER': {
            const { playerId, answer } = action.payload;
            const isSelf = playerId === 'self';

            // Validate answer using reducer's pure function
            const isCorrect = validateAnswer(state, answer);
            const scoreChange = isCorrect ? 10 : 0;

            // Calculate correct answer (only reveal on self answer)
            const correctAnswer = isSelf ? getCorrectAnswer(state) : state.correctAnswer;

            // Update self player state
            const newSelf = isSelf && state.self
                ? {
                    ...state.self,
                    score: state.self.score + scoreChange,
                    streak: isCorrect ? state.self.streak + 1 : 0,
                    maxStreak: Math.max(
                        state.self.maxStreak || 0,
                        isCorrect ? state.self.streak + 1 : state.self.streak
                    )
                }
                : state.self;

            // Update opponent player state
            const newOpponent = !isSelf && state.opponent
                ? {
                    ...state.opponent,
                    score: state.opponent.score + scoreChange,
                    streak: isCorrect ? state.opponent.streak + 1 : 0,
                    maxStreak: Math.max(
                        state.opponent.maxStreak || 0,
                        isCorrect ? state.opponent.streak + 1 : state.opponent.streak
                    )
                }
                : state.opponent;

            const newState = {
                ...state,
                self: newSelf,
                opponent: newOpponent,
                selfAnswer: isSelf ? answer : state.selfAnswer,
                opponentAnswer: !isSelf ? answer : state.opponentAnswer,
                correctAnswer,
            };

            // Self answering triggers RESOLVING phase
            if (isSelf) {
                return { ...newState, phase: GamePhase.RESOLVING };
            }

            return newState;
        }

        case 'PREPARE_NEXT_ROUND': {
            if (!state.session) return state;

            if (isLastQuestion(state)) {
                // Should not reach here, but handle gracefully
                return state;
            }

            return {
                ...state,
                phase: GamePhase.READY,
                currentQuestionIndex: state.currentQuestionIndex + 1,
                timeLeft: 15,
                lastResult: null,
                correctAnswer: null,
                selfAnswer: null,
                opponentAnswer: null,
            };
        }

        case 'FINISH_GAME': {
            // Reducer calculates winner internally
            const winnerId = calculateWinner(state);
            return {
                ...state,
                phase: GamePhase.FINISHED,
                winnerId,
                lastResult: null,
            };
        }

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        default:
            return state;
    }
}

// Export helpers for useGameLoop (for answer buffer tracking)
export { hashAnswer, validateAnswer as validateAnswerPure };
