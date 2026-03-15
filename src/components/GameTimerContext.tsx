import { createContext, useContext } from 'react';

interface GameTimerContextType {
    elapsedMs: number | null;
}

export const GameTimerContext = createContext<GameTimerContextType>({ elapsedMs: null });

export function useGameTimer() {
    return useContext(GameTimerContext);
}
