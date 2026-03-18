import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { type GlassesType, getEyeColors } from '../../modules/glassesColors';
import { t } from '../../modules/i18n';

interface Props {
    glassesType: GlassesType;
    onComplete: (balancePoint: number) => void;
}

/** Seamless fat slider — no thumb, monolithic fill, native input for a11y */
function SeamlessSlider({
    value,
    onChange,
    min = 5,
    max = 100,
}: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
}) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="relative w-full h-14 bg-white/[0.04] rounded-full shadow-inner overflow-hidden">
            {/* Filled portion */}
            <div
                className="absolute top-0 left-0 h-full bg-[var(--cta)] rounded-full pointer-events-none"
                style={{
                    width: `${percentage}%`,
                    transition: 'width 75ms ease-out',
                }}
            >
                {/* Grip indicator on the edge */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-[3px]">
                    <div className="w-[3px] h-5 bg-black/20 rounded-full" />
                    <div className="w-[3px] h-5 bg-black/20 rounded-full" />
                </div>
            </div>

            {/* Invisible native input for a11y, keyboard, and mobile swipe */}
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onChange(Number(e.target.value))
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label={t('contrast_slider.title')}
            />
        </div>
    );
}

export function ContrastSliderStep({ glassesType, onComplete }: Props) {
    const [contrast, setContrast] = useState(5);
    const eyeColors = getEyeColors(glassesType);

    // Left square = weak eye (always 100%), right square = strong eye (slider controls)
    // In our model: left eye color is always at full opacity,
    // right eye color opacity controlled by slider
    const leftOpacity = 1;
    const rightOpacity = contrast / 100;

    const handleDone = () => {
        onComplete(contrast);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-balance">
                    {t('contrast_slider.title')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base max-w-sm leading-relaxed">
                    {t('contrast_slider.subtitle')}
                </p>
            </div>

            {/* Live preview squares with glow */}
            <div className="flex gap-8 items-center justify-center py-4">
                <div
                    className="w-28 h-28 rounded-2xl transition-opacity duration-200"
                    style={{
                        backgroundColor: eyeColors.leftHex,
                        opacity: leftOpacity,
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

            {/* Fat slider — no percentage label */}
            <div className="w-full max-w-md">
                <SeamlessSlider
                    value={contrast}
                    onChange={setContrast}
                    min={5}
                    max={100}
                />
            </div>

            <AppButton
                variant="cta"
                size="lg"
                onClick={handleDone}
                className="w-full max-w-md"
            >
                {t('contrast_slider.done')}
            </AppButton>
        </div>
    );
}
