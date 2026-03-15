import { t } from '../src/modules/i18n.js';

testSuite('i18n Module', () => {
  assertEqual(typeof t('app.title'), 'string', 't() returns a string');
  assert(t('app.title').length > 0, 'app.title is not empty');
  assertEqual(t('nonexistent.key'), '[nonexistent.key]', 'missing key returns bracketed key');
  assert(t('disclaimer.text').includes('врача'), 'disclaimer mentions doctor');
  assert(t('calibration.instruction').includes('очки'), 'calibration mentions glasses');
});
