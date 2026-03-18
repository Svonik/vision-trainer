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
    { id: 'whackmole', titleKey: 'gameSelect.whackmole.title', descriptionKey: 'gameSelect.whackmole.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/whackmole/settings' },
    { id: 'game2048', titleKey: 'gameSelect.game2048.title', descriptionKey: 'gameSelect.game2048.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/game2048/settings' },
    { id: 'knifehit', titleKey: 'gameSelect.knifehit.title', descriptionKey: 'gameSelect.knifehit.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/knifehit/settings' },
    { id: 'runner', titleKey: 'gameSelect.runner.title', descriptionKey: 'gameSelect.runner.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/runner/settings' },
    { id: 'colorflood', titleKey: 'gameSelect.colorflood.title', descriptionKey: 'gameSelect.colorflood.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/colorflood/settings' },
    { id: 'match3', titleKey: 'gameSelect.match3.title', descriptionKey: 'gameSelect.match3.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/match3/settings' },
    { id: 'slidingpuzzle', titleKey: 'gameSelect.slidingpuzzle.title', descriptionKey: 'gameSelect.slidingpuzzle.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/slidingpuzzle/settings' },
    { id: 'pacman', titleKey: 'gameSelect.pacman.title', descriptionKey: 'gameSelect.pacman.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/pacman/settings' },
    { id: 'shootinggallery', titleKey: 'gameSelect.shootinggallery.title', descriptionKey: 'gameSelect.shootinggallery.description', difficultyKey: 'gameSelect.difficulty.medium', route: '/games/shootinggallery/settings' },
    { id: 'mazerunner', titleKey: 'gameSelect.mazerunner.title', descriptionKey: 'gameSelect.mazerunner.description', difficultyKey: 'gameSelect.difficulty.beginner', route: '/games/mazerunner/settings' },
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
    whackmole: 'whackmole',
    game2048: 'game2048',
    knifehit: 'knifehit',
    runner: 'runner',
    colorflood: 'colorflood',
    match3: 'match3',
    slidingpuzzle: 'slidingpuzzle',
    pacman: 'pacman',
    shootinggallery: 'shootinggallery',
    mazerunner: 'mazerunner',
};

/** Look up a game by its internal id (e.g. 'binocular-catcher') or URL route param (e.g. 'catcher'). */
export function getGameById(id: string): GameConfig | undefined {
    const resolved = ROUTE_ID_MAP[id] ?? id;
    return GAMES.find(g => g.id === resolved);
}
