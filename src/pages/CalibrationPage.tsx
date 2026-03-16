import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
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
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <Card className="max-w-lg w-full bg-gray-900 border-gray-700 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            {t('calibration.adjustBrightness')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Live preview squares */}
                        <div className="flex justify-center gap-8 mb-4">
                            <div
                                className="w-24 h-24 rounded-sm"
                                style={{ backgroundColor: eyeColors.leftHex, opacity: redBrightness / 100 }}
                                aria-label="red square"
                            />
                            <div
                                className="w-24 h-24 rounded-sm"
                                style={{ backgroundColor: eyeColors.rightHex, opacity: cyanBrightness / 100 }}
                                aria-label="cyan square"
                            />
                        </div>
                        <p className="text-center text-sm text-gray-400">{t('calibration.hint')}</p>
                        <p className="text-xs text-gray-500 text-center">{`Попытка ${attempts} из ${CALIBRATION.MAX_ATTEMPTS}`}</p>

                        <div className="space-y-2">
                            <label className="text-sm" style={{ color: '#ff6666' }}>
                                {t('calibration.red')}: {redBrightness}
                            </label>
                            <Slider
                                value={[redBrightness]}
                                min={CALIBRATION.SLIDER_MIN}
                                max={CALIBRATION.SLIDER_MAX}
                                step={CALIBRATION.SLIDER_STEP}
                                onValueChange={([val]) => setRedBrightness(val)}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm" style={{ color: '#00e5e5' }}>
                                {t('calibration.cyan')}: {cyanBrightness}
                            </label>
                            <Slider
                                value={[cyanBrightness]}
                                min={CALIBRATION.SLIDER_MIN}
                                max={CALIBRATION.SLIDER_MAX}
                                step={CALIBRATION.SLIDER_STEP}
                                onValueChange={([val]) => setCyanBrightness(val)}
                                className="w-full"
                            />
                        </div>

                        {maxAttemptsReached ? (
                            <div className="space-y-3">
                                <p className="text-yellow-400 text-sm">
                                    {t('calibration.doctorWarning')}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleContinueAnyway}
                                        variant="outline"
                                        className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
                                    >
                                        {t('calibration.continueAnyway')}
                                    </Button>
                                    <Button
                                        onClick={handleRetry}
                                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                                    >
                                        {t('calibration.recalibrate')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleRetry}
                                    variant="outline"
                                    className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
                                >
                                    {t('calibration.retry')}
                                </Button>
                                <Button
                                    onClick={handleSaveAndContinue}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                                >
                                    {t('calibration.save')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="max-w-lg w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-lg text-white">
                        {t('calibration.instruction')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Glasses type toggle */}
                    <div className="space-y-2">
                        <p className="text-sm text-gray-300">{t('calibration.glassesType')}</p>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setGlassesType('red-cyan')}
                                variant={glassesType === 'red-cyan' ? 'default' : 'outline'}
                                className={`flex-1 ${glassesType === 'red-cyan' ? 'bg-white text-black' : 'border-gray-600 text-gray-200 hover:bg-gray-800'}`}
                            >
                                {t('calibration.glassesRed')}
                            </Button>
                            <Button
                                onClick={() => setGlassesType('cyan-red')}
                                variant={glassesType === 'cyan-red' ? 'default' : 'outline'}
                                className={`flex-1 ${glassesType === 'cyan-red' ? 'bg-white text-black' : 'border-gray-600 text-gray-200 hover:bg-gray-800'}`}
                            >
                                {t('calibration.glassesCyan')}
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-center gap-8">
                        <div
                            className="w-24 h-24 rounded-sm"
                            style={{ backgroundColor: eyeColors.leftHex }}
                            aria-label="red square"
                        />
                        <div
                            className="w-24 h-24 rounded-sm"
                            style={{ backgroundColor: eyeColors.rightHex }}
                            aria-label="cyan square"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleSeeBoth}
                            className="flex-1 bg-green-700 hover:bg-green-600 text-white"
                        >
                            {t('calibration.seeBoth')}
                        </Button>
                        <Button
                            onClick={handleSeeOne}
                            variant="outline"
                            className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-800"
                        >
                            {t('calibration.seeOne')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
