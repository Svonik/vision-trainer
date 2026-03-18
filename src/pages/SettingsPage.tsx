import { Grid } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { ContrastIndicator } from '@/components/ContrastIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { getGameById } from '../config/games';
import { useGameSettings } from '../hooks/useGameSettings';
import { CONTRAST, SPEEDS } from '../modules/constants';
import type { GlassesType } from '../modules/glassesColors';
import { t } from '../modules/i18n';
import { getCalibration, getDefaultSettings } from '../modules/storage';

const SPEED_KEYS = ['slow', 'normal', 'fast', 'pro'] as const;

export function SettingsPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { settings, updateSettings } = useGameSettings();

    useEffect(() => {
        const calibration = getCalibration();
        const defaults = getDefaultSettings();
        updateSettings({
            glassesType: calibration.glasses_type ?? 'red-cyan',
            contrastLeft: defaults.contrastLeft ?? CONTRAST.DEFAULT,
            contrastRight: defaults.contrastRight ?? CONTRAST.DEFAULT,
            speed: defaults.speed ?? 'slow',
            eyeConfig: defaults.eyeConfig ?? 'platform_left',
            fellowEyeContrast: defaults.fellowEyeContrast ?? 30,
        });
    }, [updateSettings]);

    const game = getGameById(gameId ?? '');
    const defaults = getDefaultSettings();

    const handleStart = () => {
        navigate(`/games/${gameId}/play`, { state: { settings } });
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <Card className="w-full max-w-lg rounded-3xl overflow-hidden spring-enter gap-0">
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)] text-balance">
                        {game
                            ? `${t('settingsPage.title')}${t(game.titleKey)}`
                            : t('settingsPage.titleDefault')}
                    </h2>

                    {/* Contrast indicator (read-only) */}
                    <ContrastIndicator
                        fellowEyeContrast={defaults.fellowEyeContrast ?? 30}
                        eyeConfig={settings.eyeConfig}
                        glassesType={
                            (settings.glassesType ?? 'red-cyan') as GlassesType
                        }
                    />

                    {/* Speed section */}
                    <div className="space-y-3">
                        <p className="text-base font-semibold text-[var(--text)]">
                            {t('settings.speed')}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {SPEED_KEYS.map((key) => (
                                <AppButton
                                    key={key}
                                    variant="toggle"
                                    size="md"
                                    selected={settings.speed === key}
                                    onClick={() =>
                                        updateSettings({ speed: key })
                                    }
                                    aria-pressed={settings.speed === key}
                                >
                                    {SPEEDS[key].label}
                                </AppButton>
                            ))}
                        </div>
                    </div>

                    {/* Eye config section */}
                    <div className="space-y-3">
                        <p className="text-base font-semibold text-[var(--text)]">
                            {t('settings.eyeSelect')}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <AppButton
                                variant="toggle"
                                size="md"
                                selected={
                                    settings.eyeConfig === 'platform_left'
                                }
                                onClick={() =>
                                    updateSettings({
                                        eyeConfig: 'platform_left',
                                    })
                                }
                                aria-pressed={
                                    settings.eyeConfig === 'platform_left'
                                }
                            >
                                {t('settings.eyeLeft')}
                            </AppButton>
                            <AppButton
                                variant="toggle"
                                size="md"
                                selected={
                                    settings.eyeConfig === 'platform_right'
                                }
                                onClick={() =>
                                    updateSettings({
                                        eyeConfig: 'platform_right',
                                    })
                                }
                                aria-pressed={
                                    settings.eyeConfig === 'platform_right'
                                }
                            >
                                {t('settings.eyeRight')}
                            </AppButton>
                        </div>
                    </div>

                    {/* Start button */}
                    <AppButton
                        variant="cta"
                        size="lg"
                        onClick={handleStart}
                        className="w-full font-[var(--font-display)]"
                    >
                        {t('settings.startGame')}
                    </AppButton>

                    {/* Change game button */}
                    <AppButton
                        variant="outline"
                        size="md"
                        onClick={() => navigate('/games')}
                        className="w-full"
                    >
                        <Grid className="w-4 h-4" />
                        {t('nav.otherGame')}
                    </AppButton>
                </CardContent>
            </Card>
        </div>
    );
}
