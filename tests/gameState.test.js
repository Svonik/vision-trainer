import { createGameSettings, createSessionResult } from '../src/modules/gameState.js';

testSuite('GameState Module', () => {
  const defaults = createGameSettings();
  assertEqual(defaults.contrastLeft, 100, 'default contrastLeft is 100');
  assertEqual(defaults.contrastRight, 100, 'default contrastRight is 100');
  assertEqual(defaults.speed, 'slow', 'default speed is slow');
  assertEqual(defaults.eyeConfig, 'platform_left', 'default eye config is platform_left');

  const custom = createGameSettings({ contrastLeft: 50, speed: 'fast' });
  assertEqual(custom.contrastLeft, 50, 'override contrastLeft works');
  assertEqual(custom.speed, 'fast', 'override speed works');
  assertEqual(custom.contrastRight, 100, 'non-overridden fields keep defaults');

  const result = createSessionResult({
    settings: createGameSettings(),
    caught: 15,
    totalSpawned: 20,
    durationMs: 300000,
  });
  assertEqual(result.game, 'binocular-catcher', 'game name is correct');
  assertEqual(result.caught, 15, 'caught preserved');
  assertEqual(result.duration_s, 300, 'duration converted to seconds');
  assertEqual(result.hit_rate, 0.75, 'hit rate calculated correctly');

  const zeroResult = createSessionResult({
    settings: createGameSettings(),
    caught: 0,
    totalSpawned: 0,
    durationMs: 5000,
  });
  assertEqual(zeroResult.hit_rate, 0, 'hit rate is 0 when no spawns');
});
