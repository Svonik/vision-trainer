/**
 * Simplified mini-icon for each game — 1-2 SVG elements in a colored circle.
 * Used in SessionStepper, TrainingPlayPage progress, etc.
 */

interface GameIconProps {
    gameId: string;
    size?: number;
    className?: string;
}

const ICON_CONFIGS: Record<
    string,
    { bg: string; render: (s: number) => JSX.Element }
> = {
    'binocular-catcher': {
        bg: 'var(--cyan-soft)',
        render: (s) => (
            <>
                <circle cx={s / 2} cy={s * 0.35} r={s * 0.15} fill="white" opacity={0.9} />
                <rect x={s * 0.25} y={s * 0.7} width={s * 0.5} height={s * 0.08} rx={s * 0.04} fill="white" opacity={0.7} />
            </>
        ),
    },
    breakout: {
        bg: 'var(--accent)',
        render: (s) => (
            <>
                <rect x={s * 0.2} y={s * 0.2} width={s * 0.25} height={s * 0.12} rx={2} fill="white" opacity={0.8} />
                <rect x={s * 0.55} y={s * 0.2} width={s * 0.25} height={s * 0.12} rx={2} fill="white" opacity={0.6} />
                <circle cx={s / 2} cy={s * 0.55} r={s * 0.08} fill="white" opacity={0.9} />
                <rect x={s * 0.3} y={s * 0.75} width={s * 0.4} height={s * 0.08} rx={s * 0.04} fill="white" opacity={0.7} />
            </>
        ),
    },
    tetris: {
        bg: 'var(--warning)',
        render: (s) => (
            <>
                <rect x={s * 0.3} y={s * 0.25} width={s * 0.18} height={s * 0.18} rx={2} fill="white" opacity={0.8} />
                <rect x={s * 0.3} y={s * 0.45} width={s * 0.18} height={s * 0.18} rx={2} fill="white" opacity={0.6} />
                <rect x={s * 0.5} y={s * 0.45} width={s * 0.18} height={s * 0.18} rx={2} fill="white" opacity={0.8} />
            </>
        ),
    },
    invaders: {
        bg: 'var(--red-soft)',
        render: (s) => (
            <>
                <rect x={s * 0.3} y={s * 0.25} width={s * 0.12} height={s * 0.12} rx={2} fill="white" opacity={0.8} />
                <rect x={s * 0.44} y={s * 0.25} width={s * 0.12} height={s * 0.12} rx={2} fill="white" opacity={0.6} />
                <rect x={s * 0.58} y={s * 0.25} width={s * 0.12} height={s * 0.12} rx={2} fill="white" opacity={0.8} />
                <rect x={s * 0.4} y={s * 0.65} width={s * 0.2} height={s * 0.1} rx={2} fill="white" opacity={0.7} />
            </>
        ),
    },
    pong: {
        bg: 'var(--cyan-soft)',
        render: (s) => (
            <>
                <rect x={s * 0.2} y={s * 0.3} width={s * 0.08} height={s * 0.35} rx={s * 0.04} fill="white" opacity={0.8} />
                <rect x={s * 0.72} y={s * 0.3} width={s * 0.08} height={s * 0.35} rx={s * 0.04} fill="white" opacity={0.8} />
                <circle cx={s / 2} cy={s / 2} r={s * 0.06} fill="white" opacity={0.9} />
            </>
        ),
    },
    snake: {
        bg: 'var(--success)',
        render: (s) => (
            <>
                <circle cx={s * 0.35} cy={s * 0.4} r={s * 0.1} fill="white" opacity={0.9} />
                <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.08} fill="white" opacity={0.7} />
                <circle cx={s * 0.62} cy={s * 0.58} r={s * 0.06} fill="white" opacity={0.5} />
                <circle cx={s * 0.7} cy={s * 0.35} r={s * 0.05} fill="var(--red-soft)" opacity={0.9} />
            </>
        ),
    },
    flappy: {
        bg: 'var(--warning)',
        render: (s) => (
            <>
                <circle cx={s / 2} cy={s / 2} r={s * 0.15} fill="white" opacity={0.9} />
                <rect x={s * 0.2} y={s * 0.15} width={s * 0.12} height={s * 0.35} rx={s * 0.06} fill="white" opacity={0.5} />
                <rect x={s * 0.68} y={s * 0.5} width={s * 0.12} height={s * 0.35} rx={s * 0.06} fill="white" opacity={0.5} />
            </>
        ),
    },
    asteroid: {
        bg: 'var(--text-secondary)',
        render: (s) => (
            <>
                <circle cx={s * 0.35} cy={s * 0.35} r={s * 0.12} fill="white" opacity={0.6} />
                <circle cx={s * 0.6} cy={s * 0.55} r={s * 0.08} fill="white" opacity={0.4} />
                <circle cx={s * 0.65} cy={s * 0.3} r={s * 0.05} fill="white" opacity={0.3} />
            </>
        ),
    },
    balloonpop: {
        bg: 'var(--red-soft)',
        render: (s) => (
            <>
                <ellipse cx={s * 0.35} cy={s * 0.38} rx={s * 0.1} ry={s * 0.14} fill="white" opacity={0.8} />
                <ellipse cx={s * 0.55} cy={s * 0.42} rx={s * 0.08} ry={s * 0.12} fill="white" opacity={0.6} />
                <ellipse cx={s * 0.7} cy={s * 0.36} rx={s * 0.07} ry={s * 0.1} fill="white" opacity={0.5} />
            </>
        ),
    },
    memorytiles: {
        bg: 'var(--accent)',
        render: (s) => (
            <>
                <rect x={s * 0.22} y={s * 0.22} width={s * 0.22} height={s * 0.22} rx={3} fill="white" opacity={0.8} />
                <rect x={s * 0.56} y={s * 0.22} width={s * 0.22} height={s * 0.22} rx={3} fill="white" opacity={0.5} />
                <rect x={s * 0.22} y={s * 0.56} width={s * 0.22} height={s * 0.22} rx={3} fill="white" opacity={0.5} />
                <rect x={s * 0.56} y={s * 0.56} width={s * 0.22} height={s * 0.22} rx={3} fill="white" opacity={0.8} />
            </>
        ),
    },
    frogger: {
        bg: 'var(--success)',
        render: (s) => (
            <>
                <circle cx={s / 2} cy={s * 0.6} r={s * 0.1} fill="white" opacity={0.9} />
                <rect x={s * 0.15} y={s * 0.3} width={s * 0.3} height={s * 0.1} rx={s * 0.05} fill="white" opacity={0.5} />
                <rect x={s * 0.55} y={s * 0.3} width={s * 0.3} height={s * 0.1} rx={s * 0.05} fill="white" opacity={0.5} />
            </>
        ),
    },
    catchmonsters: {
        bg: 'var(--accent)',
        render: (s) => (
            <>
                <circle cx={s * 0.35} cy={s * 0.4} r={s * 0.12} fill="white" opacity={0.7} />
                <circle cx={s * 0.6} cy={s * 0.45} r={s * 0.09} fill="white" opacity={0.5} />
                <line x1={s * 0.35} y1={s * 0.2} x2={s * 0.35} y2={s * 0.65} stroke="white" strokeWidth={1.5} opacity={0.4} />
                <line x1={s * 0.15} y1={s * 0.4} x2={s * 0.55} y2={s * 0.4} stroke="white" strokeWidth={1.5} opacity={0.4} />
            </>
        ),
    },
};

export function GameIcon({ gameId, size = 48, className = '' }: GameIconProps) {
    const config = ICON_CONFIGS[gameId];
    if (!config) return null;

    return (
        <div
            className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: config.bg,
                opacity: 0.85,
            }}
        >
            <svg
                viewBox={`0 0 ${size} ${size}`}
                width={size * 0.7}
                height={size * 0.7}
                aria-hidden="true"
            >
                {config.render(size)}
            </svg>
        </div>
    );
}
