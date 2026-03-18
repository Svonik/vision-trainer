import { CLINICAL_CONTRAST } from './constants';
import type { SessionResult } from './gameState';

export interface SessionSummary {
    readonly stars: 1 | 2 | 3;
    readonly streakDays: number;
    readonly contrastProgress: number;
    readonly totalTherapyMinutes: number;
    readonly weeklySessionCount: number;
    readonly isNewRecord: boolean;
}

function computeStars(hitRate: number): 1 | 2 | 3 {
    if (hitRate >= 0.80) return 3;
    if (hitRate >= 0.60) return 2;
    return 1;
}

function computeStreakDays(allTimestamps: readonly string[]): number {
    if (allTimestamps.length === 0) return 0;

    const uniqueDays = [...new Set(
        allTimestamps.map(ts => new Date(ts).toISOString().slice(0, 10))
    )].sort().reverse();

    const today = new Date().toISOString().slice(0, 10);
    if (uniqueDays[0] !== today) return 0;

    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
        const current = new Date(uniqueDays[i - 1]);
        const prev = new Date(uniqueDays[i]);
        const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.round(diffDays) === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
}

export function computeSessionSummary(
    currentResult: SessionResult,
    allSessions: readonly SessionResult[]
): SessionSummary {
    const allIncludingCurrent = [...allSessions, currentResult];

    const stars = computeStars(currentResult.hit_rate);

    const allTimestamps = allIncludingCurrent.map(s => s.timestamp);
    const streakDays = computeStreakDays(allTimestamps);

    const fellowEnd = currentResult.fellow_contrast_end ?? CLINICAL_CONTRAST.FELLOW_INITIAL;
    const range = CLINICAL_CONTRAST.FELLOW_CEILING - CLINICAL_CONTRAST.FELLOW_FLOOR;
    const contrastProgress = range > 0
        ? ((fellowEnd - CLINICAL_CONTRAST.FELLOW_FLOOR) / range) * 100
        : 0;

    const totalSeconds = allIncludingCurrent.reduce((sum, s) => sum + s.duration_s, 0);
    const totalTherapyMinutes = Math.round(totalSeconds / 60);

    const weekStart = getWeekStart();
    const weeklySessionCount = allIncludingCurrent.filter(
        s => new Date(s.timestamp) >= weekStart
    ).length;

    const sameGameSessions = allSessions.filter(s => s.game === currentResult.game);
    const bestPreviousAccuracy = sameGameSessions.length > 0
        ? Math.max(...sameGameSessions.map(s => s.hit_rate))
        : 0;
    const isNewRecord = currentResult.hit_rate > bestPreviousAccuracy && sameGameSessions.length > 0;

    return {
        stars,
        streakDays,
        contrastProgress,
        totalTherapyMinutes,
        weeklySessionCount,
        isNewRecord,
    };
}
