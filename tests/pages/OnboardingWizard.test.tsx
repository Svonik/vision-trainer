import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initStorage } from '../../src/modules/storage';
import { OnboardingWizard } from '../../src/pages/OnboardingWizard';

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
            weak_eye: 'left',
        })),
    };
});

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion');
    return {
        ...actual,
        AnimatePresence: ({ children }: { children: React.ReactNode }) =>
            children,
        motion: {
            ...actual.motion,
            div: ({ children, ...props }: any) => {
                const {
                    initial,
                    animate,
                    exit,
                    transition,
                    custom,
                    layoutId,
                    ...domProps
                } = props;
                return <div {...domProps}>{children}</div>;
            },
            button: ({ children, ...props }: any) => {
                const {
                    initial,
                    animate,
                    exit,
                    transition,
                    custom,
                    whileTap,
                    whileHover,
                    layoutId,
                    ...domProps
                } = props;
                return <button {...domProps}>{children}</button>;
            },
        },
        useReducedMotion: () => false,
    };
});

/** Helper: advance through disclaimer → glasses → age group → weak eye */
function advanceToContrastStep() {
    // Disclaimer: accept + continue
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
    // Glasses: select + continue
    fireEvent.click(screen.getByText(/красная слева/i));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
    // Age group: select + continue
    fireEvent.click(screen.getByText(/8-12 лет/i));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
    // Weak eye: select + continue
    fireEvent.click(screen.getByText(/левый/i));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
}

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
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('button', { name: /продолжить/i }),
        ).toBeInTheDocument();
    });

    it('shows 6 dot indicators', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        const dots = document.querySelectorAll('[data-dot]');
        expect(dots).toHaveLength(6);
    });

    it('progresses from disclaimer to glasses step after accepting', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        expect(screen.getByText(/красная линза/i)).toBeInTheDocument();
    });

    it('progresses from glasses to age group step', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        expect(screen.getByText(/возрастная группа/i)).toBeInTheDocument();
    });

    it('progresses from age group to weak eye step', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/8-12 лет/i));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        expect(screen.getByText(/какой глаз тренируем/i)).toBeInTheDocument();
    });

    it('progresses from weak eye to contrast slider step', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        advanceToContrastStep();
        expect(screen.getByText(/настройка контраста/i)).toBeInTheDocument();
    });

    it('contrast slider step shows slider and done button', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        advanceToContrastStep();
        // Verify slider and "Готово" button are present
        expect(screen.getByRole('slider')).toBeInTheDocument();
        expect(screen.getByText(/готово/i)).toBeInTheDocument();
        // Button should be enabled (slider starts at min=5)
        expect(
            screen.getByText(/готово/i).closest('button'),
        ).not.toBeDisabled();
    });
});
