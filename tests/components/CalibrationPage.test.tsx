import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CalibrationPage } from '../../src/pages/CalibrationPage';
import { initStorage } from '../../src/modules/storage';

describe('CalibrationPage', () => {
    beforeEach(() => { localStorage.clear(); initStorage(); });

    it('renders suppression test question', () => {
        render(<MemoryRouter><CalibrationPage /></MemoryRouter>);
        expect(screen.getByText(/оба квадрата/)).toBeInTheDocument();
    });

    it('shows see both and see one buttons', () => {
        render(<MemoryRouter><CalibrationPage /></MemoryRouter>);
        expect(screen.getByText(/вижу оба/)).toBeInTheDocument();
        expect(screen.getByText(/только один/)).toBeInTheDocument();
    });
});
