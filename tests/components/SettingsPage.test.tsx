import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SettingsPage } from '../../src/pages/SettingsPage';

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
});
