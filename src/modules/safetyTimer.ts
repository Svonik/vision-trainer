import { SAFETY } from './constants';

interface SafetyTimerCallbacks {
    onWarning: () => void;
    onBreak: () => void;
}

export interface SafetyTimer {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    getElapsedMs: () => number;
    canExtend: () => boolean;
    extend: () => void;
}

export const createSafetyTimer = ({ onWarning, onBreak }: SafetyTimerCallbacks): SafetyTimer => {
    let startTime: number | null = null;
    let pausedAt: number | null = null;
    let totalPausedMs = 0;
    let warningFired = false;
    let breakFired = false;
    let extensions = 0;
    let breakTimeMs = SAFETY.BREAK_TIME_MS;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const getElapsedMs = (): number => {
        if (!startTime) return 0;
        const now = pausedAt || Date.now();
        return now - startTime - totalPausedMs;
    };

    const stop = (): void => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };

    const check = (): void => {
        const elapsed = getElapsedMs();
        const warningAt = breakTimeMs - SAFETY.WARNING_BEFORE_MS;

        if (!warningFired && elapsed >= warningAt) {
            warningFired = true;
            onWarning();
        }
        if (!breakFired && elapsed >= breakTimeMs) {
            breakFired = true;
            onBreak();
            stop();
        }
    };

    const start = (): void => {
        startTime = Date.now();
        pausedAt = null;
        totalPausedMs = 0;
        warningFired = false;
        breakFired = false;
        extensions = 0;
        breakTimeMs = SAFETY.BREAK_TIME_MS;
        intervalId = setInterval(check, 1000);
    };

    const pause = (): void => {
        if (!pausedAt && startTime) {
            pausedAt = Date.now();
        }
    };

    const resume = (): void => {
        if (pausedAt) {
            totalPausedMs += Date.now() - pausedAt;
            pausedAt = null;
        }
    };

    const canExtend = (): boolean => extensions < SAFETY.MAX_EXTENSIONS;

    const extend = (): void => {
        if (canExtend()) {
            extensions += 1;
            breakTimeMs += SAFETY.EXTENSION_MS;
            breakFired = false;
            warningFired = false;
            if (!intervalId) {
                intervalId = setInterval(check, 1000);
            }
        }
    };

    return { start, stop, pause, resume, getElapsedMs, canExtend, extend };
};
