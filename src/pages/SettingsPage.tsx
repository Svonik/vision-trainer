import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useGameSettings } from '../hooks/useGameSettings';
import { SPEEDS, CONTRAST } from '../modules/constants';
import { t } from '../modules/i18n';

const SPEED_KEYS = ['slow', 'normal', 'fast', 'pro'] as const;

export function SettingsPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { settings, updateSettings } = useGameSettings();

    const handleStart = () => {
        navigate(`/games/${gameId}/play`, { state: { settings } });
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-xl text-center text-white">
                        Настройки игры
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Contrast section */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium">{t('settings.contrastBalance')}</p>

                        {/* Hint box */}
                        <div className="rounded border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-300">
                            {t('settings.contrastHint')}
                        </div>

                        {/* Preview circles */}
                        <div className="flex justify-center gap-8">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-1"
                                    style={{ backgroundColor: `rgba(255, 0, 0, ${settings.contrastLeft / 100})` }}
                                />
                                <span className="text-xs text-gray-400">Л: {settings.contrastLeft}%</span>
                            </div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-1"
                                    style={{ backgroundColor: `rgba(0, 255, 255, ${settings.contrastRight / 100})` }}
                                />
                                <span className="text-xs text-gray-400">П: {settings.contrastRight}%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span style={{ color: '#ff6666' }}>{t('settings.leftEyeRed')}</span>
                                    <span className="text-gray-400">{settings.contrastLeft}%</span>
                                </div>
                                <Slider
                                    min={CONTRAST.MIN}
                                    max={CONTRAST.MAX}
                                    step={CONTRAST.STEP}
                                    value={[settings.contrastLeft]}
                                    onValueChange={([val]) => updateSettings({ contrastLeft: val })}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span style={{ color: '#00e5e5' }}>{t('settings.rightEyeCyan')}</span>
                                    <span className="text-gray-400">{settings.contrastRight}%</span>
                                </div>
                                <Slider
                                    min={CONTRAST.MIN}
                                    max={CONTRAST.MAX}
                                    step={CONTRAST.STEP}
                                    value={[settings.contrastRight]}
                                    onValueChange={([val]) => updateSettings({ contrastRight: val })}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Speed section */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium">{t('settings.speed')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {SPEED_KEYS.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => updateSettings({ speed: key })}
                                    className={`py-2 px-4 rounded border text-sm transition-colors ${
                                        settings.speed === key
                                            ? 'bg-white text-black border-white'
                                            : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    {SPEEDS[key].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Eye config section */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium">{t('settings.eyeSelect')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => updateSettings({ eyeConfig: 'platform_left' })}
                                className={`py-2 px-4 rounded border text-sm transition-colors ${
                                    settings.eyeConfig === 'platform_left'
                                        ? 'bg-white text-black border-white'
                                        : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                                }`}
                            >
                                {t('settings.eyeLeft')}
                            </button>
                            <button
                                onClick={() => updateSettings({ eyeConfig: 'platform_right' })}
                                className={`py-2 px-4 rounded border text-sm transition-colors ${
                                    settings.eyeConfig === 'platform_right'
                                        ? 'bg-white text-black border-white'
                                        : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                                }`}
                            >
                                {t('settings.eyeRight')}
                            </button>
                        </div>
                    </div>

                    {/* Start button */}
                    <Button
                        onClick={handleStart}
                        className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3"
                    >
                        {t('settings.startGame')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
