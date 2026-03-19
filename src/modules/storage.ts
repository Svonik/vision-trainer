import { CURRENT_VERSION, STORAGE_KEYS } from './constants';

export interface CalibrationData {
    suppression_passed: boolean;
    last_calibrated: string | null;
    glasses_type: string;
    age_group: '4-7' | '8-12';
    weak_eye: 'left' | 'right';
}

export interface DefaultSettings {
    speed: string;
    eyeConfig: string;
    fellowEyeContrast: number;
}

const DEFAULT_CALIBRATION: CalibrationData = {
    suppression_passed: false,
    last_calibrated: null,
    glasses_type: 'red-cyan',
    age_group: '8-12',
    weak_eye: 'left',
};

const DEFAULT_SETTINGS: DefaultSettings = {
    speed: 'slow',
    eyeConfig: 'platform_left',
    fellowEyeContrast: 30,
};

const read = (key: string): unknown => {
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

export const isStorageAvailable = (): boolean => {
    try {
        const test = '__vt_test__';
        localStorage.setItem(test, '1');
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
};

export const initStorage = (): void => {
    const version = read(STORAGE_KEYS.VERSION);
    if (!version) {
        write(STORAGE_KEYS.VERSION, CURRENT_VERSION);
        write(STORAGE_KEYS.DISCLAIMER, false);
        write(STORAGE_KEYS.CALIBRATION, DEFAULT_CALIBRATION);
        write(STORAGE_KEYS.SESSIONS, []);
    }
};

export const isDisclaimerAccepted = (): boolean =>
    read(STORAGE_KEYS.DISCLAIMER) === true;

export const acceptDisclaimer = (): void =>
    write(STORAGE_KEYS.DISCLAIMER, true);

export const getCalibration = (): CalibrationData => {
    const stored = read(
        STORAGE_KEYS.CALIBRATION,
    ) as Partial<CalibrationData> | null;
    return { ...DEFAULT_CALIBRATION, ...(stored || {}) };
};

export const saveCalibration = (cal: CalibrationData): void =>
    write(STORAGE_KEYS.CALIBRATION, cal);

export const getSessions = (): unknown[] =>
    (read(STORAGE_KEYS.SESSIONS) as unknown[] | null) || [];

export const writeSessions = (sessions: unknown[]): void => {
    write(STORAGE_KEYS.SESSIONS, sessions);
};

export const addSession = (session: unknown): void => {
    const sessions = getSessions();
    write(STORAGE_KEYS.SESSIONS, [...sessions, session]);
};

export const getDefaultSettings = (): DefaultSettings => {
    const stored = read(
        STORAGE_KEYS.DEFAULT_SETTINGS,
    ) as Partial<DefaultSettings> | null;
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
};

export const saveDefaultSettings = (settings: DefaultSettings): void =>
    write(STORAGE_KEYS.DEFAULT_SETTINGS, settings);
