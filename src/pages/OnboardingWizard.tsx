import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AgeGroupStep } from '../components/calibration/AgeGroupStep';
import { BrightnessAdjustStep } from '../components/calibration/BrightnessAdjustStep';
import { GlassesTypeStep } from '../components/calibration/GlassesTypeStep';
import { SuppressionTestStep } from '../components/calibration/SuppressionTestStep';
import { WeakEyeStep } from '../components/calibration/WeakEyeStep';
import { useCalibration } from '../hooks/useCalibration';
import { CALIBRATION } from '../modules/constants';
import { getDefaultSettings, saveDefaultSettings } from '../modules/storage';
import { DisclaimerPage } from './DisclaimerPage';

type WizardStep =
    | 'disclaimer'
    | 'glasses'
    | 'age_group'
    | 'weak_eye'
    | 'contrast'
    | 'adjust';

const STEP_ORDER: WizardStep[] = [
    'disclaimer',
    'glasses',
    'age_group',
    'weak_eye',
    'contrast',
    'adjust',
];

export function OnboardingWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState<WizardStep>('disclaimer');
    const [direction, setDirection] = useState(1);
    const reducedMotion = useReducedMotion();
    const [glassesType, setGlassesType] = useState<'red-cyan' | 'cyan-red'>(
        'red-cyan',
    );
    const [adjustAttempts, setAdjustAttempts] = useState(0);
    const {
        save,
        setGlassesType: saveGlassesType,
        setAgeGroup: saveAgeGroup,
    } = useCalibration();
    const stepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        stepRef.current?.focus();
    }, []);

    const handleDisclaimerComplete = () => {
        setDirection(1);
        setStep('glasses');
    };

    const handleGlassesSelect = (type: 'red-cyan' | 'cyan-red') => {
        setGlassesType(type);
        saveGlassesType(type);
        setDirection(1);
        setStep('age_group');
    };

    const handleAgeGroupSelect = (ageGroup: '4-7' | '8-12') => {
        saveAgeGroup(ageGroup);
        setDirection(1);
        setStep('weak_eye');
    };

    const handleWeakEyeSelect = (weakEye: 'left' | 'right') => {
        save({ weak_eye: weakEye });
        setDirection(1);
        setStep('contrast');
    };

    const handleContrastComplete = (balancePoint: number) => {
        const passed = balancePoint <= 80;
        save({ suppression_passed: passed });
        // Save contrast value as initial fellowEyeContrast for gameplay
        const defaults = getDefaultSettings();
        saveDefaultSettings({ ...defaults, fellowEyeContrast: balancePoint });
        if (passed) {
            navigate('/mode-select');
        } else {
            setAdjustAttempts((prev) => prev + 1);
            setDirection(1);
            setStep('adjust');
        }
    };

    const handleAdjustRetry = () => {
        setAdjustAttempts((prev) => prev + 1);
        setDirection(-1);
        setStep('contrast');
    };

    const handleAdjustComplete = () => {
        save({ suppression_passed: true });
        navigate('/mode-select');
    };

    const currentStepIndex = STEP_ORDER.indexOf(step);

    return (
        <div
            ref={stepRef}
            tabIndex={-1}
            className="outline-none min-h-screen relative"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    initial={
                        reducedMotion
                            ? false
                            : { opacity: 0, x: direction * 60 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                        reducedMotion
                            ? undefined
                            : { opacity: 0, x: direction * -60 }
                    }
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="min-h-screen"
                >
                    {step === 'disclaimer' && (
                        <DisclaimerPage onComplete={handleDisclaimerComplete} />
                    )}
                    {step === 'glasses' && (
                        <GlassesTypeStep
                            glassesType={glassesType}
                            onSelect={handleGlassesSelect}
                        />
                    )}
                    {step === 'age_group' && (
                        <AgeGroupStep onSelect={handleAgeGroupSelect} />
                    )}
                    {step === 'weak_eye' && (
                        <WeakEyeStep onSelect={handleWeakEyeSelect} />
                    )}
                    {step === 'contrast' && (
                        <SuppressionTestStep
                            glassesType={glassesType}
                            onComplete={handleContrastComplete}
                        />
                    )}
                    {step === 'adjust' && (
                        <BrightnessAdjustStep
                            glassesType={glassesType}
                            onRetry={handleAdjustRetry}
                            onComplete={handleAdjustComplete}
                            attempts={adjustAttempts}
                            maxAttempts={CALIBRATION.MAX_ATTEMPTS}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Dot step indicators */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-2 z-50">
                {STEP_ORDER.map((s, i) => (
                    <span
                        key={s}
                        data-dot={s}
                        aria-label={`Шаг ${i + 1} из ${STEP_ORDER.length}`}
                        className={`w-2 h-2 rounded-full transition-colors ${
                            i < currentStepIndex
                                ? 'bg-[var(--cta)] opacity-60'
                                : i === currentStepIndex
                                  ? 'bg-[var(--cta)] w-4'
                                  : 'bg-[var(--border)]'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
