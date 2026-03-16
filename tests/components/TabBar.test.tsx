import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { TabBar } from '../../src/components/TabBar';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return { ...actual, useNavigate: () => mockNavigate };
});

describe('TabBar', () => {
    it('renders 3 tabs', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <TabBar />
            </MemoryRouter>
        );
        expect(screen.getByText('Игры')).toBeInTheDocument();
        expect(screen.getByText('Прогресс')).toBeInTheDocument();
        expect(screen.getByText('Настройки')).toBeInTheDocument();
    });

    it('games tab is active when on /games route', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <TabBar />
            </MemoryRouter>
        );
        const gamesTab = screen.getByText('Игры').closest('button');
        expect(gamesTab?.className).toContain('text-[var(--cta)]');
    });

    it('progress tab is active when on /progress route', () => {
        render(
            <MemoryRouter initialEntries={['/progress']}>
                <TabBar />
            </MemoryRouter>
        );
        const progressTab = screen.getByText('Прогресс').closest('button');
        expect(progressTab?.className).toContain('text-[var(--cta)]');
    });

    it('settings tab is active when on /settings route', () => {
        render(
            <MemoryRouter initialEntries={['/settings']}>
                <TabBar />
            </MemoryRouter>
        );
        const settingsTab = screen.getByText('Настройки').closest('button');
        expect(settingsTab?.className).toContain('text-[var(--cta)]');
    });

    it('inactive tabs have secondary text color', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <TabBar />
            </MemoryRouter>
        );
        const progressTab = screen.getByText('Прогресс').closest('button');
        expect(progressTab?.className).toContain('text-[var(--text-secondary)]');
    });

    it('clicking a tab calls navigate', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <TabBar />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByText('Прогресс'));
        expect(mockNavigate).toHaveBeenCalledWith('/progress');
    });
});
