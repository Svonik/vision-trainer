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
        scene.playerBullets = [];
        // Seed scalar without going through updateFellowEyeAlpha (which also
        // applies the current blink phase to the ship).
        scene.platformAlpha = 0.52;
        scene.shipBlinkVisible = true;

        scene.setShipBlinkAlpha(false);
        scene.setShipBlinkAlpha(true);

        expect(ship.setAlpha).toHaveBeenNthCalledWith(1, 0);
        expect(shipVisual.setAlpha).toHaveBeenNthCalledWith(1, 0);
        expect(ship.setAlpha).toHaveBeenNthCalledWith(2, 0.52);
        expect(shipVisual.setAlpha).toHaveBeenNthCalledWith(2, 0.52);
    });

    it('updates ship alpha on contrast step while preserving blink phase', () => {
        const scene = new InvadersGameScene();
        const ship = { setAlpha: vi.fn() };
        const shipVisual = { setAlpha: vi.fn() };
        scene.ship = ship;
        scene.shipVisual = shipVisual;
        scene.playerBullets = [];
        scene.invincible = true;
        scene.shipBlinkVisible = false;

        scene.updateFellowEyeAlpha(0.4);
        expect(ship.setAlpha).toHaveBeenCalledWith(0);
        expect(shipVisual.setAlpha).toHaveBeenCalledWith(0);

        scene.shipBlinkVisible = true;
        scene.updateFellowEyeAlpha(0.45);
        expect(ship.setAlpha).toHaveBeenLastCalledWith(0.45);
        expect(shipVisual.setAlpha).toHaveBeenLastCalledWith(0.45);
    });

    it('applies ship alpha immediately when not invincible', () => {
        const scene = new InvadersGameScene();
        const ship = { setAlpha: vi.fn() };
        scene.ship = ship;
        scene.shipVisual = null;
        scene.playerBullets = [];
        scene.invincible = false;
        scene.shipBlinkVisible = true;

        scene.updateFellowEyeAlpha(0.48);

        expect(scene.platformAlpha).toBe(0.48);
        expect(ship.setAlpha).toHaveBeenCalledWith(0.48);
    });
});
