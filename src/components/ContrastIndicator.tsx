import { Info } from 'lucide-react';
import type { GlassesType } from '../modules/glassesColors';
import { getEyeColors } from '../modules/glassesColors';
import { t } from '../modules/i18n';

interface ContrastIndicatorProps {
    readonly fellowEyeContrast: number;
    readonly eyeConfig: string;
    readonly glassesType: GlassesType;
}

export function ContrastIndicator({
    fellowEyeContrast,
    eyeConfig,
    glassesType,
}: ContrastIndicatorProps) {
    const eyeColors = getEyeColors(glassesType);
    const isLeftFellow = eyeConfig === 'platform_left';

    const fellowLabel = isLeftFellow
        ? t('settingsPage.eyeLeft')
        : t('settingsPage.eyeRight');
    const weakLabel = isLeftFellow
        ? t('settingsPage.eyeRight')
        : t('settingsPage.eyeLeft');
    const fellowColor = isLeftFellow ? eyeColors.leftHex : eyeColors.rightHex;
    const weakColor = isLeftFellow ? eyeColors.rightHex : eyeColors.leftHex;
    const fellowRgbCss = isLeftFellow
        ? eyeColors.leftRgbCss
        : eyeColors.rightRgbCss;
    const weakRgbCss = isLeftFellow
        ? eyeColors.rightRgbCss
        : eyeColors.leftRgbCss;

    return (
        <div className="space-y-4">
            <p className="text-base font-semibold text-[var(--text)]">
                {t('settings.contrastBalance')}
            </p>

            {/* Hint */}
            <div className="rounded-2xl bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)] flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{t('settings.contrastHint')}</span>
            </div>

            {/* Eye circles */}
            <div className="flex justify-center gap-8">
                <div className="text-center">
                    <div
                        className="w-12 h-12 rounded-full mx-auto mb-1"
                        style={{
                            backgroundColor: `rgba(${fellowRgbCss}, ${fellowEyeContrast / 100})`,
                            boxShadow: `0 0 12px rgba(${fellowRgbCss}, 0.4)`,
                        }}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                        {fellowLabel}
                        {fellowEyeContrast}%
                    </span>
                </div>
                <div className="text-center">
                    <div
                        className="w-12 h-12 rounded-full mx-auto mb-1"
                        style={{
                            backgroundColor: `rgba(${weakRgbCss}, 1)`,
                            boxShadow: `0 0 12px rgba(${weakRgbCss}, 0.4)`,
                        }}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                        {weakLabel}100%
                    </span>
                </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
                {/* Fellow eye bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span style={{ color: fellowColor }}>
                            {t('settings.contrast_fellow')}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                            {fellowEyeContrast}%
                        </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--border)]/30 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${fellowEyeContrast}%`,
                                backgroundColor: fellowColor,
                                opacity: 0.8,
                            }}
                        />
                    </div>
                </div>

                {/* Weak (amblyopic) eye bar — always 100% */}
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span style={{ color: weakColor }}>
                            {t('settings.contrast_weak')}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                            100%
                        </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--border)]/30 overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: '100%',
                                backgroundColor: weakColor,
                                opacity: 0.8,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Auto-adapt note */}
            <p className="text-xs text-[var(--text-secondary)] text-center italic">
                {t('settings.contrast_auto_note')}
            </p>
        </div>
    );
}
