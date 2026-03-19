import { Clock, Gamepad2, Target } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MathGate } from '@/components/MathGate';
import { SessionStepper } from '@/components/SessionStepper';
import { Card, CardContent } from '@/components/ui/card';
import { WeeklyProgress } from '@/components/WeeklyProgress';
import type { SessionResult } from '../modules/gameState';
import { t } from '../modules/i18n';
import { getCachedSessions } from '../modules/sessionCache';
import { generateSession } from '../modules/sessionEngine';
import { getCalibration } from '../modules/storage';
import { getActiveCourse, getCourseProgress } from '../modules/therapyCourse';
import { getProtocol } from '../modules/therapyProtocol';
import { shouldAlertDoctor } from '../modules/wellnessCheck';

function hasTodaySession(sessions: readonly SessionResult[]): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return sessions.some(
        (s) => s.timestamp.slice(0, 10) === today && s.mode === 'training',
    );
}

export function ModeSelectPage() {
    const navigate = useNavigate();
    const sessions = getCachedSessions();
    const doctorAlert = shouldAlertDoctor(sessions);
    const todayGames = generateSession(sessions);
    const calibration = getCalibration();
    const protocol = getProtocol(calibration.age_group);
    const sessionMinutes = Math.round(protocol.sessionDurationMs / 60_000);
    const [showGate, setShowGate] = useState(false);

    const activeCourse = getActiveCourse();
    const courseProgress = activeCourse
        ? getCourseProgress(activeCourse)
        : null;
    const todayDone = hasTodaySession(sessions);

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

            <div className="flex flex-col gap-5 max-w-md w-full">
                {/* Training card — primary, full-width, large */}
                <button
                    type="button"
                    className="group hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-900/20 transition-[transform,box-shadow] duration-300 ease-out cursor-pointer spring-enter text-left w-full rounded-3xl"
                    style={{ animationDelay: '0ms' }}
                    onClick={handleTrainingClick}
                    aria-label={t('mode.training_title')}
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
                                            {t('mode.training_title')}
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

                            {/* Course progress bar */}
                            {activeCourse && courseProgress && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">
                                            {t('mode.training_week')}{' '}
                                            {courseProgress.elapsedWeeks + 1}{' '}
                                            {t('mode.training_of')}{' '}
                                            {activeCourse.targetWeeks}
                                        </span>
                                        <span className="text-[var(--accent)] font-bold tabular-nums">
                                            {courseProgress.progressPercent}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-[var(--border)] rounded-full h-2">
                                        <div
                                            className="bg-[var(--accent)] h-2 rounded-full transition-[width] duration-500"
                                            style={{
                                                width: `${courseProgress.progressPercent}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Adherence: WeeklyProgress + today's status */}
                            <WeeklyProgress sessions={sessions} />

                            <div className="text-sm text-center">
                                {todayDone ? (
                                    <span className="text-[var(--success)] font-semibold">
                                        {t('mode.today_done')}
                                    </span>
                                ) : (
                                    <span className="text-[var(--text-secondary)]">
                                        {t('mode.today_pending')}
                                    </span>
                                )}
                            </div>

                            {/* Session timeline */}
                            <div className="rounded-2xl bg-[var(--bg)]/50 ring-1 ring-white/[0.05] p-4 space-y-3">
                                <p className="text-sm text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                                    {t('training.todaySession')}
                                </p>
                                <SessionStepper gameIds={todayGames} />
                            </div>

                            {/* CTA button */}
                            <span className="rounded-full bg-[var(--cta)] text-[var(--cta-text)] font-semibold py-3 px-4 text-base min-h-[44px] inline-flex items-center justify-center w-full transition-[filter,transform] group-hover:brightness-110 group-active:scale-[0.98]">
                                {activeCourse
                                    ? t('mode.training_continue')
                                    : t('mode.training_start')}
                            </span>
                        </CardContent>
                    </Card>
                </button>

                {/* Free play card — secondary, smaller, muted */}
                <button
                    type="button"
                    className="group hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-900/20 transition-[transform,box-shadow] duration-300 ease-out cursor-pointer spring-enter text-left w-full rounded-3xl"
                    style={{ animationDelay: '80ms' }}
                    onClick={() => navigate('/games')}
                    aria-label={t('mode.freeplay_title')}
                >
                    <Card className="rounded-3xl gap-0">
                        <CardContent className="p-5 space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[var(--cyan-soft)]/20 flex items-center justify-center flex-shrink-0">
                                    <Gamepad2 className="w-5 h-5 text-[var(--cyan-soft)]" />
                                </div>
                                <div>
                                    <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--text)]">
                                        {t('mode.freeplay_title')}
                                    </h2>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {t('mode.freeplay_subtitle')}
                                    </p>
                                </div>
                            </div>

                            <span className="rounded-full ring-1 ring-white/[0.08] text-[var(--text-secondary)] py-2.5 px-4 text-sm min-h-[40px] inline-flex items-center justify-center w-full transition-[filter,transform] group-hover:brightness-125 group-active:scale-[0.98]">
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
