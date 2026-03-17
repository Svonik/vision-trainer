interface GameIllustrationProps {
    gameId: string;
}

export function GameIllustration({ gameId }: GameIllustrationProps) {
    return (
        <div className="h-24 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 120 60" className="h-full w-full" aria-hidden="true">
                {renderIllustration(gameId)}
            </svg>
        </div>
    );
}

function renderIllustration(gameId: string): JSX.Element | null {
    switch (gameId) {
        case 'binocular-catcher':
            return (
                <>
                    {/* Falling objects + platform */}
                    <circle cx="30" cy="10" r="4" fill="var(--cyan-soft)" opacity="0.5" />
                    <circle cx="55" cy="16" r="4" fill="var(--cyan-soft)" opacity="0.6" />
                    <circle cx="78" cy="8" r="3" fill="var(--warning)" opacity="0.5" />
                    <rect x="25" y="50" width="70" height="5" rx="2.5" fill="var(--red-soft)" opacity="0.7" />
                </>
            );
        case 'breakout':
            return (
                <>
                    {/* Bricks + ball + platform */}
                    <rect x="20" y="8" width="16" height="6" rx="2" fill="var(--cyan-soft)" opacity="0.6" />
                    <rect x="40" y="8" width="16" height="6" rx="2" fill="var(--cyan-soft)" opacity="0.4" />
                    <rect x="60" y="8" width="16" height="6" rx="2" fill="var(--accent)" opacity="0.6" />
                    <rect x="30" y="16" width="16" height="6" rx="2" fill="var(--accent)" opacity="0.4" />
                    <rect x="50" y="16" width="16" height="6" rx="2" fill="var(--cyan-soft)" opacity="0.5" />
                    <circle cx="60" cy="36" r="3" fill="white" opacity="0.7" />
                    <rect x="42" y="50" width="36" height="5" rx="2.5" fill="var(--red-soft)" opacity="0.6" />
                </>
            );
        case 'tetris':
            return (
                <>
                    {/* L/T/S blocks */}
                    <rect x="30" y="24" width="10" height="10" rx="2" fill="var(--cyan-soft)" opacity="0.6" />
                    <rect x="42" y="24" width="10" height="10" rx="2" fill="var(--warning)" opacity="0.6" />
                    <rect x="54" y="24" width="10" height="10" rx="2" fill="var(--accent)" opacity="0.6" />
                    <rect x="66" y="18" width="10" height="22" rx="2" fill="var(--red-soft)" opacity="0.6" />
                    <rect x="30" y="36" width="10" height="10" rx="2" fill="var(--cyan-soft)" opacity="0.4" />
                </>
            );
        case 'invaders':
            return (
                <>
                    {/* Pixel invaders row */}
                    <rect x="28" y="10" width="10" height="10" rx="2" fill="var(--accent)" opacity="0.6" />
                    <rect x="44" y="10" width="10" height="10" rx="2" fill="var(--accent)" opacity="0.4" />
                    <rect x="60" y="10" width="10" height="10" rx="2" fill="var(--accent)" opacity="0.6" />
                    <rect x="76" y="10" width="10" height="10" rx="2" fill="var(--accent)" opacity="0.4" />
                    {/* Shield */}
                    <rect x="46" y="36" width="28" height="6" rx="3" fill="white" opacity="0.4" />
                    {/* Player ship */}
                    <polygon points="60,52 54,58 66,58" fill="var(--cyan-soft)" opacity="0.7" />
                </>
            );
        case 'pong':
            return (
                <>
                    {/* Two paddles + ball */}
                    <rect x="12" y="18" width="4" height="24" rx="2" fill="var(--cyan-soft)" opacity="0.6" />
                    <rect x="104" y="18" width="4" height="24" rx="2" fill="var(--red-soft)" opacity="0.6" />
                    <circle cx="60" cy="30" r="4" fill="white" opacity="0.8" />
                    <line x1="60" y1="2" x2="60" y2="58" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                </>
            );
        case 'snake':
            return (
                <>
                    {/* Snake + apple */}
                    <rect x="30" y="28" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.8" />
                    <rect x="40" y="28" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.6" />
                    <rect x="50" y="28" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.4" />
                    <rect x="60" y="28" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.2" />
                    <circle cx="84" cy="20" r="4" fill="var(--red-soft)" opacity="0.8" />
                </>
            );
        case 'flappy':
            return (
                <>
                    {/* Bird + pipes */}
                    <rect x="36" y="0" width="12" height="20" rx="3" fill="var(--accent)" opacity="0.5" />
                    <rect x="36" y="42" width="12" height="18" rx="3" fill="var(--accent)" opacity="0.5" />
                    <circle cx="66" cy="30" r="6" fill="var(--warning)" opacity="0.7" />
                </>
            );
        case 'asteroid':
            return (
                <>
                    {/* Ship + asteroids */}
                    <circle cx="28" cy="16" r="8" fill="var(--border)" opacity="0.5" />
                    <circle cx="82" cy="22" r="6" fill="var(--border)" opacity="0.4" />
                    <circle cx="58" cy="12" r="4" fill="var(--border)" opacity="0.45" />
                    <polygon points="60,46 55,56 65,56" fill="white" opacity="0.7" />
                </>
            );
        case 'balloonpop':
            return (
                <>
                    {/* 3 balloons */}
                    <ellipse cx="36" cy="24" rx="8" ry="10" fill="var(--red-soft)" opacity="0.6" />
                    <ellipse cx="60" cy="20" rx="7" ry="9" fill="var(--cyan-soft)" opacity="0.5" />
                    <ellipse cx="84" cy="24" rx="8" ry="10" fill="var(--accent)" opacity="0.5" />
                    <line x1="36" y1="34" x2="36" y2="50" stroke="var(--border)" strokeWidth="1" opacity="0.4" />
                    <line x1="60" y1="29" x2="60" y2="50" stroke="var(--border)" strokeWidth="1" opacity="0.4" />
                    <line x1="84" y1="34" x2="84" y2="50" stroke="var(--border)" strokeWidth="1" opacity="0.4" />
                </>
            );
        case 'memorytiles':
            return (
                <>
                    {/* 2x2 grid, one flipped */}
                    <rect x="30" y="12" width="20" height="16" rx="3" fill="var(--cyan-soft)" opacity="0.5" />
                    <rect x="54" y="12" width="20" height="16" rx="3" fill="var(--border)" opacity="0.6" />
                    <rect x="30" y="32" width="20" height="16" rx="3" fill="var(--border)" opacity="0.6" />
                    <rect x="54" y="32" width="20" height="16" rx="3" fill="var(--red-soft)" opacity="0.5" />
                </>
            );
        case 'frogger':
            return (
                <>
                    {/* Frog + road lanes */}
                    <rect x="10" y="10" width="100" height="8" rx="2" fill="var(--border)" opacity="0.3" />
                    <rect x="10" y="24" width="100" height="8" rx="2" fill="var(--border)" opacity="0.3" />
                    <rect x="10" y="38" width="100" height="8" rx="2" fill="var(--border)" opacity="0.3" />
                    <rect x="24" y="12" width="18" height="4" rx="2" fill="var(--red-soft)" opacity="0.5" />
                    <rect x="62" y="26" width="18" height="4" rx="2" fill="var(--red-soft)" opacity="0.4" />
                    <rect x="40" y="40" width="18" height="4" rx="2" fill="var(--warning)" opacity="0.5" />
                    <rect x="52" y="50" width="10" height="8" rx="2" fill="var(--cyan-soft)" opacity="0.7" />
                </>
            );
        case 'catchmonsters':
            return (
                <>
                    {/* Monsters + crosshair */}
                    <circle cx="36" cy="24" r="8" fill="var(--cyan-soft)" opacity="0.6" />
                    <circle cx="66" cy="20" r="6" fill="var(--cyan-soft)" opacity="0.4" />
                    <circle cx="90" cy="28" r="7" fill="var(--cyan-soft)" opacity="0.5" />
                    {/* Crosshair */}
                    <line x1="50" y1="40" x2="70" y2="40" stroke="var(--red-soft)" strokeWidth="1.5" opacity="0.6" />
                    <line x1="60" y1="34" x2="60" y2="48" stroke="var(--red-soft)" strokeWidth="1.5" opacity="0.6" />
                </>
            );
        default:
            return null;
    }
}
