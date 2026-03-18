import React from 'react';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { GameIllustration } from '@/components/GameIllustration';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { WeeklyProgress } from '@/components/WeeklyProgress';
import { t } from '@/modules/i18n';
import { shouldAlertDoctor } from '@/modules/wellnessCheck';
import { GAMES as GAMES_DATA } from '../config/games';
import { getCachedSessions } from '../modules/sessionCache';

interface GameDisplayConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    difficultyKey: string;
    route: string;
}

const GAMES: GameDisplayConfig[] = GAMES_DATA.map((g) => ({
    id: g.id,
    titleKey: g.titleKey,
    descriptionKey: g.descriptionKey,
    difficultyKey: g.difficultyKey,
    route: g.route,
}));

const GameCard = React.memo(function GameCard({
    game,
    index,
    count,
}: {
    game: GameDisplayConfig;
    index: number;
    count: number;
}) {
    const navigate = useNavigate();
    return (
        <Card
            className="bg-[var(--surface)] rounded-3xl hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-900/20 transition-[transform,box-shadow] duration-300 ease-out cursor-pointer overflow-hidden spring-enter"
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => navigate(game.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(game.route)}
            aria-label={t(game.titleKey)}
        >
            <GameIllustration gameId={game.id} />
            <CardHeader>
                <CardTitle
                    as="h2"
                    className="font-[var(--font-display)] text-lg text-[var(--text)]"
                >
                    {t(game.titleKey)}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <span className="text-sm bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
                        {t(game.difficultyKey)}
                    </span>
                    {count > 0 && (
                        <span className="text-sm text-[var(--text-secondary)]">
                            {t('gameSelect.played')}: {count}{' '}
                            {t('gameSelect.times')}
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
                <AppButton
                    variant="cta"
                    size="md"
                    className="w-full"
                    aria-hidden="true"
                >
                    {t('gameSelect.play')}
                </AppButton>
            </CardFooter>
        </Card>
    );
});

export function GameSelectPage() {
    const sessions = getCachedSessions();
    const doctorAlert = shouldAlertDoctor(sessions);
    const getGameCount = (gameId: string) =>
        sessions.filter((s: any) => s.game === gameId).length;

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 py-8 relative z-10"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <h1 className="font-[var(--font-display)] text-4xl text-[var(--text)] mb-6 text-balance">
                {t('gameSelect.title')}
            </h1>

            {doctorAlert && (
                <div className="w-full max-w-3xl p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-center mb-4">
                    <p className="text-sm font-bold text-[var(--warning)]">
                        {t('wellness.alert_doctor')}
                    </p>
                </div>
            )}

            <WeeklyProgress sessions={sessions} />

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
