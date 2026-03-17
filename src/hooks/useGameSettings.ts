import { useState, useCallback } from 'react';
import { createGameSettings, GameSettings } from '../modules/gameState';

export function useGameSettings(initial: Partial<GameSettings> = {}) {
    const [settings, setSettings] = useState(() => createGameSettings(initial));

    const updateSettings = useCallback((overrides: Partial<GameSettings>) => {
        setSettings(prev => createGameSettings({ ...prev, ...overrides }));
    }, []);

    return { settings, updateSettings };
}
