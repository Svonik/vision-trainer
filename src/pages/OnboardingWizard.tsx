import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { DisclaimerPage } from './DisclaimerPage';
import { GlassesTypeStep } from '../components/calibration/GlassesTypeStep';
import { SuppressionTestStep } from '../components/calibration/SuppressionTestStep';
import { BrightnessAdjustStep } from '../components/calibration/BrightnessAdjustStep';
import { useCalibration } from '../hooks/useCalibration';
import { CALIBRATION } from '../modules/constants';

type WizardStep = 'disclaimer' | 'glasses' | 'suppression' | 'adjust';

const STEP_ORDER: WizardStep[] = ['disclaimer', 'glasses', 'suppression', 'adjust'];

export function OnboardingWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState<WizardStep>('disclaimer');
    const [glassesType, setGlassesType] = useState<'red-cyan' | 'cyan-red'>('red-cyan');
    const [adjustAttempts, setAdjustAttempts] = useState(0);
    const { save, setGlassesType: saveGlassesType } = useCalibration();
    const stepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Focus the step container when step changes (for screen readers)
        stepRef.current?.focus();
    }, [step]);

    const handleDisclaimerComplete = () => {
        setStep('glasses');
    };

    const handleGlassesSelect = (type: 'red-cyan' | 'cyan-red') => {
        setGlassesType(type);
        saveGlassesType(type);
        setStep('suppression');
    };

    const handleSuppressionPass = () => {
        save({ suppression_passed: true });
        navigate('/mode-select');
    };

    const handleSuppressionFail = () => {
        setAdjustAttempts(prev => prev + 1);
        setStep('adjust');
    };

    const handleAdjustRetry = () => {
        setAdjustAttempts(prev => prev + 1);
        setStep('suppression');
    };

    const handleAdjustComplete = () => {
        save({ suppression_passed: true });
        navigate('/mode-select');
    };

    const currentStepIndex = STEP_ORDER.indexOf(step);

    return (
        <div ref={stepRef} tabIndex={-1} className="outline-none min-h-screen relative"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
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
            {step === 'suppression' && (
                <SuppressionTestStep
                    glassesType={glassesType}
                    onPass={handleSuppressionPass}
                    onFail={handleSuppressionFail}
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

            {/* Dot step indicators */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-2 z-50">
                {STEP_ORDER.map((s, i) => (
                    <span
                        key={s}
                        data-dot={s}
                        aria-label={`Шаг ${i + 1} из ${STEP_ORDER.length}`}
                        className={`w-2 h-2 rounded-full transition-all ${
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
