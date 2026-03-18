import { SAFETY } from './constants';
import type { TherapyProtocol } from './therapyProtocol';

interface SafetyTimerCallbacks {
    onWarning: () => void;
    onBreak: () => void;
    protocol?: TherapyProtocol;
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

export const createSafetyTimer = ({
    onWarning,
    onBreak,
    protocol,
}: SafetyTimerCallbacks): SafetyTimer => {
    const sessionDurationMs =
        protocol?.sessionDurationMs ?? SAFETY.BREAK_TIME_MS;
    const warningBeforeMs =
        protocol?.warningBeforeMs ?? SAFETY.WARNING_BEFORE_MS;
    const extensionMs = protocol?.extensionMs ?? SAFETY.EXTENSION_MS;
    const maxExtensions = protocol?.maxExtensions ?? SAFETY.MAX_EXTENSIONS;

    let startTime: number | null = null;
    let pausedAt: number | null = null;
    let totalPausedMs = 0;
    let warningFired = false;
    let breakFired = false;
    let extensions = 0;
    let breakTimeMs = sessionDurationMs;
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
        const warningAt = breakTimeMs - warningBeforeMs;

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
        breakTimeMs = sessionDurationMs;
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

    const canExtend = (): boolean => extensions < maxExtensions;

    const extend = (): void => {
        if (canExtend()) {
            extensions += 1;
            breakTimeMs += extensionMs;
            breakFired = false;
            warningFired = false;
            if (!intervalId) {
                intervalId = setInterval(check, 1000);
            }
        }
    };

    return { start, stop, pause, resume, getElapsedMs, canExtend, extend };
};
