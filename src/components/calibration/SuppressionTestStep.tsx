import { getEyeColors } from '../../modules/glassesColors';
import { t } from '../../modules/i18n';

interface Props {
    glassesType: string;
    onPass: () => void;
    onFail: () => void;
}

export function SuppressionTestStep({ glassesType, onPass, onFail }: Props) {
    const eyeColors = getEyeColors(glassesType as 'red-cyan' | 'cyan-red');

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
            <h2 className="text-2xl font-bold text-[var(--text)] text-center">
                {t('calibration.instruction')}
            </h2>
            <div className="flex justify-center gap-8">
                <div
                    className="w-24 h-24 rounded-2xl"
                    style={{
                        backgroundColor: eyeColors.leftHex,
                        boxShadow: '0 0 20px rgba(255,107,138,0.3)',
                    }}
                    aria-label="Красный квадрат"
                />
                <div
                    className="w-24 h-24 rounded-2xl"
                    style={{
                        backgroundColor: eyeColors.rightHex,
                        boxShadow: '0 0 20px rgba(107,223,255,0.3)',
                    }}
                    aria-label="Голубой квадрат"
                />
            </div>
            <div className="flex flex-col gap-3 w-full max-w-sm">
                <button
                    type="button"
                    onClick={onPass}
                    className="w-full rounded-full bg-[var(--cta)] text-[var(--cta-text)] py-3 font-semibold btn-press"
                >
                    {t('calibration.seeBoth')}
                </button>
                <button
                    type="button"
                    onClick={onFail}
                    className="w-full rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 py-3 btn-press"
                >
                    {t('calibration.seeOne')}
                </button>
            </div>
        </div>
    );
}
