import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Layout } from '../../src/components/Layout';

vi.mock('../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({ suppression_passed: false })),
    isDisclaimerAccepted: vi.fn(() => true),
}));

vi.mock('../../src/components/FloatingParticles', () => ({
    FloatingParticles: () => <div data-testid="floating-particles" />,
}));

describe('Layout', () => {
    it('renders Vision Trainer logo (tab variant)', () => {
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

    it('renders TabBar on /games route', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        // TabBar has aria-label="Main navigation"
        expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('renders TopBar on /games route', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('push variant shows back button on settings page', () => {
        render(
            <MemoryRouter initialEntries={['/games/catcher/settings']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByText(/назад/i)).toBeInTheDocument();
    });

    it('renders children fullscreen for /onboarding (no tab bar)', () => {
        render(
            <MemoryRouter initialEntries={['/onboarding']}>
                <Layout><div>Onboarding Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.getByText('Onboarding Content')).toBeInTheDocument();
        expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument();
    });

    it('does not render step indicator buttons (old navigation removed)', () => {
        render(
            <MemoryRouter initialEntries={['/games']}>
                <Layout><div>Content</div></Layout>
            </MemoryRouter>
        );
        expect(screen.queryByText('Дисклеймер')).not.toBeInTheDocument();
        expect(screen.queryByText('Калибровка')).not.toBeInTheDocument();
    });
});
