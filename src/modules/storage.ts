import {
    clampFellowEyeContrast,
    CURRENT_VERSION,
    STORAGE_KEYS,
} from './constants';

export type AmblyopiaType =
    | 'strabismus'
    | 'anisometropia'
    | 'mixed'
    | 'unspecified';

export interface CalibrationData {
    suppression_passed: boolean;
    deep_suppression: boolean;
    last_calibrated: string | null;
    glasses_type: string;
    age_group: '4-7' | '8-12';
    weak_eye: 'left' | 'right';
    amblyopia_type: AmblyopiaType;
    suppression_result?: {
        suppressionDepth: number;
        balancePoint: number;
        timestamp: string;
    };
}

export interface DefaultSettings {
    speed: string;
    eyeConfig: string;
    fellowEyeContrast: number;
}

const DEFAULT_CALIBRATION: CalibrationData = {
    suppression_passed: false,
    deep_suppression: false,
    last_calibrated: null,
    glasses_type: 'red-cyan',
    age_group: '8-12',
    weak_eye: 'left',
    amblyopia_type: 'unspecified',
};

const DEFAULT_SETTINGS: DefaultSettings = {
    speed: 'slow',
    eyeConfig: 'platform_left',
    fellowEyeContrast: 30,
};

const normalizeDefaultSettings = (
    settings: Partial<DefaultSettings> | null,
): DefaultSettings => {
    const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    return {
        ...merged,
        fellowEyeContrast: clampFellowEyeContrast(merged.fellowEyeContrast),
    };
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

export interface SuppressionRecord {
    suppressionDepth: number;
    balancePoint: number;
    timestamp: string;
}

export const getSuppressionHistory = (): SuppressionRecord[] => {
    const stored = read(STORAGE_KEYS.SUPPRESSION_HISTORY) as
        | SuppressionRecord[]
        | null;
    if (stored) return stored;
    // Legacy migration: suppression_history was introduced after some users
    // already had a suppression_result on their calibration — seed the
    // history with it so 'было' has data as soon as they recalibrate.
    const { suppression_result } = getCalibration();
    return suppression_result ? [suppression_result] : [];
};

export const appendSuppressionHistory = (record: SuppressionRecord): void => {
    write(STORAGE_KEYS.SUPPRESSION_HISTORY, [
        ...getSuppressionHistory(),
        record,
    ]);
};

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
    return normalizeDefaultSettings(stored);
};

export const saveDefaultSettings = (settings: DefaultSettings): void =>
    write(STORAGE_KEYS.DEFAULT_SETTINGS, normalizeDefaultSettings(settings));
