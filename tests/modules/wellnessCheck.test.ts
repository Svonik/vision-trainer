import { describe, it, expect } from 'vitest';
import { shouldWarnBeforeSession, hasAdverseSymptoms, getConsecutiveAdverseCount, shouldAlertDoctor, type WellnessCheck } from '@/modules/wellnessCheck';
import type { SessionResult } from '@/modules/gameState';

function makeSessionWithWellness(wellness: WellnessCheck | null): SessionResult {
  return {
    game: 'test', timestamp: new Date().toISOString(), duration_s: 300,
    caught: 10, total_spawned: 20, hit_rate: 0.5, contrast_left: 100,
    contrast_right: 30, speed: 'normal', eye_config: 'platform_left',
    wellness,
  } as SessionResult;
}

describe('wellnessCheck', () => {
  it('warns before session when feeling bad', () => {
    expect(shouldWarnBeforeSession('bad')).toBe(true);
    expect(shouldWarnBeforeSession('good')).toBe(false);
    expect(shouldWarnBeforeSession('okay')).toBe(false);
  });

  it('detects adverse symptoms', () => {
    expect(hasAdverseSymptoms({ preSession: 'good', postEyeStrain: true, postHeadache: false, timestamp: '' })).toBe(true);
    expect(hasAdverseSymptoms({ preSession: 'good', postEyeStrain: false, postHeadache: true, timestamp: '' })).toBe(true);
    expect(hasAdverseSymptoms({ preSession: 'good', postEyeStrain: false, postHeadache: false, timestamp: '' })).toBe(false);
  });

  it('counts consecutive adverse sessions from end', () => {
    const sessions = [
      makeSessionWithWellness({ preSession: 'good', postEyeStrain: false, postHeadache: false, timestamp: '' }),
      makeSessionWithWellness({ preSession: 'good', postEyeStrain: true, postHeadache: false, timestamp: '' }),
      makeSessionWithWellness({ preSession: 'okay', postEyeStrain: true, postHeadache: true, timestamp: '' }),
    ];
    expect(getConsecutiveAdverseCount(sessions)).toBe(2);
  });

  it('returns 0 for no adverse symptoms', () => {
    const sessions = [
      makeSessionWithWellness({ preSession: 'good', postEyeStrain: false, postHeadache: false, timestamp: '' }),
    ];
    expect(getConsecutiveAdverseCount(sessions)).toBe(0);
  });

  it('alerts doctor after 3+ consecutive adverse', () => {
    const sessions = [
      makeSessionWithWellness({ preSession: 'good', postEyeStrain: true, postHeadache: false, timestamp: '' }),
      makeSessionWithWellness({ preSession: 'okay', postEyeStrain: true, postHeadache: false, timestamp: '' }),
      makeSessionWithWellness({ preSession: 'good', postEyeStrain: false, postHeadache: true, timestamp: '' }),
    ];
    expect(shouldAlertDoctor(sessions)).toBe(true);
  });

  it('skips sessions without wellness data', () => {
    const sessions = [makeSessionWithWellness(null), makeSessionWithWellness(null)];
    expect(getConsecutiveAdverseCount(sessions)).toBe(0);
  });
});
