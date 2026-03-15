import { createSafetyTimer } from '../src/modules/safetyTimer.js';

testSuite('Safety Timer Module', () => {
  let warningFired = false;
  let breakFired = false;

  const timer = createSafetyTimer({
    onWarning: () => { warningFired = true; },
    onBreak: () => { breakFired = true; },
  });

  assertEqual(typeof timer.start, 'function', 'timer has start method');
  assertEqual(typeof timer.stop, 'function', 'timer has stop method');
  assertEqual(typeof timer.pause, 'function', 'timer has pause method');
  assertEqual(typeof timer.resume, 'function', 'timer has resume method');
  assertEqual(typeof timer.getElapsedMs, 'function', 'timer has getElapsedMs method');
  assertEqual(typeof timer.canExtend, 'function', 'timer has canExtend method');
  assertEqual(typeof timer.extend, 'function', 'timer has extend method');

  assertEqual(timer.getElapsedMs(), 0, 'elapsed is 0 before start');
  assertEqual(timer.canExtend(), true, 'can extend initially');

  timer.extend();
  assertEqual(timer.canExtend(), false, 'cannot extend after 1 extension');
});
