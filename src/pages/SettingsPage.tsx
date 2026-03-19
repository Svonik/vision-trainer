import { Grid } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { ContrastIndicator } from '@/components/ContrastIndicator';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card, CardContent } from '@/components/ui/card';
import { getGameById } from '../config/games';
import { useGameSettings } from '../hooks/useGameSettings';
import { SPEED_KEYS, SPEEDS } from '../modules/constants';
import type { GlassesType } from '../modules/glassesColors';
import { deriveEyeConfig } from '../modules/glassesColors';
import { t } from '../modules/i18n';
import { getCalibration, getDefaultSettings } from '../modules/storage';

const SPEED_OPTIONS = SPEED_KEYS.map((key) => ({
    id: key,
    label: SPEEDS[key].label,
}));

export function SettingsPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { settings, updateSettings } = useGameSettings();

    useEffect(() => {
        const calibration = getCalibration();
        const defaults = getDefaultSettings();
        const eyeConfig = deriveEyeConfig(
            calibration.glasses_type ?? 'red-cyan',
            calibration.weak_eye ?? 'left',
        );
        updateSettings({
            glassesType: calibration.glasses_type ?? 'red-cyan',
            speed: defaults.speed ?? 'slow',
            eyeConfig,
            fellowEyeContrast: defaults.fellowEyeContrast ?? 30,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateSettings]);

    const game = getGameById(gameId ?? '');
    const defaults = getDefaultSettings();

    const handleStart = () => {
        navigate(`/games/${gameId}/play`, { state: { settings } });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
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
                        <SegmentedControl
                            options={SPEED_OPTIONS}
                            selected={settings.speed ?? 'slow'}
                            onChange={(key) => updateSettings({ speed: key })}
                        />
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
