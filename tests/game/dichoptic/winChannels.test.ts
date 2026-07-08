import { describe, expect, it } from 'vitest';
import {
    ALL_CHANNEL_SPECS,
    AMBLYOPIC,
    FELLOW,
    FROGGER_CHANNELS,
    type GameChannelSpec,
    MAZERUNNER_CHANNELS,
    oppositeChannel,
    PACMAN_CHANNELS,
    RUNNER_CHANNELS,
    requiredChannels,
    requiresBothEyes,
    roleAlpha,
    roleColor,
    winRequiresOppositeChannel,
} from '../../../src/game/dichoptic/winChannels';

describe('dichoptic win-channel invariant', () => {
    it.each(
        ALL_CHANNEL_SPECS,
    )('$game: every win-critical object is on the channel OPPOSITE the player', (spec) => {
        expect(spec.crossChannelWin.length).toBeGreaterThan(0);
        const opp = oppositeChannel(spec.player);
        for (const role of spec.crossChannelWin) {
            expect(spec.roles[role]).toBe(opp);
        }
        expect(winRequiresOppositeChannel(spec)).toBe(true);
    });

    it.each(
        ALL_CHANNEL_SPECS,
    )('$game: required perception spans BOTH channels (no single-eye solve)', (spec) => {
        expect(requiresBothEyes(spec)).toBe(true);
        const channels = requiredChannels(spec);
        // Player-eye channel alone is insufficient …
        expect(channels.has(oppositeChannel(spec.player))).toBe(true);
        // … and the opposite channel alone is insufficient (player is here).
        expect(channels.has(spec.player)).toBe(true);
    });

    it.each(
        ALL_CHANNEL_SPECS,
    )('$game: the player is always in the required set', (spec) => {
        expect(spec.requiredRoles).toContain('player');
        expect(spec.roles.player).toBe(spec.player);
    });
});

describe('per-game channel assignments match the refactor', () => {
    it('Pacman: dots + pellets moved off Pac-Man’s eye', () => {
        expect(PACMAN_CHANNELS.roles.player).toBe(FELLOW);
        expect(PACMAN_CHANNELS.roles.dots).toBe(AMBLYOPIC);
        expect(PACMAN_CHANNELS.roles.pellets).toBe(AMBLYOPIC);
        expect(PACMAN_CHANNELS.roles.dots).toBe(
            oppositeChannel(PACMAN_CHANNELS.player),
        );
    });

    it('MazeRunner: walls opposite the player, exit shares the player eye', () => {
        expect(MAZERUNNER_CHANNELS.roles.walls).toBe(
            oppositeChannel(MAZERUNNER_CHANNELS.player),
        );
        expect(MAZERUNNER_CHANNELS.roles.exit).toBe(MAZERUNNER_CHANNELS.player);
        // Walls are the win-critical gate, not the exit.
        expect(MAZERUNNER_CHANNELS.crossChannelWin).toEqual(['walls']);
    });

    it('Frogger: the goal pad is on the opposite channel from the player', () => {
        expect(FROGGER_CHANNELS.roles.goalPad).toBe(
            oppositeChannel(FROGGER_CHANNELS.player),
        );
        expect(FROGGER_CHANNELS.roles.cars).toBe(
            oppositeChannel(FROGGER_CHANNELS.player),
        );
    });

    it('Runner: mandatory coins are on the player eye, obstacles opposite', () => {
        expect(RUNNER_CHANNELS.roles.coins).toBe(RUNNER_CHANNELS.player);
        expect(RUNNER_CHANNELS.roles.obstacles).toBe(
            oppositeChannel(RUNNER_CHANNELS.player),
        );
        // Coins on the player eye are what make the opposite-eye-only bypass fail.
        expect(requiresBothEyes(RUNNER_CHANNELS)).toBe(true);
    });
});

describe('the invariant is falsifiable (catches the pre-refactor loophole)', () => {
    // Pre-refactor Pac-Man: dots were on Pac-Man's own eye — winnable one-eyed.
    const BROKEN_PACMAN_BEFORE: GameChannelSpec = {
        game: 'pacman-before',
        player: FELLOW,
        roles: { player: FELLOW, dots: FELLOW, ghosts: AMBLYOPIC },
        requiredRoles: ['player', 'dots'],
        crossChannelWin: ['dots'],
    };

    // Pre-refactor MazeRunner: walls on the player's eye (stand-in for "both
    // eyes"), so the maze could be run seeing only the player's channel.
    const BROKEN_MAZE_BEFORE: GameChannelSpec = {
        game: 'maze-before',
        player: FELLOW,
        roles: { player: FELLOW, exit: FELLOW, walls: FELLOW },
        requiredRoles: ['player', 'exit', 'walls'],
        crossChannelWin: ['walls'],
    };

    it('flags a win object drawn on the player’s own eye', () => {
        expect(winRequiresOppositeChannel(BROKEN_PACMAN_BEFORE)).toBe(false);
        expect(requiresBothEyes(BROKEN_PACMAN_BEFORE)).toBe(false);
    });

    it('flags a maze solvable with a single channel', () => {
        expect(winRequiresOppositeChannel(BROKEN_MAZE_BEFORE)).toBe(false);
        expect(requiresBothEyes(BROKEN_MAZE_BEFORE)).toBe(false);
    });
});

describe('scene wiring resolvers', () => {
    const paint = {
        fellowColor: 0xff0000,
        amblyopicColor: 0x00ffff,
        fellowAlpha: 0.3,
        amblyopicAlpha: 1,
    };

    it('resolves color + alpha per role channel', () => {
        // Pac-Man on fellow (red, adaptive), dots on amblyopic (cyan, full).
        expect(roleColor(PACMAN_CHANNELS, 'player', paint)).toBe(0xff0000);
        expect(roleColor(PACMAN_CHANNELS, 'dots', paint)).toBe(0x00ffff);
        expect(roleAlpha(PACMAN_CHANNELS, 'player', paint)).toBe(0.3);
        expect(roleAlpha(PACMAN_CHANNELS, 'dots', paint)).toBe(1);
    });

    it('keeps player and win object on different colors for every game', () => {
        for (const spec of ALL_CHANNEL_SPECS) {
            const playerColor = roleColor(spec, 'player', paint);
            for (const role of spec.crossChannelWin) {
                expect(roleColor(spec, role, paint)).not.toBe(playerColor);
            }
        }
    });
});
