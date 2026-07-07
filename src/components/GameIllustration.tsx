interface GameIllustrationProps {
    gameId: string;
}

const ILLUSTRATION_IDS = new Set([
    'binocular-catcher',
    'breakout',
    'tetris',
    'invaders',
    'pong',
    'snake',
    'flappy',
    'asteroid',
    'balloonpop',
    'memorytiles',
    'frogger',
    'catchmonsters',
    'whackmole',
    'game2048',
    'knifehit',
    'runner',
    'colorflood',
    'match3',
    'slidingpuzzle',
    'pacman',
    'shootinggallery',
    'mazerunner',
]);

export function GameIllustration({ gameId }: GameIllustrationProps) {
    const illustrationId = ILLUSTRATION_IDS.has(gameId)
        ? gameId
        : 'binocular-catcher';
    const baseUrl = import.meta.env.BASE_URL;
    const src = `${baseUrl}assets/game-illustrations/${illustrationId}.webp`;

    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden">
            <img
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover scale-[1.05]"
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_-28px_36px_rgba(11,9,20,0.28)]" />
        </div>
    );
}
