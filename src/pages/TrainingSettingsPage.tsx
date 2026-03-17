import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Slider } from '@/components/ui/slider';
import { useGameSettings } from '../hooks/useGameSettings';
import { SPEEDS, CONTRAST } from '../modules/constants';
import { t } from '../modules/i18n';
import { getEyeColors } from '../modules/glassesColors';
import { getCalibration, getDefaultSettings, getSessions } from '../modules/storage';
import { generateSession, recommendContrast, GAME_TITLE_KEYS } from '../modules/sessionEngine';

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
    const sessionGames: string[] = location.state?.sessionGames ?? generateSession(sessions);
    const recommendation = recommendContrast(sessions);

    useEffect(() => {
        const calibration = getCalibration();
        const defaults = getDefaultSettings();
        updateSettings({
            glassesType: calibration.glasses_type ?? 'red-cyan',
            contrastLeft: recommendation.left ?? defaults.contrastLeft ?? CONTRAST.DEFAULT,
            contrastRight: recommendation.right ?? defaults.contrastRight ?? CONTRAST.DEFAULT,
            speed: defaults.speed ?? 'slow',
            eyeConfig: defaults.eyeConfig ?? 'platform_left',
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const eyeColors = getEyeColors(settings.glassesType ?? 'red-cyan');

    const handleStart = () => {
        navigate('/training/play', {
            state: { sessionGames, settings },
        });
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter">
                <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--cta)] to-[var(--cyan-soft)]" />

                <div className="p-6 space-y-7">
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)]">
                        {t('training.settings')}
                    </h2>

                    {/* Session game list */}
                    <div className="rounded-2xl bg-[var(--bg)]/50 border border-[var(--border)]/40 p-4 space-y-3">
                        <p className="text-sm text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                            {t('training.todaySession')}
                        </p>
                        <div className="space-y-2">
                            {sessionGames.map((gameId, i) => (
                                <GamePill key={gameId} gameId={gameId} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Contrast recommendation hint */}
                    {recommendation.suggestion !== 'keep' && (
                        <div className="rounded-xl bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)]">
                            {t('training.contrastRecommendation')}:{' '}
                            {recommendation.suggestion === 'decrease'
                                ? t('training.suggestDecrease')
                                : t('training.suggestIncrease')}
                        </div>
                    )}

                    {/* Contrast section */}
                    <div className="space-y-4">
                        <p className="text-base font-semibold text-[var(--text)]">{t('settings.contrastBalance')}</p>

                        <div className="flex justify-center gap-8">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-1"
                                    style={{
                                        backgroundColor: `rgba(${eyeColors.leftRgbCss}, ${settings.contrastLeft / 100})`,
                                        boxShadow: '0 0 12px rgba(255,107,138,0.4)',
                                    }}
                                />
                                <span className="text-sm text-[var(--text-secondary)]">{t('stats.contrastL')}: {settings.contrastLeft}%</span>
                            </div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full mx-auto mb-1"
                                    style={{
                                        backgroundColor: `rgba(${eyeColors.rightRgbCss}, ${settings.contrastRight / 100})`,
                                        boxShadow: '0 0 12px rgba(107,223,255,0.4)',
                                    }}
                                />
                                <span className="text-sm text-[var(--text-secondary)]">{t('stats.contrastR')}: {settings.contrastRight}%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex justify-between text-base">
                                    <span style={{ color: eyeColors.leftHex }}>{`${t('settings.leftEye')} (${eyeColors.leftLabel})`}</span>
                                    <span className="text-[var(--text-secondary)]">{settings.contrastLeft}%</span>
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
                                <div className="flex justify-between text-base">
                                    <span style={{ color: eyeColors.rightHex }}>{`${t('settings.rightEye')} (${eyeColors.rightLabel})`}</span>
                                    <span className="text-[var(--text-secondary)]">{settings.contrastRight}%</span>
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
                        <p className="text-base font-semibold text-[var(--text)]">{t('settings.speed')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {SPEED_KEYS.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => updateSettings({ speed: key })}
                                    className={`py-2 px-4 rounded-full border text-base transition-colors btn-press ${
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
                                className={`py-2 px-4 rounded-full border text-base transition-colors btn-press ${
                                    settings.eyeConfig === 'platform_left'
                                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]'
                                        : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50'
                                }`}
                            >
                                {t('settings.eyeLeft')}
                            </button>
                            <button
                                onClick={() => updateSettings({ eyeConfig: 'platform_right' })}
                                className={`py-2 px-4 rounded-full border text-base transition-colors btn-press ${
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
                        {t('training.startSession')}
                    </button>

                    <button
                        onClick={() => navigate('/mode-select')}
                        className="w-full border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 font-semibold btn-press hover:bg-[var(--surface)]"
                    >
                        ← {t('nav.back')}
                    </button>
                </div>
            </div>
        </div>
    );
}
