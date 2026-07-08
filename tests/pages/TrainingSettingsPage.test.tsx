import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TrainingSettingsPage } from '../../src/pages/TrainingSettingsPage';
import { storeCompletedCalibrationWithDefault } from '../helpers/storageFixtures';

describe('TrainingSettingsPage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('displays 50% for legacy default settings above the clinical ceiling', () => {
        storeCompletedCalibrationWithDefault(55);

        render(
            <MemoryRouter>
                <TrainingSettingsPage />
            </MemoryRouter>,
        );

        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });
});
