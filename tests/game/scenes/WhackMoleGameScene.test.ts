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

import { isValidHit } from '../../../src/game/scenes/WhackMoleGameScene';

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
