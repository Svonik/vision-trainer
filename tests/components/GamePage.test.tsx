import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../src/game/PhaserGame', () => ({
    PhaserGame: () => <div id="game-container" data-testid="phaser-game" />,
}));

vi.mock('../../src/game/EventBus', () => ({
    EventBus: {
        on: vi.fn(),
        removeListener: vi.fn(),
        emit: vi.fn(),
    },
}));

vi.mock('../../src/modules/storage', () => ({
    addSession: vi.fn(),
}));

import { GamePage } from '../../src/pages/GamePage';

describe('GamePage', () => {
    it('renders game container', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/play', state: { settings: { speed: 'slow' } } }]}>
                <Routes>
                    <Route path="/games/:gameId/play" element={<GamePage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(document.getElementById('game-container')).toBeInTheDocument();
    });
});
