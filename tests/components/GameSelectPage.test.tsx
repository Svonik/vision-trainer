import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { GameSelectPage } from '../../src/pages/GameSelectPage';

describe('GameSelectPage', () => {
    it('renders game title', () => {
        render(<MemoryRouter><GameSelectPage /></MemoryRouter>);
        expect(screen.getByText(/бинокулярный захват/i)).toBeInTheDocument();
    });

    it('has play buttons', () => {
        render(<MemoryRouter><GameSelectPage /></MemoryRouter>);
        const playButtons = screen.getAllByText(/играть/i);
        expect(playButtons.length).toBeGreaterThan(0);
    });

    it('renders difficulty badge', () => {
        render(<MemoryRouter><GameSelectPage /></MemoryRouter>);
        expect(screen.getAllByText(/начальный/i).length).toBeGreaterThan(0);
    });
});
