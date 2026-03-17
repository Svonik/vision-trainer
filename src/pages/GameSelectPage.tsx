import React from 'react';
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
}

interface IllustrationElement {
    type: 'circle' | 'rect' | 'bar';
    className: string;
    style?: React.CSSProperties;
}

interface IllustrationConfig {
    containerClass: string;
    elements: IllustrationElement[];
}

const ILLUSTRATION_CONFIGS: Record<string, IllustrationConfig> = {
    'binocular-catcher': {
        containerClass: 'flex items-end justify-center pb-2',
        elements: [
            { type: 'circle', className: 'absolute w-3 h-3 rounded-full bg-[var(--cyan-soft)]/60 top-2 left-1/4 animate-bounce', style: { animationDelay: '0s' } },
            { type: 'circle', className: 'absolute w-3 h-3 rounded-full bg-[var(--cyan-soft)]/40 top-4 right-1/3 animate-bounce', style: { animationDelay: '0.3s' } },
            { type: 'bar', className: 'w-12 h-1.5 bg-[var(--red-soft)]/70 rounded' },
        ],
    },
    'breakout': {
        containerClass: 'flex items-end justify-center pb-2',
        elements: [
            { type: 'rect', className: 'absolute w-4 h-2 bg-[var(--cyan-soft)]/60 top-2 left-1/4 rounded' },
            { type: 'rect', className: 'absolute w-4 h-2 bg-[var(--cyan-soft)]/40 top-2 left-2/4 rounded' },
            { type: 'rect', className: 'absolute w-4 h-2 bg-[var(--accent)]/60 top-5 left-1/3 rounded' },
            { type: 'circle', className: 'w-3 h-3 rounded-full bg-white/60 top-8 absolute' },
        ],
    },
    'tetris': {
        containerClass: 'flex items-center justify-center gap-1',
        elements: [
            { type: 'rect', className: 'w-4 h-4 bg-[var(--cyan-soft)]/60 rounded-sm' },
            { type: 'rect', className: 'w-4 h-4 bg-yellow-400/60 rounded-sm' },
            { type: 'rect', className: 'w-4 h-4 bg-[var(--accent)]/60 rounded-sm' },
            { type: 'rect', className: 'w-4 h-8 bg-[var(--red-soft)]/60 rounded-sm' },
        ],
    },
    'invaders': {
        containerClass: 'flex items-center justify-center gap-3',
        elements: [
            { type: 'rect', className: 'w-5 h-5 bg-[var(--accent)]/60 rounded-sm' },
            { type: 'rect', className: 'w-5 h-5 bg-[var(--accent)]/40 rounded-sm' },
            { type: 'rect', className: 'w-5 h-5 bg-[var(--accent)]/60 rounded-sm' },
            { type: 'rect', className: 'absolute bottom-2 w-6 h-3 bg-white/60 rounded' },
        ],
    },
    'pong': {
        containerClass: 'flex items-center justify-center',
        elements: [
            { type: 'bar', className: 'absolute left-3 w-1.5 h-10 bg-[var(--cyan-soft)]/60 rounded' },
            { type: 'bar', className: 'absolute right-3 w-1.5 h-10 bg-[var(--red-soft)]/60 rounded' },
            { type: 'circle', className: 'w-3 h-3 rounded-full bg-white/80 animate-bounce', style: { animationDelay: '0.1s' } },
        ],
    },
    'snake': {
        containerClass: 'flex items-center justify-center',
        elements: [
            { type: 'rect', className: 'w-3 h-3 bg-[var(--accent)]/80 rounded-sm' },
            { type: 'rect', className: 'w-3 h-3 bg-[var(--accent)]/60 rounded-sm' },
            { type: 'rect', className: 'w-3 h-3 bg-[var(--accent)]/40 rounded-sm' },
            { type: 'rect', className: 'w-3 h-3 bg-[var(--accent)]/20 rounded-sm' },
            { type: 'circle', className: 'absolute w-2 h-2 rounded-full bg-[var(--red-soft)]/80 top-3 right-8' },
        ],
    },
    'flappy': {
        containerClass: 'flex items-center justify-center',
        elements: [
            { type: 'rect', className: 'absolute left-8 w-4 h-6 bg-[var(--accent)]/60 rounded', style: { top: 0 } },
            { type: 'rect', className: 'absolute left-8 w-4 h-6 bg-[var(--accent)]/60 rounded', style: { bottom: 0 } },
            { type: 'circle', className: 'w-4 h-4 rounded-full bg-yellow-400/70 animate-bounce', style: { animationDelay: '0.2s' } },
        ],
    },
    'asteroid': {
        containerClass: 'flex items-center justify-center',
        elements: [
            { type: 'circle', className: 'absolute w-6 h-6 bg-gray-500/60 rounded-full top-2 left-1/4' },
            { type: 'circle', className: 'absolute w-4 h-4 bg-gray-500/40 rounded-full top-4 right-1/4' },
            { type: 'rect', className: 'w-3 h-5 bg-white/70 rounded-t-full' },
        ],
    },
    'balloonpop': {
        containerClass: 'flex items-center justify-center gap-3',
        elements: [
            { type: 'circle', className: 'w-6 h-7 bg-[var(--red-soft)]/60 rounded-full animate-bounce', style: { animationDelay: '0s' } },
            { type: 'circle', className: 'w-5 h-6 bg-[var(--cyan-soft)]/50 rounded-full animate-bounce', style: { animationDelay: '0.25s' } },
            { type: 'circle', className: 'w-6 h-7 bg-[var(--red-soft)]/40 rounded-full animate-bounce', style: { animationDelay: '0.5s' } },
        ],
    },
    'memorytiles': {
        containerClass: 'flex items-center justify-center gap-1.5',
        elements: [
            { type: 'rect', className: 'w-8 h-8 bg-[var(--cyan-soft)]/50 rounded-sm' },
            { type: 'rect', className: 'w-8 h-8 bg-gray-600/70 rounded-sm' },
            { type: 'rect', className: 'w-8 h-8 bg-[var(--red-soft)]/50 rounded-sm' },
            { type: 'rect', className: 'w-8 h-8 bg-gray-600/70 rounded-sm' },
        ],
    },
    'frogger': {
        containerClass: 'flex flex-col justify-center gap-1 px-4',
        elements: [
            { type: 'rect', className: 'w-8 h-4 bg-[var(--red-soft)]/60 rounded-sm animate-pulse', style: { animationDelay: '0s' } },
            { type: 'rect', className: 'w-8 h-4 bg-[var(--red-soft)]/40 rounded-sm animate-pulse', style: { animationDelay: '0.4s' } },
            { type: 'rect', className: 'w-8 h-4 bg-orange-400/50 rounded-sm animate-pulse', style: { animationDelay: '0.2s' } },
            { type: 'rect', className: 'w-8 h-4 bg-orange-400/30 rounded-sm animate-pulse', style: { animationDelay: '0.6s' } },
            { type: 'rect', className: 'absolute right-6 bottom-3 w-5 h-5 bg-[var(--cyan-soft)]/70 rounded-sm' },
        ],
    },
    'catchmonsters': {
        containerClass: 'flex items-center justify-center gap-4',
        elements: [
            { type: 'circle', className: 'w-7 h-7 bg-[var(--cyan-soft)]/60 rounded-full animate-bounce', style: { animationDelay: '0s' } },
            { type: 'circle', className: 'w-5 h-5 bg-[var(--cyan-soft)]/40 rounded-full animate-bounce', style: { animationDelay: '0.3s' } },
            { type: 'circle', className: 'w-6 h-6 bg-[var(--cyan-soft)]/50 rounded-full animate-bounce', style: { animationDelay: '0.15s' } },
            { type: 'bar', className: 'absolute w-5 h-0.5 bg-[var(--red-soft)]/70' },
            { type: 'bar', className: 'absolute w-0.5 h-5 bg-[var(--red-soft)]/70' },
        ],
    },
};

function GameIllustration({ gameId }: { gameId: string }) {
    const config = ILLUSTRATION_CONFIGS[gameId];
    if (!config) return <div className="relative h-16 sm:h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden" />;

    return (
        <div className={`relative h-16 sm:h-28 bg-[var(--surface)] rounded-t-3xl overflow-hidden ${config.containerClass}`}>
            {config.elements.map((el, i) => (
                <div key={i} className={el.className} style={el.style} />
            ))}
        </div>
    );
}

const GAMES: GameDisplayConfig[] = GAMES_DATA.map(g => ({
    id: g.id,
    titleKey: g.titleKey,
    descriptionKey: g.descriptionKey,
    difficultyKey: g.difficultyKey,
    route: g.route,
}));

const GameCard = React.memo(function GameCard({ game, index, count }: { game: GameDisplayConfig; index: number; count: number }) {
    const navigate = useNavigate();
    return (
        <button
            key={game.id}
            className="group bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/30 transition-all duration-200 cursor-pointer overflow-hidden spring-enter text-left w-full"
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => navigate(game.route)}
            aria-label={t(game.titleKey)}
        >
            <GameIllustration gameId={game.id} />
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div>
                    <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--text)]">
                        {t(game.titleKey)}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
                            {t(game.difficultyKey)}
                        </span>
                        {count > 0 && (
                            <span className="text-sm text-[var(--text-secondary)]">
                                {t('gameSelect.played')}: {count} {t('gameSelect.times')}
                            </span>
                        )}
                    </div>
                </div>
                <p className="hidden sm:block text-sm text-[var(--text-secondary)]">
                    {t(game.descriptionKey)}
                </p>
                <span className="block w-full sm:w-auto bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-2.5 px-6 font-semibold text-center">
                    {t('gameSelect.play')}
                </span>
            </div>
        </button>
    );
});

export function GameSelectPage() {
    const sessions = getSessions();
    const getGameCount = (gameId: string) => sessions.filter((s: any) => s.game === gameId).length;

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 py-8 relative z-10"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <h1 className="font-[var(--font-display)] text-3xl text-[var(--text)] mb-6">
                {t('gameSelect.title')}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full">
                {GAMES.map((game, index) => (
                    <GameCard
                        key={game.id}
                        game={game}
                        index={index}
                        count={getGameCount(game.id)}
                    />
                ))}
            </div>
        </div>
    );
}
