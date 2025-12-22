import { GamePhase, type GameState, type GameSession, type PlayerState } from '@/types/game';

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

export const initialGameState: GameState = {
    phase: GamePhase.IDLE,
    currentQuestionIndex: 0,
    timeLeft: 15,
    session: null,
    self: null,
    opponent: null,
    winnerId: null,
    error: null,
    correctAnswer: null,
    selfAnswer: null,
    opponentAnswer: null,
    selfIsCorrect: null,
    opponentIsCorrect: null,
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
            // Time's up - force both players to have answers and transition to RESOLVING
            const correctAnswer = getCorrectAnswer(state);

            // Mark unanswered players as timeout (empty string)
            const newSelfAnswer = state.selfAnswer ?? '';
            const newOpponentAnswer = state.opponentAnswer ?? '';

            // Calculate correctness for anyone who timed out (they're wrong)
            const selfIsCorrect = state.selfIsCorrect ?? false;
            const opponentIsCorrect = state.opponentIsCorrect ?? false;

            return {
                ...state,
                selfAnswer: newSelfAnswer,
                opponentAnswer: newOpponentAnswer,
                selfIsCorrect,
                opponentIsCorrect,
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

            // Track answers and correctness
            const newSelfAnswer = isSelf ? answer : state.selfAnswer;
            const newOpponentAnswer = !isSelf ? answer : state.opponentAnswer;
            const newSelfIsCorrect = isSelf ? isCorrect : state.selfIsCorrect;
            const newOpponentIsCorrect = !isSelf ? isCorrect : state.opponentIsCorrect;

            const newState = {
                ...state,
                self: newSelf,
                opponent: newOpponent,
                selfAnswer: newSelfAnswer,
                opponentAnswer: newOpponentAnswer,
                selfIsCorrect: newSelfIsCorrect,
                opponentIsCorrect: newOpponentIsCorrect,
            };

            // Check if BOTH have now answered → transition to RESOLVING
            const bothAnswered = newSelfAnswer !== null && newOpponentAnswer !== null;

            if (bothAnswered) {
                const correctAnswer = getCorrectAnswer(state);
                return { ...newState, correctAnswer, phase: GamePhase.RESOLVING };
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
                correctAnswer: null,
                selfAnswer: null,
                opponentAnswer: null,
                selfIsCorrect: null,
                opponentIsCorrect: null,
            };
        }

        case 'FINISH_GAME': {
            // Reducer calculates winner internally
            const winnerId = calculateWinner(state);
            return {
                ...state,
                phase: GamePhase.FINISHED,
                winnerId,
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
