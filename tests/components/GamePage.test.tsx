import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../src/game/PhaserGame', () => ({
    PhaserGame: () => <div id="game-container" data-testid="phaser-game" />,
}));

vi.mock('../../src/game/TypedEventBus', () => ({
    typedEventBus: {
        on: vi.fn(),
        off: vi.fn(),
        removeListener: vi.fn(),
        emit: vi.fn(),
    },
}));

vi.mock('../../src/modules/sessionCache', () => ({
    addCachedSession: vi.fn(),
}));

import { GamePage } from '../../src/pages/GamePage';

describe('GamePage', () => {
    it('renders game container after wellness check', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/play', state: { settings: { speed: 'slow' } } }]}>
                <Routes>
                    <Route path="/games/:gameId/play" element={<GamePage />} />
                </Routes>
            </MemoryRouter>
        );
        // Wellness pre-check modal appears first
        expect(screen.getByText('Как ты себя чувствуешь?')).toBeInTheDocument();
        // Click first emoji button (good) to proceed past wellness check
        const emojiButtons = screen.getAllByRole('button');
        fireEvent.click(emojiButtons[0]);
        expect(document.getElementById('game-container')).toBeInTheDocument();
    });
});
