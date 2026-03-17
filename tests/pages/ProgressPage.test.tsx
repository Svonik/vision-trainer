import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProgressPage } from '../../src/pages/ProgressPage';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/modules/storage', () => ({
    getSessions: vi.fn(() => []),
}));

vi.mock('../../src/modules/sessionCache', () => ({
    getCachedSessions: vi.fn(() => []),
}));

import * as storage from '../../src/modules/storage';
import * as sessionCache from '../../src/modules/sessionCache';

describe('ProgressPage', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders empty state when no sessions', () => {
        vi.mocked(storage.getSessions).mockReturnValue([]);
        vi.mocked(sessionCache.getCachedSessions).mockReturnValue([]);
        render(
            <MemoryRouter>
                <ProgressPage />
            </MemoryRouter>
        );
        expect(screen.getByText(/сыграй первую игру/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /выбрать игру/i })).toBeInTheDocument();
    });

    it('renders summary card and session list when sessions exist', () => {
        const sessions = [
            {
                game: 'binocular-catcher',
                timestamp: '2026-03-15T10:00:00Z',
                duration_s: 120,
                caught: 15,
                total_spawned: 20,
                hit_rate: 0.75,
                contrast_left: 100,
                contrast_right: 100,
                speed: 'normal',
            },
            {
                game: 'breakout',
                timestamp: '2026-03-16T11:00:00Z',
                duration_s: 90,
                caught: 10,
                total_spawned: 15,
                hit_rate: 0.67,
                contrast_left: 80,
                contrast_right: 90,
                speed: 'slow',
            },
        ];
        vi.mocked(storage.getSessions).mockReturnValue(sessions);
        vi.mocked(sessionCache.getCachedSessions).mockReturnValue(sessions);

        render(
            <MemoryRouter>
                <ProgressPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/прогресс тренировок/i)).toBeInTheDocument();
        // Summary stats
        expect(screen.getByText('2')).toBeInTheDocument(); // total sessions
        // Session items (newest first)
        expect(screen.getByText('Арканоид')).toBeInTheDocument();
    });

    it('shows total sessions count in summary', () => {
        const sessions = [
            {
                game: 'binocular-catcher',
                timestamp: '2026-03-15T10:00:00Z',
                duration_s: 60,
                caught: 10,
                total_spawned: 15,
                hit_rate: 0.67,
                contrast_left: 100,
                contrast_right: 100,
                speed: 'slow',
            },
        ];
        vi.mocked(storage.getSessions).mockReturnValue(sessions);
        vi.mocked(sessionCache.getCachedSessions).mockReturnValue(sessions);

        render(
            <MemoryRouter>
                <ProgressPage />
            </MemoryRouter>
        );
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText(/всего сессий/i)).toBeInTheDocument();
    });
});
