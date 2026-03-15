// @ts-nocheck
import { useState, useCallback } from 'react';
import { createGameSettings } from '../modules/gameState';

export function useGameSettings(initial = {}) {
    const [settings, setSettings] = useState(() => createGameSettings(initial));

    const updateSettings = useCallback((overrides) => {
        setSettings(prev => createGameSettings({ ...prev, ...overrides }));
    }, []);

    return { settings, updateSettings };
}
