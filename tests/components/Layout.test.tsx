import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Layout } from '../../src/components/Layout';

vi.mock('../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({ suppression_passed: false })),
    isDisclaimerAccepted: vi.fn(() => true),
}));

describe('Layout', () => {
    it('renders logo', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByText('Vision Trainer')).toBeInTheDocument();
    });

    it('logo is a clickable button', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        const logo = screen.getByText('Vision Trainer');
        expect(logo.tagName).toBe('BUTTON');
    });

    it('renders children', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Test Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('back button shows "Назад" text', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByText(/назад/i)).toBeInTheDocument();
    });

    it('completed steps are rendered as buttons', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        // Disclaimer and Calibration steps should be completed and rendered as buttons
        const stepButtons = screen.getAllByRole('button');
        const labels = stepButtons.map(b => b.textContent);
        expect(labels.some(l => l?.includes('Дисклеймер'))).toBe(true);
    });
});
