import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSessions } from '../modules/storage';
import { SPEEDS, GAME } from '../modules/constants';
import { t } from '../modules/i18n';

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
    return <span className="text-5xl font-bold text-white">{count}</span>;
}

function ProgressRing({ percent }: { percent: number }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const color = percent > 70 ? '#22c55e' : percent > 40 ? '#eab308' : '#ef4444';
    return (
        <svg width="100" height="100" className="mx-auto">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#374151" strokeWidth="8" />
            <circle cx="50" cy="50" r={radius} fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000" />
            <text x="50" y="50" textAnchor="middle" dy="6" fill="white" fontSize="18" fontWeight="bold">
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
        <span className={`text-xs ml-2 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
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

    const speedLabel = result?.speed && SPEEDS[result.speed as keyof typeof SPEEDS]
        ? SPEEDS[result.speed as keyof typeof SPEEDS].label
        : result?.speed ?? '—';

    const hitRatePercent = result?.hit_rate != null
        ? Math.round(result.hit_rate * 100)
        : 0;

    const sessions = getSessions();
    const prevSession = sessions.length > 1 ? sessions[sessions.length - 2] : null;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-xl text-center text-white">
                        {t('stats.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {result ? (
                        <div className="space-y-6">
                            {/* Caught - big number */}
                            <div className="text-center">
                                <CountUp target={result.caught} />
                                <p className="text-gray-400 text-sm mt-1">{t('stats.caught')} из {GAME.TARGET_CATCHES}</p>
                            </div>

                            {/* Hit rate ring */}
                            <div className="text-center">
                                <ProgressRing percent={hitRatePercent} />
                                <p className="text-gray-400 text-sm mt-2">
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
                                <p className="text-2xl font-mono text-white">{formatDuration(result.duration_s)}</p>
                                <p className="text-gray-400 text-sm">{t('stats.sessionTime')}</p>
                            </div>

                            {/* Settings footer */}
                            <div className="flex justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-800">
                                <span>{t('stats.speed')}: {speedLabel}</span>
                                <span>Контраст: {result.contrast_left}% / {result.contrast_right}%</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">Нет данных</p>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={() => navigate(`/games/${gameId}/settings`)}
                            className="w-full bg-white text-black hover:bg-gray-200 font-semibold"
                        >
                            {t('stats.playAgain')}
                        </Button>
                        <Button
                            onClick={() => navigate(`/games/${gameId}/settings`)}
                            variant="outline"
                            className="w-full border-gray-600 text-white hover:bg-gray-800"
                        >
                            {t('stats.changeSettings')}
                        </Button>
                        <Button
                            onClick={() => navigate('/games')}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-400 hover:bg-gray-800"
                        >
                            {t('stats.exit')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
