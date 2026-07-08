import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    const globalWithPhaser = globalThis as typeof globalThis & {
        Phaser: { Scene: new () => object };
    };
    globalWithPhaser.Phaser = {
        Scene: class {},
    };
});

vi.mock('phaser', () => ({
    Events: {
        EventEmitter: class {
            on() {}
            off() {}
            emit() {}
        },
    },
}));

import DichopticScene from '../../../src/game/scenes/DichopticScene';

class TestDichopticScene extends DichopticScene {}

describe('DichopticScene contrast stats', () => {
    it('reports the clamped fellow contrast as the start and end before trials', () => {
        const scene = new TestDichopticScene();

        scene.initDichoptics({ fellowEyeContrast: 120 });

        expect(scene.getDichopticStats()).toEqual({
            accuracy: 0,
            totalTrials: 0,
            fellowContrastStart: 50,
            fellowContrastEnd: 50,
        });
        expect(scene.fellowAlpha).toBe(0.5);
    });
});
