import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    Object.assign(globalThis, {
        Phaser: {
            Scene: class {},
            Math: { Between: () => 10 },
            Input: { Keyboard: { JustDown: () => false } },
        },
    });
});

vi.mock('phaser', () => ({
    Events: {
        EventEmitter: class {
            on() {}
            off() {}
            emit() {}
            removeListener() {}
        },
    },
}));

vi.mock('../../../src/game/audio/SynthSounds', () => ({
    SynthSounds: {
        resume: vi.fn(),
        score: vi.fn(),
        miss: vi.fn(),
        victory: vi.fn(),
        gameOver: vi.fn(),
    },
}));

vi.mock('../../../src/game/vfx/GameVFX', () => ({
    GameVFX: {
        countdown: vi.fn(),
        flash: vi.fn(),
        scorePopup: vi.fn(),
        screenShake: vi.fn(),
        particleBurst: vi.fn(),
        addTrailDot: vi.fn(),
    },
}));

vi.mock('../../../src/game/vfx/GameVisuals', () => ({
    GameVisuals: {
        drawBgGrid: vi.fn(),
        styledBorder: vi.fn(),
        styledCross: vi.fn(),
        scoreText: vi.fn(() => ({ setText: vi.fn() })),
        createHUD: vi.fn(() => ({})),
        updateHUD: vi.fn(),
        glowRect: vi.fn(() => ({ setAlpha: vi.fn() })),
        glowCircle: vi.fn(() => ({ setAlpha: vi.fn() })),
        pulse: vi.fn(),
    },
}));

vi.mock('../../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({ age_group: '8-12' })),
}));

vi.mock('../../../src/modules/therapyProtocol', () => ({
    getProtocol: vi.fn(() => ({})),
}));

vi.mock('../../../src/modules/safetyTimer', () => ({
    createSafetyTimer: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        extend: vi.fn(),
        canExtend: vi.fn(() => true),
        getElapsedMs: vi.fn(() => 0),
    })),
}));

import RunnerGameScene from '../../../src/game/scenes/RunnerGameScene';

describe('Runner fellow-alpha sync', () => {
    it('updates runnerAlpha, channelPaint, and in-flight coins when contrast steps', () => {
        const scene = new RunnerGameScene();
        const activeCoin = { active: true, setAlpha: vi.fn() };
        const inactiveCoin = { active: false, setAlpha: vi.fn() };
        scene.runnerAlpha = 0.3;
        scene.channelPaint = {
            fellowColor: 0xff0000,
            amblyopicColor: 0x00ffff,
            fellowAlpha: 0.3,
            amblyopicAlpha: 1,
        };
        scene.coinGraphics = [activeCoin, inactiveCoin];

        // 0.45 > COIN_MIN_ALPHA (0.4) so coins should track the new alpha.
        scene.updateFellowEyeAlpha(0.45);

        expect(scene.runnerAlpha).toBe(0.45);
        expect(scene.channelPaint.fellowAlpha).toBe(0.45);
        expect(activeCoin.setAlpha).toHaveBeenCalledWith(0.45);
        expect(inactiveCoin.setAlpha).not.toHaveBeenCalled();
    });

    it('floors coin alpha at COIN_MIN_ALPHA when fellow contrast is lower', () => {
        const scene = new RunnerGameScene();
        const coin = { active: true, setAlpha: vi.fn() };
        scene.coinGraphics = [coin];
        scene.channelPaint = {
            fellowColor: 0xff0000,
            amblyopicColor: 0x00ffff,
            fellowAlpha: 0.3,
            amblyopicAlpha: 1,
        };

        scene.updateFellowEyeAlpha(0.2);

        expect(coin.setAlpha).toHaveBeenCalledWith(0.4);
    });
});
