import { CONTRAST } from './constants';

export interface GameSettings {
    /** @deprecated Kept for backward compat with stored sessions. Use fellowEyeContrast for clinical contrast. */
    contrastLeft: number;
    /** @deprecated Kept for backward compat with stored sessions. Use fellowEyeContrast for clinical contrast. */
    contrastRight: number;
    fellowEyeContrast: number;
    speed: string;
    eyeConfig: string;
    glassesType: string;
    [key: string]: unknown;
}

export interface SessionResultInput {
    settings: GameSettings;
    caught: number;
    totalSpawned: number;
    durationMs: number;
    level?: number;
    game?: string;
    fellowContrastStart?: number;
    fellowContrastEnd?: number;
    windowAccuracy?: number;
    totalTrials?: number;
}

export interface SessionResult {
    game: string;
    timestamp: string;
    duration_s: number;
    caught: number;
    total_spawned: number;
    hit_rate: number;
    contrast_left: number;
    contrast_right: number;
    speed: string;
    eye_config: string;
    level?: number;
    fellow_contrast_start?: number;
    fellow_contrast_end?: number;
    window_accuracy?: number;
    total_trials?: number;
    wellness?: {
        preSession: string;
        postEyeStrain: boolean;
        postHeadache: boolean;
        timestamp: string;
    } | null;
    [key: string]: unknown;
}

export const createGameSettings = (
    overrides: Partial<GameSettings> = {},
): GameSettings => ({
    ...overrides,
    contrastLeft: overrides.contrastLeft ?? CONTRAST.DEFAULT,
    contrastRight: overrides.contrastRight ?? CONTRAST.DEFAULT,
    fellowEyeContrast: overrides.fellowEyeContrast ?? 30,
    speed: overrides.speed ?? 'slow',
    eyeConfig: overrides.eyeConfig ?? 'platform_left',
    glassesType: overrides.glassesType ?? 'red-cyan',
});

export const createSessionResult = ({
    settings,
    caught,
    totalSpawned,
    durationMs,
    level,
    game,
    fellowContrastStart,
    fellowContrastEnd,
    windowAccuracy,
    totalTrials,
}: SessionResultInput): SessionResult => {
    const durationS = Math.round(durationMs / 1000);
    const hitRate =
        totalSpawned > 0 ? Math.round((caught / totalSpawned) * 100) / 100 : 0;

    return {
        game: game ?? 'binocular-catcher',
        timestamp: new Date().toISOString(),
        duration_s: durationS,
        caught,
        total_spawned: totalSpawned,
        hit_rate: hitRate,
        contrast_left: settings.contrastLeft,
        contrast_right: settings.contrastRight,
        speed: settings.speed,
        eye_config: settings.eyeConfig,
        ...(level !== undefined ? { level } : {}),
        fellow_contrast_start: fellowContrastStart,
        fellow_contrast_end: fellowContrastEnd,
        window_accuracy: windowAccuracy,
        total_trials: totalTrials,
    };
};
