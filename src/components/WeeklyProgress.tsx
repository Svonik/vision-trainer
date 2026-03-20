import type { SessionResult } from '@/modules/gameState';
import { t } from '@/modules/i18n';
import {
    computeWeeklySchedule,
    getDayStatus,
    toLocalDateString,
} from '@/modules/scheduleTracker';

interface WeeklyProgressProps {
    sessions: readonly SessionResult[];
}

const DAY_KEYS = [
    'schedule.days.mon',
    'schedule.days.tue',
    'schedule.days.wed',
    'schedule.days.thu',
    'schedule.days.fri',
    'schedule.days.sat',
    'schedule.days.sun',
] as const;

function getWeekDates(weekStart: string): string[] {
    const dates: string[] = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(toLocalDateString(d));
    }
    return dates;
}

export function WeeklyProgress({ sessions }: WeeklyProgressProps) {
    const schedule = computeWeeklySchedule(sessions);
    const weekDates = getWeekDates(schedule.weekStart);

    return (
        <div className="flex flex-col items-center gap-2 p-4">
            <div className="flex gap-2">
                {weekDates.map((date, i) => {
                    const status = getDayStatus(schedule, date);
                    return (
                        <div
                            key={date}
                            className="flex flex-col items-center gap-1"
                        >
                            <span className="text-xs text-[var(--text-secondary)]">
                                {t(DAY_KEYS[i])}
                            </span>
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    status === 'completed'
                                        ? 'bg-[var(--success)] text-[var(--bg)]'
                                        : status === 'rest'
                                          ? 'bg-[var(--border)] text-[var(--text-secondary)]'
                                          : status === 'missed'
                                            ? 'bg-[var(--red-soft)]/20 text-[var(--red-soft)]'
                                            : 'bg-[var(--surface)] text-[var(--text-secondary)]'
                                }`}
                            >
                                {status === 'completed'
                                    ? '\u2713'
                                    : status === 'rest'
                                      ? '\u00B7'
                                      : ''}
                            </div>
                        </div>
                    );
                })}
            </div>
            {schedule.currentStreak > 0 && (
                <div className="text-sm font-bold text-[var(--success)]">
                    {t('schedule.streak')}: {schedule.currentStreak}
                </div>
            )}
        </div>
    );
}
