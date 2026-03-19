import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsHub } from '../../src/pages/SettingsHub';

vi.mock('../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({
        suppression_passed: true,
        last_calibrated: null,
        glasses_type: 'red-cyan',
        age_group: '8-12',
        weak_eye: 'left',
    })),
    saveCalibration: vi.fn(),
    getDefaultSettings: vi.fn(() => ({
        speed: 'slow',
        eyeConfig: 'platform_left',
        fellowEyeContrast: 30,
    })),
    saveDefaultSettings: vi.fn(),
}));

describe('SettingsHub', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders 3 sections', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('region', { name: /калибровка/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: /тип очков/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: /настройки по умолчанию/i }),
        ).toBeInTheDocument();
    });

    it('recalibrate button is present', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('button', { name: /перекалибровать/i }),
        ).toBeInTheDocument();
    });

    it('shows calibration passed status', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(screen.getByText(/калибровка пройдена/i)).toBeInTheDocument();
    });

    it('renders glasses type info', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(screen.getByText(/красная слева/i)).toBeInTheDocument();
    });

    it('renders speed selection buttons', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('button', { name: /медленно/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /нормально/i }),
        ).toBeInTheDocument();
    });
});
