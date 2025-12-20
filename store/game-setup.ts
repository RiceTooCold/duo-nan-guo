import { create } from 'zustand';
import { TargetLanguage } from '@/generated/prisma';

export type GameStep = 'LANG' | 'MODE' | 'LOBBY' | 'GAME';
export type GameMode = 'SOLO' | 'BOT' | 'MULTI';

interface GameSetupState {
    selectedLang: TargetLanguage | null;
    selectedMode: GameMode;
    selectedRank: number;
    step: GameStep;
    matchId: string | null;

    // Actions
    selectLang: (lang: TargetLanguage | null) => void;
    setMode: (mode: GameMode) => void;
    setRank: (rank: number) => void;
    setStep: (step: GameStep) => void;
    setMatchId: (id: string | null) => void;
    goBack: () => void;
    reset: () => void;
}

export const useGameSetupStore = create<GameSetupState>((set, get) => ({
    selectedLang: null,
    selectedMode: 'SOLO',
    selectedRank: 1,
    step: 'LANG',
    matchId: null,

    selectLang: (lang) => set({
        selectedLang: lang,
        step: lang ? 'MODE' : 'LANG'
    }),

    setMode: (mode) => set({ selectedMode: mode }),

    setRank: (rank) => set({ selectedRank: rank }),

    setStep: (step) => set({ step }),

    setMatchId: (id) => set({ matchId: id }),

    goBack: () => {
        const currentStep = get().step;
        if (currentStep === 'MODE') set({ step: 'LANG', selectedLang: null });
        if (currentStep === 'LOBBY') set({ step: 'MODE' });
        if (currentStep === 'GAME') set({ step: 'MODE' });
    },

    reset: () => set({
        selectedLang: null,
        selectedMode: 'SOLO',
        selectedRank: 1,
        step: 'LANG',
        matchId: null,
    }),
}));
