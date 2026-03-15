import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { DisclaimerGuard } from '../../src/guards/DisclaimerGuard';
import { CalibrationGuard } from '../../src/guards/CalibrationGuard';
import { GameSettingsGuard } from '../../src/guards/GameSettingsGuard';
import * as storage from '../../src/modules/storage';

vi.mock('../../src/modules/storage');

describe('DisclaimerGuard', () => {
    it('redirects to /disclaimer when not accepted', () => {
        vi.mocked(storage.isDisclaimerAccepted).mockReturnValue(false);
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Routes>
                    <Route path="/disclaimer" element={<div>Disclaimer</div>} />
                    <Route path="/games" element={<DisclaimerGuard><div>Games</div></DisclaimerGuard>} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Disclaimer')).toBeInTheDocument();
    });

    it('renders children when accepted', () => {
        vi.mocked(storage.isDisclaimerAccepted).mockReturnValue(true);
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Routes>
                    <Route path="/games" element={<DisclaimerGuard><div>Games</div></DisclaimerGuard>} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Games')).toBeInTheDocument();
    });
});

describe('CalibrationGuard', () => {
    it('redirects to /calibration when not passed', () => {
        vi.mocked(storage.getCalibration).mockReturnValue({
            red_brightness: 100, cyan_brightness: 100,
            suppression_passed: false, last_calibrated: null,
        });
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Routes>
                    <Route path="/calibration" element={<div>Calibration</div>} />
                    <Route path="/games" element={<CalibrationGuard><div>Games</div></CalibrationGuard>} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Calibration')).toBeInTheDocument();
    });
});

describe('GameSettingsGuard', () => {
    it('redirects to settings when location.state.settings is absent', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/play']}>
                <Routes>
                    <Route path="/games/:gameId/settings" element={<div>Settings</div>} />
                    <Route path="/games/:gameId/play" element={
                        <GameSettingsGuard><div>Game</div></GameSettingsGuard>
                    } />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders children when settings present', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/play', state: { settings: { speed: 'slow' } } }]}>
                <Routes>
                    <Route path="/games/:gameId/play" element={
                        <GameSettingsGuard><div>Game</div></GameSettingsGuard>
                    } />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('Game')).toBeInTheDocument();
    });
});
