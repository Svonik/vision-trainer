import { describe, it, expect } from 'vitest';
import { computeSessionSummary } from '@/modules/sessionSummary';
import type { SessionResult } from '@/modules/gameState';

function makeSession(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    game: 'binocular-catcher',
    timestamp: new Date().toISOString(),
    duration_s: 300,
    caught: 15,
    total_spawned: 20,
    hit_rate: 0.75,
    contrast_left: 100,
    contrast_right: 30,
    speed: 'normal',
    eye_config: 'platform_left',
    fellow_contrast_start: 30,
    fellow_contrast_end: 35,
    window_accuracy: 0.75,
    total_trials: 20,
    ...overrides,
  };
}

describe('computeSessionSummary', () => {
  it('returns 3 stars for accuracy >= 80%', () => {
    const current = makeSession({ hit_rate: 0.85 });
    const summary = computeSessionSummary(current, []);
    expect(summary.stars).toBe(3);
  });

  it('returns 2 stars for accuracy >= 60%', () => {
    const current = makeSession({ hit_rate: 0.65 });
    const summary = computeSessionSummary(current, []);
    expect(summary.stars).toBe(2);
  });

  it('returns 1 star for accuracy < 60%', () => {
    const current = makeSession({ hit_rate: 0.40 });
    const summary = computeSessionSummary(current, []);
    expect(summary.stars).toBe(1);
  });

  it('computes contrast progress toward ceiling', () => {
    const current = makeSession({ fellow_contrast_end: 57.5 });
    const summary = computeSessionSummary(current, []);
    expect(summary.contrastProgress).toBeCloseTo((57.5 - 15) / (100 - 15) * 100);
  });

  it('detects new record accuracy for game', () => {
    const oldSession = makeSession({ hit_rate: 0.70, game: 'breakout' });
    const current = makeSession({ hit_rate: 0.90, game: 'breakout' });
    const summary = computeSessionSummary(current, [oldSession]);
    expect(summary.isNewRecord).toBe(true);
  });

  it('calculates total therapy minutes', () => {
    const s1 = makeSession({ duration_s: 600 });
    const s2 = makeSession({ duration_s: 900 });
    const current = makeSession({ duration_s: 300 });
    const summary = computeSessionSummary(current, [s1, s2]);
    expect(summary.totalTherapyMinutes).toBe(30);
  });
});
