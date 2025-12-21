'use client';

import { create } from 'zustand';

export interface GameResult {
    matchId: string;
    isWin: boolean;
    playerScore: number;
    botScore: number;
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    maxCombo: number;
    language: string;
    level: string;
    playerName: string;
    botName: string;
    playerAvatar?: string | null;
    botAvatar?: string | null;
}

interface GameResultState {
    result: GameResult | null;
    setResult: (result: GameResult) => void;
    clearResult: () => void;
}

export const useGameResultStore = create<GameResultState>((set) => ({
    result: null,
    setResult: (result) => set({ result }),
    clearResult: () => set({ result: null }),
}));
