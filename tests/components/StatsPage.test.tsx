import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { StatsPage } from '../../src/pages/StatsPage';

const mockResult = {
    game: 'binocular-catcher',
    timestamp: '2026-03-15T10:35:00Z',
    duration_s: 300,
    caught: 15,
    total_spawned: 20,
    hit_rate: 0.75,
    contrast_left: 100,
    contrast_right: 50,
    speed: 'slow',
    eye_config: 'platform_left',
};

describe('StatsPage', () => {
    it('renders results', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/stats', state: { result: mockResult } }]}>
                <Routes>
                    <Route path="/games/:gameId/stats" element={<StatsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/результаты/i)).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('has play again and exit buttons', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/stats', state: { result: mockResult } }]}>
                <Routes>
                    <Route path="/games/:gameId/stats" element={<StatsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/играть снова/i)).toBeInTheDocument();
        expect(screen.getByText(/выход/i)).toBeInTheDocument();
    });
});
