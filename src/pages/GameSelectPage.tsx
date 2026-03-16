import { useNavigate } from 'react-router';
import { t } from '@/modules/i18n';
import { getSessions } from '../modules/storage';
import { GAMES as GAMES_DATA } from '../config/games';

interface GameDisplayConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    difficultyKey: string;
    route: string;
    illustration: React.ReactNode;
}

function CatcherIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-end justify-center pb-2">
            <div className="absolute w-3 h-3 rounded-full bg-[var(--cyan-soft)]/60 top-2 left-1/4 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="absolute w-3 h-3 rounded-full bg-[var(--cyan-soft)]/40 top-4 right-1/3 animate-bounce" style={{ animationDelay: '0.3s' }} />
            <div className="w-12 h-1.5 bg-[var(--red-soft)]/70 rounded" />
        </div>
    );
}

function BreakoutIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-end justify-center pb-2">
            <div className="absolute w-4 h-2 bg-[var(--cyan-soft)]/60 top-2 left-1/4 rounded" />
            <div className="absolute w-4 h-2 bg-[var(--cyan-soft)]/40 top-2 left-2/4 rounded" />
            <div className="absolute w-4 h-2 bg-[var(--accent)]/60 top-5 left-1/3 rounded" />
            <div className="w-3 h-3 rounded-full bg-white/60 top-8 absolute" />
        </div>
    );
}

function TetrisIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center gap-1">
            <div className="w-4 h-4 bg-[var(--cyan-soft)]/60 rounded-sm" />
            <div className="w-4 h-4 bg-yellow-400/60 rounded-sm" />
            <div className="w-4 h-4 bg-[var(--accent)]/60 rounded-sm" />
            <div className="w-4 h-8 bg-[var(--red-soft)]/60 rounded-sm" />
        </div>
    );
}

function InvadersIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-[var(--accent)]/60 rounded-sm" />
            <div className="w-5 h-5 bg-[var(--accent)]/40 rounded-sm" />
            <div className="w-5 h-5 bg-[var(--accent)]/60 rounded-sm" />
            <div className="absolute bottom-2 w-6 h-3 bg-white/60 rounded" />
        </div>
    );
}

function PongIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center">
            <div className="absolute left-3 w-1.5 h-10 bg-[var(--cyan-soft)]/60 rounded" />
            <div className="absolute right-3 w-1.5 h-10 bg-[var(--red-soft)]/60 rounded" />
            <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0.1s' }} />
        </div>
    );
}

function SnakeIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center">
            <div className="flex gap-1">
                <div className="w-3 h-3 bg-[var(--accent)]/80 rounded-sm" />
                <div className="w-3 h-3 bg-[var(--accent)]/60 rounded-sm" />
                <div className="w-3 h-3 bg-[var(--accent)]/40 rounded-sm" />
                <div className="w-3 h-3 bg-[var(--accent)]/20 rounded-sm" />
            </div>
            <div className="absolute w-2 h-2 rounded-full bg-[var(--red-soft)]/80 top-3 right-8" />
        </div>
    );
}

function FlappyIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center">
            <div className="absolute left-8 w-4 h-6 bg-[var(--accent)]/60 rounded" style={{ top: 0 }} />
            <div className="absolute left-8 w-4 h-6 bg-[var(--accent)]/60 rounded" style={{ bottom: 0 }} />
            <div className="w-4 h-4 rounded-full bg-yellow-400/70 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
    );
}

function AsteroidIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center">
            <div className="absolute w-6 h-6 bg-gray-500/60 rounded-full top-2 left-1/4" />
            <div className="absolute w-4 h-4 bg-gray-500/40 rounded-full top-4 right-1/4" />
            <div className="w-3 h-5 bg-white/70 rounded-t-full" />
        </div>
    );
}

function BalloonPopIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center gap-3">
            <div className="w-6 h-7 bg-[var(--red-soft)]/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-5 h-6 bg-[var(--cyan-soft)]/50 rounded-full animate-bounce" style={{ animationDelay: '0.25s' }} />
            <div className="w-6 h-7 bg-[var(--red-soft)]/40 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
        </div>
    );
}

function MemoryTilesIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center gap-1.5">
            <div className="w-8 h-8 bg-[var(--cyan-soft)]/50 rounded-sm" />
            <div className="w-8 h-8 bg-gray-600/70 rounded-sm" />
            <div className="w-8 h-8 bg-[var(--red-soft)]/50 rounded-sm" />
            <div className="w-8 h-8 bg-gray-600/70 rounded-sm" />
        </div>
    );
}

function FroggerIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex flex-col justify-center gap-1 px-4">
            <div className="flex gap-2">
                <div className="w-8 h-4 bg-[var(--red-soft)]/60 rounded-sm animate-pulse" style={{ animationDelay: '0s' }} />
                <div className="w-8 h-4 bg-[var(--red-soft)]/40 rounded-sm animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <div className="flex gap-2">
                <div className="w-8 h-4 bg-orange-400/50 rounded-sm animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-8 h-4 bg-orange-400/30 rounded-sm animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
            <div className="absolute right-6 bottom-3 w-5 h-5 bg-[var(--cyan-soft)]/70 rounded-sm" />
        </div>
    );
}

function CatchMonstersIllustration() {
    return (
        <div className="relative h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden flex items-center justify-center gap-4">
            <div className="w-7 h-7 bg-[var(--cyan-soft)]/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-5 h-5 bg-[var(--cyan-soft)]/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            <div className="w-6 h-6 bg-[var(--cyan-soft)]/50 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="absolute w-5 h-0.5 bg-[var(--red-soft)]/70" />
            <div className="absolute w-0.5 h-5 bg-[var(--red-soft)]/70" />
        </div>
    );
}

const ILLUSTRATION_MAP: Record<string, React.ReactNode> = {
    'binocular-catcher': <CatcherIllustration />,
    'breakout': <BreakoutIllustration />,
    'tetris': <TetrisIllustration />,
    'invaders': <InvadersIllustration />,
    'pong': <PongIllustration />,
    'snake': <SnakeIllustration />,
    'flappy': <FlappyIllustration />,
    'asteroid': <AsteroidIllustration />,
    'balloonpop': <BalloonPopIllustration />,
    'memorytiles': <MemoryTilesIllustration />,
    'frogger': <FroggerIllustration />,
    'catchmonsters': <CatchMonstersIllustration />,
};

const GAMES: GameDisplayConfig[] = GAMES_DATA.map(g => ({
    ...g,
    illustration: ILLUSTRATION_MAP[g.id] ?? null,
}));

export function GameSelectPage() {
    const navigate = useNavigate();
    const sessions = getSessions();
    const getGameCount = (gameId: string) => sessions.filter((s: any) => s.game === gameId).length;

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 py-8 relative z-10"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <h1 className="font-[var(--font-display)] text-3xl text-[var(--text)] mb-6">
                {t('gameSelect.title')}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full">
                {GAMES.map((game, index) => {
                    const count = getGameCount(game.id);
                    return (
                        <div
                            key={game.id}
                            className="group bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/30 transition-all duration-200 cursor-pointer overflow-hidden spring-enter"
                            style={{ animationDelay: `${index * 60}ms` }}
                            onClick={() => navigate(game.route)}
                        >
                            {game.illustration}
                            <div className="p-4 space-y-3">
                                <div>
                                    <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--text)]">
                                        {t(game.titleKey)}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
                                            {t(game.difficultyKey)}
                                        </span>
                                        {count > 0 && (
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                Сыграно: {count} раз
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {t(game.descriptionKey)}
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(game.route); }}
                                    className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-2.5 font-semibold btn-press"
                                >
                                    {t('gameSelect.play')}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
