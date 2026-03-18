import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
            age_group: '8-12',
        })),
    };
});

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion');
    return {
        ...actual,
        AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
        motion: {
            ...actual.motion,
            div: ({ children, ...props }: any) => {
                const { initial, animate, exit, transition, custom, ...domProps } = props;
                return <div {...domProps}>{children}</div>;
            },
            button: ({ children, ...props }: any) => {
                const { initial, animate, exit, transition, custom, whileTap, whileHover, ...domProps } = props;
                return <button {...domProps}>{children}</button>;
            },
        },
        useReducedMotion: () => false,
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

    it('shows 5 dot indicators', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        const dots = document.querySelectorAll('[data-dot]');
        expect(dots).toHaveLength(5);
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

    it('progresses from glasses to age group step after selecting glasses type', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        // Click the first "Красная слева" button
        fireEvent.click(screen.getByText(/красная слева/i));
        // Should now show age group step
        expect(screen.getByText(/возрастная группа/i)).toBeInTheDocument();
    });

    it('progresses from age group to suppression test after selecting age group', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        // Select age group
        fireEvent.click(screen.getByText(/8-12 лет/i));
        // Should now show quantitative suppression test
        expect(screen.getByText(/тест на подавление/i)).toBeInTheDocument();
    });

    it('navigates to /mode-select when suppression test passes (seen at low contrast)', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByText(/8-12 лет/i));
        // Click "Вижу обе!" at contrast 5 — balancePoint=5 <= 80, passes
        fireEvent.click(screen.getByText(/вижу обе/i));
        expect(mockNavigate).toHaveBeenCalledWith('/mode-select');
    });

    it('advances to brightness adjust step when suppression is full (never seen)', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByText(/4-7 лет/i));
        // Click "Не вижу" 20 times (contrast starts at 5, advances by 5 each click,
        // last click at contrast=100 triggers onComplete with balancePoint=100 > 80)
        const notSeenButton = screen.getByText(/не вижу/i);
        for (let i = 0; i < 20; i++) {
            fireEvent.click(notSeenButton);
        }
        expect(screen.getByText(/подстройте яркость/i)).toBeInTheDocument();
    });
});
