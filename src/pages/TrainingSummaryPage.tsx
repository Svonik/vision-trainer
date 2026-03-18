import { Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { ProgressRing } from '@/components/ProgressRing';
import { formatDuration } from '@/lib/formatTime';
import { t } from '../modules/i18n';
import { GAME_TITLE_KEYS } from '../modules/sessionEngine';

interface GameResult {
    game: string;
    hit_rate: number;
    duration_s: number;
    caught?: number;
    contrast_left?: number;
    contrast_right?: number;
    speed?: string;
    [key: string]: unknown;
}

function CountUp({ target }: { target: number }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (count < target) {
            const timer = setTimeout(
                () => setCount((c) => Math.min(c + 1, target)),
                30,
            );
            return () => clearTimeout(timer);
        }
    }, [count, target]);
    return (
        <span className="font-[var(--font-display)] text-4xl font-semibold text-[var(--text)]">
            {count}
        </span>
    );
}

export function TrainingSummaryPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const results: GameResult[] = location.state?.results ?? [];

    const totalTimeSecs = results.reduce(
        (sum, r) => sum + (r.duration_s ?? 0),
        0,
    );
    const avgHitRate =
        results.length > 0
            ? Math.round(
                  (results.reduce((sum, r) => sum + (r.hit_rate ?? 0), 0) /
                      results.length) *
                      100,
              )
            : 0;

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter">
                <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--cta)] to-[var(--cyan-soft)]" />

                <div className="p-6 space-y-6">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)]">
                        {t('training.summary')}
                    </h2>

                    {/* Average hit rate ring */}
                    <div className="text-center">
                        <ProgressRing percent={avgHitRate} />
                        <p className="text-[var(--text-secondary)] text-sm mt-2">
                            {t('training.averageHitRate')}
                        </p>
                    </div>

                    {/* Total time */}
                    <div className="text-center">
                        <p className="font-[var(--font-display)] text-2xl text-[var(--text)] flex items-center justify-center gap-2">
                            <Hourglass className="w-5 h-5 text-[var(--text-secondary)]" />
                            {formatDuration(totalTimeSecs)}
                        </p>
                        <p className="text-[var(--text-secondary)] text-sm">
                            {t('training.totalTime')}
                        </p>
                    </div>

                    {/* Per-game breakdown */}
                    {results.length > 0 && (
                        <div className="space-y-2">
                            {results.map((result, i) => {
                                const gameKey = result.game ?? '';
                                const hitPercent = Math.round(
                                    (result.hit_rate ?? 0) * 100,
                                );
                                return (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]/40 px-4 py-3"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-sm flex items-center justify-center font-bold flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm text-[var(--text)] truncate">
                                                {t(
                                                    GAME_TITLE_KEYS[gameKey] ??
                                                        'app.title',
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] flex-shrink-0">
                                            <span>{hitPercent}%</span>
                                            <span>
                                                {formatDuration(
                                                    result.duration_s ?? 0,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Overall score: count of games with hit_rate > 0.5 */}
                    <div className="text-center border-t border-[var(--border)]/40 pt-4">
                        <CountUp target={avgHitRate} />
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            {t('training.averageHitRate')}
                        </p>
                    </div>

                    {/* Finish button */}
                    <AppButton
                        variant="cta"
                        size="lg"
                        onClick={() => navigate('/mode-select')}
                        className="w-full font-[var(--font-display)]"
                    >
                        {t('training.finish')}
                    </AppButton>
                </div>
            </div>
        </div>
    );
}
