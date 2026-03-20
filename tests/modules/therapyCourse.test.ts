import { beforeEach, describe, expect, it } from 'vitest';
import {
    completeCourse,
    getActiveCourse,
    getCourseProgress,
    pauseCourse,
    startCourse,
} from '@/modules/therapyCourse';

describe('therapyCourse', () => {
    beforeEach(() => localStorage.clear());

    it('returns null when no active course', () => {
        expect(getActiveCourse()).toBeNull();
    });

    it('starts a new course and persists it', () => {
        const course = startCourse('8-12', 30);
        expect(course.ageGroup).toBe('8-12');
        expect(course.initialFellowContrast).toBe(30);
        expect(course.status).toBe('active');
        expect(course.targetWeeks).toBe(12);
        expect(getActiveCourse()).toEqual(course);
    });

    it('starts a course for younger age group with correct target weeks', () => {
        const course = startCourse('4-7', 25);
        expect(course.ageGroup).toBe('4-7');
        expect(course.initialFellowContrast).toBe(25);
        expect(course.targetWeeks).toBe(16);
    });

    it('generates a unique id for each course', () => {
        const course1 = startCourse('4-7', 25);
        localStorage.clear();
        const course2 = startCourse('8-12', 30);
        expect(course1.id).not.toBe(course2.id);
    });

    it('sets startDate to current ISO date string', () => {
        const before = new Date().toISOString().slice(0, 10);
        const course = startCourse('8-12', 30);
        const after = new Date().toISOString().slice(0, 10);
        const courseDate = course.startDate.slice(0, 10);
        expect(courseDate >= before && courseDate <= after).toBe(true);
    });

    it('completes active course', () => {
        startCourse('4-7', 25);
        const completed = completeCourse();
        expect(completed?.status).toBe('completed');
        expect(getActiveCourse()).toBeNull();
    });

    it('completeCourse returns null when no active course', () => {
        expect(completeCourse()).toBeNull();
    });

    it('pauses active course', () => {
        startCourse('8-12', 30);
        const paused = pauseCourse();
        expect(paused?.status).toBe('paused');
        expect(getActiveCourse()).toBeNull();
    });

    it('pauseCourse returns null when no active course', () => {
        expect(pauseCourse()).toBeNull();
    });

    it('calculates course progress based on completed sessions', () => {
        const course = startCourse('8-12', 30);
        const progress = getCourseProgress(course, 10);
        expect(progress.elapsedWeeks).toBeGreaterThanOrEqual(0);
        expect(progress.targetSessions).toBe(60); // 12 weeks * 5
        expect(progress.completedSessions).toBe(10);
        expect(progress.progressPercent).toBe(17); // Math.round(10/60*100)
    });

    it('clamps progress percent to 100 when sessions exceed target', () => {
        const course = startCourse('8-12', 30);
        // 12 weeks * 5 = 60 target, pass 80 completed
        const progress = getCourseProgress(course, 80);
        expect(progress.progressPercent).toBe(100);
    });

    it('returns 0 progress when no sessions completed', () => {
        const course = startCourse('8-12', 30);
        const progress = getCourseProgress(course, 0);
        expect(progress.progressPercent).toBe(0);
        expect(progress.completedSessions).toBe(0);
    });
});
