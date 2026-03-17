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
                    {/* Falling objects - larger and more visible */}
                    <circle cx="35" cy="10" r="6" fill="var(--cyan-soft)" opacity="0.7" />
                    <circle cx="62" cy="18" r="5" fill="var(--cyan-soft)" opacity="0.5" />
                    <circle cx="85" cy="8" r="4" fill="var(--warning)" opacity="0.6" />
                    {/* Motion trail dots */}
                    <circle cx="35" cy="20" r="2" fill="var(--cyan-soft)" opacity="0.2" />
                    <circle cx="62" cy="26" r="2" fill="var(--cyan-soft)" opacity="0.15" />
                    {/* Platform - thick, glowing */}
                    <rect x="30" y="48" width="60" height="6" rx="3" fill="var(--red-soft)" opacity="0.8" />
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
                    {/* L-piece */}
                    <rect x="28" y="30" width="10" height="10" rx="1.5" fill="var(--cyan-soft)" opacity="0.7" />
                    <rect x="28" y="20" width="10" height="10" rx="1.5" fill="var(--cyan-soft)" opacity="0.7" />
                    <rect x="38" y="30" width="10" height="10" rx="1.5" fill="var(--cyan-soft)" opacity="0.7" />
                    {/* T-piece */}
                    <rect x="56" y="20" width="10" height="10" rx="1.5" fill="var(--accent)" opacity="0.6" />
                    <rect x="66" y="20" width="10" height="10" rx="1.5" fill="var(--accent)" opacity="0.6" />
                    <rect x="76" y="20" width="10" height="10" rx="1.5" fill="var(--accent)" opacity="0.6" />
                    <rect x="66" y="30" width="10" height="10" rx="1.5" fill="var(--accent)" opacity="0.6" />
                    {/* Stacked blocks at bottom */}
                    <rect x="28" y="42" width="60" height="8" rx="1.5" fill="var(--border)" opacity="0.3" />
                    <rect x="38" y="42" width="10" height="8" rx="1.5" fill="var(--warning)" opacity="0.4" />
                    <rect x="58" y="42" width="10" height="8" rx="1.5" fill="var(--red-soft)" opacity="0.3" />
                </>
            );
        case 'invaders':
            return (
                <>
                    {/* Classic space invader shape using small rects */}
                    {/* Row 1: antennae */}
                    <rect x="40" y="8" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="56" y="8" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    {/* Row 2: head */}
                    <rect x="36" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="40" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="44" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="48" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="52" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="56" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="60" y="12" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    {/* Row 3: body with eyes */}
                    <rect x="32" y="16" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="36" y="16" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="44" y="16" width="4" height="4" fill="white" opacity="0.8" />
                    <rect x="48" y="16" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="52" y="16" width="4" height="4" fill="white" opacity="0.8" />
                    <rect x="60" y="16" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="64" y="16" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    {/* Row 4: legs */}
                    <rect x="36" y="20" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="44" y="20" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="52" y="20" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    <rect x="60" y="20" width="4" height="4" fill="var(--accent)" opacity="0.7" />
                    {/* Shield */}
                    <rect x="42" y="36" width="16" height="6" rx="2" fill="var(--success)" opacity="0.4" />
                    {/* Player ship */}
                    <polygon points="50,50 46,56 54,56" fill="var(--cyan-soft)" opacity="0.8" />
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
                    {/* Pipes */}
                    <rect x="32" y="0" width="14" height="18" rx="3" fill="var(--accent)" opacity="0.5" />
                    <rect x="32" y="44" width="14" height="16" rx="3" fill="var(--accent)" opacity="0.5" />
                    {/* Pipe caps */}
                    <rect x="29" y="15" width="20" height="5" rx="2" fill="var(--accent)" opacity="0.6" />
                    <rect x="29" y="42" width="20" height="5" rx="2" fill="var(--accent)" opacity="0.6" />
                    {/* Bird body */}
                    <ellipse cx="70" cy="30" rx="8" ry="6" fill="var(--warning)" opacity="0.8" />
                    {/* Wing */}
                    <ellipse cx="66" cy="28" rx="5" ry="3" fill="var(--warning)" opacity="0.5" transform="rotate(-15,66,28)" />
                    {/* Eye */}
                    <circle cx="74" cy="28" r="2" fill="white" opacity="0.9" />
                    <circle cx="75" cy="28" r="1" fill="var(--bg)" opacity="0.8" />
                    {/* Beak */}
                    <polygon points="78,30 82,31 78,33" fill="var(--cta)" opacity="0.8" />
                </>
            );
        case 'asteroid':
            return (
                <>
                    {/* Large asteroid - irregular polygon */}
                    <polygon points="25,10 35,6 42,12 40,22 30,24 22,18" fill="var(--text-secondary)" opacity="0.6" stroke="var(--border)" strokeWidth="1" />
                    {/* Medium asteroid */}
                    <polygon points="78,18 86,14 92,20 88,28 80,26" fill="var(--text-secondary)" opacity="0.5" stroke="var(--border)" strokeWidth="1" />
                    {/* Small asteroid */}
                    <polygon points="55,8 60,5 64,10 60,14 54,12" fill="var(--text-secondary)" opacity="0.45" stroke="var(--border)" strokeWidth="1" />
                    {/* Player ship */}
                    <polygon points="60,44 54,54 60,50 66,54" fill="var(--cyan-soft)" opacity="0.8" />
                    {/* Thrust */}
                    <polygon points="58,52 60,58 62,52" fill="var(--cta)" opacity="0.5" />
                    {/* Stars */}
                    <circle cx="15" cy="40" r="1" fill="white" opacity="0.3" />
                    <circle cx="95" cy="10" r="1" fill="white" opacity="0.25" />
                    <circle cx="50" cy="35" r="1" fill="white" opacity="0.2" />
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
                    {/* Road lanes */}
                    <rect x="10" y="8" width="100" height="10" rx="2" fill="var(--border)" opacity="0.3" />
                    <rect x="10" y="22" width="100" height="10" rx="2" fill="var(--border)" opacity="0.3" />
                    {/* Cars */}
                    <rect x="20" y="10" width="20" height="6" rx="3" fill="var(--red-soft)" opacity="0.6" />
                    <rect x="65" y="24" width="20" height="6" rx="3" fill="var(--warning)" opacity="0.5" />
                    {/* Water/safe zone */}
                    <rect x="10" y="36" width="100" height="10" rx="2" fill="var(--cyan-soft)" opacity="0.15" />
                    {/* Lily pad */}
                    <ellipse cx="55" cy="41" rx="8" ry="4" fill="var(--success)" opacity="0.4" />
                    {/* Frog - simple but recognizable */}
                    <ellipse cx="55" cy="40" rx="5" ry="4" fill="var(--success)" opacity="0.7" />
                    <circle cx="52" cy="37" r="2" fill="var(--success)" opacity="0.8" />
                    <circle cx="58" cy="37" r="2" fill="var(--success)" opacity="0.8" />
                    {/* Frog eyes */}
                    <circle cx="52" cy="37" r="1" fill="white" opacity="0.9" />
                    <circle cx="58" cy="37" r="1" fill="white" opacity="0.9" />
                </>
            );
        case 'catchmonsters':
            return (
                <>
                    {/* Monster 1 - big, with horns */}
                    <circle cx="32" cy="26" r="10" fill="var(--cyan-soft)" opacity="0.6" />
                    <rect x="26" y="14" width="3" height="6" rx="1" fill="var(--cyan-soft)" opacity="0.5" />
                    <rect x="35" y="14" width="3" height="6" rx="1" fill="var(--cyan-soft)" opacity="0.5" />
                    <circle cx="28" cy="24" r="2" fill="white" opacity="0.8" />
                    <circle cx="36" cy="24" r="2" fill="white" opacity="0.8" />
                    <rect x="29" y="30" width="6" height="2" rx="1" fill="var(--bg)" opacity="0.5" />
                    {/* Monster 2 - small, single eye */}
                    <circle cx="65" cy="22" r="7" fill="var(--accent)" opacity="0.5" />
                    <circle cx="65" cy="20" r="3" fill="white" opacity="0.8" />
                    <circle cx="66" cy="20" r="1.5" fill="var(--bg)" opacity="0.7" />
                    {/* Monster 3 */}
                    <circle cx="90" cy="28" r="8" fill="var(--warning)" opacity="0.4" />
                    <circle cx="86" cy="26" r="2" fill="white" opacity="0.7" />
                    <circle cx="94" cy="26" r="2" fill="white" opacity="0.7" />
                    {/* Crosshair */}
                    <circle cx="65" cy="44" r="8" fill="none" stroke="var(--red-soft)" strokeWidth="1.5" opacity="0.5" />
                    <line x1="65" y1="34" x2="65" y2="54" stroke="var(--red-soft)" strokeWidth="1" opacity="0.4" />
                    <line x1="55" y1="44" x2="75" y2="44" stroke="var(--red-soft)" strokeWidth="1" opacity="0.4" />
                </>
            );
        default:
            return null;
    }
}
