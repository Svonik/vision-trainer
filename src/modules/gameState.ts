import { CONTRAST } from './constants';

export interface GameSettings {
    contrastLeft: number;
    contrastRight: number;
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
}

export const createGameSettings = (overrides: Partial<GameSettings> = {}): GameSettings => ({
    ...overrides,
    contrastLeft: overrides.contrastLeft ?? CONTRAST.DEFAULT,
    contrastRight: overrides.contrastRight ?? CONTRAST.DEFAULT,
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
}: SessionResultInput): SessionResult => {
    const durationS = Math.round(durationMs / 1000);
    const hitRate = totalSpawned > 0 ? Math.round((caught / totalSpawned) * 100) / 100 : 0;

    return {
        game: 'binocular-catcher',
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
    };
};
