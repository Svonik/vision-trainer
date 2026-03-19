import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppButton } from '@/components/AppButton';
import { ContrastIndicator } from '@/components/ContrastIndicator';
import { MathGate } from '@/components/MathGate';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card, CardContent } from '@/components/ui/card';
import { BrightnessAdjustStep } from '../components/calibration/BrightnessAdjustStep';
import { GlassesTypeStep } from '../components/calibration/GlassesTypeStep';
import { SuppressionTestStep } from '../components/calibration/SuppressionTestStep';
import { WeakEyeStep } from '../components/calibration/WeakEyeStep';
import { useCalibration } from '../hooks/useCalibration';
import { CALIBRATION, SPEED_KEYS, SPEEDS } from '../modules/constants';
import type { GlassesType } from '../modules/glassesColors';
import { deriveEyeConfig } from '../modules/glassesColors';
import { t } from '../modules/i18n';
import {
    getCalibration,
    getDefaultSettings,
    saveDefaultSettings,
} from '../modules/storage';

type CalibrationMode =
    | 'view'
    | 'glasses'
    | 'weak_eye'
    | 'suppression'
    | 'adjust';

export function SettingsHub() {
    const { glassesType, setGlassesType, passed, save } = useCalibration();
    const calibrationData = getCalibration();
    const [calibMode, setCalibMode] = useState<CalibrationMode>('view');
    const [showGate, setShowGate] = useState(false);
    const [adjustAttempts, setAdjustAttempts] = useState(0);
    const [recalibGlassesType, setRecalibGlassesType] = useState<
        'red-cyan' | 'cyan-red'
    >(glassesType as 'red-cyan' | 'cyan-red');

    const defaults = getDefaultSettings();
    const [defaultSpeed, setDefaultSpeed] = useState<string>(
        defaults.speed ?? 'slow',
    );
    const handleGlassesSelect = (type: 'red-cyan' | 'cyan-red') => {
        setRecalibGlassesType(type);
        setGlassesType(type);
        save({ suppression_passed: false, glasses_type: type });
        setCalibMode('weak_eye');
    };

    const handleWeakEyeSelect = (weakEye: 'left' | 'right') => {
        save({ weak_eye: weakEye });
        setCalibMode('suppression');
    };

    const handleSuppressionComplete = (balancePoint: number) => {
        const passed = balancePoint <= 80;
        save({ suppression_passed: passed });
        const settings = getDefaultSettings();
        saveDefaultSettings({
            ...settings,
            fellowEyeContrast: balancePoint,
        });
        if (passed) {
            setCalibMode('view');
            toast.success(t('settings.calibrationStatus'));
        } else {
            setAdjustAttempts((prev) => prev + 1);
            setCalibMode('adjust');
        }
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

    if (calibMode === 'weak_eye') {
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
                <WeakEyeStep onSelect={handleWeakEyeSelect} />
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
                    onComplete={handleSuppressionComplete}
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
                            onClick={() => setShowGate(true)}
                        >
                            {t('settings.recalibrate')}
                        </AppButton>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Glasses & Weak Eye (read-only with recalibrate) */}
            <Card
                className="rounded-3xl"
                role="region"
                aria-label={t('settings.glassesSection')}
            >
                <CardContent className="p-6 space-y-4">
                    <h2 className="text-base font-semibold text-[var(--text)] uppercase tracking-wider text-balance">
                        {t('settings.glassesSection')}
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)] text-sm">
                                {t('calibration.glassesTitle')}
                            </span>
                            <span className="text-[var(--text)] text-sm font-medium">
                                {glassesType === 'red-cyan'
                                    ? t('calibration.redLeft')
                                    : t('calibration.redRight')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)] text-sm">
                                {t('weak_eye.title')}
                            </span>
                            <span className="text-[var(--text)] text-sm font-medium">
                                {calibrationData.weak_eye === 'left'
                                    ? t('weak_eye.left')
                                    : t('weak_eye.right')}
                            </span>
                        </div>
                        {calibrationData.last_calibrated && (
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-secondary)] text-sm">
                                    {t('settings.lastCalibrated')}
                                </span>
                                <span className="text-[var(--text-secondary)] text-sm">
                                    {new Date(
                                        calibrationData.last_calibrated,
                                    ).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                        )}
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
                        eyeConfig={deriveEyeConfig(
                            (glassesType ?? 'red-cyan') as GlassesType,
                            calibrationData.weak_eye ?? 'left',
                        )}
                        glassesType={(glassesType ?? 'red-cyan') as GlassesType}
                    />

                    {/* Speed — SegmentedControl */}
                    <div className="space-y-3">
                        <p className="text-base font-semibold text-[var(--text)]">
                            {t('settings.speed')}
                        </p>
                        <SegmentedControl
                            options={SPEED_KEYS.map((key) => ({
                                id: key,
                                label: SPEEDS[key].label,
                            }))}
                            selected={defaultSpeed}
                            onChange={(key) => {
                                setDefaultSpeed(key);
                                saveDefaultSettings({
                                    ...defaults,
                                    speed: key,
                                });
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            {showGate && (
                <MathGate
                    onPass={() => {
                        setShowGate(false);
                        setCalibMode('glasses');
                    }}
                    onCancel={() => setShowGate(false)}
                />
            )}
        </div>
    );
}
