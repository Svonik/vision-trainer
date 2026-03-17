import { Slider } from '@/components/ui/slider';
import { useCalibration } from '../../hooks/useCalibration';
import { getEyeColors } from '../../modules/glassesColors';
import { CALIBRATION } from '../../modules/constants';
import { t } from '../../modules/i18n';

interface Props {
    glassesType: string;
    onRetry: () => void;
    onComplete: () => void;
    attempts: number;
    maxAttempts: number;
}

export function BrightnessAdjustStep({ glassesType, onRetry, onComplete, attempts, maxAttempts }: Props) {
    const { redBrightness, setRedBrightness, cyanBrightness, setCyanBrightness } = useCalibration();
    const eyeColors = getEyeColors(glassesType as 'red-cyan' | 'cyan-red');
    const maxAttemptsReached = attempts >= maxAttempts;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <h2 className="text-xl font-bold text-[var(--text)] text-center">
                {t('calibration.adjustBrightness')}
            </h2>

            {/* Live preview squares */}
            <div className="flex justify-center gap-8">
                <div
                    className="w-24 h-24 rounded-2xl"
                    style={{
                        backgroundColor: eyeColors.leftHex,
                        opacity: redBrightness / 100,
                        boxShadow: '0 0 20px rgba(255,107,138,0.3)',
                    }}
                    aria-label="Красный квадрат"
                />
                <div
                    className="w-24 h-24 rounded-2xl"
                    style={{
                        backgroundColor: eyeColors.rightHex,
                        opacity: cyanBrightness / 100,
                        boxShadow: '0 0 20px rgba(107,223,255,0.3)',
                    }}
                    aria-label="Голубой квадрат"
                />
            </div>

            <p className="text-center text-base text-[var(--text-secondary)]">
                {t('calibration.hint')}
            </p>
            <p className="text-sm text-[var(--text-secondary)] text-center">
                {`Попытка ${attempts} из ${maxAttempts}`}
            </p>

            <div className="w-full max-w-sm space-y-4">
                {/* Red channel slider */}
                <div className="space-y-2">
                    <label className="text-base" style={{ color: 'var(--red-soft)' }}>
                        {t('calibration.red')}: {redBrightness}
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setRedBrightness(Math.max(0, redBrightness - 5))}
                            className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-lg btn-press flex items-center justify-center"
                        >
                            −
                        </button>
                        <Slider
                            value={[redBrightness]}
                            min={CALIBRATION.SLIDER_MIN}
                            max={CALIBRATION.SLIDER_MAX}
                            step={CALIBRATION.SLIDER_STEP}
                            onValueChange={([val]) => setRedBrightness(val)}
                            className="flex-1"
                            aria-label="Яркость красного канала"
                        />
                        <button
                            onClick={() => setRedBrightness(Math.min(100, redBrightness + 5))}
                            className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-lg btn-press flex items-center justify-center"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Cyan channel slider */}
                <div className="space-y-2">
                    <label className="text-base" style={{ color: 'var(--cyan-soft)' }}>
                        {t('calibration.cyan')}: {cyanBrightness}
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCyanBrightness(Math.max(0, cyanBrightness - 5))}
                            className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-lg btn-press flex items-center justify-center"
                        >
                            −
                        </button>
                        <Slider
                            value={[cyanBrightness]}
                            min={CALIBRATION.SLIDER_MIN}
                            max={CALIBRATION.SLIDER_MAX}
                            step={CALIBRATION.SLIDER_STEP}
                            onValueChange={([val]) => setCyanBrightness(val)}
                            className="flex-1"
                            aria-label="Яркость голубого канала"
                        />
                        <button
                            onClick={() => setCyanBrightness(Math.min(100, cyanBrightness + 5))}
                            className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-lg btn-press flex items-center justify-center"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {maxAttemptsReached ? (
                <div className="w-full max-w-sm space-y-3">
                    <p className="text-[var(--warning)] text-base text-center">
                        {t('calibration.doctorWarning')}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onComplete}
                            className="flex-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 py-2 btn-press"
                        >
                            {t('calibration.continueAnyway')}
                        </button>
                        <button
                            onClick={onRetry}
                            className="flex-1 rounded-full bg-[var(--cta)] text-[var(--cta-text)] py-2 font-semibold btn-press"
                        >
                            {t('calibration.recalibrate')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-sm flex gap-2">
                    <button
                        onClick={onRetry}
                        className="flex-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 py-2 btn-press"
                    >
                        {t('calibration.retry')}
                    </button>
                    <button
                        onClick={onComplete}
                        className="flex-1 rounded-full bg-[var(--cta)] text-[var(--cta-text)] py-2 font-semibold btn-press"
                    >
                        {t('calibration.save')}
                    </button>
                </div>
            )}
        </div>
    );
}
