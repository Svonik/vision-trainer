import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsHub } from '../../src/pages/SettingsHub';

function storeCompletedCalibrationWithDefault(fellowEyeContrast: number) {
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

describe('SettingsHub storage boundary', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('displays 50% for legacy default settings above the clinical ceiling', () => {
        storeCompletedCalibrationWithDefault(100);

        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );

        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });
});
