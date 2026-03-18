import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { ContrastIndicator } from '@/components/ContrastIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { useGameSettings } from '../hooks/useGameSettings';
import { CONTRAST, SPEEDS } from '../modules/constants';
import type { GlassesType } from '../modules/glassesColors';
import { t } from '../modules/i18n';
import { GAME_TITLE_KEYS, generateSession } from '../modules/sessionEngine';
import {
    getCalibration,
    getDefaultSettings,
    getSessions,
} from '../modules/storage';

const SPEED_KEYS = ['slow', 'normal', 'fast', 'pro'] as const;

function GamePill({ gameId, index }: { gameId: string; index: number }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-sm flex items-center justify-center font-bold flex-shrink-0">
                {index + 1}
            </span>
            <span className="text-sm text-[var(--text)]">
                {t(GAME_TITLE_KEYS[gameId] ?? 'app.title')}
            </span>
        </div>
    );
}

export function TrainingSettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { settings, updateSettings } = useGameSettings();

    const sessions = getSessions();
    // Accept session passed via navigation state (allows re-entry without regenerating)
    const sessionGames: string[] =
        location.state?.sessionGames ?? generateSession(sessions);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateSettings]);

    const defaults = getDefaultSettings();

    const handleStart = () => {
        navigate('/training/play', {
            state: { sessionGames, settings },
        });
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <Card className="w-full max-w-lg rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter gap-0">
                <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--cta)] to-[var(--cyan-soft)]" />

                <CardContent className="p-6 space-y-6">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)] text-balance">
                        {t('training.settings')}
                    </h2>

                    {/* Session game list */}
                    <div className="rounded-3xl bg-[var(--bg)]/50 border border-[var(--border)]/40 p-4 space-y-3">
                        <p className="text-sm text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                            {t('training.todaySession')}
                        </p>
                        <div className="space-y-2">
                            {sessionGames.map((gameId, i) => (
                                <GamePill
                                    key={gameId}
                                    gameId={gameId}
                                    index={i}
                                />
                            ))}
                        </div>
                    </div>

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
                        {t('training.startSession')}
                    </AppButton>

                    <AppButton
                        variant="outline"
                        size="md"
                        onClick={() => navigate('/mode-select')}
                        className="w-full"
                    >
                        <ArrowLeft className="w-4 h-4" /> {t('nav.back')}
                    </AppButton>
                </CardContent>
            </Card>
        </div>
    );
}
