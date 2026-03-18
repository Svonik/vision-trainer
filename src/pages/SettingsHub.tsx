import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppButton } from '@/components/AppButton';
import { ContrastIndicator } from '@/components/ContrastIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { BrightnessAdjustStep } from '../components/calibration/BrightnessAdjustStep';
import { GlassesTypeStep } from '../components/calibration/GlassesTypeStep';
import { SuppressionTestStep } from '../components/calibration/SuppressionTestStep';
import { useCalibration } from '../hooks/useCalibration';
import { CALIBRATION, SPEEDS } from '../modules/constants';
import type { GlassesType } from '../modules/glassesColors';
import { t } from '../modules/i18n';
import { getDefaultSettings, saveDefaultSettings } from '../modules/storage';

type CalibrationMode = 'view' | 'glasses' | 'suppression' | 'adjust';

const SPEED_KEYS = ['slow', 'normal', 'fast', 'pro'] as const;

export function SettingsHub() {
    const {
        glassesType,
        setGlassesType,
        passed,
        save,
        setRedBrightness,
        setCyanBrightness,
    } = useCalibration();
    const [calibMode, setCalibMode] = useState<CalibrationMode>('view');
    const [adjustAttempts, setAdjustAttempts] = useState(0);
    const [recalibGlassesType, setRecalibGlassesType] = useState<
        'red-cyan' | 'cyan-red'
    >(glassesType as 'red-cyan' | 'cyan-red');

    const defaults = getDefaultSettings();
    const [defaultSpeed, setDefaultSpeed] = useState<string>(
        defaults.speed ?? 'slow',
    );
    const [defaultEyeConfig, setDefaultEyeConfig] = useState<string>(
        defaults.eyeConfig ?? 'platform_left',
    );

    const handleSaveDefaults = () => {
        saveDefaultSettings({
            ...defaults,
            speed: defaultSpeed,
            eyeConfig: defaultEyeConfig,
        });
        toast.success(t('settings.saved'));
    };

    const handleGlassesSelect = (type: 'red-cyan' | 'cyan-red') => {
        setRecalibGlassesType(type);
        setGlassesType(type);
        save({ suppression_passed: passed, glasses_type: type });
        setCalibMode('suppression');
    };

    const handleSuppressionPass = () => {
        save({ suppression_passed: true });
        setCalibMode('view');
    };

    const handleSuppressionFail = () => {
        setAdjustAttempts((prev) => prev + 1);
        setCalibMode('adjust');
    };

    const handleAdjustRetry = () => {
        setAdjustAttempts((prev) => prev + 1);
        setCalibMode('suppression');
    };

    const handleAdjustComplete = () => {
        save({ suppression_passed: true });
        setCalibMode('view');
    };

    // Inline calibration steps
    if (calibMode === 'glasses') {
        return (
            <div className="p-4 max-w-lg mx-auto">
                <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalibMode('view')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> {t('nav.back')}
                </AppButton>
                <GlassesTypeStep
                    glassesType={recalibGlassesType}
                    onSelect={handleGlassesSelect}
                />
            </div>
        );
    }

    if (calibMode === 'suppression') {
        return (
            <div className="p-4 max-w-lg mx-auto">
                <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalibMode('glasses')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> {t('nav.back')}
                </AppButton>
                <SuppressionTestStep
                    glassesType={recalibGlassesType}
                    onPass={handleSuppressionPass}
                    onFail={handleSuppressionFail}
                />
            </div>
        );
    }

    if (calibMode === 'adjust') {
        return (
            <div className="p-4 max-w-lg mx-auto">
                <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalibMode('suppression')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> {t('nav.back')}
                </AppButton>
                <BrightnessAdjustStep
                    glassesType={recalibGlassesType}
                    onRetry={handleAdjustRetry}
                    onComplete={handleAdjustComplete}
                    attempts={adjustAttempts}
                    maxAttempts={CALIBRATION.MAX_ATTEMPTS}
                />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 max-w-lg mx-auto">
            <h1 className="font-[var(--font-display)] text-2xl text-[var(--text)] pt-2 text-balance">
                {t('settings.title')}
            </h1>

            {/* Section 1: Calibration */}
            <Card
                className="rounded-3xl"
                role="region"
                aria-label={t('settings.calibrationSection')}
            >
                <CardContent className="p-6 space-y-4">
                    <h2 className="text-base font-semibold text-[var(--text)] uppercase tracking-wider text-balance">
                        {t('settings.calibrationSection')}
                    </h2>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {passed ? (
                                <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                            ) : (
                                <XCircle className="w-5 h-5 text-[var(--warning)]" />
                            )}
                            <span className="text-[var(--text)] text-base">
                                {passed
                                    ? t('settings.calibrationStatus')
                                    : t('settings.calibrationNotPassed')}
                            </span>
                        </div>
                        <AppButton
                            variant="cta"
                            size="sm"
                            onClick={() => setCalibMode('glasses')}
                        >
                            {t('settings.recalibrate')}
                        </AppButton>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Glasses type */}
            <Card
                className="rounded-3xl"
                role="region"
                aria-label={t('settings.glassesSection')}
            >
                <CardContent className="p-6 space-y-4">
                    <h2 className="text-base font-semibold text-[var(--text)] uppercase tracking-wider text-balance">
                        {t('settings.glassesSection')}
                    </h2>
                    <div className="flex gap-2">
                        <AppButton
                            variant="toggle"
                            size="md"
                            selected={glassesType === 'red-cyan'}
                            onClick={() => {
                                setGlassesType('red-cyan');
                                save({
                                    suppression_passed: passed,
                                    glasses_type: 'red-cyan',
                                });
                                toast.info(t('settings.glassesChanged'));
                            }}
                            aria-pressed={glassesType === 'red-cyan'}
                            className={`flex-1 ${
                                glassesType === 'red-cyan'
                                    ? 'bg-[var(--red-soft)]/20 !text-[var(--red-soft)] !border-[var(--red-soft)]'
                                    : ''
                            }`}
                        >
                            {t('calibration.glassesRed')}
                        </AppButton>
                        <AppButton
                            variant="toggle"
                            size="md"
                            selected={glassesType === 'cyan-red'}
                            onClick={() => {
                                setGlassesType('cyan-red');
                                save({
                                    suppression_passed: passed,
                                    glasses_type: 'cyan-red',
                                });
                                toast.info(t('settings.glassesChanged'));
                            }}
                            aria-pressed={glassesType === 'cyan-red'}
                            className={`flex-1 ${
                                glassesType === 'cyan-red'
                                    ? 'bg-[var(--cyan-soft)]/20 !text-[var(--cyan-soft)] !border-[var(--cyan-soft)]'
                                    : ''
                            }`}
                        >
                            {t('calibration.glassesCyan')}
                        </AppButton>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Default settings */}
            <Card
                className="rounded-3xl"
                role="region"
                aria-label={t('settings.defaultsSection')}
            >
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-base font-semibold text-[var(--text)] uppercase tracking-wider">
                        {t('settings.defaultsSection')}
                    </h2>

                    {/* Contrast indicator (read-only) */}
                    <ContrastIndicator
                        fellowEyeContrast={defaults.fellowEyeContrast ?? 30}
                        eyeConfig={defaultEyeConfig}
                        glassesType={(glassesType ?? 'red-cyan') as GlassesType}
                    />

                    {/* Speed buttons */}
                    <div className="space-y-2">
                        <p className="text-base text-[var(--text-secondary)]">
                            {t('settings.speed')}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {SPEED_KEYS.map((key) => (
                                <AppButton
                                    key={key}
                                    variant="toggle"
                                    size="md"
                                    selected={defaultSpeed === key}
                                    onClick={() => setDefaultSpeed(key)}
                                    aria-pressed={defaultSpeed === key}
                                >
                                    {SPEEDS[key].label}
                                </AppButton>
                            ))}
                        </div>
                    </div>

                    {/* Eye config toggle */}
                    <div className="space-y-2">
                        <p className="text-base text-[var(--text-secondary)]">
                            {t('settings.eyeSelect')}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <AppButton
                                variant="toggle"
                                size="md"
                                selected={defaultEyeConfig === 'platform_left'}
                                onClick={() =>
                                    setDefaultEyeConfig('platform_left')
                                }
                                aria-pressed={
                                    defaultEyeConfig === 'platform_left'
                                }
                            >
                                {t('settings.eyeLeft')}
                            </AppButton>
                            <AppButton
                                variant="toggle"
                                size="md"
                                selected={defaultEyeConfig === 'platform_right'}
                                onClick={() =>
                                    setDefaultEyeConfig('platform_right')
                                }
                                aria-pressed={
                                    defaultEyeConfig === 'platform_right'
                                }
                            >
                                {t('settings.eyeRight')}
                            </AppButton>
                        </div>
                    </div>

                    <AppButton
                        variant="cta"
                        size="md"
                        onClick={handleSaveDefaults}
                        className="w-full"
                    >
                        {t('settings.saveDefaults')}
                    </AppButton>
                </CardContent>
            </Card>
        </div>
    );
}
