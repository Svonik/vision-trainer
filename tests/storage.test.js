import {
  initStorage,
  getCalibration,
  saveCalibration,
  getSessions,
  addSession,
  isDisclaimerAccepted,
  acceptDisclaimer,
  isStorageAvailable,
} from '../src/modules/storage.js';

testSuite('Storage Module', () => {
  localStorage.clear();

  initStorage();
  assertEqual(localStorage.getItem('vt_version'), '"1.0"', 'initStorage sets version');
  assertEqual(isDisclaimerAccepted(), false, 'disclaimer not accepted initially');

  acceptDisclaimer();
  assertEqual(isDisclaimerAccepted(), true, 'disclaimer accepted after call');

  const cal = getCalibration();
  assertEqual(cal.red_brightness, 100, 'default red brightness is 100');
  assertEqual(cal.cyan_brightness, 100, 'default cyan brightness is 100');
  assertEqual(cal.suppression_passed, false, 'suppression not passed by default');

  const newCal = {
    red_brightness: 80,
    cyan_brightness: 90,
    suppression_passed: true,
    last_calibrated: new Date().toISOString(),
  };
  saveCalibration(newCal);
  const loaded = getCalibration();
  assertEqual(loaded.red_brightness, 80, 'calibration saved correctly');
  assertEqual(loaded.suppression_passed, true, 'suppression_passed saved correctly');

  assertEqual(getSessions().length, 0, 'no sessions initially');
  const session = {
    game: 'binocular-catcher',
    timestamp: new Date().toISOString(),
    duration_s: 300,
    caught: 15,
    total_spawned: 20,
    hit_rate: 0.75,
    contrast_left: 50,
    contrast_right: 100,
    speed: 'slow',
    eye_config: 'platform_left',
  };
  addSession(session);
  assertEqual(getSessions().length, 1, 'session added');
  assertEqual(getSessions()[0].caught, 15, 'session data preserved');

  assertEqual(isStorageAvailable(), true, 'localStorage is available');

  localStorage.clear();
});
