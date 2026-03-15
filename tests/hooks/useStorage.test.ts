import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStorage } from '../../src/hooks/useStorage';

describe('useStorage', () => {
    beforeEach(() => localStorage.clear());

    it('returns null for missing key', () => {
        const { result } = renderHook(() => useStorage('test_key'));
        expect(result.current[0]).toBeNull();
    });

    it('reads existing value', () => {
        localStorage.setItem('test_key', JSON.stringify({ a: 1 }));
        const { result } = renderHook(() => useStorage('test_key'));
        expect(result.current[0]).toEqual({ a: 1 });
    });

    it('writes and reads back', () => {
        const { result } = renderHook(() => useStorage('test_key'));
        act(() => { result.current[1]({ b: 2 }); });
        expect(result.current[0]).toEqual({ b: 2 });
        expect(JSON.parse(localStorage.getItem('test_key')!)).toEqual({ b: 2 });
    });
});
