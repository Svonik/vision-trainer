import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { OnboardingWizard } from '../../src/pages/OnboardingWizard';
import { initStorage } from '../../src/modules/storage';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/modules/storage', async () => {
    const actual = await vi.importActual('../../src/modules/storage');
    return {
        ...actual,
        acceptDisclaimer: vi.fn(),
        saveCalibration: vi.fn(),
        getCalibration: vi.fn(() => ({
            red_brightness: 100,
            cyan_brightness: 100,
            suppression_passed: false,
            last_calibrated: null,
            glasses_type: 'red-cyan',
        })),
    };
});

describe('OnboardingWizard', () => {
    beforeEach(() => {
        localStorage.clear();
        initStorage();
        mockNavigate.mockClear();
    });

    it('renders disclaimer step first', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        expect(screen.getByRole('button', { name: /продолжить/i })).toBeInTheDocument();
    });

    it('shows 4 dot indicators', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        const dots = document.querySelectorAll('[data-dot]');
        expect(dots).toHaveLength(4);
    });

    it('progresses from disclaimer to glasses step after accepting', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        // Glasses step shows "красная линза" question
        expect(screen.getByText(/красная линза/i)).toBeInTheDocument();
    });

    it('progresses from glasses to suppression test after selecting glasses type', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        // Click the first "Красная слева" button
        fireEvent.click(screen.getByText(/красная слева/i));
        // Should now show suppression test
        expect(screen.getByText(/оба квадрата/i)).toBeInTheDocument();
    });

    it('navigates to /games when suppression test passes', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByText(/вижу оба/i));
        expect(mockNavigate).toHaveBeenCalledWith('/mode-select');
    });

    it('advances to brightness adjust step when suppression test fails', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByText(/только один/i));
        expect(screen.getByText(/подстройте яркость/i)).toBeInTheDocument();
    });
});
