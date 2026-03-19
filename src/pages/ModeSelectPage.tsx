import { Clock, Gamepad2, Target } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MathGate } from '@/components/MathGate';
import { SessionStepper } from '@/components/SessionStepper';
import { Card, CardContent } from '@/components/ui/card';
import { WeeklyProgress } from '@/components/WeeklyProgress';
import { t } from '../modules/i18n';
import { getCachedSessions } from '../modules/sessionCache';
import { generateSession } from '../modules/sessionEngine';
import { getCalibration } from '../modules/storage';
import { getProtocol } from '../modules/therapyProtocol';
import { shouldAlertDoctor } from '../modules/wellnessCheck';

export function ModeSelectPage() {
    const navigate = useNavigate();
    const sessions = getCachedSessions();
    const doctorAlert = shouldAlertDoctor(sessions);
    const todayGames = generateSession(sessions);
    const calibration = getCalibration();
    const protocol = getProtocol(calibration.age_group);
    const sessionMinutes = Math.round(protocol.sessionDurationMs / 60_000);
    const [showGate, setShowGate] = useState(false);

    const handleTrainingClick = () => {
        if (doctorAlert) {
            setShowGate(true);
        } else {
            navigate('/training/settings');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-24 relative z-10">
            <h1 className="font-[var(--font-display)] text-4xl text-[var(--text)] mb-2 text-center text-balance">
                {t('mode.title')}
            </h1>
            <p className="text-[var(--text-secondary)] text-base mb-5 text-center max-w-xs">
                {t('mode.subtitle')}
            </p>

            {doctorAlert && (
                <div className="w-full max-w-md p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-center mb-4">
                    <p className="text-sm font-bold text-[var(--warning)]">
                        {t('wellness.alert_doctor')}
                    </p>
                </div>
            )}

            <WeeklyProgress sessions={sessions} />

            <div className="flex flex-col gap-5 max-w-md w-full">
                {/* Training card */}
                <button
                    type="button"
                    className="group hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-900/20 transition-[transform,box-shadow] duration-300 ease-out cursor-pointer spring-enter text-left w-full rounded-3xl"
                    style={{ animationDelay: '0ms' }}
                    onClick={handleTrainingClick}
                    aria-label={t('mode.training')}
                >
                    <Card glow className="rounded-3xl gap-0">
                        <CardContent className="p-6 space-y-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/30 flex items-center justify-center flex-shrink-0">
                                        <Target className="w-6 h-6 text-[var(--accent)]" />
                                    </div>
                                    <div>
                                        <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--text)]">
                                            {t('mode.training')}
                                        </h2>
                                        <span className="text-sm bg-[var(--success)]/20 text-[var(--success)] px-2 py-0.5 rounded-full">
                                            {t('mode.trainingRecommended')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[var(--text-secondary)] text-sm tabular-nums">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        ~{sessionMinutes} {t('stats.min')}
                                    </span>
                                </div>
                            </div>

                            <p className="text-base text-[var(--text-secondary)]">
                                {t('mode.trainingDesc')}
                            </p>

                            {/* Session timeline */}
                            <div className="rounded-2xl bg-[var(--bg)]/50 ring-1 ring-white/[0.05] p-4 space-y-3">
                                <p className="text-sm text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                                    {t('training.todaySession')}
                                </p>
                                <SessionStepper gameIds={todayGames} />
                            </div>

                            {/* Visual CTA (span, not button — avoids nested interactive) */}
                            <span className="rounded-full bg-[var(--cta)] text-[var(--cta-text)] font-semibold py-3 px-4 text-base min-h-[44px] inline-flex items-center justify-center w-full transition-[filter,transform] group-hover:brightness-110 group-active:scale-[0.98]">
                                {t('mode.startTraining')}
                            </span>
                        </CardContent>
                    </Card>
                </button>

                {/* Free play card */}
                <button
                    type="button"
                    className="group hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-900/20 transition-[transform,box-shadow] duration-300 ease-out cursor-pointer spring-enter text-left w-full rounded-3xl"
                    style={{ animationDelay: '80ms' }}
                    onClick={() => navigate('/games')}
                    aria-label={t('mode.freePlay')}
                >
                    <Card glow className="rounded-3xl gap-0">
                        <CardContent className="p-6 space-y-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-[var(--cyan-soft)]/20 flex items-center justify-center flex-shrink-0">
                                    <Gamepad2 className="w-6 h-6 text-[var(--cyan-soft)]" />
                                </div>
                                <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--text)]">
                                    {t('mode.freePlay')}
                                </h2>
                            </div>

                            <p className="text-base text-[var(--text-secondary)]">
                                {t('mode.freePlayDesc')}
                            </p>

                            <span className="rounded-full ring-1 ring-white/[0.08] text-[var(--text-secondary)] py-3 px-4 text-base min-h-[44px] inline-flex items-center justify-center w-full transition-[filter,transform] group-hover:brightness-125 group-active:scale-[0.98]">
                                {t('mode.chooseGame')}
                            </span>
                        </CardContent>
                    </Card>
                </button>
            </div>

            {showGate && (
                <MathGate
                    onPass={() => {
                        setShowGate(false);
                        navigate('/training/settings');
                    }}
                    onCancel={() => setShowGate(false)}
                />
            )}
        </div>
    );
}
