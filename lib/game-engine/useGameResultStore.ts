'use client';

import { create } from 'zustand';
import type { GameResult } from '@/types/game';

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
