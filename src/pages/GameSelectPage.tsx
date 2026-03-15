import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/modules/i18n';

export function GameSelectPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 gap-6">
            <h1 className="text-2xl font-bold text-white">
                {t('gameSelect.title')}
            </h1>

            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.catcher.title')}
                    </CardTitle>
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

            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.breakout.title')}
                    </CardTitle>
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

            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.tetris.title')}
                    </CardTitle>
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

            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.invaders.title')}
                    </CardTitle>
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

            <Card className="max-w-md w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('gameSelect.pong.title')}
                    </CardTitle>
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

            <Button
                onClick={() => navigate('/calibration')}
                variant="outline"
                className="border-gray-600 text-gray-200 hover:bg-gray-800"
            >
                {t('calibration.recalibrate')}
            </Button>
        </div>
    );
}
