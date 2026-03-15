import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameSettings } from '../../src/hooks/useGameSettings';

describe('useGameSettings', () => {
    it('returns defaults', () => {
        const { result } = renderHook(() => useGameSettings());
        expect(result.current.settings.speed).toBe('slow');
        expect(result.current.settings.contrastLeft).toBe(100);
        expect(result.current.settings.eyeConfig).toBe('platform_left');
    });

    it('updates immutably', () => {
        const { result } = renderHook(() => useGameSettings());
        const original = result.current.settings;
        act(() => { result.current.updateSettings({ speed: 'fast' }); });
        expect(result.current.settings.speed).toBe('fast');
        expect(result.current.settings.contrastLeft).toBe(100);
        expect(result.current.settings).not.toBe(original);
    });
});
