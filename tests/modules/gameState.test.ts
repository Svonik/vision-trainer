import { describe, it, expect } from 'vitest';
import { createGameSettings, createSessionResult } from '../../src/modules/gameState';

describe('GameState Module', () => {
    it('creates default settings', () => {
        const defaults = createGameSettings();
        expect(defaults.contrastLeft).toBe(100);
        expect(defaults.speed).toBe('slow');
        expect(defaults.eyeConfig).toBe('platform_left');
    });

    it('overrides settings', () => {
        const custom = createGameSettings({ contrastLeft: 50, speed: 'fast' });
        expect(custom.contrastLeft).toBe(50);
        expect(custom.speed).toBe('fast');
        expect(custom.contrastRight).toBe(100);
    });

    it('creates session result', () => {
        const result = createSessionResult({
            settings: createGameSettings(),
            caught: 15, totalSpawned: 20, durationMs: 300000,
        });
        expect(result.game).toBe('binocular-catcher');
        expect(result.duration_s).toBe(300);
        expect(result.hit_rate).toBe(0.75);
    });

    it('handles zero spawns', () => {
        const result = createSessionResult({
            settings: createGameSettings(),
            caught: 0, totalSpawned: 0, durationMs: 5000,
        });
        expect(result.hit_rate).toBe(0);
    });

    it('includes glassesType in settings', () => {
        const defaults = createGameSettings();
        expect(defaults.glassesType).toBe('red-cyan');
        const custom = createGameSettings({ glassesType: 'cyan-red' });
        expect(custom.glassesType).toBe('cyan-red');
    });

    it('creates default settings with fellowEyeContrast', () => {
        const s = createGameSettings({});
        expect(s.fellowEyeContrast).toBe(30);
    });

    it('includes fellowEyeContrast override', () => {
        const s = createGameSettings({ fellowEyeContrast: 50 });
        expect(s.fellowEyeContrast).toBe(50);
    });

    it('creates session result with contrast engine fields', () => {
        const result = createSessionResult({
            settings: createGameSettings({}),
            caught: 10,
            totalSpawned: 20,
            durationMs: 60000,
            fellowContrastStart: 30,
            fellowContrastEnd: 45,
            windowAccuracy: 0.75,
            totalTrials: 20,
        });
        expect(result.fellow_contrast_start).toBe(30);
        expect(result.fellow_contrast_end).toBe(45);
        expect(result.window_accuracy).toBe(0.75);
        expect(result.total_trials).toBe(20);
    });
});
