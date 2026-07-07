export type AgeGroup = '4-7' | '8-12';

export interface TherapyProtocol {
    readonly sessionDurationMs: number;
    readonly warningBeforeMs: number;
    readonly extensionMs: number;
    readonly maxExtensions: number;
    readonly recommendedDaysPerWeek: number;
    readonly recommendedCourseWeeks: number;
}

/**
 * Age-stratified session duration and course length — evidence-based protocol.
 * Full source list: SCIENCE.md (repo root).
 */
const PROTOCOLS: Record<AgeGroup, TherapyProtocol> = {
    /** 15 min sessions, 16-week course for preschoolers — Birch et al. 2020; Gambacorta et al. 2018 */
    '4-7': {
        sessionDurationMs: 900_000,
        warningBeforeMs: 60_000,
        extensionMs: 300_000,
        maxExtensions: 1,
        recommendedDaysPerWeek: 5,
        recommendedCourseWeeks: 16,
    },
    /** 25 min sessions, 12-week course for school-age children — Li et al. 2013; Holmes et al. 2016 (PEDIG ATS18) */
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
