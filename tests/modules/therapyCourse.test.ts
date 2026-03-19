import { describe, it, expect, beforeEach } from 'vitest';
import {
    getActiveCourse,
    startCourse,
    completeCourse,
    pauseCourse,
    getCourseProgress,
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

    it('calculates course progress', () => {
        const course = startCourse('8-12', 30);
        const progress = getCourseProgress(course);
        expect(progress.elapsedWeeks).toBeGreaterThanOrEqual(0);
        expect(progress.progressPercent).toBeGreaterThanOrEqual(0);
    });

    it('clamps progress percent to 100', () => {
        const pastCourse = startCourse('8-12', 30);
        // Simulate a course started long ago
        const oldCourse = {
            ...pastCourse,
            startDate: new Date(
                Date.now() - 20 * 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
        };
        const progress = getCourseProgress(oldCourse);
        expect(progress.progressPercent).toBe(100);
    });
});
