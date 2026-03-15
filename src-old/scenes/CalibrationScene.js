import { getCalibration, saveCalibration } from '../modules/storage.js';
import { t } from '../modules/i18n.js';
import { COLORS, CALIBRATION } from '../config/constants.js';
import {
  THEME, applySceneBackground, createTitle, createLabel,
  createStyledButton, createStyledSlider, createCard,
} from '../modules/uiTheme.js';

export default class CalibrationScene extends Phaser.Scene {
  constructor() {
    super('CalibrationScene');
  }

  create() {
    applySceneBackground(this);
    this.attempts = 0;
    const cal = getCalibration();
    this.redBrightness = cal.red_brightness;
    this.cyanBrightness = cal.cyan_brightness;
    this.showSuppressionTest();
  }

  showSuppressionTest() {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    createCard(this, cx, cy - 20, 660, 460, { delay: 0 });

    createTitle(this, cx, 70, t('calibration.instruction'), { fontSize: '18px', delay: 100 });

    // Red square (left eye)
    this.add.graphics()
      .fillStyle(COLORS.RED, this.redBrightness / 100)
      .fillRoundedRect(cx - 200, cy - 100, 150, 150, 8);
    createLabel(this, cx - 125, cy + 70, 'L — левый глаз', { fontSize: '12px' });

    // Cyan square (right eye)
    this.add.graphics()
      .fillStyle(COLORS.CYAN, this.cyanBrightness / 100)
      .fillRoundedRect(cx + 50, cy - 100, 150, 150, 8);
    createLabel(this, cx + 125, cy + 70, 'R — правый глаз', { fontSize: '12px' });

    createStyledButton(this, cx - 130, cy + 140, 230, 46, t('calibration.seeBoth'), () => {
      this.onSuppressionPassed();
    }, { color: THEME.success, delay: 200 });

    createStyledButton(this, cx + 130, cy + 140, 230, 46, t('calibration.seeOne'), () => {
      this.attempts += 1;
      if (this.attempts >= CALIBRATION.MAX_ATTEMPTS) {
        this.showDoctorWarning();
      } else {
        this.showSliders();
      }
    }, { color: THEME.accentRed, delay: 300 });
  }

  showSliders() {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;

    applySceneBackground(this);
    createCard(this, cx, 300, 600, 500, { delay: 0 });

    createTitle(this, cx, 70, t('calibration.adjustBrightness'), { fontSize: '20px' });

    // Red channel
    createLabel(this, cx - 120, 140, t('calibration.red'), { color: '#FF6677' });
    this.redLabel = this.add.text(cx + 150, 140, `${this.redBrightness}%`, {
      fontSize: '16px', color: '#FF6677', fontFamily: THEME.font,
    }).setOrigin(0, 0.5);

    const redPreview = this.add.graphics();
    redPreview.fillStyle(COLORS.RED, this.redBrightness / 100);
    redPreview.fillRoundedRect(cx - 50, 240, 80, 80, 6);

    createStyledSlider(this, cx, 180, 280, this.redBrightness, 1, (val) => {
      this.redBrightness = val;
      this.redLabel.setText(`${val}%`);
      redPreview.clear();
      redPreview.fillStyle(COLORS.RED, val / 100);
      redPreview.fillRoundedRect(cx - 50, 240, 80, 80, 6);
    }, { fillColor: COLORS.RED });

    // Cyan channel
    createLabel(this, cx - 120, 350, t('calibration.cyan'), { color: '#00DDFF' });
    this.cyanLabel = this.add.text(cx + 150, 350, `${this.cyanBrightness}%`, {
      fontSize: '16px', color: '#00DDFF', fontFamily: THEME.font,
    }).setOrigin(0, 0.5);

    const cyanPreview = this.add.graphics();
    cyanPreview.fillStyle(COLORS.CYAN, this.cyanBrightness / 100);
    cyanPreview.fillRoundedRect(cx + 50 - 80, 240, 80, 80, 6);

    createStyledSlider(this, cx, 390, 280, this.cyanBrightness, 1, (val) => {
      this.cyanBrightness = val;
      this.cyanLabel.setText(`${val}%`);
      cyanPreview.clear();
      cyanPreview.fillStyle(COLORS.CYAN, val / 100);
      cyanPreview.fillRoundedRect(cx + 50 - 80, 240, 80, 80, 6);
    }, { fillColor: COLORS.CYAN });

    createStyledButton(this, cx, 480, 220, 44, t('calibration.retry'), () => {
      this.showSuppressionTest();
    }, { delay: 200 });
  }

  showDoctorWarning() {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    applySceneBackground(this);
    createCard(this, cx, cy, 500, 250);

    this.add.text(cx, cy - 60, '\u26A0', {
      fontSize: '36px', color: THEME.warningHex,
    }).setOrigin(0.5);

    createLabel(this, cx, cy - 10, t('calibration.doctorWarning'), {
      fontSize: '16px', color: THEME.warningHex, wordWrap: { width: 420 },
    });

    createStyledButton(this, cx, cy + 70, 260, 44, t('calibration.continueAnyway'), () => {
      this.onSuppressionPassed();
    }, { color: THEME.warning });
  }

  onSuppressionPassed() {
    saveCalibration({
      red_brightness: this.redBrightness,
      cyan_brightness: this.cyanBrightness,
      suppression_passed: true,
      last_calibrated: new Date().toISOString(),
    });
    this.scene.start('GameSelectScene');
  }
}
