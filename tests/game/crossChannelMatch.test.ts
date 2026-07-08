import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
    canMergeTiles,
    isCrossChannel,
    isMemoryPair,
    isValidMatchRun,
    runSpansBothChannels,
} from '../../src/game/crossChannelMatch';

// Channel A = one eye, channel B = the other. A therapeutic pair/merge/match
// MUST combine one element from each channel so both eyes are engaged.
const A = true; // isColorA === true  → channel A
const B = false; // isColorA === false → channel B

describe('isCrossChannel', () => {
    it('is true only when the two channels differ', () => {
        expect(isCrossChannel(A, B)).toBe(true);
        expect(isCrossChannel(B, A)).toBe(true);
        expect(isCrossChannel(A, A)).toBe(false);
        expect(isCrossChannel(B, B)).toBe(false);
    });
});

describe('2048 — canMergeTiles', () => {
    it('ACCEPTS equal-value tiles from DIFFERENT channels', () => {
        expect(
            canMergeTiles({ value: 4, isColorA: A }, { value: 4, isColorA: B }),
        ).toBe(true);
        expect(
            canMergeTiles({ value: 4, isColorA: B }, { value: 4, isColorA: A }),
        ).toBe(true);
    });

    it('REJECTS equal-value tiles from the SAME channel (one-eye merge)', () => {
        expect(
            canMergeTiles({ value: 4, isColorA: A }, { value: 4, isColorA: A }),
        ).toBe(false);
        expect(
            canMergeTiles({ value: 4, isColorA: B }, { value: 4, isColorA: B }),
        ).toBe(false);
    });

    it('REJECTS different values even across channels (value still must match)', () => {
        expect(
            canMergeTiles({ value: 4, isColorA: A }, { value: 8, isColorA: B }),
        ).toBe(false);
    });
});

describe('MemoryTiles — isMemoryPair', () => {
    it('ACCEPTS same symbol from DIFFERENT channels', () => {
        expect(
            isMemoryPair(
                { symbol: 'star', isColorA: A },
                { symbol: 'star', isColorA: B },
            ),
        ).toBe(true);
    });

    it('REJECTS same symbol from the SAME channel (one-eye pair)', () => {
        expect(
            isMemoryPair(
                { symbol: 'star', isColorA: A },
                { symbol: 'star', isColorA: A },
            ),
        ).toBe(false);
        expect(
            isMemoryPair(
                { symbol: 'star', isColorA: B },
                { symbol: 'star', isColorA: B },
            ),
        ).toBe(false);
    });

    it('REJECTS different symbols even across channels', () => {
        expect(
            isMemoryPair(
                { symbol: 'star', isColorA: A },
                { symbol: 'heart', isColorA: B },
            ),
        ).toBe(false);
    });
});

describe('Match3 — runSpansBothChannels', () => {
    it('is true only when both channels are present in the run', () => {
        expect(
            runSpansBothChannels([
                { isColorA: A },
                { isColorA: A },
                { isColorA: B },
            ]),
        ).toBe(true);
        expect(
            runSpansBothChannels([
                { isColorA: A },
                { isColorA: A },
                { isColorA: A },
            ]),
        ).toBe(false);
        expect(runSpansBothChannels([{ isColorA: B }, { isColorA: B }])).toBe(
            false,
        );
    });
});

describe('Match3 — isValidMatchRun', () => {
    const run = (shape: string, channels: boolean[]) =>
        channels.map((isColorA) => ({ shape, isColorA }));

    it('ACCEPTS a run of same shape that spans BOTH channels', () => {
        expect(isValidMatchRun(run('circle', [A, B, A]))).toBe(true);
        expect(isValidMatchRun(run('circle', [A, B, A, B]))).toBe(true);
    });

    it('REJECTS a run of same shape that is MONO-channel (one-eye puzzle)', () => {
        expect(isValidMatchRun(run('circle', [A, A, A]))).toBe(false);
        expect(isValidMatchRun(run('circle', [B, B, B]))).toBe(false);
    });

    it('REJECTS a cross-channel run shorter than 3', () => {
        expect(isValidMatchRun(run('circle', [A, B]))).toBe(false);
    });

    it('REJECTS a cross-channel run of MIXED shapes (symbol still must match)', () => {
        expect(
            isValidMatchRun([
                { shape: 'circle', isColorA: A },
                { shape: 'square', isColorA: B },
                { shape: 'circle', isColorA: A },
            ]),
        ).toBe(false);
    });
});

// Guard the scenes actually WIRE IN the cross-channel rule (not just the helper
// existing in isolation) and that the old single-channel shortcuts are gone.
describe('scene source guard — cross-channel rule is wired into the scenes', () => {
    const read = (file: string) =>
        readFileSync(
            path.resolve(__dirname, '../../src/game/scenes', file),
            'utf8',
        );

    it('Game2048Scene: merges via canMergeTiles and tiles carry an independent channel', () => {
        const src = read('Game2048Scene.ts');
        expect(src).toContain("from '../crossChannelMatch'");
        expect(src).toContain('canMergeTiles');
        expect(src).toContain('isColorA');
        // The old parity-derived channel must be gone.
        expect(src).not.toContain('isOddPower');
    });

    it('Match3GameScene: matches via isValidMatchRun and no longer keys off typeIndex', () => {
        const src = read('Match3GameScene.ts');
        expect(src).toContain("from '../crossChannelMatch'");
        expect(src).toContain('isValidMatchRun');
        expect(src).not.toContain('typeIndex');
    });

    it('MemoryTilesGameScene: pairs via isMemoryPair, not a bare symbol compare', () => {
        const src = read('MemoryTilesGameScene.ts');
        expect(src).toContain("from '../crossChannelMatch'");
        expect(src).toContain('isMemoryPair');
        expect(src).not.toMatch(/if\s*\(\s*dA\.symbol === dB\.symbol\s*\)/);
    });
});
