import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Hourglass } from 'lucide-react';
import { t } from '../modules/i18n';
import { getSessions } from '../modules/storage';
import { recommendContrast, GAME_TITLE_KEYS } from '../modules/sessionEngine';

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

function formatDuration(seconds: number): string {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

function ProgressRing({ percent }: { percent: number }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const color = percent > 70
        ? 'var(--success)'
        : percent > 40
            ? 'var(--warning)'
            : 'var(--accent-secondary)';
    return (
        <svg width="100" height="100" className="mx-auto">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#374151" strokeWidth="8" />
            <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000"
            />
            <text x="50" y="50" textAnchor="middle" dy="6" fill="var(--text)" fontSize="18" fontWeight="bold">
                {percent}%
            </text>
        </svg>
    );
}

function CountUp({ target }: { target: number }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (count < target) {
            const timer = setTimeout(() => setCount(c => Math.min(c + 1, target)), 30);
            return () => clearTimeout(timer);
        }
    }, [count, target]);
    return <span className="font-[var(--font-display)] text-4xl font-semibold text-[var(--text)]">{count}</span>;
}

export function TrainingSummaryPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const results: GameResult[] = location.state?.results ?? [];

    const totalTimeSecs = results.reduce((sum, r) => sum + (r.duration_s ?? 0), 0);
    const avgHitRate = results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + (r.hit_rate ?? 0), 0) / results.length * 100)
        : 0;

    const sessions = getSessions();
    const recommendation = recommendContrast(sessions);

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
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
                        <p className="text-[var(--text-secondary)] text-sm">{t('training.totalTime')}</p>
                    </div>

                    {/* Per-game breakdown */}
                    {results.length > 0 && (
                        <div className="space-y-2">
                            {results.map((result, i) => {
                                const gameKey = result.game ?? '';
                                const hitPercent = Math.round((result.hit_rate ?? 0) * 100);
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
                                                {t(GAME_TITLE_KEYS[gameKey] ?? 'app.title')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] flex-shrink-0">
                                            <span>{hitPercent}%</span>
                                            <span>{formatDuration(result.duration_s ?? 0)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Contrast recommendation */}
                    <div className={`rounded-xl px-4 py-3 border-l-2 text-sm ${
                        recommendation.suggestion === 'decrease'
                            ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
                            : recommendation.suggestion === 'increase'
                            ? 'bg-[var(--warning)]/10 border-[var(--warning)] text-[var(--warning)]'
                            : 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    }`}>
                        <p className="font-medium text-sm uppercase tracking-wide mb-1 opacity-70">
                            {t('training.contrastSuggestion')}
                        </p>
                        <p>
                            {recommendation.suggestion === 'decrease'
                                ? t('training.suggestDecrease')
                                : recommendation.suggestion === 'increase'
                                ? t('training.suggestIncrease')
                                : t('training.suggestKeep')}
                        </p>
                        {recommendation.suggestion !== 'keep' && (
                            <p className="text-sm opacity-60 mt-1">
                                Л: {recommendation.left}% / П: {recommendation.right}%
                            </p>
                        )}
                    </div>

                    {/* Overall score: count of games with hit_rate > 0.5 */}
                    <div className="text-center border-t border-[var(--border)]/40 pt-4">
                        <CountUp target={avgHitRate} />
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            {t('training.averageHitRate')}
                        </p>
                    </div>

                    {/* Finish button */}
                    <button
                        onClick={() => navigate('/mode-select')}
                        className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-4 text-lg btn-press font-[var(--font-display)] font-semibold"
                    >
                        {t('training.finish')}
                    </button>
                </div>
            </div>
        </div>
    );
}
