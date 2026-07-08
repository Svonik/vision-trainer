import { clampFellowEyeContrast, CLINICAL_CONTRAST } from './constants';

export interface ContrastState {
    readonly fellowEyeContrast: number;
    readonly amblyopicEyeContrast: 100;
    readonly rollingWindow: readonly boolean[];
    readonly totalTrials: number;
    readonly totalHits: number;
    readonly lastStepDirection: 'up' | 'down' | null;
    /** New trials accumulated since the last contrast step — gates step pacing. */
    readonly trialsSinceLastStep: number;
}

export interface ContrastConfig {
    readonly windowSize: number;
    readonly stepSize: number;
    readonly stepUpThreshold: number;
    readonly stepDownThreshold: number;
    readonly floor: number;
    readonly ceiling: number;
}

export function createContrastConfig(): ContrastConfig {
    return {
        windowSize: CLINICAL_CONTRAST.ROLLING_WINDOW_SIZE,
        stepSize: CLINICAL_CONTRAST.STEP_SIZE,
        stepUpThreshold: CLINICAL_CONTRAST.STEP_UP_THRESHOLD,
        stepDownThreshold: CLINICAL_CONTRAST.STEP_DOWN_THRESHOLD,
        floor: CLINICAL_CONTRAST.FELLOW_FLOOR,
        ceiling: CLINICAL_CONTRAST.FELLOW_CEILING,
    };
}

export function createContrastState(
    initialFellowContrast: number,
): ContrastState {
    const clamped = clampFellowEyeContrast(initialFellowContrast);
    return {
        fellowEyeContrast: clamped,
        amblyopicEyeContrast: 100,
        rollingWindow: [],
        totalTrials: 0,
        totalHits: 0,
        lastStepDirection: null,
        trialsSinceLastStep: 0,
    };
}

export function getAccuracy(state: ContrastState): number {
    if (state.rollingWindow.length === 0) return 0;
    const hits = state.rollingWindow.filter(Boolean).length;
    return hits / state.rollingWindow.length;
}

export function getContrastProgress(
    state: ContrastState,
    config: ContrastConfig,
): number {
    if (config.ceiling <= config.floor) return 0;
    return (
        (state.fellowEyeContrast - config.floor) /
        (config.ceiling - config.floor)
    );
}

/**
 * Rolling-window contrast adaptation — evidence-based dichoptic protocol.
 * Fellow (strong) eye contrast steps up/down based on recent trial accuracy;
 * amblyopic (weak) eye contrast stays fixed at 100% (never adapted) — Hess et al. 2010.
 * Direction matters: adapt the FELLOW eye up toward parity, not the amblyopic eye down
 * — Knox et al. 2012 ("contrast to the fellow fixing eye ... was increased by ... steps").
 *
 * Pacing: accuracy is recomputed every trial once the window is full, but a
 * contrast step is only APPLIED once per `config.windowSize` new trials since
 * the last step. Without this gate, a short losing streak right after the
 * window fills can trigger a step on almost every subsequent trial (the
 * window keeps sliding), crashing contrast far faster than the documented
 * "step once per window" clinical cadence intends.
 */
export function recordTrial(
    state: ContrastState,
    config: ContrastConfig,
    hit: boolean,
): ContrastState {
    const newWindow = [...state.rollingWindow, hit];
    const trimmed =
        newWindow.length > config.windowSize
            ? newWindow.slice(newWindow.length - config.windowSize)
            : newWindow;

    const newTotalTrials = state.totalTrials + 1;
    const newTotalHits = state.totalHits + (hit ? 1 : 0);
    const newTrialsSinceLastStep = state.trialsSinceLastStep + 1;

    let newContrast = state.fellowEyeContrast;
    let stepDirection: 'up' | 'down' | null = state.lastStepDirection;
    let trialsSinceLastStep = newTrialsSinceLastStep;

    if (
        trimmed.length >= config.windowSize &&
        newTrialsSinceLastStep >= config.windowSize
    ) {
        const windowHits = trimmed.filter(Boolean).length;
        const accuracy = windowHits / trimmed.length;

        if (accuracy > config.stepUpThreshold && newContrast < config.ceiling) {
            newContrast = Math.min(
                newContrast + config.stepSize,
                config.ceiling,
            );
            stepDirection = 'up';
            trialsSinceLastStep = 0;
        } else if (
            accuracy < config.stepDownThreshold &&
            newContrast > config.floor
        ) {
            newContrast = Math.max(newContrast - config.stepSize, config.floor);
            stepDirection = 'down';
            trialsSinceLastStep = 0;
        }
    }

    return {
        fellowEyeContrast: newContrast,
        amblyopicEyeContrast: 100,
        rollingWindow: trimmed,
        totalTrials: newTotalTrials,
        totalHits: newTotalHits,
        lastStepDirection: stepDirection,
        trialsSinceLastStep,
    };
}
