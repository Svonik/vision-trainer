import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { type GlassesType, getEyeColors } from '../../modules/glassesColors';
import { t } from '../../modules/i18n';

interface Props {
    glassesType: GlassesType;
    onComplete: (balancePoint: number) => void;
    trials?: number;
}

const STEP = 5;
const MIN = 5;
const MAX = 100;

/** Seamless fat slider — discrete steps, no thumb */
function TestSlider({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    const percentage = ((value - MIN) / (MAX - MIN)) * 100;

    return (
        <div className="relative w-full h-14 bg-white/[0.04] rounded-full shadow-inner overflow-hidden">
            <div
                className="absolute top-0 left-0 h-full bg-[var(--cta)] rounded-full pointer-events-none"
                style={{
                    width: `${percentage}%`,
                    transition: 'width 75ms ease-out',
                }}
            >
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-[3px]">
                    <div className="w-[3px] h-5 bg-black/20 rounded-full" />
                    <div className="w-[3px] h-5 bg-black/20 rounded-full" />
                </div>
            </div>
            <input
                type="range"
                min={MIN}
                max={MAX}
                step={STEP}
                value={value}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onChange(Number(e.target.value))
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label={t('suppression.title')}
            />
        </div>
    );
}

export function SuppressionTestStep({
    glassesType,
    onComplete,
    trials = 2,
}: Props) {
    const [currentTrial, setCurrentTrial] = useState(0);
    const [contrast, setContrast] = useState(MIN);
    const [results, setResults] = useState<number[]>([]);
    const eyeColors = getEyeColors(glassesType);

    const isLastTrial = currentTrial >= trials - 1;
    const trialLabel = `${currentTrial + 1} / ${trials}`;

    const handleConfirm = useCallback(() => {
        const newResults = [...results, contrast];

        if (isLastTrial) {
            const balancePoint = Math.round(
                newResults.reduce((sum, v) => sum + v, 0) / newResults.length,
            );
            onComplete(balancePoint);
        } else {
            setResults(newResults);
            setContrast(MIN);
            setCurrentTrial((prev) => prev + 1);
        }
    }, [contrast, results, isLastTrial, onComplete]);

    const rightOpacity = contrast / 100;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-balance">
                    {t('suppression.title')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base max-w-sm leading-relaxed">
                    {t('suppression.slider_instruction')}
                </p>
            </div>

            {/* Trial indicator */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)]">
                    {t('suppression.trial')}
                </span>
                <span className="text-sm font-semibold text-[var(--text)] tabular-nums">
                    {trialLabel}
                </span>
            </div>

            {/* Live preview squares with glow */}
            <div className="flex gap-8 items-center justify-center py-4">
                <div
                    className="w-28 h-28 rounded-2xl"
                    style={{
                        backgroundColor: eyeColors.leftHex,
                        opacity: 1,
                        boxShadow: `0 0 24px rgba(${eyeColors.leftRgbCss}, 0.4)`,
                    }}
                />
                <div
                    className="w-28 h-28 rounded-2xl transition-opacity duration-200"
                    style={{
                        backgroundColor: eyeColors.rightHex,
                        opacity: rightOpacity,
                        boxShadow: `0 0 24px rgba(${eyeColors.rightRgbCss}, ${rightOpacity * 0.4})`,
                    }}
                />
            </div>

            {/* Fat slider with fixed steps */}
            <div className="w-full max-w-md">
                <TestSlider value={contrast} onChange={setContrast} />
            </div>

            <AppButton
                variant="cta"
                size="lg"
                onClick={handleConfirm}
                className="w-full max-w-md"
            >
                {isLastTrial
                    ? t('suppression.confirm_final')
                    : t('suppression.confirm_next')}
            </AppButton>
        </div>
    );
}
