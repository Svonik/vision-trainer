import { Grid, Hourglass, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { ProgressRing } from '@/components/ProgressRing';
import { formatDuration } from '@/lib/formatTime';
import { getGameById } from '../config/games';
import { GAME, SPEEDS } from '../modules/constants';
import { t } from '../modules/i18n';
import { getCachedSessions } from '../modules/sessionCache';

function CountUp({ target }: { target: number }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (count < target) {
            const timer = setTimeout(
                () => setCount((c) => Math.min(c + 1, target)),
                50,
            );
            return () => clearTimeout(timer);
        }
    }, [count, target]);
    return (
        <span className="font-[var(--font-display)] text-5xl font-semibold text-[var(--text)] tabular-nums">
            {count}
        </span>
    );
}

function DeltaIndicator({
    current,
    previous,
}: {
    current: number;
    previous: number;
}) {
    const delta = current - previous;
    if (delta === 0) return null;
    const isUp = delta > 0;
    return (
        <span
            className={`text-sm ml-2 tabular-nums ${isUp ? 'text-[var(--success)]' : 'text-[var(--accent-secondary)]'}`}
        >
            {isUp ? '↑' : '↓'}
            {Math.abs(delta)}%
        </span>
    );
}

export function StatsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();

    const result =
        location.state?.result ??
        (() => {
            const sessions = getCachedSessions();
            return sessions.length > 0 ? sessions[sessions.length - 1] : null;
        })();

    const game = getGameById(gameId ?? '');

    const speedLabel =
        result?.speed && SPEEDS[result.speed as keyof typeof SPEEDS]
            ? SPEEDS[result.speed as keyof typeof SPEEDS].label
            : (result?.speed ?? '—');

    const hitRatePercent =
        result?.hit_rate != null ? Math.round(result.hit_rate * 100) : 0;

    const sessions = getCachedSessions();
    const prevSession =
        sessions.length > 1 ? sessions[sessions.length - 2] : null;

    // Settings to pass for "play again" — location.state.settings is passed from GamePage
    const playSettings = location.state?.settings ?? null;

    const handlePlayAgain = () => {
        if (playSettings) {
            navigate(`/games/${gameId}/play`, {
                state: { settings: playSettings },
            });
        } else {
            navigate(`/games/${gameId}/settings`);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter">
                <div className="p-6 space-y-6">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)] text-balance">
                        {game
                            ? `${t('stats.resultsFor')}${t(game.titleKey)}`
                            : t('stats.title')}
                    </h2>

                    {result ? (
                        <div className="space-y-6">
                            {/* Caught - big number with star */}
                            <div className="text-center">
                                <CountUp target={result.caught} />
                                <p className="text-[var(--text-secondary)] text-base mt-1 flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 text-[var(--warning)]" />
                                    {t('stats.collectedStars')}{' '}
                                    {Math.min(
                                        result.caught,
                                        GAME.TARGET_CATCHES,
                                    )}{' '}
                                    {t('stats.starsLabel')}
                                </p>
                            </div>

                            {/* Hit rate ring */}
                            <div className="text-center">
                                <ProgressRing percent={hitRatePercent} />
                                <p className="text-[var(--text-secondary)] text-base mt-2">
                                    {t('stats.hitRate')}
                                    {prevSession && (
                                        <DeltaIndicator
                                            current={hitRatePercent}
                                            previous={Math.round(
                                                prevSession.hit_rate * 100,
                                            )}
                                        />
                                    )}
                                </p>
                            </div>

                            {/* Duration */}
                            <div className="text-center">
                                <p className="font-[var(--font-display)] text-2xl text-[var(--text)] flex items-center justify-center gap-2 tabular-nums">
                                    <Hourglass className="w-5 h-5 text-[var(--text-secondary)]" />
                                    {formatDuration(result.duration_s)}
                                </p>
                                <p className="text-[var(--text-secondary)] text-base">
                                    {t('stats.sessionTime')}
                                </p>
                            </div>

                            {/* Settings footer */}
                            <div className="flex justify-center gap-4 text-sm text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]/50 bg-[var(--surface)]/50 tabular-nums">
                                <span>
                                    {t('stats.speed')}: {speedLabel}
                                </span>
                                <span>
                                    {t('stats.contrast')}:{' '}
                                    {result.contrast_left}% /{' '}
                                    {result.contrast_right}%
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 space-y-3">
                            <Star className="w-12 h-12 text-[var(--warning)] mx-auto" />
                            <p className="font-[var(--font-display)] text-xl text-[var(--text)]">
                                {t('stats.firstSession')}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        {result ? (
                            <>
                                <AppButton
                                    variant="cta"
                                    size="md"
                                    onClick={handlePlayAgain}
                                    className="w-full"
                                >
                                    {t('stats.playAgain')}
                                </AppButton>
                                <AppButton
                                    variant="outline"
                                    size="md"
                                    onClick={() =>
                                        navigate(`/games/${gameId}/settings`)
                                    }
                                    className="w-full"
                                >
                                    {t('stats.changeSettings')}
                                </AppButton>
                                <AppButton
                                    variant="outline"
                                    size="md"
                                    onClick={() => navigate('/games')}
                                    className="w-full"
                                >
                                    <Grid className="w-4 h-4" />
                                    {t('nav.otherGame')}
                                </AppButton>
                            </>
                        ) : (
                            <AppButton
                                variant="cta"
                                size="md"
                                onClick={() =>
                                    navigate(`/games/${gameId}/settings`)
                                }
                                className="w-full"
                            >
                                {t('stats.startGame')}
                            </AppButton>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
