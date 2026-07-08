import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsHub } from '../../src/pages/SettingsHub';
import { storeCompletedCalibrationWithDefault } from '../helpers/storageFixtures';

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
