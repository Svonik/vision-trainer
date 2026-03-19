import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCalibration } from '../../src/hooks/useCalibration';

describe('useCalibration', () => {
    beforeEach(() => localStorage.clear());

    it('returns defaults', () => {
        const { result } = renderHook(() => useCalibration());
        expect(result.current.attempts).toBe(0);
        expect(result.current.passed).toBe(false);
    });

    it('records pass', () => {
        const { result } = renderHook(() => useCalibration());
        act(() => {
            result.current.pass();
        });
        expect(result.current.passed).toBe(true);
    });

    it('returns default glasses type', () => {
        const { result } = renderHook(() => useCalibration());
        expect(result.current.glassesType).toBe('red-cyan');
    });
});
