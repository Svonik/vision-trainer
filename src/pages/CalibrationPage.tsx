import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useCalibration } from '@/hooks/useCalibration';
import { CALIBRATION } from '@/modules/constants';
import { t } from '@/modules/i18n';
import { getEyeColors } from '@/modules/glassesColors';

type Phase = 'test' | 'adjust';

export function CalibrationPage() {
    const navigate = useNavigate();
    const {
        redBrightness, setRedBrightness,
        cyanBrightness, setCyanBrightness,
        attempts, addAttempt,
        pass, save,
        glassesType, setGlassesType,
    } = useCalibration();

    const eyeColors = getEyeColors(glassesType);

    const [phase, setPhase] = useState<Phase>('test');
    const maxAttemptsReached = attempts >= CALIBRATION.MAX_ATTEMPTS;

    const handleSeeBoth = () => {
        pass();
        save({ suppression_passed: true });
        navigate('/games');
    };

    const handleSeeOne = () => {
        addAttempt();
        setPhase('adjust');
    };

    const handleRetry = () => {
        setPhase('test');
    };

    const handleSaveAndContinue = () => {
        save({ suppression_passed: true });
        navigate('/games');
    };

    const handleContinueAnyway = () => {
        save({ suppression_passed: true });
        navigate('/games');
    };

    if (phase === 'adjust') {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
            >
                <Card className="max-w-lg w-full bg-[var(--surface)] border-[var(--border)]/50 rounded-3xl spring-enter">
                    <CardHeader>
                        <CardTitle className="text-lg text-[var(--text)]">
                            {t('calibration.adjustBrightness')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Live preview squares */}
                        <div className="flex justify-center gap-8 mb-4">
                            <div
                                className="w-24 h-24 rounded-2xl"
                                style={{
                                    backgroundColor: eyeColors.leftHex,
                                    opacity: redBrightness / 100,
                                    boxShadow: '0 0 20px rgba(255,107,138,0.3)',
                                }}
                                aria-label="red square"
                            />
                            <div
                                className="w-24 h-24 rounded-2xl"
                                style={{
                                    backgroundColor: eyeColors.rightHex,
                                    opacity: cyanBrightness / 100,
                                    boxShadow: '0 0 20px rgba(107,223,255,0.3)',
                                }}
                                aria-label="cyan square"
                            />
                        </div>
                        <p className="text-center text-sm text-[var(--text-secondary)]">{t('calibration.hint')}</p>
                        <p className="text-xs text-[var(--text-secondary)] text-center">{`Попытка ${attempts} из ${CALIBRATION.MAX_ATTEMPTS}`}</p>

                        <div className="space-y-2">
                            <label className="text-sm" style={{ color: '#ff6666' }}>
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
                                />
                                <button
                                    onClick={() => setRedBrightness(Math.min(100, redBrightness + 5))}
                                    className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-lg btn-press flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm" style={{ color: '#00e5e5' }}>
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
                                />
                                <button
                                    onClick={() => setCyanBrightness(Math.min(100, cyanBrightness + 5))}
                                    className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-lg btn-press flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {maxAttemptsReached ? (
                            <div className="space-y-3">
                                <p className="text-[var(--warning)] text-sm">
                                    {t('calibration.doctorWarning')}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleContinueAnyway}
                                        className="flex-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 py-2 btn-press"
                                    >
                                        {t('calibration.continueAnyway')}
                                    </button>
                                    <button
                                        onClick={handleRetry}
                                        className="flex-1 rounded-full bg-[var(--cta)] text-[var(--cta-text)] py-2 font-semibold btn-press"
                                    >
                                        {t('calibration.recalibrate')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 py-2 btn-press"
                                >
                                    {t('calibration.retry')}
                                </button>
                                <button
                                    onClick={handleSaveAndContinue}
                                    className="flex-1 rounded-full bg-[var(--cta)] text-[var(--cta-text)] py-2 font-semibold btn-press"
                                >
                                    {t('calibration.save')}
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <Card className="max-w-lg w-full bg-[var(--surface)] border-[var(--border)]/50 rounded-3xl spring-enter">
                <CardHeader>
                    <CardTitle className="text-lg text-[var(--text)]">
                        {t('calibration.instruction')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Glasses type toggle */}
                    <div className="space-y-2">
                        <p className="text-sm text-[var(--text-secondary)]">{t('calibration.glassesType')}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setGlassesType('red-cyan')}
                                className={`flex-1 rounded-full border py-2 btn-press font-medium transition-colors ${
                                    glassesType === 'red-cyan'
                                        ? 'bg-[var(--red-soft)]/20 text-[var(--red-soft)] border-[var(--red-soft)]'
                                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                                }`}
                            >
                                {t('calibration.glassesRed')}
                            </button>
                            <button
                                onClick={() => setGlassesType('cyan-red')}
                                className={`flex-1 rounded-full border py-2 btn-press font-medium transition-colors ${
                                    glassesType === 'cyan-red'
                                        ? 'bg-[var(--cyan-soft)]/20 text-[var(--cyan-soft)] border-[var(--cyan-soft)]'
                                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                                }`}
                            >
                                {t('calibration.glassesCyan')}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-center gap-8">
                        <div
                            className="w-24 h-24 rounded-2xl"
                            style={{
                                backgroundColor: eyeColors.leftHex,
                                boxShadow: '0 0 20px rgba(255,107,138,0.3)',
                            }}
                            aria-label="red square"
                        />
                        <div
                            className="w-24 h-24 rounded-2xl"
                            style={{
                                backgroundColor: eyeColors.rightHex,
                                boxShadow: '0 0 20px rgba(107,223,255,0.3)',
                            }}
                            aria-label="cyan square"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSeeBoth}
                            className="flex-1 rounded-full bg-[var(--cta)] text-[var(--cta-text)] py-2.5 font-semibold btn-press"
                        >
                            {t('calibration.seeBoth')}
                        </button>
                        <button
                            onClick={handleSeeOne}
                            className="flex-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 py-2.5 btn-press"
                        >
                            {t('calibration.seeOne')}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
