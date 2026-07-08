// Dichoptic win-channel map — clinical anaglyph separation for gameplay scenes.
//
// Clinical model (see glassesColors.ts / CLINICAL_CONTRAST):
//   - 'fellow'    = the strong (fellow) eye. Shows the player object at the
//                   adaptive, reduced fellow-eye contrast (platformColor).
//   - 'amblyopic' = the weak (amblyopic) eye. Shows targets at full contrast
//                   (ballColor).
//
// Invariant enforced here: objects that must be perceived to make progress /
// win live on the channel OPPOSITE the player, and the set of required objects
// spans BOTH channels. A patient who suppresses (sees only one channel) cannot
// complete the task — this is the whole therapeutic point.
//
// This module is pure and engine-free so the invariant is unit-testable. The
// four refactored scenes (Frogger, Pacman, MazeRunner, Runner) resolve their
// object colors through the specs below, so the tested invariant is the same
// mapping the game actually renders.

export type Channel = 'fellow' | 'amblyopic';

export const FELLOW: Channel = 'fellow';
export const AMBLYOPIC: Channel = 'amblyopic';

/** Duration (ms) of the adaptive-contrast alpha tween applied to the visible
 *  fellow-eye object after each trial. Required by the therapeutic protocol. */
export const CONTRAST_TWEEN_MS = 250;

export function oppositeChannel(ch: Channel): Channel {
    return ch === FELLOW ? AMBLYOPIC : FELLOW;
}

export interface GameChannelSpec {
    /** Game identifier (matches the scene / config route). */
    game: string;
    /** Channel the user-controlled player object is drawn on. */
    player: Channel;
    /** Every keyed object role → the channel it is drawn on. */
    roles: Record<string, Channel>;
    /** Roles the patient MUST perceive to make progress. Used to prove that
     *  neither eye alone is sufficient. Always includes the player. */
    requiredRoles: string[];
    /** Win-critical roles that must live on the channel OPPOSITE the player
     *  (closes the "solve it with one eye" loophole). */
    crossChannelWin: string[];
}

// --- Frogger -----------------------------------------------------------------
// Player (fellow) must be aligned onto the goal lily-pad, which is drawn on the
// amblyopic channel, while dodging cars (amblyopic). Reaching the top row is not
// enough — the crossing only counts on the pad, so the player's position must be
// perceived relative to the amblyopic-channel pad + cars.
export const FROGGER_CHANNELS: GameChannelSpec = {
    game: 'frogger',
    player: FELLOW,
    roles: { player: FELLOW, cars: AMBLYOPIC, goalPad: AMBLYOPIC },
    requiredRoles: ['player', 'cars', 'goalPad'],
    crossChannelWin: ['goalPad', 'cars'],
};

// --- Pacman ------------------------------------------------------------------
// Dots + power pellets (the only win condition — clear them all) move to the
// amblyopic channel, opposite Pac-Man (fellow). Navigation needs both eyes.
export const PACMAN_CHANNELS: GameChannelSpec = {
    game: 'pacman',
    player: FELLOW,
    roles: {
        player: FELLOW,
        dots: AMBLYOPIC,
        pellets: AMBLYOPIC,
        ghosts: AMBLYOPIC,
    },
    requiredRoles: ['player', 'dots'],
    crossChannelWin: ['dots', 'pellets'],
};

// --- MazeRunner --------------------------------------------------------------
// Walls move to the amblyopic channel (were visible to both eyes — the blind
// bypass). Player + exit stay on the fellow channel. The maze cannot be solved
// without perceiving the opposite-channel walls to navigate.
export const MAZERUNNER_CHANNELS: GameChannelSpec = {
    game: 'mazerunner',
    player: FELLOW,
    roles: {
        player: FELLOW,
        exit: FELLOW,
        walls: AMBLYOPIC,
        coins: AMBLYOPIC,
    },
    requiredRoles: ['player', 'exit', 'walls'],
    crossChannelWin: ['walls'],
};

// --- Runner ------------------------------------------------------------------
// Obstacles (amblyopic) gate survival. Mandatory-for-progress coins live on the
// fellow channel at variable heights, so obstacle-avoidance alone (amblyopic
// only) can no longer level up — both eyes are required.
export const RUNNER_CHANNELS: GameChannelSpec = {
    game: 'runner',
    player: FELLOW,
    roles: { player: FELLOW, coins: FELLOW, obstacles: AMBLYOPIC },
    requiredRoles: ['player', 'coins', 'obstacles'],
    crossChannelWin: ['obstacles'],
};

export const ALL_CHANNEL_SPECS: GameChannelSpec[] = [
    FROGGER_CHANNELS,
    PACMAN_CHANNELS,
    MAZERUNNER_CHANNELS,
    RUNNER_CHANNELS,
];

// --- Invariant checks (unit-tested) ------------------------------------------

/** True when every win-critical role is drawn on the channel opposite the
 *  player — i.e. the win condition references an object the player's eye cannot
 *  see, so it cannot be solved with the player's channel alone. */
export function winRequiresOppositeChannel(spec: GameChannelSpec): boolean {
    if (spec.crossChannelWin.length === 0) return false;
    const opp = oppositeChannel(spec.player);
    return spec.crossChannelWin.every((role) => spec.roles[role] === opp);
}

/** Channels spanned by the roles the patient must perceive to progress. */
export function requiredChannels(spec: GameChannelSpec): Set<Channel> {
    return new Set(spec.requiredRoles.map((role) => spec.roles[role]));
}

/** True when required perception spans BOTH channels — neither eye alone is
 *  sufficient (closes the "blind bypass" loophole at the structural level). */
export function requiresBothEyes(spec: GameChannelSpec): boolean {
    const channels = requiredChannels(spec);
    return channels.has(FELLOW) && channels.has(AMBLYOPIC);
}

// --- Scene wiring helpers ----------------------------------------------------

export interface ChannelPaint {
    fellowColor: number;
    amblyopicColor: number;
    fellowAlpha: number;
    amblyopicAlpha: number;
}

/** Anaglyph color (0xRRGGBB) for a role, given the scene's per-eye colors. */
export function roleColor(
    spec: GameChannelSpec,
    role: string,
    paint: ChannelPaint,
): number {
    return spec.roles[role] === FELLOW
        ? paint.fellowColor
        : paint.amblyopicColor;
}

/** Alpha for a role, given the scene's per-eye contrast. */
export function roleAlpha(
    spec: GameChannelSpec,
    role: string,
    paint: ChannelPaint,
): number {
    return spec.roles[role] === FELLOW
        ? paint.fellowAlpha
        : paint.amblyopicAlpha;
}
