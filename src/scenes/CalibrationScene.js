import { getCalibration, saveCalibration } from '../modules/storage.js';
import { t } from '../modules/i18n.js';
import { COLORS, CALIBRATION } from '../config/constants.js';

export default class CalibrationScene extends Phaser.Scene {
  constructor() {
    super('CalibrationScene');
  }

  create() {
    this.attempts = 0;
    const cal = getCalibration();
    this.redBrightness = cal.red_brightness;
    this.cyanBrightness = cal.cyan_brightness;
    this.showSuppressionTest();
  }

  showSuppressionTest() {
    this.children.removeAll();
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, 60, t('calibration.instruction'), {
      fontSize: '18px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      wordWrap: { width: 600 }, align: 'center',
    }).setOrigin(0.5);

    this.add.rectangle(centerX - 120, centerY - 40, 150, 150, COLORS.RED)
      .setAlpha(this.redBrightness / 100);
    this.add.text(centerX - 120, centerY + 50, 'L', {
      fontSize: '20px', color: COLORS.GRAY_HEX,
    }).setOrigin(0.5);

    this.add.rectangle(centerX + 120, centerY - 40, 150, 150, COLORS.CYAN)
      .setAlpha(this.cyanBrightness / 100);
    this.add.text(centerX + 120, centerY + 50, 'R', {
      fontSize: '20px', color: COLORS.GRAY_HEX,
    }).setOrigin(0.5);

    this.createButton(centerX - 120, centerY + 140, t('calibration.seeBoth'), () => {
      this.onSuppressionPassed();
    });

    this.createButton(centerX + 120, centerY + 140, t('calibration.seeOne'), () => {
      this.attempts += 1;
      if (this.attempts >= CALIBRATION.MAX_ATTEMPTS) {
        this.showDoctorWarning();
      } else {
        this.showSliders();
      }
    });
  }

  showSliders() {
    this.children.removeAll();
    const centerX = this.cameras.main.centerX;

    this.add.text(centerX, 40, t('calibration.adjustBrightness'), {
      fontSize: '18px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Red channel
    this.add.text(centerX, 100, `${t('calibration.red')}:`, {
      fontSize: '16px', color: COLORS.RED_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const redLabel = this.add.text(centerX + 170, 100, `${this.redBrightness}%`, {
      fontSize: '16px', color: COLORS.RED_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);

    // Preview squares — created BEFORE sliders so callbacks can reference them
    const redPreview = this.add.rectangle(centerX - 80, 380, 100, 100, COLORS.RED)
      .setAlpha(this.redBrightness / 100);
    const cyanPreview = this.add.rectangle(centerX + 80, 380, 100, 100, COLORS.CYAN)
      .setAlpha(this.cyanBrightness / 100);

    this.createSlider(centerX, 140, this.redBrightness, (val) => {
      this.redBrightness = val;
      redLabel.setText(`${val}%`);
      redPreview.setAlpha(val / 100);
    });

    // Cyan channel
    this.add.text(centerX, 220, `${t('calibration.cyan')}:`, {
      fontSize: '16px', color: COLORS.CYAN_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const cyanLabel = this.add.text(centerX + 170, 220, `${this.cyanBrightness}%`, {
      fontSize: '16px', color: COLORS.CYAN_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);

    this.createSlider(centerX, 260, this.cyanBrightness, (val) => {
      this.cyanBrightness = val;
      cyanLabel.setText(`${val}%`);
      cyanPreview.setAlpha(val / 100);
    });

    this.createButton(centerX, 480, t('calibration.retry'), () => {
      this.showSuppressionTest();
    });
  }

  showDoctorWarning() {
    this.children.removeAll();
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, centerY - 60, t('calibration.doctorWarning'), {
      fontSize: '20px', color: '#FFAA00', fontFamily: 'Arial, sans-serif',
      wordWrap: { width: 500 }, align: 'center',
    }).setOrigin(0.5);

    this.createButton(centerX, centerY + 40, t('calibration.continueAnyway'), () => {
      this.onSuppressionPassed();
    });
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

  createButton(x, y, label, callback) {
    const bg = this.add.rectangle(x, y, 240, 44, COLORS.GRAY, 0.2)
      .setStrokeStyle(1, COLORS.GRAY)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '16px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    bg.on('pointerup', callback);
    bg.on('pointerover', () => bg.setFillStyle(COLORS.GRAY, 0.4));
    bg.on('pointerout', () => bg.setFillStyle(COLORS.GRAY, 0.2));
    return bg;
  }

  createSlider(x, y, value, onChange) {
    const width = 300;
    const left = x - width / 2;
    this.add.rectangle(x, y, width, 6, COLORS.GRAY, 0.3);

    const thumbX = left + (value / 100) * width;
    const thumb = this.add.circle(thumbX, y, 12, COLORS.WHITE)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(thumb);
    thumb.on('drag', (_pointer, dragX) => {
      const clamped = Phaser.Math.Clamp(dragX, left, left + width);
      thumb.x = clamped;
      const newVal = Math.round(((clamped - left) / width) * 100);
      onChange(newVal);
    });
  }
}
