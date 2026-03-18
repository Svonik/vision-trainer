import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { CLINICAL_CONTRAST } from '@/modules/constants';
import { t } from '@/modules/i18n';
import { getCachedSessions } from '@/modules/sessionCache';
import { computeWeeklySchedule } from '@/modules/scheduleTracker';
import { hasAdverseSymptoms } from '@/modules/wellnessCheck';
import type { SessionResult } from '@/modules/gameState';

function computeCourseStars(sessions: readonly SessionResult[]): 1 | 2 | 3 {
    if (sessions.length === 0) return 1;
    const avgAccuracy =
        sessions.reduce((sum, s) => sum + s.hit_rate, 0) / sessions.length;
    if (avgAccuracy >= 0.8) return 3;
    if (avgAccuracy >= 0.6) return 2;
    return 1;
}

function countAdverseSessions(sessions: readonly SessionResult[]): number {
    return sessions.filter((s) => {
        const w = s.wellness;
        return w != null && hasAdverseSymptoms(w as any);
    }).length;
}

function ContrastBar({
    startValue,
    endValue,
}: {
    readonly startValue: number;
    readonly endValue: number;
}) {
    const floor = CLINICAL_CONTRAST.FELLOW_FLOOR;
    const ceiling = CLINICAL_CONTRAST.FELLOW_CEILING;
    const range = ceiling - floor;

    const startPercent = range > 0 ? ((startValue - floor) / range) * 100 : 0;
    const endPercent = range > 0 ? ((endValue - floor) / range) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-[var(--text)]">
                <span>
                    {t('training_summary.contrast_start')}: {Math.round(startValue)}%
                </span>
                <span>
                    {t('training_summary.contrast_now')}: {Math.round(endValue)}%
                </span>
            </div>
            <div className="relative w-full h-3 bg-[var(--border)] rounded-full overflow-hidden">
                {/* Start marker */}
                <div
                    className="absolute top-0 h-full w-0.5 bg-[var(--text)] opacity-40 z-10"
                    style={{
                        left: `${Math.min(100, Math.max(0, startPercent))}%`,
                    }}
                />
                {/* Current progress fill */}
                <div
                    className="h-full bg-[var(--accent)] rounded-full transition-[width] duration-700"
                    style={{
                        width: `${Math.min(100, Math.max(0, endPercent))}%`,
                    }}
                />
            </div>
        </div>
    );
}

function StatRow({
    label,
    value,
    color,
}: {
    readonly label: string;
    readonly value: string;
    readonly color?: string;
}) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]/40 px-4 py-3">
            <span className="text-sm text-[var(--text)]">{label}</span>
            <span
                className="text-sm font-bold"
                style={{ color: color ?? 'var(--text)' }}
            >
                {value}
            </span>
        </div>
    );
}

export function TrainingSummaryPage() {
    const navigate = useNavigate();

    const narrative = useMemo(() => {
        const allSessions = getCachedSessions();

        const stars = computeCourseStars(allSessions);

        // Contrast progress: first session start -> last session end
        const firstSession = allSessions[0] as SessionResult | undefined;
        const lastSession = allSessions[allSessions.length - 1] as
            | SessionResult
            | undefined;
        const contrastStart =
            firstSession?.fellow_contrast_start ??
            CLINICAL_CONTRAST.FELLOW_INITIAL;
        const contrastEnd =
            lastSession?.fellow_contrast_end ?? CLINICAL_CONTRAST.FELLOW_INITIAL;

        // Adherence
        const schedule = computeWeeklySchedule(allSessions);
        const expectedDays = schedule.totalWeeks * schedule.targetDaysPerWeek;
        const adherencePercent =
            expectedDays > 0
                ? Math.round(
                      (schedule.completedDays.length / expectedDays) * 100,
                  )
                : 0;

        // Wellness
        const adverseCount = countAdverseSessions(allSessions);

        // Total therapy minutes
        const totalSeconds = allSessions.reduce(
            (sum, s) => sum + s.duration_s,
            0,
        );
        const totalMinutes = Math.round(totalSeconds / 60);

        // Current streak
        const currentStreak = schedule.currentStreak;

        return {
            stars,
            contrastStart,
            contrastEnd,
            adherencePercent,
            completedDays: schedule.completedDays.length,
            expectedDays,
            adverseCount,
            totalMinutes,
            currentStreak,
        };
    }, []);

    const starsDisplay = '\u2605'.repeat(narrative.stars) +
        '\u2606'.repeat(3 - narrative.stars);

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 overflow-hidden spring-enter">
                <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--cta)] to-[var(--cyan-soft)]" />

                <div className="p-6 space-y-5">
                    {/* Header */}
                    <h2 className="text-xl text-center font-[var(--font-display)] text-[var(--text)]">
                        {t('training_summary.course_result')}
                    </h2>

                    {/* Stars */}
                    <div className="text-center text-4xl">{starsDisplay}</div>

                    {/* Contrast progress bar */}
                    <ContrastBar
                        startValue={narrative.contrastStart}
                        endValue={narrative.contrastEnd}
                    />

                    {/* Stat rows */}
                    <div className="space-y-2">
                        {/* Adherence */}
                        <StatRow
                            label={t('training_summary.adherence')}
                            value={`${narrative.adherencePercent}% (${narrative.completedDays} ${t('training_summary.adherence_days')})`}
                        />

                        {/* Wellness */}
                        <StatRow
                            label={
                                narrative.adverseCount === 0
                                    ? t('training_summary.wellness_ok')
                                    : `${narrative.adverseCount} ${t('training_summary.wellness_count')}`
                            }
                            value={
                                narrative.adverseCount === 0 ? '\u2713' : '\u26A0'
                            }
                            color={
                                narrative.adverseCount === 0
                                    ? 'var(--success)'
                                    : 'var(--warning)'
                            }
                        />

                        {/* Total minutes */}
                        <StatRow
                            label={t('training_summary.total_minutes')}
                            value={String(narrative.totalMinutes)}
                        />

                        {/* Streak */}
                        <StatRow
                            label={t('summary.streak')}
                            value={String(narrative.currentStreak)}
                        />
                    </div>

                    {/* Finish button */}
                    <AppButton
                        variant="cta"
                        size="lg"
                        onClick={() => navigate('/mode-select')}
                        className="w-full font-[var(--font-display)] btn-press"
                    >
                        {t('training.finish')}
                    </AppButton>
                </div>
            </div>
        </div>
    );
}
