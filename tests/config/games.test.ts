import { describe, it, expect } from 'vitest';
import { getGameById, GAMES } from '../../src/config/games';

describe('getGameById', () => {
    it('returns game by internal id', () => {
        const game = getGameById('binocular-catcher');
        expect(game).toBeDefined();
        expect(game?.id).toBe('binocular-catcher');
    });

    it('returns game by URL route param (catcher -> binocular-catcher)', () => {
        const game = getGameById('catcher');
        expect(game).toBeDefined();
        expect(game?.id).toBe('binocular-catcher');
        expect(game?.titleKey).toBe('gameSelect.catcher.title');
    });

    it('returns game for all known route params', () => {
        const routeParams = ['catcher', 'breakout', 'tetris', 'invaders', 'pong', 'snake', 'flappy', 'asteroid', 'balloonpop', 'memorytiles', 'frogger', 'catchmonsters'];
        for (const param of routeParams) {
            const game = getGameById(param);
            expect(game, `Expected game for route param '${param}'`).toBeDefined();
        }
    });

    it('returns undefined for unknown id', () => {
        const game = getGameById('nonexistent-game');
        expect(game).toBeUndefined();
    });

    it('GAMES array has 13 entries', () => {
        expect(GAMES).toHaveLength(13);
    });

    it('every game has required fields', () => {
        for (const game of GAMES) {
            expect(game.id).toBeTruthy();
            expect(game.titleKey).toBeTruthy();
            expect(game.descriptionKey).toBeTruthy();
            expect(game.difficultyKey).toBeTruthy();
            expect(game.route).toBeTruthy();
        }
    });
});
