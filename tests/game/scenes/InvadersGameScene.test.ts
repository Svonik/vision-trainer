import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    Object.assign(globalThis, {
        Phaser: {
            Scene: class {},
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

import InvadersGameScene from '../../../src/game/scenes/InvadersGameScene';

describe('Invaders fellow-alpha sync', () => {
    it('updates platformAlpha and active player bullets when fellow alpha changes', () => {
        const scene = new InvadersGameScene();
        const activeBullet = { active: true, setAlpha: vi.fn() };
        const inactiveBullet = { active: false, setAlpha: vi.fn() };
        scene.platformAlpha = 0.3;
        scene.playerBullets = [activeBullet, inactiveBullet];

        scene.updateFellowEyeAlpha(0.52);

        expect(scene.platformAlpha).toBe(0.52);
        expect(activeBullet.setAlpha).toHaveBeenCalledWith(0.52);
        expect(inactiveBullet.setAlpha).not.toHaveBeenCalled();
    });

    it('uses the latest platformAlpha for future player bullets', () => {
        const scene = new InvadersGameScene();
        const bullet = { setAlpha: vi.fn().mockReturnThis() };
        scene.ship = { x: 100, y: 200, height: 40 };
        scene.time = { now: 1000 };
        scene.lastPlayerFireMs = 0;
        scene.textures = { exists: vi.fn(() => false) };
        scene.add = { rectangle: vi.fn(() => bullet) };
        scene.platformColor = 0x00ffff;
        scene.playerBullets = [];
        scene.updateFellowEyeAlpha(0.52);

        scene.firePlayerBullet();

        expect(bullet.setAlpha).toHaveBeenCalledWith(0.52);
        expect(scene.playerBullets).toContain(bullet);
    });

    it('uses the latest platformAlpha when invincibility blink restores visibility', () => {
        const scene = new InvadersGameScene();
        const ship = { setAlpha: vi.fn() };
        const shipVisual = { setAlpha: vi.fn() };
        scene.ship = ship;
        scene.shipVisual = shipVisual;
        scene.updateFellowEyeAlpha(0.52);

        scene.setShipBlinkAlpha(false);
        scene.setShipBlinkAlpha(true);

        expect(ship.setAlpha).toHaveBeenNthCalledWith(1, 0);
        expect(shipVisual.setAlpha).toHaveBeenNthCalledWith(1, 0);
        expect(ship.setAlpha).toHaveBeenNthCalledWith(2, 0.52);
        expect(shipVisual.setAlpha).toHaveBeenNthCalledWith(2, 0.52);
    });
});
