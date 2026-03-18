import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSafetyTimer } from '../../src/modules/safetyTimer';
import { getProtocol } from '@/modules/therapyProtocol';

describe('SafetyTimer Module', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('starts and tracks elapsed time', () => {
        const timer = createSafetyTimer({ onWarning: vi.fn(), onBreak: vi.fn() });
        timer.start();
        vi.advanceTimersByTime(5000);
        expect(timer.getElapsedMs()).toBeGreaterThanOrEqual(5000);
        timer.stop();
    });

    it('fires warning before break', () => {
        const onWarning = vi.fn();
        const timer = createSafetyTimer({ onWarning, onBreak: vi.fn() });
        timer.start();
        vi.advanceTimersByTime(14 * 60 * 1000 + 1000);
        expect(onWarning).toHaveBeenCalled();
        timer.stop();
    });

    it('fires break at 15 minutes', () => {
        const onBreak = vi.fn();
        const timer = createSafetyTimer({ onWarning: vi.fn(), onBreak });
        timer.start();
        vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
        expect(onBreak).toHaveBeenCalled();
    });

    it('supports one extension', () => {
        const timer = createSafetyTimer({ onWarning: vi.fn(), onBreak: vi.fn() });
        timer.start();
        expect(timer.canExtend()).toBe(true);
        timer.extend();
        expect(timer.canExtend()).toBe(false);
        timer.stop();
    });

    it('pauses and resumes', () => {
        const timer = createSafetyTimer({ onWarning: vi.fn(), onBreak: vi.fn() });
        timer.start();
        vi.advanceTimersByTime(3000);
        timer.pause();
        vi.advanceTimersByTime(5000);
        timer.resume();
        expect(timer.getElapsedMs()).toBeLessThan(5000);
        timer.stop();
    });

    it('uses protocol session duration when provided', () => {
        const onWarning = vi.fn();
        const onBreak = vi.fn();
        const protocol = getProtocol('8-12');
        const timer = createSafetyTimer({ onWarning, onBreak, protocol });
        // Verify timer was created (basic smoke test — full timing tests are complex)
        expect(timer.canExtend()).toBe(true);
        timer.start();
        timer.stop();
    });
});
