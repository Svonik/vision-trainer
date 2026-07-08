import { beforeEach, describe, expect, it } from 'vitest';
import {
    acceptDisclaimer,
    addSession,
    appendSuppressionHistory,
    getCalibration,
    getDefaultSettings,
    getSessions,
    getSuppressionHistory,
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

    it('clamps stored default fellowEyeContrast above the clinical ceiling', () => {
        initStorage();
        saveDefaultSettings({ ...getDefaultSettings(), fellowEyeContrast: 55 });
        expect(
            JSON.parse(localStorage.getItem('vt_default_settings') ?? '{}')
                .fellowEyeContrast,
        ).toBe(50);
        expect(getDefaultSettings().fellowEyeContrast).toBe(50);
    });

    it('clamps legacy stored default fellowEyeContrast below the clinical floor', () => {
        localStorage.setItem(
            'vt_default_settings',
            JSON.stringify({
                speed: 'slow',
                eyeConfig: 'platform_left',
                fellowEyeContrast: 10,
            }),
        );
        expect(getDefaultSettings().fellowEyeContrast).toBe(15);
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

    it('persists amblyopia_type in calibration', () => {
        initStorage();
        saveCalibration({
            ...getCalibration(),
            amblyopia_type: 'anisometropia',
        });
        expect(getCalibration().amblyopia_type).toBe('anisometropia');
    });

    it('defaults amblyopia_type to unspecified for legacy calibration', () => {
        localStorage.setItem(
            'vt_calibration',
            JSON.stringify({
                suppression_passed: true,
                deep_suppression: false,
                last_calibrated: null,
                glasses_type: 'red-cyan',
                age_group: '8-12',
                weak_eye: 'left',
            }),
        );
        expect(getCalibration().amblyopia_type).toBe('unspecified');
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

    it('history getter returns [] when nothing was ever calibrated', () => {
        initStorage();
        expect(getSuppressionHistory()).toEqual([]);
    });

    it('appends a suppression record on save, and getter returns it', () => {
        initStorage();
        const record = {
            suppressionDepth: 40,
            balancePoint: 60,
            timestamp: '2026-01-01T00:00:00.000Z',
        };
        // Mirrors OnboardingWizard/SettingsHub: append before the calibration
        // record itself is overwritten with the new suppression_result.
        appendSuppressionHistory(record);
        saveCalibration({ ...getCalibration(), suppression_result: record });
        expect(getSuppressionHistory()).toEqual([record]);
    });

    it('does not clamp raw suppression_result measurements when default settings are normalized', () => {
        initStorage();
        const record = {
            suppressionDepth: 0,
            balancePoint: 100,
            timestamp: '2026-01-01T00:00:00.000Z',
        };

        appendSuppressionHistory(record);
        saveCalibration({ ...getCalibration(), suppression_result: record });
        saveDefaultSettings({ ...getDefaultSettings(), fellowEyeContrast: 100 });

        expect(getDefaultSettings().fellowEyeContrast).toBe(50);
        expect(getCalibration().suppression_result).toEqual(record);
        expect(getSuppressionHistory()).toEqual([record]);
    });

    it('a second (re)calibration appends a second history record', () => {
        initStorage();
        const first = {
            suppressionDepth: 40,
            balancePoint: 60,
            timestamp: '2026-01-01T00:00:00.000Z',
        };
        const second = {
            suppressionDepth: 25,
            balancePoint: 75,
            timestamp: '2026-02-01T00:00:00.000Z',
        };
        appendSuppressionHistory(first);
        saveCalibration({ ...getCalibration(), suppression_result: first });
        appendSuppressionHistory(second);
        saveCalibration({ ...getCalibration(), suppression_result: second });
        expect(getSuppressionHistory()).toEqual([first, second]);
    });

    it('legacy migration: seeds history from an existing suppression_result when history was never written', () => {
        initStorage();
        const legacyResult = {
            suppressionDepth: 35,
            balancePoint: 65,
            timestamp: '2025-06-01T00:00:00.000Z',
        };
        // Simulate a pre-feature user: calibration already has a
        // suppression_result, but vt_suppression_history was never written.
        saveCalibration({
            ...getCalibration(),
            suppression_result: legacyResult,
        });
        expect(getSuppressionHistory()).toEqual([legacyResult]);

        // Their first recalibration under the new code appends a second
        // record, giving them a 'было → стало' comparison immediately.
        const newResult = {
            suppressionDepth: 20,
            balancePoint: 80,
            timestamp: '2025-07-01T00:00:00.000Z',
        };
        appendSuppressionHistory(newResult);
        saveCalibration({
            ...getCalibration(),
            suppression_result: newResult,
        });
        expect(getSuppressionHistory()).toEqual([legacyResult, newResult]);
    });
});
