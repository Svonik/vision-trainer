import { STORAGE_KEYS, CURRENT_VERSION } from '../config/constants.js';

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
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
  };

export const saveCalibration = (cal) => write(STORAGE_KEYS.CALIBRATION, cal);

export const getSessions = () => read(STORAGE_KEYS.SESSIONS) || [];

export const addSession = (session) => {
  const sessions = getSessions();
  write(STORAGE_KEYS.SESSIONS, [...sessions, session]);
};
