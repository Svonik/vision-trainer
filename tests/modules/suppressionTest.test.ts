import { describe, it, expect } from 'vitest';
import { createSuppressionTest, advanceContrast, recordResponse, computeResult } from '@/modules/suppressionTest';

describe('suppressionTest', () => {
  it('creates test at contrast 0', () => {
    const state = createSuppressionTest();
    expect(state.currentContrast).toBe(0);
    expect(state.step).toBe(5);
    expect(state.responses).toEqual([]);
  });

  it('advances contrast by step', () => {
    const state = createSuppressionTest();
    const next = advanceContrast(state);
    expect(next.currentContrast).toBe(5);
    expect(next).not.toBe(state);
  });

  it('caps contrast at 100', () => {
    let state = createSuppressionTest();
    for (let i = 0; i < 25; i++) { state = advanceContrast(state); }
    expect(state.currentContrast).toBe(100);
  });

  it('records response immutably', () => {
    const state = createSuppressionTest();
    const advanced = advanceContrast(state);
    const responded = recordResponse(advanced, false);
    expect(responded.responses.length).toBe(1);
    expect(responded.responses[0]).toEqual({ contrast: 5, seen: false });
    expect(advanced.responses.length).toBe(0);
  });

  it('computes result — balance point is first seen contrast', () => {
    let state = createSuppressionTest();
    for (let i = 0; i < 5; i++) { state = advanceContrast(state); state = recordResponse(state, false); }
    state = advanceContrast(state); state = recordResponse(state, true);
    const result = computeResult(state);
    expect(result.balancePoint).toBe(30);
    expect(result.suppressionDepth).toBe(30);
  });

  it('computes result — no suppression if seen at first step', () => {
    let state = createSuppressionTest();
    state = advanceContrast(state); state = recordResponse(state, true);
    const result = computeResult(state);
    expect(result.balancePoint).toBe(5);
    expect(result.suppressionDepth).toBe(5);
  });

  it('computes result — full suppression if never seen', () => {
    let state = createSuppressionTest();
    for (let i = 0; i < 20; i++) { state = advanceContrast(state); state = recordResponse(state, false); }
    const result = computeResult(state);
    expect(result.balancePoint).toBe(100);
    expect(result.suppressionDepth).toBe(100);
  });
});
