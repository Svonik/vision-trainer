import { describe, it, expect } from 'vitest';
import {
  createContrastState,
  createContrastConfig,
  recordTrial,
  getAccuracy,
  getContrastProgress,
} from '@/modules/contrastEngine';
import { CLINICAL_CONTRAST } from '@/modules/constants';

describe('contrastEngine', () => {
  const config = createContrastConfig();

  describe('createContrastState', () => {
    it('creates state with given initial fellow contrast', () => {
      const state = createContrastState(30);
      expect(state.fellowEyeContrast).toBe(30);
      expect(state.amblyopicEyeContrast).toBe(100);
      expect(state.rollingWindow).toEqual([]);
      expect(state.totalTrials).toBe(0);
      expect(state.totalHits).toBe(0);
      expect(state.lastStepDirection).toBeNull();
    });

    it('clamps initial contrast to floor', () => {
      const state = createContrastState(5);
      expect(state.fellowEyeContrast).toBe(CLINICAL_CONTRAST.FELLOW_FLOOR);
    });

    it('clamps initial contrast to ceiling', () => {
      const state = createContrastState(120);
      expect(state.fellowEyeContrast).toBe(CLINICAL_CONTRAST.FELLOW_CEILING);
    });
  });

  describe('createContrastConfig', () => {
    it('reads defaults from CLINICAL_CONTRAST', () => {
      expect(config.windowSize).toBe(20);
      expect(config.stepSize).toBe(5);
      expect(config.stepUpThreshold).toBe(0.75);
      expect(config.stepDownThreshold).toBe(0.50);
      expect(config.floor).toBe(15);
      expect(config.ceiling).toBe(100);
    });
  });

  describe('recordTrial', () => {
    it('adds hit to rolling window', () => {
      const state = createContrastState(30);
      const next = recordTrial(state, config, true);
      expect(next.rollingWindow).toEqual([true]);
      expect(next.totalTrials).toBe(1);
      expect(next.totalHits).toBe(1);
    });

    it('adds miss to rolling window', () => {
      const state = createContrastState(30);
      const next = recordTrial(state, config, false);
      expect(next.rollingWindow).toEqual([false]);
      expect(next.totalTrials).toBe(1);
      expect(next.totalHits).toBe(0);
    });

    it('returns new object (immutable)', () => {
      const state = createContrastState(30);
      const next = recordTrial(state, config, true);
      expect(next).not.toBe(state);
      expect(state.rollingWindow).toEqual([]);
    });

    it('trims window to windowSize', () => {
      let state = createContrastState(30);
      for (let i = 0; i < 25; i++) {
        state = recordTrial(state, config, true);
      }
      expect(state.rollingWindow.length).toBe(config.windowSize);
      expect(state.totalTrials).toBe(25);
    });

    it('does NOT step up before window is full', () => {
      let state = createContrastState(30);
      for (let i = 0; i < 15; i++) {
        state = recordTrial(state, config, true);
      }
      expect(state.fellowEyeContrast).toBe(30);
      expect(state.lastStepDirection).toBeNull();
    });

    it('steps UP fellow contrast when accuracy > 75% and window full', () => {
      let state = createContrastState(30);
      for (let i = 0; i < 16; i++) {
        state = recordTrial(state, config, true);
      }
      for (let i = 0; i < 4; i++) {
        state = recordTrial(state, config, false);
      }
      expect(state.fellowEyeContrast).toBe(35);
      expect(state.lastStepDirection).toBe('up');
    });

    it('steps DOWN fellow contrast when accuracy < 50% and window full', () => {
      let state = createContrastState(30);
      for (let i = 0; i < 9; i++) {
        state = recordTrial(state, config, true);
      }
      for (let i = 0; i < 11; i++) {
        state = recordTrial(state, config, false);
      }
      expect(state.fellowEyeContrast).toBe(25);
      expect(state.lastStepDirection).toBe('down');
    });

    it('does NOT step when accuracy is between thresholds', () => {
      let state = createContrastState(30);
      for (let i = 0; i < 12; i++) {
        state = recordTrial(state, config, true);
      }
      for (let i = 0; i < 8; i++) {
        state = recordTrial(state, config, false);
      }
      expect(state.fellowEyeContrast).toBe(30);
    });

    it('respects ceiling — does not exceed 100', () => {
      let state = createContrastState(100);
      for (let i = 0; i < 20; i++) {
        state = recordTrial(state, config, true);
      }
      expect(state.fellowEyeContrast).toBe(100);
    });

    it('respects floor — does not go below 15', () => {
      let state = createContrastState(15);
      for (let i = 0; i < 20; i++) {
        state = recordTrial(state, config, false);
      }
      expect(state.fellowEyeContrast).toBe(15);
    });
  });

  describe('getAccuracy', () => {
    it('returns 0 for empty window', () => {
      const state = createContrastState(30);
      expect(getAccuracy(state)).toBe(0);
    });

    it('returns correct accuracy', () => {
      let state = createContrastState(30);
      state = recordTrial(state, config, true);
      state = recordTrial(state, config, false);
      state = recordTrial(state, config, true);
      expect(getAccuracy(state)).toBeCloseTo(2 / 3);
    });
  });

  describe('getContrastProgress', () => {
    it('returns 0 at floor', () => {
      const state = createContrastState(15);
      expect(getContrastProgress(state, config)).toBe(0);
    });

    it('returns 1 at ceiling', () => {
      const state = createContrastState(100);
      expect(getContrastProgress(state, config)).toBe(1);
    });

    it('returns fractional progress', () => {
      const state = createContrastState(57.5);
      const progress = getContrastProgress(state, config);
      expect(progress).toBeCloseTo((57.5 - 15) / (100 - 15));
    });
  });
});
