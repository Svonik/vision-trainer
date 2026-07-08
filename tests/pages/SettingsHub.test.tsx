import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    appendSuppressionHistory,
    saveCalibration,
    saveDefaultSettings,
} from '../../src/modules/storage';
import { SettingsHub } from '../../src/pages/SettingsHub';

vi.mock('../../src/modules/storage', () => ({
    getCalibration: vi.fn(() => ({
        suppression_passed: true,
        deep_suppression: false,
        last_calibrated: null,
        glasses_type: 'red-cyan',
        age_group: '8-12',
        weak_eye: 'left',
        amblyopia_type: 'unspecified',
    })),
    saveCalibration: vi.fn(),
    appendSuppressionHistory: vi.fn(),
    getDefaultSettings: vi.fn(() => ({
        speed: 'slow',
        eyeConfig: 'platform_left',
        fellowEyeContrast: 30,
    })),
    saveDefaultSettings: vi.fn(),
}));

/** Helper: pass the math gate deterministically (Math.random mocked to 0 → 6×6=36) */
function passMathGate() {
    fireEvent.change(screen.getByRole('spinbutton'), {
        target: { value: '36' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ответить/i }));
}

/** Helper: recalibrate → math gate → glasses → amblyopia type → weak eye → suppression step */
function advanceToSuppressionStep() {
    fireEvent.click(screen.getByRole('button', { name: /перекалибровать/i }));
    passMathGate();
    fireEvent.click(screen.getByText(/красная слева/i));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
    fireEvent.click(screen.getByRole('button', { name: /^не указан$/i }));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
    fireEvent.click(screen.getByText(/левый/i));
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
}

describe('SettingsHub', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // MathGate uses Math.random() for its arithmetic challenge — pin it
        // so passMathGate()'s hardcoded answer (6×6=36) is deterministic.
        vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders 3 sections', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('region', { name: /калибровка/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: /тип очков/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: /настройки по умолчанию/i }),
        ).toBeInTheDocument();
    });

    it('recalibrate button is present', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('button', { name: /перекалибровать/i }),
        ).toBeInTheDocument();
    });

    it('shows calibration passed status', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(screen.getByText(/калибровка пройдена/i)).toBeInTheDocument();
    });

    it('renders glasses type info', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(screen.getByText(/красная слева/i)).toBeInTheDocument();
    });

    it('renders speed selection buttons', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.getByRole('button', { name: /медленно/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /нормально/i }),
        ).toBeInTheDocument();
    });

    it('does not reference the removed BrightnessAdjustStep flow', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        expect(
            screen.queryByText(/подстройте яркость/i),
        ).not.toBeInTheDocument();
    });

    it('recalibration persists selected amblyopia type before weak eye step', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        fireEvent.click(
            screen.getByRole('button', { name: /перекалибровать/i }),
        );
        passMathGate();
        fireEvent.click(screen.getByText(/красная слева/i));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));
        fireEvent.click(screen.getByText(/смешанная/i));
        fireEvent.click(screen.getByRole('button', { name: /продолжить/i }));

        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                amblyopia_type: 'mixed',
            }),
        );
        expect(screen.getByText(/какой глаз тренируем/i)).toBeInTheDocument();
    });
    it('deep suppression (balancePoint > 80) persists deep_suppression, shows doctor warning, and still allows finishing recalibration', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        advanceToSuppressionStep();

        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '100' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /проверим ещё раз/i }),
        );
        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '100' },
        });
        fireEvent.click(screen.getByRole('button', { name: /готово/i }));

        expect(screen.getByRole('alert')).toHaveTextContent(/офтальмолог/i);
        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                deep_suppression: true,
                suppression_passed: true,
            }),
        );
        expect(saveDefaultSettings).toHaveBeenCalledWith(
            expect.objectContaining({
                fellowEyeContrast: 50,
            }),
        );
        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                suppression_result: expect.objectContaining({
                    balancePoint: 100,
                    suppressionDepth: 0,
                }),
            }),
        );
        expect(appendSuppressionHistory).toHaveBeenCalledWith(
            expect.objectContaining({
                balancePoint: 100,
                suppressionDepth: 0,
            }),
        );
        // View section (with the recalibrate button) is not yet shown —
        // it appears once the warning is acknowledged.
        expect(
            screen.queryByRole('button', { name: /перекалибровать/i }),
        ).not.toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: /продолжить всё равно/i }),
        );
        expect(
            screen.getByRole('button', { name: /перекалибровать/i }),
        ).toBeInTheDocument();
    });

    it('balancePoint <= 80 persists deep_suppression:false and shows no warning', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        );
        advanceToSuppressionStep();

        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '80' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /проверим ещё раз/i }),
        );
        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '80' },
        });
        fireEvent.click(screen.getByRole('button', { name: /готово/i }));
        expect(saveDefaultSettings).toHaveBeenCalledWith(
            expect.objectContaining({
                fellowEyeContrast: 50,
            }),
        );
        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                suppression_result: expect.objectContaining({
                    balancePoint: 80,
                    suppressionDepth: 20,
                }),
            }),
        );

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(saveCalibration).toHaveBeenCalledWith(
            expect.objectContaining({
                deep_suppression: false,
                suppression_passed: true,
            }),
        );
        expect(
            screen.getByRole('button', { name: /перекалибровать/i }),
        ).toBeInTheDocument();
    });
});
