import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
    clampNumber,
    pointerDragToVelocity,
    stepControl,
} from '../../src/game/relativeControl';

const FRAME_MS = 1000 / 60;
const cfg = {
    minX: 0,
    maxX: 800,
    smoothing: 0.6,
    maxSpeed: 400,
};

describe('clampNumber', () => {
    it('clamps below, above and within range', () => {
        expect(clampNumber(-5, 0, 10)).toBe(0);
        expect(clampNumber(15, 0, 10)).toBe(10);
        expect(clampNumber(4, 0, 10)).toBe(4);
    });
});

describe('pointerDragToVelocity (relative input)', () => {
    it('depends only on the DELTA, not on absolute pointer position', () => {
        // Same 20px drag → same velocity regardless of where the pointer is.
        const vAtLeft = pointerDragToVelocity(20, FRAME_MS, 0.7);
        const vAtRight = pointerDragToVelocity(20, FRAME_MS, 0.7);
        expect(vAtLeft).toBe(vAtRight);
        expect(vAtLeft).toBeGreaterThan(0);
    });

    it('is signed by drag direction and scaled below 1:1 by sensitivity', () => {
        const forward = pointerDragToVelocity(10, FRAME_MS, 0.7);
        const backward = pointerDragToVelocity(-10, FRAME_MS, 0.7);
        expect(forward).toBeGreaterThan(0);
        expect(backward).toBeLessThan(0);
        // sensitivity < 1 → object trails the hand (object speed < hand speed)
        const handSpeed = 10 / (FRAME_MS / 1000);
        expect(Math.abs(forward)).toBeLessThan(handSpeed);
    });

    it('never divides by zero on a zero delta frame', () => {
        expect(pointerDragToVelocity(5, 0, 0.7)).toBeTypeOf('number');
        expect(Number.isFinite(pointerDragToVelocity(5, 0, 0.7))).toBe(true);
    });
});

describe('stepControl (velocity-integrated relative control)', () => {
    it('INVARIANT: object position is NOT set to the pointer position', () => {
        // Pointer is at absolute x=700; the frame drag was small (5px).
        const pointerAbsoluteX = 700;
        const dragDelta = 5;
        const command = pointerDragToVelocity(dragDelta, FRAME_MS, 0.7);
        const next = stepControl({ x: 100, vx: 0 }, command, cfg, FRAME_MS);
        // The object integrates from its PRIOR position (100), it does not
        // teleport to the pointer's absolute coordinate.
        expect(next.x).not.toBe(pointerAbsoluteX);
        expect(next.x).toBeGreaterThan(100); // moved a little in drag direction
        expect(next.x).toBeLessThan(120); // ...but nowhere near 700
    });

    it('position is derived from PRIOR position, not from input alone', () => {
        const command = pointerDragToVelocity(10, FRAME_MS, 0.7);
        const fromA = stepControl({ x: 100, vx: 0 }, command, cfg, FRAME_MS);
        const fromB = stepControl({ x: 400, vx: 0 }, command, cfg, FRAME_MS);
        // Same input, different prior state → different result. Therefore the
        // position cannot be recovered from the input alone (must be perceived).
        expect(fromA.x).not.toBe(fromB.x);
        expect(fromB.x - fromA.x).toBeCloseTo(300, 5);
    });

    it('does not mutate the input state (immutability)', () => {
        const state = { x: 200, vx: 50 };
        const snapshot = { ...state };
        stepControl(state, 300, cfg, FRAME_MS);
        expect(state).toEqual(snapshot);
    });

    it('clamps at the left/right walls and kills velocity there', () => {
        const atRight = stepControl({ x: 795, vx: 400 }, 400, cfg, FRAME_MS);
        expect(atRight.x).toBe(cfg.maxX);
        expect(atRight.vx).toBe(0);

        const atLeft = stepControl({ x: 5, vx: -400 }, -400, cfg, FRAME_MS);
        expect(atLeft.x).toBe(cfg.minX);
        expect(atLeft.vx).toBe(0);
    });

    it('ANTI-TELEPORT: a huge command cannot jump the object across the field in one frame', () => {
        // A giant pointer jump would imply an enormous velocity command.
        const hugeCommand = 100000;
        const next = stepControl({ x: 100, vx: 0 }, hugeCommand, cfg, FRAME_MS);
        // maxSpeed (400 px/s) over one 60fps frame ≈ 6.7px — bounded, no teleport.
        const maxStep = cfg.maxSpeed * (FRAME_MS / 1000);
        expect(next.x - 100).toBeLessThanOrEqual(maxStep + 1e-6);
    });

    it('decelerates to rest when input stops (not slippery)', () => {
        let state = stepControl({ x: 100, vx: 0 }, 400, cfg, FRAME_MS);
        // Release input: command 0 for several frames.
        for (let i = 0; i < 20; i++) {
            state = stepControl(state, 0, cfg, FRAME_MS);
        }
        expect(Math.abs(state.vx)).toBeLessThan(1);
    });

    it('is frame-rate independent (integrates by delta time)', () => {
        // One 32ms frame vs two 16ms frames should land close together.
        const oneBig = stepControl({ x: 100, vx: 200 }, 200, cfg, 2 * FRAME_MS);
        let twoSmall = stepControl({ x: 100, vx: 200 }, 200, cfg, FRAME_MS);
        twoSmall = stepControl(twoSmall, 200, cfg, FRAME_MS);
        expect(oneBig.x).toBeCloseTo(twoSmall.x, 0);
    });
});

describe('scene source guard — no direct pointer-to-object assignment', () => {
    const scenes = ['BreakoutGameScene.ts', 'InvadersGameScene.ts'];

    for (const file of scenes) {
        it(`${file}: controlled object is NOT assigned from pointer.x`, () => {
            const src = readFileSync(
                path.resolve(__dirname, '../../src/game/scenes', file),
                'utf8',
            );
            // Forbid the proprioceptive cheat: platform.x/ship.x = pointer.x
            expect(src).not.toMatch(
                /\b(platform|ship)\.x\s*=\s*[^;]*pointer\.x/,
            );
            // And it must use the relative velocity-integrated control helper.
            expect(src).toContain('stepControl');
            expect(src).toContain('pointerDragToVelocity');
        });
    }
});
