import { beforeEach, describe, expect, it } from 'vitest';
import {
    acceptDisclaimer,
    addSession,
    getCalibration,
    getDefaultSettings,
    getSessions,
    initStorage,
    isDisclaimerAccepted,
    isStorageAvailable,
    saveCalibration,
    saveDefaultSettings,
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
        expect(cal.suppression_passed).toBe(false);

        saveCalibration({ ...cal, suppression_passed: true });
        const loaded = getCalibration();
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

    it('returns default settings with fellowEyeContrast', () => {
        initStorage();
        const settings = getDefaultSettings();
        expect(settings.fellowEyeContrast).toBe(30);
    });

    it('saves and retrieves fellowEyeContrast', () => {
        initStorage();
        saveDefaultSettings({ ...getDefaultSettings(), fellowEyeContrast: 55 });
        expect(getDefaultSettings().fellowEyeContrast).toBe(55);
    });

    it('returns default calibration with age_group', () => {
        initStorage();
        const cal = getCalibration();
        expect(cal.age_group).toBe('8-12');
    });

    it('persists age_group in calibration', () => {
        initStorage();
        saveCalibration({ ...getCalibration(), age_group: '4-7' });
        expect(getCalibration().age_group).toBe('4-7');
    });

    it('defaults fellowEyeContrast to 30 for legacy settings', () => {
        localStorage.setItem(
            'vt_default_settings',
            JSON.stringify({
                contrastLeft: 100,
                contrastRight: 100,
                speed: 'slow',
                eyeConfig: 'platform_left',
            }),
        );
        const settings = getDefaultSettings();
        expect(settings.fellowEyeContrast).toBe(30);
    });
});
