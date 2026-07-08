import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TrainingSettingsPage } from '../../src/pages/TrainingSettingsPage';

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

describe('TrainingSettingsPage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('displays the clamped fellow-eye contrast persisted in default settings', () => {
        storeCompletedCalibrationWithDefault(50);

        render(
            <MemoryRouter>
                <TrainingSettingsPage />
            </MemoryRouter>,
        );

        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });
});
