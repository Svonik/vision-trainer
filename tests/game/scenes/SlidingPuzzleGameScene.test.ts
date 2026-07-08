import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    Object.assign(globalThis, {
        Phaser: {
            Scene: class {},
            Input: { Keyboard: { JustDown: () => false } },
        },
    });
});

vi.mock('phaser', () => ({
    Events: {
        EventEmitter: class {
            on = vi.fn();
            emit = vi.fn();
            removeListener = vi.fn();
        },
    },
}));

vi.mock('../../../src/game/audio/SynthSounds', () => ({
    SynthSounds: {
        resume: vi.fn(),
        score: vi.fn(),
        miss: vi.fn(),
        victory: vi.fn(),
    },
}));

vi.mock('../../../src/game/vfx/GameVFX', () => ({
    GameVFX: {
        countdown: vi.fn(),
        flash: vi.fn(),
        scorePopup: vi.fn(),
    },
}));

vi.mock('../../../src/game/vfx/GameVisuals', () => ({
    GameVisuals: {
        drawBgGrid: vi.fn(),
        styledBorder: vi.fn(),
        scoreText: vi.fn(() => ({ setText: vi.fn() })),
        createHUD: vi.fn(() => ({})),
        updateHUD: vi.fn(),
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

import SlidingPuzzleGameScene from '../../../src/game/scenes/SlidingPuzzleGameScene';

interface GraphicsCall {
    color: number;
    alpha: number;
}

class MockGraphics {
    fillCalls: GraphicsCall[] = [];
    lineCalls: GraphicsCall[] = [];
    clear = vi.fn(() => {
        this.fillCalls = [];
        this.lineCalls = [];
        return this;
    });
    fillStyle = vi.fn((color: number, alpha: number) => {
        this.fillCalls.push({ color, alpha });
        return this;
    });
    fillRoundedRect = vi.fn(() => this);
    lineStyle = vi.fn((width: number, color: number, alpha: number) => {
        this.lineCalls.push({ color, alpha });
        return this;
    });
    strokeRoundedRect = vi.fn(() => this);
}

class MockText {
    alpha = 1;
    constructor(public text: string) {}
    setOrigin = vi.fn(() => this);
    setAlpha = vi.fn((alpha: number) => {
        this.alpha = alpha;
        return this;
    });
    setInteractive = vi.fn(() => this);
    on = vi.fn(() => this);
    destroy = vi.fn();
    setText = vi.fn((value: string) => {
        this.text = value;
        return this;
    });
}

class MockContainer {
    children: unknown[] = [];
    constructor(
        public x: number,
        public y: number,
    ) {}
    add = vi.fn((child: unknown) => {
        this.children.push(child);
        return this;
    });
    destroy = vi.fn();
}

class MockRectangle {
    setInteractive = vi.fn(() => this);
    on = vi.fn(() => this);
    setStrokeStyle = vi.fn(() => this);
    destroy = vi.fn();
}

class MockCircle {
    destroy = vi.fn();
}

function createPhaserAddStub() {
    return {
        container: vi.fn((x: number, y: number) => new MockContainer(x, y)),
        graphics: vi.fn(() => new MockGraphics()),
        text: vi.fn((x: number, y: number, text: string) => new MockText(text)),
        rectangle: vi.fn(() => new MockRectangle()),
        circle: vi.fn(() => new MockCircle()),
    };
}

interface SlidingTileEntry {
    value: number;
    background: MockGraphics;
    label: MockText;
}

function isRenderedOddTile(entry: unknown): entry is SlidingTileEntry {
    if (!entry || typeof entry !== 'object') return false;
    if (!('value' in entry) || typeof entry.value !== 'number') return false;
    if (entry.value % 2 !== 1) return false;
    if (
        !('background' in entry) ||
        !(entry.background instanceof MockGraphics)
    ) {
        return false;
    }
    return 'label' in entry && entry.label instanceof MockText;
}

function isRenderedEvenTile(entry: unknown): entry is SlidingTileEntry {
    if (!entry || typeof entry !== 'object') return false;
    if (!('value' in entry) || typeof entry.value !== 'number') return false;
    if (entry.value % 2 !== 0) return false;
    if (
        !('background' in entry) ||
        !(entry.background instanceof MockGraphics)
    ) {
        return false;
    }
    return 'label' in entry && entry.label instanceof MockText;
}

describe('SlidingPuzzle fellow-alpha sync', () => {
    it('updates an already-rendered fellow-eye tile when the registered contrast listener fires', () => {
        const scene = new SlidingPuzzleGameScene();
        scene.settings = {
            speed: 'normal',
            eyeConfig: 'left',
            glassesType: 'red-cyan',
            fellowEyeContrast: 30,
        };
        scene.add = createPhaserAddStub();
        scene.tweens = { add: vi.fn(), killTweensOf: vi.fn() };
        scene.game = { events: { on: vi.fn(), off: vi.fn() } };
        scene.input = { setDefaultCursor: vi.fn() };
        scene.scene = { isActive: vi.fn(() => true) };
        scene.events = { on: vi.fn() };

        scene.startGameplay();

        const oddTile = scene.tileObjects.find(isRenderedOddTile);
        expect(oddTile).toBeDefined();
        if (!oddTile) throw new Error('Expected an odd SlidingPuzzle tile');
        const background = oddTile.background;
        const label = oddTile.label;
        expect(background.fillCalls.at(-1)?.alpha).toBeCloseTo(0.075);
        expect(background.lineCalls.at(-1)?.alpha).toBeCloseTo(0.18);
        expect(label.alpha).toBeCloseTo(0.3);

        for (let i = 0; i < 20; i++) {
            scene.recordDichopticTrial(true);
        }

        expect(scene.alphaA).toBeCloseTo(0.35);
        expect(background.fillCalls.at(-1)?.alpha).toBeCloseTo(0.0875);
        expect(background.lineCalls.at(-1)?.alpha).toBeCloseTo(0.21);
        expect(label.alpha).toBeCloseTo(0.35);

        // Amblyopic-eye (even) tiles stay at 100% alpha through contrast steps.
        const evenTile = scene.tileObjects.find(isRenderedEvenTile);
        expect(evenTile).toBeDefined();
        if (!evenTile) throw new Error('Expected an even SlidingPuzzle tile');
        expect(evenTile.label.alpha).toBeCloseTo(1.0);
        expect(evenTile.background.fillCalls.at(-1)?.alpha).toBeCloseTo(0.25);
    });
});
