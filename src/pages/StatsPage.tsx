import { useLocation, useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSessions } from '../modules/storage';
import { SPEEDS } from '../modules/constants';
import { t } from '../modules/i18n';

function formatDuration(seconds: number): string {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
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
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-700">
                                <span className="text-gray-400">{t('stats.caught')}</span>
                                <span className="text-white font-semibold">{result.caught}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-700">
                                <span className="text-gray-400">{t('stats.hitRate')}</span>
                                <span className="text-white font-semibold">{hitRatePercent}%</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-700">
                                <span className="text-gray-400">{t('stats.sessionTime')}</span>
                                <span className="text-white font-semibold">{formatDuration(result.duration_s)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-700">
                                <span className="text-gray-400">{t('stats.speed')}</span>
                                <span className="text-white font-semibold">{speedLabel}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-700">
                                <span className="text-gray-400">Контраст Л/П</span>
                                <span className="text-white font-semibold">
                                    {result.contrast_left}% / {result.contrast_right}%
                                </span>
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
