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

import { isValidHit } from '../../../src/game/scenes/ShootingGalleryGameScene';

// Vision-i55: dichoptic target gate.
// A shot must only be counted when the target carries the strong-eye
// marker (fusion of both anaglyph channels). Perceiving only the
// weak-eye channel (the target body / its screen position) must never
// be enough to succeed on its own.
describe('ShootingGallery dichoptic target gate (isValidHit)', () => {
    it('rejects a shot on a target without the strong-eye marker, even dead center', () => {
        expect(isValidHit(false, 0, 22)).toBe(false);
    });

    it('rejects a shot on a target without the marker, near the hit radius edge', () => {
        expect(isValidHit(false, 20, 22)).toBe(false);
    });

    it('accepts a shot on the marked target within the hit radius', () => {
        expect(isValidHit(true, 0, 22)).toBe(true);
    });

    it('accepts a shot on the marked target exactly at the hit radius boundary', () => {
        expect(isValidHit(true, 22, 22)).toBe(true);
    });

    it('rejects a shot on the marked target outside the hit radius (missed)', () => {
        expect(isValidHit(true, 30, 22)).toBe(false);
    });

    it('rejects when marker is undefined (target never assigned a marker)', () => {
        expect(isValidHit(undefined as unknown as boolean, 0, 22)).toBe(false);
    });
});
