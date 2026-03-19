import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalibrationGuard } from '../../src/guards/CalibrationGuard';
import { DisclaimerGuard } from '../../src/guards/DisclaimerGuard';
import { GameSettingsGuard } from '../../src/guards/GameSettingsGuard';
import * as storage from '../../src/modules/storage';

vi.mock('../../src/modules/storage');

describe('DisclaimerGuard', () => {
    it('redirects to /onboarding when not accepted', () => {
        vi.mocked(storage.isDisclaimerAccepted).mockReturnValue(false);
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Routes>
                    <Route path="/onboarding" element={<div>Onboarding</div>} />
                    <Route
                        path="/games"
                        element={
                            <DisclaimerGuard>
                                <div>Games</div>
                            </DisclaimerGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Onboarding')).toBeInTheDocument();
    });

    it('renders children when accepted', () => {
        vi.mocked(storage.isDisclaimerAccepted).mockReturnValue(true);
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Routes>
                    <Route
                        path="/games"
                        element={
                            <DisclaimerGuard>
                                <div>Games</div>
                            </DisclaimerGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Games')).toBeInTheDocument();
    });
});

describe('CalibrationGuard', () => {
    it('redirects to /onboarding when not passed', () => {
        vi.mocked(storage.getCalibration).mockReturnValue({
            suppression_passed: false,
            last_calibrated: null,
            glasses_type: 'red-cyan',
            age_group: '8-12',
            weak_eye: 'left',
        });
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Routes>
                    <Route path="/onboarding" element={<div>Onboarding</div>} />
                    <Route
                        path="/games"
                        element={
                            <CalibrationGuard>
                                <div>Games</div>
                            </CalibrationGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Onboarding')).toBeInTheDocument();
    });
});

describe('GameSettingsGuard', () => {
    it('redirects to settings when location.state.settings is absent', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/play']}>
                <Routes>
                    <Route
                        path="/games/:gameId/settings"
                        element={<div>Settings</div>}
                    />
                    <Route
                        path="/games/:gameId/play"
                        element={
                            <GameSettingsGuard>
                                <div>Game</div>
                            </GameSettingsGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders children when settings present', () => {
        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/games/catcher/play',
                        state: { settings: { speed: 'slow' } },
                    },
                ]}
            >
                <Routes>
                    <Route
                        path="/games/:gameId/play"
                        element={
                            <GameSettingsGuard>
                                <div>Game</div>
                            </GameSettingsGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Game')).toBeInTheDocument();
    });
});
