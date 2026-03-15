import { SAFETY } from '../config/constants.js';

export const createSafetyTimer = ({ onWarning, onBreak }) => {
  let startTime = null;
  let pausedAt = null;
  let totalPausedMs = 0;
  let warningFired = false;
  let breakFired = false;
  let extensions = 0;
  let breakTimeMs = SAFETY.BREAK_TIME_MS;
  let intervalId = null;

  const getElapsedMs = () => {
    if (!startTime) return 0;
    const now = pausedAt || Date.now();
    return now - startTime - totalPausedMs;
  };

  const check = () => {
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

  const start = () => {
    startTime = Date.now();
    pausedAt = null;
    totalPausedMs = 0;
    warningFired = false;
    breakFired = false;
    extensions = 0;
    breakTimeMs = SAFETY.BREAK_TIME_MS;
    intervalId = setInterval(check, 1000);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const pause = () => {
    if (!pausedAt && startTime) {
      pausedAt = Date.now();
    }
  };

  const resume = () => {
    if (pausedAt) {
      totalPausedMs += Date.now() - pausedAt;
      pausedAt = null;
    }
  };

  const canExtend = () => extensions < SAFETY.MAX_EXTENSIONS;

  const extend = () => {
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
