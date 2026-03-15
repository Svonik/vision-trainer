import { describe, it, expect, beforeEach } from 'vitest';
import {
    initStorage, getCalibration, saveCalibration,
    getSessions, addSession, isDisclaimerAccepted,
    acceptDisclaimer, isStorageAvailable,
} from '../../src/modules/storage';

describe('Storage Module', () => {
    beforeEach(() => localStorage.clear());

    it('initializes storage with defaults', () => {
        initStorage();
        expect(localStorage.getItem('vt_version')).toBe('"1.0"');
        expect(isDisclaimerAccepted()).toBe(false);
    });

    it('accepts disclaimer', () => {
        initStorage();
        acceptDisclaimer();
        expect(isDisclaimerAccepted()).toBe(true);
    });

    it('manages calibration', () => {
        initStorage();
        const cal = getCalibration();
        expect(cal.red_brightness).toBe(100);
        expect(cal.suppression_passed).toBe(false);

        saveCalibration({ ...cal, red_brightness: 80, suppression_passed: true });
        const loaded = getCalibration();
        expect(loaded.red_brightness).toBe(80);
        expect(loaded.suppression_passed).toBe(true);
    });

    it('manages sessions', () => {
        initStorage();
        expect(getSessions().length).toBe(0);
        addSession({ game: 'test', caught: 15 });
        expect(getSessions().length).toBe(1);
        expect(getSessions()[0].caught).toBe(15);
    });

    it('reports storage availability', () => {
        expect(isStorageAvailable()).toBe(true);
    });
});
