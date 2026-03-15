import { t } from '../modules/i18n.js';
import { COLORS, CONTRAST, SPEEDS } from '../config/constants.js';
import { createGameSettings } from '../modules/gameState.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  init(data) {
    this.settings = createGameSettings(data.settings || {});
  }

  create() {
    this.children.removeAll();
    const cx = this.cameras.main.centerX;

    this.add.text(cx, 30, t('settings.contrastBalance'), {
      fontSize: '22px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.add.text(cx, 55, t('settings.contrastHint'), {
      fontSize: '12px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Left eye
    this.add.text(cx - 60, 90, t('settings.leftEye'), {
      fontSize: '14px', color: COLORS.RED_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0.5);
    this.leftLabel = this.add.text(cx + 170, 90, `${this.settings.contrastLeft}%`, {
      fontSize: '14px', color: COLORS.RED_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);
    this.createSlider(cx + 50, 90, 200, this.settings.contrastLeft, CONTRAST.STEP, (v) => {
      this.settings = createGameSettings({ ...this.settings, contrastLeft: v });
      this.leftLabel.setText(`${v}%`);
      this.updatePreview();
    });

    // Right eye
    this.add.text(cx - 60, 130, t('settings.rightEye'), {
      fontSize: '14px', color: COLORS.CYAN_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0.5);
    this.rightLabel = this.add.text(cx + 170, 130, `${this.settings.contrastRight}%`, {
      fontSize: '14px', color: COLORS.CYAN_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);
    this.createSlider(cx + 50, 130, 200, this.settings.contrastRight, CONTRAST.STEP, (v) => {
      this.settings = createGameSettings({ ...this.settings, contrastRight: v });
      this.rightLabel.setText(`${v}%`);
      this.updatePreview();
    });

    // Preview
    this.redPreview = this.add.rectangle(cx - 40, 200, 60, 60, COLORS.RED)
      .setAlpha(this.settings.contrastLeft / 100);
    this.cyanPreview = this.add.rectangle(cx + 40, 200, 60, 60, COLORS.CYAN)
      .setAlpha(this.settings.contrastRight / 100);

    // Speed
    this.add.text(cx, 270, t('settings.speed'), {
      fontSize: '18px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const speedKeys = Object.keys(SPEEDS);
    speedKeys.forEach((key, i) => {
      const bx = 160 + i * 140;
      const isActive = this.settings.speed === key;
      const bg = this.add.rectangle(bx, 310, 120, 36, COLORS.GRAY, isActive ? 0.4 : 0.1)
        .setStrokeStyle(1, isActive ? COLORS.WHITE : COLORS.GRAY)
        .setInteractive({ useHandCursor: true });
      this.add.text(bx, 310, SPEEDS[key].label, {
        fontSize: '14px', color: isActive ? COLORS.WHITE_HEX : COLORS.GRAY_HEX,
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);
      bg.on('pointerup', () => {
        this.settings = createGameSettings({ ...this.settings, speed: key });
        this.create();
      });
    });

    // Eye select
    this.add.text(cx, 370, t('settings.eyeSelect'), {
      fontSize: '18px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const eyeOptions = [
      { key: 'platform_left', label: t('settings.eyeLeft') },
      { key: 'platform_right', label: t('settings.eyeRight') },
    ];
    eyeOptions.forEach((opt, i) => {
      const bx = cx - 100 + i * 200;
      const isActive = this.settings.eyeConfig === opt.key;
      const bg = this.add.rectangle(bx, 410, 170, 36, COLORS.GRAY, isActive ? 0.4 : 0.1)
        .setStrokeStyle(1, isActive ? COLORS.WHITE : COLORS.GRAY)
        .setInteractive({ useHandCursor: true });
      this.add.text(bx, 410, opt.label, {
        fontSize: '14px', color: isActive ? COLORS.WHITE_HEX : COLORS.GRAY_HEX,
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);
      bg.on('pointerup', () => {
        this.settings = createGameSettings({ ...this.settings, eyeConfig: opt.key });
        this.create();
      });
    });

    // Start button
    const startBtn = this.add.rectangle(cx, 510, 240, 50, COLORS.WHITE, 0.15)
      .setStrokeStyle(2, COLORS.WHITE)
      .setInteractive({ useHandCursor: true });
    this.add.text(cx, 510, t('settings.startGame'), {
      fontSize: '20px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    startBtn.on('pointerup', () => {
      this.scene.start('GameScene', { settings: this.settings });
    });
    startBtn.on('pointerover', () => startBtn.setFillStyle(COLORS.WHITE, 0.3));
    startBtn.on('pointerout', () => startBtn.setFillStyle(COLORS.WHITE, 0.15));
  }

  updatePreview() {
    this.redPreview.setAlpha(this.settings.contrastLeft / 100);
    this.cyanPreview.setAlpha(this.settings.contrastRight / 100);
  }

  createSlider(x, y, width, value, step, onChange) {
    const left = x - width / 2;
    this.add.rectangle(x, y, width, 4, COLORS.GRAY, 0.3);
    const thumbX = left + (value / 100) * width;
    const thumb = this.add.circle(thumbX, y, 10, COLORS.WHITE)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(thumb);
    thumb.on('drag', (_pointer, dragX) => {
      const clamped = Phaser.Math.Clamp(dragX, left, left + width);
      thumb.x = clamped;
      const raw = ((clamped - left) / width) * 100;
      const snapped = Math.round(raw / step) * step;
      onChange(Phaser.Math.Clamp(snapped, 0, 100));
    });
  }
}
