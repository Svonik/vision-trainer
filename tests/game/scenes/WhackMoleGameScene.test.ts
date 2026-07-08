import { describe, expect, it, vi } from 'vitest';

// The scene file references the global `Phaser` identifier (no explicit
// import — Phaser normally self-registers as a global at runtime) and
// EventBus.ts imports `Events` from 'phaser'. The real 'phaser' package
// requires a working <canvas> (device feature detection), which jsdom does
// not provide without the optional 'canvas' npm package. Stub just enough
// of the surface touched at MODULE LOAD time (class declaration + the
// EventBus singleton) so the scene module can be imported to reach the
// pure, framework-free `isValidHit` gate under test.
vi.hoisted(() => {
    (globalThis as unknown as { Phaser: unknown }).Phaser = {
        Scene: class {},
    };
});
vi.mock('phaser', () => ({
    Events: {
        EventEmitter: class {
            on() {}
            off() {}
            emit() {}
            removeListener() {}
            removeAllListeners() {}
        },
    },
}));

import {
    isValidHit,
    resolveChannelColors,
} from '../../../src/game/scenes/WhackMoleGameScene';
import {
    deriveEyeConfig,
    getEyeColors,
} from '../../../src/modules/glassesColors';

// Vision-i55: dichoptic target gate + role fix.
// A whack must only be counted when the mole's hole carries the
// strong-eye "active hole" marker (fusion of both anaglyph channels).
// Perceiving only the weak-eye channel (the mole body / its screen
// position) must never be enough to succeed on its own.
describe('WhackMole dichoptic target gate (isValidHit)', () => {
    it('rejects a whack on a mole without the strong-eye "active hole" marker, even dead center', () => {
        expect(isValidHit(false, 0, 36)).toBe(false);
    });

    it('rejects a whack on an unmarked mole near the hit radius edge', () => {
        expect(isValidHit(false, 35, 36)).toBe(false);
    });

    it('accepts a whack on the marked (active-hole) mole within the hit radius', () => {
        expect(isValidHit(true, 0, 36)).toBe(true);
    });

    it('accepts a whack on the marked mole exactly at the hit radius boundary', () => {
        expect(isValidHit(true, 36, 36)).toBe(true);
    });

    it('rejects a whack on the marked mole outside the hit radius (missed)', () => {
        expect(isValidHit(true, 40, 36)).toBe(false);
    });

    it('rejects when marker is undefined (mole never assigned a marker)', () => {
        expect(isValidHit(undefined as unknown as boolean, 0, 36)).toBe(false);
    });
});

// Vision-kbn: dichoptic CHANNEL assignment.
// The crosshair "active hole" marker carries the ADAPTIVE (clinical-contrast)
// alpha, so per the canonical Formula A in GameScene.ts:97-104 it must be
// drawn in the STRONG (fellow) eye's anaglyph channel. The mole body is
// fixed at alpha 1.0 (weak/amblyopic eye, always 100%) and must use the
// opposite (Formula B) channel. Cross-checked against the same
// glassesColors.ts helpers (getEyeColors/deriveEyeConfig) the scene itself
// is built on.
describe('WhackMole dichoptic channel assignment (resolveChannelColors)', () => {
    it.each([
        { glassesType: 'red-cyan' as const, weakEye: 'left' as const },
        { glassesType: 'red-cyan' as const, weakEye: 'right' as const },
        { glassesType: 'cyan-red' as const, weakEye: 'left' as const },
        { glassesType: 'cyan-red' as const, weakEye: 'right' as const },
    ])('crosshair (adaptive) = strong-eye channel, mole (fixed, alpha 1.0) = weak-eye channel — glasses=$glassesType, weak eye=$weakEye', ({
        glassesType,
        weakEye,
    }) => {
        const eyeConfig = deriveEyeConfig(glassesType, weakEye);
        const eyeColors = getEyeColors(glassesType);
        const strongEye = weakEye === 'left' ? 'right' : 'left';
        const strongEyeColor =
            strongEye === 'left' ? eyeColors.leftColor : eyeColors.rightColor;
        const weakEyeColor =
            weakEye === 'left' ? eyeColors.leftColor : eyeColors.rightColor;

        const { crosshairColor, moleColor } = resolveChannelColors(
            eyeConfig,
            glassesType,
        );

        expect(crosshairColor).toBe(strongEyeColor);
        expect(moleColor).toBe(weakEyeColor);
    });
});
