// @ts-nocheck
import { STORAGE_KEYS, CURRENT_VERSION } from './constants';

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      window.dispatchEvent(new CustomEvent('storage-quota-exceeded'));
    }
    console.warn(`Failed to write to localStorage key: ${key}`);
  }
};

export const isStorageAvailable = () => {
  try {
    const test = '__vt_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const initStorage = () => {
  const version = read(STORAGE_KEYS.VERSION);
  if (!version) {
    write(STORAGE_KEYS.VERSION, CURRENT_VERSION);
    write(STORAGE_KEYS.DISCLAIMER, false);
    write(STORAGE_KEYS.CALIBRATION, {
      red_brightness: 100,
      cyan_brightness: 100,
      suppression_passed: false,
      last_calibrated: null,
      glasses_type: 'red-cyan',
    });
    write(STORAGE_KEYS.SESSIONS, []);
  }
};

export const isDisclaimerAccepted = () => read(STORAGE_KEYS.DISCLAIMER) === true;

export const acceptDisclaimer = () => write(STORAGE_KEYS.DISCLAIMER, true);

export const getCalibration = () =>
  read(STORAGE_KEYS.CALIBRATION) || {
    red_brightness: 100,
    cyan_brightness: 100,
    suppression_passed: false,
    last_calibrated: null,
    glasses_type: 'red-cyan',
  };

export const saveCalibration = (cal) => write(STORAGE_KEYS.CALIBRATION, cal);

export const getSessions = () => read(STORAGE_KEYS.SESSIONS) || [];

export const writeSessions = (sessions: unknown[]): void => {
    write(STORAGE_KEYS.SESSIONS, sessions);
};

export const addSession = (session) => {
  const sessions = getSessions();
  write(STORAGE_KEYS.SESSIONS, [...sessions, session]);
};

export const getDefaultSettings = () =>
  read(STORAGE_KEYS.DEFAULT_SETTINGS) || {
    contrastLeft: 100,
    contrastRight: 100,
    speed: 'slow',
    eyeConfig: 'platform_left',
  };

export const saveDefaultSettings = (settings) =>
  write(STORAGE_KEYS.DEFAULT_SETTINGS, settings);
