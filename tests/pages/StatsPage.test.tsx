import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { StatsPage } from '../../src/pages/StatsPage';

vi.mock('../../src/modules/sessionCache', () => ({
    getCachedSessions: vi.fn(() => []),
}));

vi.mock('../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({
        suppression_passed: true,
        deep_suppression: false,
        last_calibrated: null,
        glasses_type: 'red-cyan',
        age_group: '8-12',
        weak_eye: 'left',
        amblyopia_type: 'mixed',
    })),
    getSuppressionHistory: vi.fn(() => []),
}));

describe('StatsPage', () => {
    it('renders stored amblyopia type human-readably', () => {
        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/games/catcher/stats',
                        state: {
                            result: {
                                game: 'catcher',
                                caught: 3,
                                hit_rate: 0.5,
                                duration_s: 60,
                                speed: 'slow',
                                contrast_left: 100,
                                contrast_right: 100,
                            },
                        },
                    },
                ]}
            >
                <Routes>
                    <Route
                        path="/games/:gameId/stats"
                        element={<StatsPage />}
                    />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByText(/тип амблиопии/i)).toBeInTheDocument();
        expect(screen.getByText(/смешанная/i)).toBeInTheDocument();
    });
});
