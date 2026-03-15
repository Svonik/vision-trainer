import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSafetyTimer } from '../../src/hooks/useSafetyTimer';

describe('useSafetyTimer', () => {
    beforeEach(() => { vi.useFakeTimers(); });

    it('starts and exposes canExtend', () => {
        const onWarning = vi.fn();
        const onBreak = vi.fn();
        const { result } = renderHook(() => useSafetyTimer({ onWarning, onBreak }));
        act(() => { result.current.start(); });
        expect(result.current.canExtend()).toBe(true);
    });

    it('stops cleanly on unmount', () => {
        const { unmount } = renderHook(() => useSafetyTimer({ onWarning: vi.fn(), onBreak: vi.fn() }));
        unmount(); // should not throw
    });
});
