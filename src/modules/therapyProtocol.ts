export type AgeGroup = '4-7' | '8-12';

export interface TherapyProtocol {
    readonly sessionDurationMs: number;
    readonly warningBeforeMs: number;
    readonly extensionMs: number;
    readonly maxExtensions: number;
    readonly recommendedDaysPerWeek: number;
    readonly recommendedCourseWeeks: number;
}

const PROTOCOLS: Record<AgeGroup, TherapyProtocol> = {
    '4-7': {
        sessionDurationMs: 900_000,
        warningBeforeMs: 60_000,
        extensionMs: 300_000,
        maxExtensions: 1,
        recommendedDaysPerWeek: 5,
        recommendedCourseWeeks: 16,
    },
    '8-12': {
        sessionDurationMs: 1_500_000,
        warningBeforeMs: 60_000,
        extensionMs: 300_000,
        maxExtensions: 1,
        recommendedDaysPerWeek: 5,
        recommendedCourseWeeks: 12,
    },
};

export function getProtocol(ageGroup: AgeGroup): TherapyProtocol {
    return PROTOCOLS[ageGroup];
}
