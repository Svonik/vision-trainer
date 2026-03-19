import { useState } from 'react';
import { t } from '@/modules/i18n';
import { getCachedSessions } from '@/modules/sessionCache';
import type { SessionSummary } from '@/modules/sessionSummary';
import {
    getActiveCourse,
    getCourseProgress,
} from '@/modules/therapyCourse';
import { shouldAlertDoctor } from '@/modules/wellnessCheck';

interface SessionSummaryCardProps {
    readonly summary: SessionSummary;
    readonly onContinue: () => void;
    readonly onWellnessPost?: (eyeStrain: boolean, headache: boolean) => void;
}

function getNextActionMessage(
    sessions: readonly { timestamp: string }[],
): string {
    const course = getActiveCourse();

    // Course complete check
    if (course) {
        const progress = getCourseProgress(course);
        if (progress.elapsedWeeks >= course.targetWeeks) {
            return t('next.course_complete');
        }
    }

    // Doctor alert takes priority over daily guidance
    if (shouldAlertDoctor(sessions)) {
        return t('next.see_doctor');
    }

    // Check if today already has a session (the current one counts)
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = sessions.filter(
        (s) => s.timestamp.slice(0, 10) === today,
    ).length;

    // If this is the first session today, goal is done
    if (todayCount <= 1) {
        return t('next.goal_done');
    }

    return t('next.play_more');
}

function getContinueButtonText(): string {
    const course = getActiveCourse();
    if (course) {
        const progress = getCourseProgress(course);
        if (progress.elapsedWeeks >= course.targetWeeks) {
            return t('summary.view_results');
        }
    }
    return t('summary.continue');
}

export function SessionSummaryCard({
    summary,
    onContinue,
    onWellnessPost,
}: SessionSummaryCardProps) {
    const [eyeStrain, setEyeStrain] = useState(false);
    const [headache, setHeadache] = useState(false);
    const sessions = getCachedSessions();
    const doctorAlert = shouldAlertDoctor(sessions);
    const nextAction = getNextActionMessage(sessions);
    const buttonText = getContinueButtonText();

    const message =
        summary.stars === 3
            ? t('summary.excellent')
            : summary.stars === 2
              ? t('summary.good')
              : t('summary.try_again');

    const handleContinue = () => {
        onWellnessPost?.(eyeStrain, headache);
        onContinue();
    };

    return (
        <div className="flex flex-col items-center gap-4 p-8 bg-[var(--surface)] rounded-2xl shadow-lg max-w-sm mx-auto">
            <div className="text-4xl">
                {'★'.repeat(summary.stars)}
                {'☆'.repeat(3 - summary.stars)}
            </div>

            <h2 className="text-2xl font-bold text-[var(--text)]">{message}</h2>

            {summary.isNewRecord && (
                <div className="text-[var(--warning)] font-bold">
                    {t('summary.new_record')}
                </div>
            )}

            <div className="w-full space-y-2 text-sm text-[var(--text)]">
                <div className="flex justify-between">
                    <span>{t('summary.streak')}</span>
                    <span className="font-bold">{summary.streakDays}</span>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>{t('summary.contrast_progress')}</span>
                        <span className="font-bold">
                            {Math.round(summary.contrastProgress)}%
                        </span>
                    </div>
                    <div className="w-full bg-[var(--border)] rounded-full h-2">
                        <div
                            className="bg-[var(--accent)] h-2 rounded-full transition-[width] duration-500"
                            style={{
                                width: `${Math.min(100, summary.contrastProgress)}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Post-session wellness questions */}
            <div className="w-full space-y-3 pt-2 border-t border-[var(--border)]">
                <WellnessToggle
                    label={t('wellness.post_eye_strain')}
                    value={eyeStrain}
                    onChange={setEyeStrain}
                />
                <WellnessToggle
                    label={t('wellness.post_headache')}
                    value={headache}
                    onChange={setHeadache}
                />
            </div>

            {doctorAlert && (
                <div className="w-full p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-center">
                    <p className="text-sm font-bold text-[var(--warning)]">
                        {t('wellness.alert_doctor')}
                    </p>
                </div>
            )}

            {/* Next action guidance */}
            <div className="w-full pt-2 border-t border-[var(--border)]">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-2">
                    {t('next.title')}
                </p>
                <p className="text-sm text-[var(--text)]">{nextAction}</p>
            </div>

            <button
                type="button"
                onClick={handleContinue}
                className="mt-4 px-8 py-3 bg-[var(--cta)] text-[var(--cta-text)] rounded-full text-lg font-bold btn-press transition-colors"
            >
                {buttonText}
            </button>
        </div>
    );
}

interface WellnessToggleProps {
    readonly label: string;
    readonly value: boolean;
    readonly onChange: (v: boolean) => void;
}

function WellnessToggle({ label, value, onChange }: WellnessToggleProps) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">
                {label}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange(false)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold btn-press transition-[transform,box-shadow,border-color] ${
                        !value
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]'
                            : 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                >
                    Нет
                </button>
                <button
                    type="button"
                    onClick={() => onChange(true)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold btn-press transition-[transform,box-shadow,border-color] ${
                        value
                            ? 'bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]'
                            : 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                >
                    Да
                </button>
            </div>
        </div>
    );
}
