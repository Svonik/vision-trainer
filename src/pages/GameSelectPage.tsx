import React from 'react';
import { useNavigate } from 'react-router';
import { t } from '@/modules/i18n';
import { GameIllustration } from '@/components/GameIllustration';
import { getCachedSessions } from '../modules/sessionCache';
import { GAMES as GAMES_DATA } from '../config/games';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
        <Card
            className="bg-[var(--surface)] border-[var(--border)]/50 rounded-3xl hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/30 transition-all duration-200 cursor-pointer overflow-hidden spring-enter"
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => navigate(game.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(game.route)}
            aria-label={t(game.titleKey)}
        >
            <GameIllustration gameId={game.id} />
            <CardHeader>
                <CardTitle as="h2" className="font-[var(--font-display)] text-lg text-[var(--text)]">
                    {t(game.titleKey)}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <span className="text-sm bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
                        {t(game.difficultyKey)}
                    </span>
                    {count > 0 && (
                        <span className="text-sm text-[var(--text-secondary)]">
                            {t('gameSelect.played')}: {count} {t('gameSelect.times')}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-[var(--text-secondary)]">
                    {t(game.descriptionKey)}
                </p>
            </CardContent>
            <CardFooter>
                <span
                    className="rounded-full flex items-center justify-center py-3 text-base min-h-[44px] bg-[var(--cta)] text-[var(--cta-text)] font-semibold w-full btn-press"
                    aria-hidden="true"
                >
                    {t('gameSelect.play')}
                </span>
            </CardFooter>
        </Card>
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
