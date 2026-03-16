import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalibration } from '../../src/hooks/useCalibration';

describe('useCalibration', () => {
    beforeEach(() => localStorage.clear());

    it('returns defaults', () => {
        const { result } = renderHook(() => useCalibration());
        expect(result.current.redBrightness).toBe(100);
        expect(result.current.cyanBrightness).toBe(100);
        expect(result.current.attempts).toBe(0);
        expect(result.current.passed).toBe(false);
    });

    it('updates brightness', () => {
        const { result } = renderHook(() => useCalibration());
        act(() => { result.current.setRedBrightness(80); });
        expect(result.current.redBrightness).toBe(80);
    });

    it('records pass', () => {
        const { result } = renderHook(() => useCalibration());
        act(() => { result.current.pass(); });
        expect(result.current.passed).toBe(true);
    });

    it('returns default glasses type', () => {
        const { result } = renderHook(() => useCalibration());
        expect(result.current.glassesType).toBe('red-cyan');
    });
});
