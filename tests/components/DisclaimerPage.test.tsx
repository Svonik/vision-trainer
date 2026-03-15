import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DisclaimerPage } from '../../src/pages/DisclaimerPage';

describe('DisclaimerPage', () => {
    beforeEach(() => localStorage.clear());

    it('renders disclaimer text', () => {
        render(<MemoryRouter><DisclaimerPage /></MemoryRouter>);
        expect(screen.getByText(/не является заменой/)).toBeInTheDocument();
    });

    it('continue button disabled until checkbox checked', () => {
        render(<MemoryRouter><DisclaimerPage /></MemoryRouter>);
        const button = screen.getByRole('button', { name: /продолжить/i });
        expect(button).toBeDisabled();
    });

    it('enables button after checking checkbox', () => {
        render(<MemoryRouter><DisclaimerPage /></MemoryRouter>);
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        const button = screen.getByRole('button', { name: /продолжить/i });
        expect(button).toBeEnabled();
    });
});
