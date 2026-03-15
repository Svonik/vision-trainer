import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { GameSelectPage } from '../../src/pages/GameSelectPage';

describe('GameSelectPage', () => {
    it('renders game title', () => {
        render(<MemoryRouter><GameSelectPage /></MemoryRouter>);
        expect(screen.getByText(/бинокулярный захват/i)).toBeInTheDocument();
    });

    it('has play button', () => {
        render(<MemoryRouter><GameSelectPage /></MemoryRouter>);
        expect(screen.getByText(/играть/i)).toBeInTheDocument();
    });

    it('has recalibrate button', () => {
        render(<MemoryRouter><GameSelectPage /></MemoryRouter>);
        expect(screen.getByText(/перекалибровать/i)).toBeInTheDocument();
    });
});
