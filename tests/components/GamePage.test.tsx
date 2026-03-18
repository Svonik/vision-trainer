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
    it('renders game container and wellness overlay simultaneously', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/play', state: { settings: { speed: 'slow' } } }]}>
                <Routes>
                    <Route path="/games/:gameId/play" element={<GamePage />} />
                </Routes>
            </MemoryRouter>
        );
        // Game container is always rendered (Phaser loads in background)
        expect(document.getElementById('game-container')).toBeInTheDocument();
        // Wellness pre-check modal appears as an overlay
        expect(screen.getByText('Как ты себя чувствуешь?')).toBeInTheDocument();
    });

    it('dismisses wellness overlay after selection', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/games/catcher/play', state: { settings: { speed: 'slow' } } }]}>
                <Routes>
                    <Route path="/games/:gameId/play" element={<GamePage />} />
                </Routes>
            </MemoryRouter>
        );
        // Click the first emoji (good) to dismiss wellness check
        const wellnessHeading = screen.getByText('Как ты себя чувствуешь?');
        const wellnessModal = wellnessHeading.closest('div.fixed');
        const emojiButtons = wellnessModal!.querySelectorAll('button');
        fireEvent.click(emojiButtons[0]);
        // Wellness overlay should be gone
        expect(screen.queryByText('Как ты себя чувствуешь?')).not.toBeInTheDocument();
        // Game container remains
        expect(document.getElementById('game-container')).toBeInTheDocument();
    });
});
