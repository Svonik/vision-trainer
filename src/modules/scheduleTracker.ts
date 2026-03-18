import type { SessionResult } from './gameState';

export interface WeeklySchedule {
    readonly weekStart: string;
    readonly targetDaysPerWeek: number;
    readonly completedDays: readonly string[];
    readonly currentStreak: number;
    readonly totalWeeks: number;
    readonly courseStartDate: string;
}

function getMonday(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff)
        .toISOString()
        .slice(0, 10);
}

function computeStreak(sortedDays: readonly string[]): number {
    if (sortedDays.length === 0) return 0;
    const today = new Date().toISOString().slice(0, 10);
    if (sortedDays[sortedDays.length - 1] !== today) return 0;
    let streak = 1;
    for (let i = sortedDays.length - 2; i >= 0; i--) {
        const curr = new Date(sortedDays[i + 1]);
        const prev = new Date(sortedDays[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

export function computeWeeklySchedule(
    sessions: readonly SessionResult[],
): WeeklySchedule {
    if (sessions.length === 0) {
        return {
            weekStart: getMonday(new Date()),
            targetDaysPerWeek: 5,
            completedDays: [],
            currentStreak: 0,
            totalWeeks: 0,
            courseStartDate: '',
        };
    }

    const allDays = [
        ...new Set(
            sessions.map((s) =>
                new Date(s.timestamp).toISOString().slice(0, 10),
            ),
        ),
    ].sort();

    const weekStart = getMonday(new Date());
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);

    const completedDays = allDays.filter((d) => d >= weekStart && d < weekEnd);
    const courseStartDate = allDays[0];
    const firstDate = new Date(courseStartDate);
    const now = new Date();
    const totalWeeks = Math.max(
        1,
        Math.ceil(
            (now.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        ),
    );

    return {
        weekStart,
        targetDaysPerWeek: 5,
        completedDays,
        currentStreak: computeStreak(allDays),
        totalWeeks,
        courseStartDate,
    };
}

export function getDayStatus(
    schedule: WeeklySchedule,
    date: string,
): 'completed' | 'rest' | 'pending' | 'missed' {
    const dayStr = date.slice(0, 10);
    if (schedule.completedDays.includes(dayStr)) return 'completed';
    const dayOfWeek = new Date(dayStr).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'rest';
    const today = new Date().toISOString().slice(0, 10);
    if (dayStr < today) return 'missed';
    return 'pending';
}

export function getWeekProgress(schedule: WeeklySchedule): number {
    if (schedule.targetDaysPerWeek === 0) return 0;
    return schedule.completedDays.length / schedule.targetDaysPerWeek;
}

export function getCourseProgress(
    schedule: WeeklySchedule,
    courseWeeks: number,
): number {
    if (courseWeeks === 0) return 0;
    return schedule.totalWeeks / courseWeeks;
}
