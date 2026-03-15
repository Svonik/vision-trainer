import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Layout } from '../../src/components/Layout';

vi.mock('../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({ suppression_passed: false })),
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

    it('renders children', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Test Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
});
