// Cross-channel (binocular) pairing rules for the merge/match games.
//
// Every element belongs to exactly one anaglyph channel:
//   isColorA === true  → channel A (one eye, e.g. the fellow/strong eye)
//   isColorA === false → channel B (the other eye, e.g. the amblyopic/weak eye)
//
// Medical rationale: a therapeutic pair / merge / match MUST combine one element
// from EACH channel, so the child is forced to perceive both eyes at once. The
// value / symbol / shape still has to match — the channels are the extra
// constraint, they are not a substitute for it. These are pure functions so the
// rule can be unit-tested without the Phaser runtime.

/** True when the two elements occupy DIFFERENT anaglyph channels. */
export function isCrossChannel(
    aIsColorA: boolean,
    bIsColorA: boolean,
): boolean {
    return aIsColorA !== bIsColorA;
}

/** 2048: two tiles merge iff the values are equal AND the channels differ. */
export function canMergeTiles(
    a: { readonly value: number; readonly isColorA: boolean },
    b: { readonly value: number; readonly isColorA: boolean },
): boolean {
    return a.value === b.value && isCrossChannel(a.isColorA, b.isColorA);
}

/** MemoryTiles: two flipped tiles are a pair iff same symbol AND channels differ. */
export function isMemoryPair(
    a: { readonly symbol: string; readonly isColorA: boolean },
    b: { readonly symbol: string; readonly isColorA: boolean },
): boolean {
    return a.symbol === b.symbol && isCrossChannel(a.isColorA, b.isColorA);
}

/** True when a group of elements contains at least one of EACH channel. */
export function runSpansBothChannels(
    run: ReadonlyArray<{ readonly isColorA: boolean }>,
): boolean {
    let hasA = false;
    let hasB = false;
    for (const el of run) {
        if (el.isColorA) hasA = true;
        else hasB = true;
        if (hasA && hasB) return true;
    }
    return false;
}

/**
 * Match3: a run counts as a match iff it is long enough, every element has the
 * SAME shape, AND the run spans BOTH channels. A mono-channel run of identical
 * shapes is rejected — it would be solvable with a single eye.
 */
export function isValidMatchRun(
    run: ReadonlyArray<{ readonly shape: string; readonly isColorA: boolean }>,
    minLength = 3,
): boolean {
    if (run.length < minLength) return false;
    const { shape } = run[0];
    for (const el of run) {
        if (el.shape !== shape) return false;
    }
    return runSpansBothChannels(run);
}
