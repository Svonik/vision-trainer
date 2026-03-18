import { CLINICAL_CONTRAST } from './constants';

export interface ContrastState {
    readonly fellowEyeContrast: number;
    readonly amblyopicEyeContrast: 100;
    readonly rollingWindow: readonly boolean[];
    readonly totalTrials: number;
    readonly totalHits: number;
    readonly lastStepDirection: 'up' | 'down' | null;
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
    const clamped = Math.max(
        CLINICAL_CONTRAST.FELLOW_FLOOR,
        Math.min(CLINICAL_CONTRAST.FELLOW_CEILING, initialFellowContrast),
    );
    return {
        fellowEyeContrast: clamped,
        amblyopicEyeContrast: 100,
        rollingWindow: [],
        totalTrials: 0,
        totalHits: 0,
        lastStepDirection: null,
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

    let newContrast = state.fellowEyeContrast;
    let stepDirection: 'up' | 'down' | null = state.lastStepDirection;

    if (trimmed.length >= config.windowSize) {
        const windowHits = trimmed.filter(Boolean).length;
        const accuracy = windowHits / trimmed.length;

        if (accuracy > config.stepUpThreshold && newContrast < config.ceiling) {
            newContrast = Math.min(
                newContrast + config.stepSize,
                config.ceiling,
            );
            stepDirection = 'up';
        } else if (
            accuracy < config.stepDownThreshold &&
            newContrast > config.floor
        ) {
            newContrast = Math.max(newContrast - config.stepSize, config.floor);
            stepDirection = 'down';
        }
    }

    return {
        fellowEyeContrast: newContrast,
        amblyopicEyeContrast: 100,
        rollingWindow: trimmed,
        totalTrials: newTotalTrials,
        totalHits: newTotalHits,
        lastStepDirection: stepDirection,
    };
}
