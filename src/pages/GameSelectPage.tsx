import React from 'react';
import { useNavigate } from 'react-router';
import { t } from '@/modules/i18n';
import { GameIllustration } from '@/components/GameIllustration';
import { getCachedSessions } from '../modules/sessionCache';
import { GAMES as GAMES_DATA } from '../config/games';

interface GameDisplayConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    difficultyKey: string;
    route: string;
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
            <div className="p-5 space-y-4">
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
                <p className="sr-only sm:not-sr-only text-sm text-[var(--text-secondary)]">
                    {t(game.descriptionKey)}
                </p>
                <span
                    className="rounded-full flex items-center justify-center gap-2 py-3 px-4 text-base min-h-[44px] bg-[var(--cta)] text-[var(--cta-text)] font-semibold w-full mt-4"
                    aria-hidden="true"
                >
                    {t('gameSelect.play')}
                </span>
            </div>
        </button>
    );
});

export function GameSelectPage() {
    const sessions = getCachedSessions();
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
