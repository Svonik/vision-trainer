export interface GameConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    difficultyKey: string;
    route: string;
}

export const GAMES: GameConfig[] = [
    { id: 'binocular-catcher', titleKey: 'gameSelect.catcher.title', descriptionKey: 'gameSelect.catcher.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/catcher/settings' },
    { id: 'breakout', titleKey: 'gameSelect.breakout.title', descriptionKey: 'gameSelect.breakout.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/breakout/settings' },
    { id: 'tetris', titleKey: 'gameSelect.tetris.title', descriptionKey: 'gameSelect.tetris.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/tetris/settings' },
    { id: 'invaders', titleKey: 'gameSelect.invaders.title', descriptionKey: 'gameSelect.invaders.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/invaders/settings' },
    { id: 'pong', titleKey: 'gameSelect.pong.title', descriptionKey: 'gameSelect.pong.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/pong/settings' },
    { id: 'snake', titleKey: 'gameSelect.snake.title', descriptionKey: 'gameSelect.snake.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/snake/settings' },
    { id: 'flappy', titleKey: 'gameSelect.flappy.title', descriptionKey: 'gameSelect.flappy.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/flappy/settings' },
    { id: 'asteroid', titleKey: 'gameSelect.asteroid.title', descriptionKey: 'gameSelect.asteroid.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/asteroid/settings' },
    { id: 'balloonpop', titleKey: 'gameSelect.balloonpop.title', descriptionKey: 'gameSelect.balloonpop.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/balloonpop/settings' },
    { id: 'memorytiles', titleKey: 'gameSelect.memorytiles.title', descriptionKey: 'gameSelect.memorytiles.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/memorytiles/settings' },
    { id: 'frogger', titleKey: 'gameSelect.frogger.title', descriptionKey: 'gameSelect.frogger.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/frogger/settings' },
    { id: 'catchmonsters', titleKey: 'gameSelect.catchmonsters.title', descriptionKey: 'gameSelect.catchmonsters.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/catchmonsters/settings' },
];

// Map from URL gameId param (e.g. 'catcher') to GAMES entry id (e.g. 'binocular-catcher')
const ROUTE_ID_MAP: Record<string, string> = {
    catcher: 'binocular-catcher',
    breakout: 'breakout',
    tetris: 'tetris',
    invaders: 'invaders',
    pong: 'pong',
    snake: 'snake',
    flappy: 'flappy',
    asteroid: 'asteroid',
    balloonpop: 'balloonpop',
    memorytiles: 'memorytiles',
    frogger: 'frogger',
    catchmonsters: 'catchmonsters',
};

/** Look up a game by its internal id (e.g. 'binocular-catcher') or URL route param (e.g. 'catcher'). */
export function getGameById(id: string): GameConfig | undefined {
    const resolved = ROUTE_ID_MAP[id] ?? id;
    return GAMES.find(g => g.id === resolved);
}
