import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/modules/i18n';
import { getSessions } from '../modules/storage';

export function GameSelectPage() {
    const navigate = useNavigate();
    const sessions = getSessions();
    const getGameCount = (gameId: string) => sessions.filter((s: any) => s.game === gameId).length;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 gap-6">
            <h1 className="text-2xl font-bold text-white">
                {t('gameSelect.title')}
            </h1>

            {/* Binocular Catcher */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-end justify-center pb-2">
                    <div className="absolute w-3 h-3 rounded-full bg-cyan-400/60 top-2 left-1/4 animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="absolute w-3 h-3 rounded-full bg-cyan-400/40 top-4 right-1/3 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <div className="w-12 h-1.5 bg-red-500/70 rounded" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.catcher.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.beginner')}</span>
                        {getGameCount('binocular-catcher') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('binocular-catcher')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.catcher.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/catcher/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Breakout */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-end justify-center pb-2">
                    <div className="absolute w-4 h-2 bg-blue-400/60 top-2 left-1/4 rounded" />
                    <div className="absolute w-4 h-2 bg-blue-400/40 top-2 left-2/4 rounded" />
                    <div className="absolute w-4 h-2 bg-purple-400/60 top-5 left-1/3 rounded" />
                    <div className="w-3 h-3 rounded-full bg-white/60 top-8 absolute" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.breakout.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.beginner')}</span>
                        {getGameCount('breakout') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('breakout')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.breakout.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/breakout/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Tetris */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-center justify-center gap-1">
                    <div className="w-4 h-4 bg-cyan-400/60 rounded-sm" />
                    <div className="w-4 h-4 bg-yellow-400/60 rounded-sm" />
                    <div className="w-4 h-4 bg-purple-400/60 rounded-sm" />
                    <div className="w-4 h-8 bg-red-400/60 rounded-sm" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.tetris.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.medium')}</span>
                        {getGameCount('tetris') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('tetris')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.tetris.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/tetris/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Invaders */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-center justify-center gap-3">
                    <div className="w-5 h-5 bg-green-400/60 rounded-sm" />
                    <div className="w-5 h-5 bg-green-400/40 rounded-sm" />
                    <div className="w-5 h-5 bg-green-400/60 rounded-sm" />
                    <div className="absolute bottom-2 w-6 h-3 bg-white/60 rounded" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.invaders.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.medium')}</span>
                        {getGameCount('invaders') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('invaders')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.invaders.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/invaders/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Pong */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-center justify-center">
                    <div className="absolute left-3 w-1.5 h-10 bg-white/60 rounded" />
                    <div className="absolute right-3 w-1.5 h-10 bg-white/60 rounded" />
                    <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0.1s' }} />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.pong.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.beginner')}</span>
                        {getGameCount('pong') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('pong')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.pong.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/pong/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Snake */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-center justify-center">
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-green-400/80 rounded-sm" />
                        <div className="w-3 h-3 bg-green-400/60 rounded-sm" />
                        <div className="w-3 h-3 bg-green-400/40 rounded-sm" />
                        <div className="w-3 h-3 bg-green-400/20 rounded-sm" />
                    </div>
                    <div className="absolute w-2 h-2 rounded-full bg-red-400/80 top-3 right-8" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.snake.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.beginner')}</span>
                        {getGameCount('snake') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('snake')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.snake.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/snake/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Flappy */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-center justify-center">
                    <div className="absolute left-8 w-4 h-6 bg-green-600/60 rounded" style={{ top: 0 }} />
                    <div className="absolute left-8 w-4 h-6 bg-green-600/60 rounded" style={{ bottom: 0 }} />
                    <div className="w-4 h-4 rounded-full bg-yellow-400/70 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.flappy.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.medium')}</span>
                        {getGameCount('flappy') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('flappy')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.flappy.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/flappy/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>

            {/* Asteroid */}
            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <div className="relative h-16 bg-gray-800 rounded-t overflow-hidden flex items-center justify-center">
                    <div className="absolute w-6 h-6 bg-gray-500/60 rounded-full top-2 left-1/4" />
                    <div className="absolute w-4 h-4 bg-gray-500/40 rounded-full top-4 right-1/4" />
                    <div className="w-3 h-5 bg-white/70 rounded-t-full" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.asteroid.title')}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded">{t('gameSelect.difficulty.medium')}</span>
                        {getGameCount('asteroid') > 0 && (
                            <span className="text-xs text-gray-500">Сыграно: {getGameCount('asteroid')} раз</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        {t('gameSelect.asteroid.description')}
                    </p>
                    <Button
                        onClick={() => navigate('/games/asteroid/settings')}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                        {t('gameSelect.play')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
