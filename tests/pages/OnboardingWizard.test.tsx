import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initStorage, saveCalibration } from '../../src/modules/storage';
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
            suppression_passed: false,
            deep_suppression: false,
            last_calibrated: null,
            glasses_type: 'red-cyan',
            age_group: '8-12',
            weak_eye: 'left',
            amblyopia_type: 'unspecified',
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

/** Helper: advance through disclaimer → glasses → age group → amblyopia type → weak eye */
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
    // Amblyopia type: keep default unspecified + continue
    fireEvent.click(screen.getByRole('button', { name: /^не указан$/i }));
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
        expect(screen.getByText(/тип амблиопии/i)).toBeInTheDocument();
    });

    it('persists selected amblyopia type before weak eye step', () => {
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
        fireEvent.click(screen.getByText(/анизометропия/i));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));

        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                amblyopia_type: 'anisometropia',
            }),
        );
        expect(screen.getByText(/какой глаз тренируем/i)).toBeInTheDocument();
    });

    it('progresses from weak eye to contrast slider step', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        advanceToContrastStep();
        expect(screen.getByText(/тест на подавление/i)).toBeInTheDocument();
    });

    it('suppression test step shows slider and trial indicator', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        advanceToContrastStep();
        expect(screen.getByRole('slider')).toBeInTheDocument();
        // Trial indicator: "1 / 2"
        expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    });

    it('deep suppression (balancePoint > 80) persists deep_suppression, shows doctor warning, and still allows proceeding to therapy', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        advanceToContrastStep();

        // Trial 1: push contrast to max (100) — deep suppression
        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '100' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /проверим ещё раз/i }),
        );
        // Trial 2: same
        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '100' },
        });
        fireEvent.click(screen.getByRole('button', { name: /готово/i }));

        // Doctor warning must be shown before proceeding
        expect(screen.getByRole('alert')).toHaveTextContent(/офтальмолог/i);
        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                deep_suppression: true,
                suppression_passed: true,
            }),
        );
        // Navigation (therapy access) is not blocked — it's just deferred
        // until the user acknowledges the warning.
        expect(mockNavigate).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole('button', { name: /продолжить всё равно/i }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('/mode-select');
    });

    it('balancePoint <= 80 persists deep_suppression:false and shows no warning', () => {
        render(
            <MemoryRouter>
                <OnboardingWizard />
            </MemoryRouter>,
        );
        advanceToContrastStep();

        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '30' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /проверим ещё раз/i }),
        );
        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '30' },
        });
        fireEvent.click(screen.getByRole('button', { name: /готово/i }));

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                deep_suppression: false,
                suppression_passed: true,
            }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('/mode-select');
    });
});
