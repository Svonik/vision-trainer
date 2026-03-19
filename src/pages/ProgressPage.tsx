import {
    AlertTriangle,
    Calendar,
    Clock,
    Gamepad2,
    Star,
    TrendingUp,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { formatDuration, formatTotalTime } from '@/lib/formatTime';
import { getGameById } from '../config/games';
import { SPEEDS } from '../modules/constants';
import type { SessionResult } from '../modules/gameState';
import { t } from '../modules/i18n';
import { computeWeeklySchedule } from '../modules/scheduleTracker';
import { getCachedSessions } from '../modules/sessionCache';
import { getConsecutiveAdverseCount } from '../modules/wellnessCheck';

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });
    } catch {
        return iso;
    }
}

const SessionRow = React.memo(function SessionRow({
    session,
}: {
    session: any;
}) {
    const game = session.game ? getGameById(session.game) : undefined;
    const gameName = game
        ? t(game.titleKey)
        : (session.game ?? t('progress.unknownGame'));
    const hitPct =
        session.hit_rate != null ? Math.round(session.hit_rate * 100) : 0;
    const speedLabel =
        session.speed && SPEEDS[session.speed as keyof typeof SPEEDS]
            ? SPEEDS[session.speed as keyof typeof SPEEDS].label
            : (session.speed ?? '—');

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-4 flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[var(--text)] text-base font-medium truncate max-w-[180px]">
                    {gameName}
                </p>
                <p className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                    {session.timestamp ? formatDate(session.timestamp) : '—'}
                    <span>·</span>
                    {speedLabel}
                </p>
            </div>
            <div className="text-right space-y-1">
                <p className="font-[var(--font-display)] text-lg text-[var(--text)] tabular-nums">
                    {hitPct}%
                </p>
                <p className="text-[var(--text-secondary)] text-sm flex items-center gap-1 justify-end tabular-nums">
                    <Star className="w-3 h-3 text-[var(--warning)]" />
                    {session.caught ?? 0}
                    <Clock className="w-3 h-3 ml-1" />
                    {session.duration_s != null
                        ? formatDuration(session.duration_s)
                        : '—'}
                </p>
            </div>
        </div>
    );
});

export function ProgressPage() {
    const navigate = useNavigate();
    const sessions = useMemo(() => getCachedSessions(), []);
    const sorted = useMemo(() => [...sessions].reverse(), [sessions]);

    if (sorted.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-6">
                <Star className="w-16 h-16 text-[var(--warning)]" />
                <h2 className="font-[var(--font-display)] text-2xl text-[var(--text)]">
                    {t('progress.playFirst')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base max-w-xs">
                    {t('progress.historyHint')}
                </p>
                <AppButton
                    variant="cta"
                    size="md"
                    onClick={() => navigate('/games')}
                >
                    <Gamepad2 className="w-5 h-5" />
                    {t('progress.chooseGame')}
                </AppButton>
            </div>
        );
    }

    const totalSessions = sessions.length;
    const avgHitRate =
        sessions.length > 0
            ? Math.round(
                  (sessions.reduce(
                      (sum: number, s: any) => sum + (s.hit_rate ?? 0),
                      0,
                  ) /
                      sessions.length) *
                      100,
              )
            : 0;
    const totalTime = sessions.reduce(
        (sum: number, s: any) => sum + (s.duration_s ?? 0),
        0,
    );

    // Filter to training sessions for clinical metrics
    const trainingSessions = useMemo(
        () => sessions.filter((s: SessionResult) => s.mode !== 'freeplay'),
        [sessions],
    );

    // Clinical metrics — use training sessions only
    const contrastEntries = useMemo(
        () =>
            trainingSessions
                .filter((s: SessionResult) => s.fellow_contrast_end != null)
                .slice(-10)
                .map((s: SessionResult) => ({
                    date: s.timestamp ? formatDate(s.timestamp) : '—',
                    value: s.fellow_contrast_end as number,
                })),
        [trainingSessions],
    );

    const schedule = useMemo(
        () => computeWeeklySchedule(trainingSessions as SessionResult[]),
        [trainingSessions],
    );

    const adverseCount = useMemo(
        () => getConsecutiveAdverseCount(sessions as SessionResult[]),
        [sessions],
    );

    return (
        <div className="p-4 space-y-4 max-w-lg mx-auto">
            <h1 className="font-[var(--font-display)] text-2xl text-[var(--text)] pt-2 text-balance">
                {t('progress.title')}
            </h1>

            {/* Summary card */}
            <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-5 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="font-[var(--font-display)] text-3xl text-[var(--text)] tabular-nums">
                        {totalSessions}
                    </p>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {t('progress.totalSessions')}
                    </p>
                </div>
                <div className="text-center">
                    <p className="font-[var(--font-display)] text-3xl text-[var(--text)] tabular-nums">
                        {avgHitRate}%
                    </p>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {t('progress.avgHitRate')}
                    </p>
                </div>
                <div className="text-center">
                    <p className="font-[var(--font-display)] text-3xl text-[var(--text)] tabular-nums">
                        {formatTotalTime(totalTime)}
                    </p>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {t('progress.totalTime')}
                    </p>
                </div>
            </div>

            {/* Contrast trend */}
            {contrastEntries.length > 0 && (
                <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-5 space-y-3">
                    <h2 className="font-[var(--font-display)] text-lg text-[var(--text)] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                        {t('progress.contrast_trend')}
                    </h2>
                    <div className="space-y-2">
                        {contrastEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="text-[var(--text-secondary)] text-sm w-16 shrink-0 tabular-nums">
                                    {entry.date}
                                </span>
                                <div className="flex-1 h-5 bg-[var(--border)]/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--accent)] rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, entry.value)}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-[var(--text)] text-sm font-medium w-10 text-right tabular-nums">
                                    {entry.value}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Adherence summary */}
            <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-5 space-y-3">
                <h2 className="font-[var(--font-display)] text-lg text-[var(--text)] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--success)]" />
                    {t('progress.adherence_calendar')}
                </h2>
                <div className="flex items-center gap-3">
                    <span className="text-[var(--text)] text-sm font-medium tabular-nums">
                        {schedule.completedDays.length} /{' '}
                        {schedule.targetDaysPerWeek}
                    </span>
                    <div className="flex-1 h-5 bg-[var(--border)]/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--success)] rounded-full transition-all"
                            style={{
                                width: `${Math.min(100, (schedule.completedDays.length / Math.max(1, schedule.targetDaysPerWeek)) * 100)}%`,
                            }}
                        />
                    </div>
                </div>
                {schedule.currentStreak > 0 && (
                    <p className="text-[var(--text-secondary)] text-sm">
                        {t('schedule.streak')}: {schedule.currentStreak}
                    </p>
                )}
            </div>

            {/* Wellness summary */}
            {adverseCount > 0 && (
                <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-5 space-y-2">
                    <h2 className="font-[var(--font-display)] text-lg text-[var(--text)] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
                        {t('progress.wellness_trend')}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm">
                        {adverseCount}{' '}
                        {adverseCount === 1
                            ? 'сессия подряд с жалобами'
                            : adverseCount < 5
                              ? 'сессии подряд с жалобами'
                              : 'сессий подряд с жалобами'}
                    </p>
                    {adverseCount >= 3 && (
                        <p className="text-[var(--accent-secondary)] text-sm font-medium">
                            {t('wellness.alert_doctor')}
                        </p>
                    )}
                </div>
            )}

            {/* Session list */}
            <div className="space-y-3">
                {sorted.map((session, idx) => (
                    <SessionRow
                        key={session.timestamp ?? idx}
                        session={session}
                    />
                ))}
            </div>

            <div className="flex items-center justify-center gap-1 pt-2 pb-4">
                <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                <p className="text-[var(--text-secondary)] text-sm">
                    {totalSessions}{' '}
                    {totalSessions === 1
                        ? t('progress.sessionsOne')
                        : totalSessions < 5
                          ? t('progress.sessionsFew')
                          : t('progress.sessionsMany')}
                </p>
            </div>
        </div>
    );
}
