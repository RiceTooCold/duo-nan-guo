/**
 * Taunt system for the game to make it feel more interactive and "aggressive".
 */

type TauntSituation = 'START' | 'WIN_ROUND' | 'LOSE_ROUND' | 'STREAK' | 'GAME_OVER_WIN' | 'GAME_OVER_LOSE';

const TAUNTS: Record<TauntSituation, string[]> = {
    START: [
        "Prepare to lose, human.",
        "I've been programmed to destroy you.",
        "Is this your first time? I'll be gentle... NOT.",
        "Duo-Nan-Guo? More like You-Nan-Guo.",
    ],
    WIN_ROUND: [
        "Too slow!",
        "Is that your final answer? Wrong.",
        "My circuits are faster than your brain.",
        "Maybe try a lower rank next time?",
    ],
    LOSE_ROUND: [
        "Lucky guess.",
        "I let you have that one.",
        "Error 404: Skill not found... oh wait, it's on your side.",
        "Don't get cocky.",
    ],
    STREAK: [
        "You're on fire! But I'll put you out.",
        "A streak? How cute.",
        "Keep it up, you might actually challenge me.",
        "Is this the power of humanity?",
    ],
    GAME_OVER_WIN: [
        "Better luck next life.",
        "I expected more from a human.",
        "Go back to the tutorial.",
        "GG EZ.",
    ],
    GAME_OVER_LOSE: [
        "I was just testing my beta algorithms.",
        "My internet lagged!",
        "You won, but I'll be back... in your dreams.",
        "Cheater! I'm reporting you to RiceBot HQ.",
    ],
};

export function getTaunt(situation: TauntSituation): string {
    const list = TAUNTS[situation];
    return list[Math.floor(Math.random() * list.length)];
}

// Hook version for easier use in components if needed
export function useTaunt() {
    return {
        getTaunt,
    };
}
