import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SettingsPage } from '../../src/pages/SettingsPage';


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

function renderSettingsPage() {
    render(
        <MemoryRouter initialEntries={['/games/catcher/settings']}>
            <Routes>
                <Route
                    path="/games/:gameId/settings"
                    element={<SettingsPage />}
                />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    localStorage.clear();
});
describe('SettingsPage', () => {
    it('renders contrast balance section', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Routes>
                    <Route path="/games/:gameId/settings" element={<SettingsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/баланс контраста/i)).toBeInTheDocument();
    });

    it('renders speed selection', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Routes>
                    <Route path="/games/:gameId/settings" element={<SettingsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/скорость падения/i)).toBeInTheDocument();
    });

    it('renders start button', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Routes>
                    <Route path="/games/:gameId/settings" element={<SettingsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/начать игру/i)).toBeInTheDocument();
    });

    it('renders contrast hint text', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Routes><Route path="/games/:gameId/settings" element={<SettingsPage />} /></Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/снизьте яркость/i)).toBeInTheDocument();
    });

    it('shows game name in title', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Routes><Route path="/games/:gameId/settings" element={<SettingsPage />} /></Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/настройки:/i)).toBeInTheDocument();
        expect(screen.getByText(/бинокулярный захват/i)).toBeInTheDocument();
    });

    it('shows "Другая игра" button', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Routes><Route path="/games/:gameId/settings" element={<SettingsPage />} /></Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/другая игра/i)).toBeInTheDocument();
    });

    it('displays 50% for legacy default settings above the clinical ceiling', () => {
        storeCompletedCalibrationWithDefault(100);

        renderSettingsPage();

        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });
});
