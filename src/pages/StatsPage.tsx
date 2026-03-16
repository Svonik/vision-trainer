import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Star, Hourglass, Grid } from 'lucide-react';
import { getSessions } from '../modules/storage';
import { SPEEDS, GAME } from '../modules/constants';
import { t } from '../modules/i18n';
import { getGameById } from '../config/games';

function formatDuration(seconds: number): string {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

function CountUp({ target }: { target: number }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (count < target) {
            const timer = setTimeout(() => setCount(c => Math.min(c + 1, target)), 50);
            return () => clearTimeout(timer);
        }
    }, [count, target]);
    return <span className="font-[var(--font-display)] text-5xl font-semibold text-[var(--text)]">{count}</span>;
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
            <circle cx="50" cy="50" r={radius} fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000" />
            <text x="50" y="50" textAnchor="middle" dy="6" fill="var(--text)" fontSize="18" fontWeight="bold">
                {percent}%
            </text>
        </svg>
    );
}

function DeltaIndicator({ current, previous }: { current: number; previous: number }) {
    const delta = current - previous;
    if (delta === 0) return null;
    const isUp = delta > 0;
    return (
        <span className={`text-xs ml-2 ${isUp ? 'text-[var(--success)]' : 'text-[var(--accent-secondary)]'}`}>
            {isUp ? '↑' : '↓'}{Math.abs(delta)}%
        </span>
    );
}

export function StatsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();

    const result = location.state?.result ?? (() => {
        const sessions = getSessions();
        return sessions.length > 0 ? sessions[sessions.length - 1] : null;
    })();

    const game = getGameById(gameId ?? '');

    const speedLabel = result?.speed && SPEEDS[result.speed as keyof typeof SPEEDS]
        ? SPEEDS[result.speed as keyof typeof SPEEDS].label
        : result?.speed ?? '—';

    const hitRatePercent = result?.hit_rate != null
        ? Math.round(result.hit_rate * 100)
        : 0;

    const sessions = getSessions();
    const prevSession = sessions.length > 1 ? sessions[sessions.length - 2] : null;

    // Settings to pass for "play again"
    const playSettings = result?.settings ?? location.state?.settings ?? null;

    const handlePlayAgain = () => {
        if (playSettings) {
            navigate(`/games/${gameId}/play`, { state: { settings: playSettings } });
        } else {
            navigate(`/games/${gameId}/settings`);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter">
                <div className="p-6 space-y-6">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)]">
                        {game ? `Результаты: ${t(game.titleKey)}` : t('stats.title')}
                    </h2>

                    {result ? (
                        <div className="space-y-6">
                            {/* Caught - big number with star */}
                            <div className="text-center">
                                <CountUp target={result.caught} />
                                <p className="text-[var(--text-secondary)] text-sm mt-1 flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 text-[var(--warning)]" />
                                    Ты собрал {result.caught} звёзд! из {GAME.TARGET_CATCHES}
                                </p>
                            </div>

                            {/* Hit rate ring */}
                            <div className="text-center">
                                <ProgressRing percent={hitRatePercent} />
                                <p className="text-[var(--text-secondary)] text-sm mt-2">
                                    {t('stats.hitRate')}
                                    {prevSession && (
                                        <DeltaIndicator
                                            current={hitRatePercent}
                                            previous={Math.round(prevSession.hit_rate * 100)}
                                        />
                                    )}
                                </p>
                            </div>

                            {/* Duration */}
                            <div className="text-center">
                                <p className="font-[var(--font-display)] text-2xl text-[var(--text)] flex items-center justify-center gap-2">
                                    <Hourglass className="w-5 h-5 text-[var(--text-secondary)]" />
                                    {formatDuration(result.duration_s)}
                                </p>
                                <p className="text-[var(--text-secondary)] text-sm">{t('stats.sessionTime')}</p>
                            </div>

                            {/* Settings footer */}
                            <div className="flex justify-center gap-4 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]/50 bg-[var(--surface)]/50">
                                <span>{t('stats.speed')}: {speedLabel}</span>
                                <span>Контраст: {result.contrast_left}% / {result.contrast_right}%</span>
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
                                <button
                                    onClick={handlePlayAgain}
                                    className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 font-semibold btn-press"
                                >
                                    {t('stats.playAgain')}
                                </button>
                                <button
                                    onClick={() => navigate(`/games/${gameId}/settings`)}
                                    className="w-full border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 font-semibold btn-press hover:bg-[var(--surface)]"
                                >
                                    {t('stats.changeSettings')}
                                </button>
                                <button
                                    onClick={() => navigate('/games')}
                                    className="w-full border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 btn-press hover:bg-[var(--surface)] flex items-center justify-center gap-2"
                                >
                                    <Grid className="w-4 h-4" />
                                    {t('nav.otherGame')}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate(`/games/${gameId}/settings`)}
                                className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 font-semibold btn-press"
                            >
                                {t('stats.startGame')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
