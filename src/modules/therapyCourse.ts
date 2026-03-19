import { getProtocol, type AgeGroup } from './therapyProtocol';

const STORAGE_KEY = 'vt_active_course';

export interface TherapyCourse {
    readonly id: string;
    readonly startDate: string;
    readonly ageGroup: AgeGroup;
    readonly initialFellowContrast: number;
    readonly targetWeeks: number;
    readonly status: 'active' | 'completed' | 'paused';
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getActiveCourse(): TherapyCourse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        const course: TherapyCourse = JSON.parse(raw);
        return course.status === 'active' ? course : null;
    } catch {
        return null;
    }
}

export function startCourse(
    ageGroup: AgeGroup,
    initialFellowContrast: number
): TherapyCourse {
    const protocol = getProtocol(ageGroup);
    const course: TherapyCourse = {
        id: generateId(),
        startDate: new Date().toISOString(),
        ageGroup,
        initialFellowContrast,
        targetWeeks: protocol.recommendedCourseWeeks,
        status: 'active',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(course));
    return course;
}

export function completeCourse(): TherapyCourse | null {
    const course = getActiveCourse();
    if (!course) return null;

    const completed: TherapyCourse = { ...course, status: 'completed' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    return completed;
}

export function pauseCourse(): TherapyCourse | null {
    const course = getActiveCourse();
    if (!course) return null;

    const paused: TherapyCourse = { ...course, status: 'paused' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paused));
    return paused;
}

export function getCourseProgress(course: TherapyCourse): {
    elapsedWeeks: number;
    progressPercent: number;
} {
    const startMs = new Date(course.startDate).getTime();
    const elapsedMs = Date.now() - startMs;
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const elapsedWeeks = Math.max(0, Math.floor(elapsedMs / msPerWeek));
    const progressPercent = Math.min(
        100,
        Math.round((elapsedWeeks / course.targetWeeks) * 100)
    );

    return { elapsedWeeks, progressPercent };
}
