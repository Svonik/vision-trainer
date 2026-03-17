import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Grid } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useGameSettings } from '../hooks/useGameSettings';
import { SPEEDS, CONTRAST } from '../modules/constants';
import { t } from '../modules/i18n';
import { getEyeColors } from '../modules/glassesColors';
import { getCalibration, getDefaultSettings } from '../modules/storage';
import { getGameById } from '../config/games';

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
        });
    }, []);

    const game = getGameById(gameId ?? '');
    const eyeColors = getEyeColors(settings.glassesType ?? 'red-cyan');

    const handleStart = () => {
        navigate(`/games/${gameId}/play`, { state: { settings } });
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter">
                {/* Game illustration bar */}
                <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--cta)] to-[var(--cyan-soft)]" />

                <div className="p-6 space-y-8">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)]">
                        {game ? `${t('settingsPage.title')}${t(game.titleKey)}` : t('settingsPage.titleDefault')}
                    </h2>

                    {/* Contrast section */}
                    <div className="space-y-4">
                        <p className="text-base font-semibold text-[var(--text)]">{t('settings.contrastBalance')}</p>

                        {/* Hint box */}
                        <div className="rounded-xl bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] px-3 py-2 text-base text-[var(--accent)]">
                            {t('settings.contrastHint')}
                        </div>

                        {/* Preview circles */}
                        <div className="flex justify-center gap-8">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-1"
                                    style={{
                                        backgroundColor: `rgba(${eyeColors.leftRgbCss}, ${settings.contrastLeft / 100})`,
                                        boxShadow: '0 0 12px rgba(255,107,138,0.4)',
                                    }}
                                />
                                <span className="text-sm text-[var(--text-secondary)]">{t('settingsPage.eyeLeft')}{settings.contrastLeft}%</span>
                            </div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-1"
                                    style={{
                                        backgroundColor: `rgba(${eyeColors.rightRgbCss}, ${settings.contrastRight / 100})`,
                                        boxShadow: '0 0 12px rgba(107,223,255,0.4)',
                                    }}
                                />
                                <span className="text-sm text-[var(--text-secondary)]">{t('settingsPage.eyeRight')}{settings.contrastRight}%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex justify-between text-base">
                                    <span style={{ color: eyeColors.leftHex }}>{`${t('settings.leftEyeLabel')} (${eyeColors.leftLabel})`}</span>
                                    <span className="text-[var(--text-secondary)]">{settings.contrastLeft}%</span>
                                </div>
                                <Slider
                                    min={CONTRAST.MIN}
                                    max={CONTRAST.MAX}
                                    step={CONTRAST.STEP}
                                    value={[settings.contrastLeft]}
                                    onValueChange={([val]) => updateSettings({ contrastLeft: val })}
                                    className="w-full"
                                    aria-label="Контраст левого глаза"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-base">
                                    <span style={{ color: eyeColors.rightHex }}>{`${t('settings.rightEyeLabel')} (${eyeColors.rightLabel})`}</span>
                                    <span className="text-[var(--text-secondary)]">{settings.contrastRight}%</span>
                                </div>
                                <Slider
                                    min={CONTRAST.MIN}
                                    max={CONTRAST.MAX}
                                    step={CONTRAST.STEP}
                                    value={[settings.contrastRight]}
                                    onValueChange={([val]) => updateSettings({ contrastRight: val })}
                                    className="w-full"
                                    aria-label="Контраст правого глаза"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Speed section */}
                    <div className="space-y-3">
                        <p className="text-base font-semibold text-[var(--text)]">{t('settings.speed')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {SPEED_KEYS.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => updateSettings({ speed: key })}
                                    aria-pressed={settings.speed === key}
                                    className={`min-h-[48px] py-2 px-4 rounded-full border text-base transition-colors btn-press ${
                                        settings.speed === key
                                            ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]'
                                            : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50'
                                    }`}
                                >
                                    {SPEEDS[key].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Eye config section */}
                    <div className="space-y-3">
                        <p className="text-base font-semibold text-[var(--text)]">{t('settings.eyeSelect')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => updateSettings({ eyeConfig: 'platform_left' })}
                                aria-pressed={settings.eyeConfig === 'platform_left'}
                                className={`min-h-[48px] py-2 px-4 rounded-full border text-base transition-colors btn-press ${
                                    settings.eyeConfig === 'platform_left'
                                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]'
                                        : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50'
                                }`}
                            >
                                {t('settings.eyeLeft')}
                            </button>
                            <button
                                onClick={() => updateSettings({ eyeConfig: 'platform_right' })}
                                aria-pressed={settings.eyeConfig === 'platform_right'}
                                className={`min-h-[48px] py-2 px-4 rounded-full border text-base transition-colors btn-press ${
                                    settings.eyeConfig === 'platform_right'
                                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]'
                                        : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50'
                                }`}
                            >
                                {t('settings.eyeRight')}
                            </button>
                        </div>
                    </div>

                    {/* Start button */}
                    <button
                        onClick={handleStart}
                        className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-4 text-lg btn-press font-[var(--font-display)] font-semibold"
                    >
                        {t('settings.startGame')}
                    </button>

                    {/* Change game button */}
                    <button
                        onClick={() => navigate('/games')}
                        className="w-full min-h-[48px] border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 font-semibold btn-press hover:bg-[var(--surface)] flex items-center justify-center gap-2"
                    >
                        <Grid className="w-4 h-4" />
                        {t('nav.otherGame')}
                    </button>
                </div>
            </div>
        </div>
    );
}
