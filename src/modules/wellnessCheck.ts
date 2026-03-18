import type { SessionResult } from './gameState';

export type WellnessLevel = 'good' | 'okay' | 'bad';

export interface WellnessCheck {
    readonly preSession: WellnessLevel;
    readonly postEyeStrain: boolean;
    readonly postHeadache: boolean;
    readonly timestamp: string;
}

export function shouldWarnBeforeSession(preLevel: WellnessLevel): boolean {
    return preLevel === 'bad';
}

export function hasAdverseSymptoms(check: WellnessCheck): boolean {
    return check.postEyeStrain || check.postHeadache;
}

export function getConsecutiveAdverseCount(
    sessions: readonly SessionResult[],
): number {
    let count = 0;
    for (let i = sessions.length - 1; i >= 0; i--) {
        const wellness = (sessions[i] as any).wellness as
            | WellnessCheck
            | null
            | undefined;
        if (!wellness) break;
        if (hasAdverseSymptoms(wellness)) {
            count++;
        } else {
            break;
        }
    }
    return count;
}

export function shouldAlertDoctor(sessions: readonly SessionResult[]): boolean {
    return getConsecutiveAdverseCount(sessions) >= 3;
}
