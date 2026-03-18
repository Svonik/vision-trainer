import { Gamepad2, Target } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '../modules/i18n';
import { getCachedSessions } from '../modules/sessionCache';
import { GAME_TITLE_KEYS, generateSession } from '../modules/sessionEngine';

function GameDot({ gameId }: { gameId: string }) {
    return (
        <span className="inline-flex items-center gap-1 bg-[var(--accent)]/20 text-[var(--accent)] text-sm px-2 py-0.5 rounded-full font-medium">
            {t(GAME_TITLE_KEYS[gameId] ?? 'app.title')}
        </span>
    );
}

export function ModeSelectPage() {
    const navigate = useNavigate();
    const sessions = getCachedSessions();
    const todayGames = generateSession(sessions);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 py-8 relative z-10"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <h1 className="font-[var(--font-display)] text-3xl text-[var(--text)] mb-2 text-center text-balance">
                {t('mode.title')}
            </h1>
            <p className="text-[var(--text-secondary)] text-base mb-8 text-center max-w-xs">
                {t('mode.subtitle')}
            </p>

            <div className="flex flex-col gap-5 max-w-sm w-full">
                {/* Training card */}
                <button
                    className="group hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-900/30 transition-[transform,box-shadow] duration-200 cursor-pointer spring-enter text-left w-full rounded-xl"
                    style={{ animationDelay: '0ms' }}
                    onClick={() => navigate('/training/settings')}
                    aria-label={t('mode.training')}
                >
                    <Card className="rounded-3xl overflow-hidden gap-0">
                        <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--cta)] to-[var(--cyan-soft)]" />
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                                    <Target className="w-6 h-6 text-[var(--accent)]" />
                                </div>
                                <div>
                                    <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--text)]">
                                        {t('mode.training')}
                                    </h2>
                                    <span className="text-sm bg-[var(--success)]/20 text-[var(--success)] px-2 py-0.5 rounded-full">
                                        {t('mode.trainingRecommended')}
                                    </span>
                                </div>
                            </div>

                            <p className="text-base text-[var(--text-secondary)]">
                                {t('mode.trainingDesc')}
                            </p>

                            {/* Today's session preview */}
                            <div className="rounded-3xl bg-[var(--bg)]/50 border border-[var(--border)]/40 p-3 space-y-2">
                                <p className="text-sm text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                                    {t('training.todaySession')}
                                </p>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    {todayGames.map((gameId, i) => (
                                        <span
                                            key={gameId}
                                            className="flex items-center gap-1"
                                        >
                                            <GameDot gameId={gameId} />
                                            {i < todayGames.length - 1 && (
                                                <span className="text-[var(--text-secondary)] text-sm">
                                                    →
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <AppButton
                                variant="cta"
                                size="md"
                                className="w-full"
                                aria-hidden="true"
                            >
                                {t('mode.startTraining')}
                            </AppButton>
                        </CardContent>
                    </Card>
                </button>

                {/* Free play card */}
                <button
                    className="group hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-900/30 transition-[transform,box-shadow] duration-200 cursor-pointer spring-enter text-left w-full rounded-xl"
                    style={{ animationDelay: '80ms' }}
                    onClick={() => navigate('/games')}
                    aria-label={t('mode.freePlay')}
                >
                    <Card className="rounded-3xl overflow-hidden gap-0">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-[var(--cyan-soft)]/20 flex items-center justify-center flex-shrink-0">
                                    <Gamepad2 className="w-6 h-6 text-[var(--cyan-soft)]" />
                                </div>
                                <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--text)]">
                                    {t('mode.freePlay')}
                                </h2>
                            </div>

                            <p className="text-base text-[var(--text-secondary)]">
                                {t('mode.freePlayDesc')}
                            </p>

                            <AppButton
                                variant="outline"
                                size="md"
                                className="w-full"
                                aria-hidden="true"
                            >
                                {t('mode.chooseGame')}
                            </AppButton>
                        </CardContent>
                    </Card>
                </button>
            </div>
        </div>
    );
}
