import { describe, it, expect } from 'vitest';
import { getProtocol } from '@/modules/therapyProtocol';

describe('therapyProtocol', () => {
  it('returns 15 min session for age group 4-7', () => {
    const protocol = getProtocol('4-7');
    expect(protocol.sessionDurationMs).toBe(900_000);
    expect(protocol.warningBeforeMs).toBe(60_000);
    expect(protocol.extensionMs).toBe(300_000);
    expect(protocol.maxExtensions).toBe(1);
    expect(protocol.recommendedDaysPerWeek).toBe(5);
    expect(protocol.recommendedCourseWeeks).toBe(16);
  });

  it('returns 25 min session for age group 8-12', () => {
    const protocol = getProtocol('8-12');
    expect(protocol.sessionDurationMs).toBe(1_500_000);
    expect(protocol.warningBeforeMs).toBe(60_000);
    expect(protocol.extensionMs).toBe(300_000);
    expect(protocol.maxExtensions).toBe(1);
    expect(protocol.recommendedDaysPerWeek).toBe(5);
    expect(protocol.recommendedCourseWeeks).toBe(12);
  });
});
