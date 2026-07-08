/** Shared localStorage fixtures for settings / calibration UI tests. */

export function storeCompletedCalibrationWithDefault(
    fellowEyeContrast: number,
): void {
    localStorage.setItem(
        'vt_calibration',
        JSON.stringify({
            suppression_passed: true,
            deep_suppression: false,
            last_calibrated: new Date().toISOString(),
            glasses_type: 'red-cyan',
            age_group: '8-12',
            weak_eye: 'left',
            amblyopia_type: 'unspecified',
        }),
    );
    localStorage.setItem(
        'vt_default_settings',
        JSON.stringify({
            speed: 'slow',
            eyeConfig: 'platform_left',
            fellowEyeContrast,
        }),
    );
}
