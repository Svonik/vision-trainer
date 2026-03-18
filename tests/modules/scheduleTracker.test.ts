import { describe, it, expect } from 'vitest';
import { computeWeeklySchedule, getDayStatus, getWeekProgress, getCourseProgress } from '@/modules/scheduleTracker';
import type { SessionResult } from '@/modules/gameState';

function makeSession(dateStr: string): SessionResult {
  return {
    game: 'test', timestamp: new Date(dateStr + 'T12:00:00').toISOString(), duration_s: 300,
    caught: 10, total_spawned: 20, hit_rate: 0.5, contrast_left: 100,
    contrast_right: 30, speed: 'normal', eye_config: 'platform_left',
  } as SessionResult;
}

describe('scheduleTracker', () => {
  it('returns empty schedule for no sessions', () => {
    const schedule = computeWeeklySchedule([]);
    expect(schedule.courseStartDate).toBe('');
    expect(schedule.currentStreak).toBe(0);
    expect(schedule.totalWeeks).toBe(0);
    expect(schedule.completedDays).toEqual([]);
  });

  it('getWeekProgress returns fraction of target', () => {
    const schedule = { weekStart: '', targetDaysPerWeek: 5, completedDays: ['a', 'b', 'c'] as readonly string[], currentStreak: 0, totalWeeks: 0, courseStartDate: '' };
    expect(getWeekProgress(schedule)).toBeCloseTo(3 / 5);
  });

  it('getCourseProgress returns fraction of course', () => {
    const schedule = { weekStart: '', targetDaysPerWeek: 5, completedDays: [] as readonly string[], currentStreak: 0, totalWeeks: 6, courseStartDate: '' };
    expect(getCourseProgress(schedule, 12)).toBeCloseTo(6 / 12);
  });

  it('getCourseProgress returns 0 for 0 course weeks', () => {
    const schedule = { weekStart: '', targetDaysPerWeek: 5, completedDays: [] as readonly string[], currentStreak: 0, totalWeeks: 3, courseStartDate: '' };
    expect(getCourseProgress(schedule, 0)).toBe(0);
  });

  it('getDayStatus returns rest for weekends', () => {
    const schedule = { weekStart: '2026-03-16', targetDaysPerWeek: 5, completedDays: [] as readonly string[], currentStreak: 0, totalWeeks: 0, courseStartDate: '' };
    // 2026-03-21 is Saturday, 2026-03-22 is Sunday
    expect(getDayStatus(schedule, '2026-03-21')).toBe('rest');
    expect(getDayStatus(schedule, '2026-03-22')).toBe('rest');
  });
});
