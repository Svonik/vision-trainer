import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { StatsPage } from '../../src/pages/StatsPage';

vi.mock('../../src/modules/storage', () => ({
    getSessions: vi.fn(() => []),
}));

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
    });

    it('has play again, change settings, and other game buttons', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/stats', state: { result: mockResult } }]}>
                <Routes>
                    <Route path="/games/:gameId/stats" element={<StatsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/играть снова/i)).toBeInTheDocument();
        expect(screen.getByText(/изменить настройки/i)).toBeInTheDocument();
        expect(screen.getByText(/другая игра/i)).toBeInTheDocument();
    });

    it('renders progress ring for hit rate', () => {
        const { container } = render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/stats', state: { result: mockResult } }]}>
                <Routes>
                    <Route path="/games/:gameId/stats" element={<StatsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(container.querySelector('svg circle')).toBeInTheDocument();
    });

    it('shows game name in title', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/stats', state: { result: mockResult } }]}>
                <Routes>
                    <Route path="/games/:gameId/stats" element={<StatsPage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText(/результаты: бинокулярный захват/i)).toBeInTheDocument();
    });

    it('shows single CTA when no result (empty state)', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/stats', state: {} }]}>
                <Routes>
                    <Route path="/games/:gameId/stats" element={<StatsPage />} />
                </Routes>
            </MemoryRouter>
        );
        // Should show "Начать игру!" as the only button
        expect(screen.getByText(/начать игру!/i)).toBeInTheDocument();
        expect(screen.queryByText(/играть снова/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/другая игра/i)).not.toBeInTheDocument();
    });
});
