import { CONTRAST, SPEEDS } from '../config/constants.js';

export const createGameSettings = (overrides = {}) => ({
  ...overrides,
  contrastLeft: overrides.contrastLeft ?? CONTRAST.DEFAULT,
  contrastRight: overrides.contrastRight ?? CONTRAST.DEFAULT,
  speed: overrides.speed ?? 'slow',
  eyeConfig: overrides.eyeConfig ?? 'platform_left',
});

export const createSessionResult = ({
  settings,
  caught,
  totalSpawned,
  durationMs,
}) => {
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
  };
};
