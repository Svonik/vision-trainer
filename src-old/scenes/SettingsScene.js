import { t } from '../modules/i18n.js';
import { COLORS, CONTRAST, SPEEDS } from '../config/constants.js';
import { createGameSettings } from '../modules/gameState.js';
import {
  THEME, applySceneBackground, createTitle, createLabel,
  createStyledButton, createStyledSlider, createCard,
} from '../modules/uiTheme.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  init(data) {
    this.settings = createGameSettings(data.settings || {});
  }

  create() {
    this.children.removeAll();
    applySceneBackground(this);
    const cx = this.cameras.main.centerX;

    createTitle(this, cx, 30, t('settings.contrastBalance'), { fontSize: '22px' });
    createLabel(this, cx, 58, t('settings.contrastHint'), { fontSize: '11px' });

    // Contrast card
    createCard(this, cx, 145, 560, 170);

    // Left eye slider
    createLabel(this, cx - 170, 90, t('settings.leftEye'), { color: '#FF6677', align: 1 });
    this.leftLabel = this.add.text(cx + 160, 90, `${this.settings.contrastLeft}%`, {
      fontSize: '14px', color: '#FF6677', fontFamily: THEME.font,
    }).setOrigin(0, 0.5);

    // Right eye slider
    createLabel(this, cx - 170, 135, t('settings.rightEye'), { color: '#00DDFF', align: 1 });
    this.rightLabel = this.add.text(cx + 160, 135, `${this.settings.contrastRight}%`, {
      fontSize: '14px', color: '#00DDFF', fontFamily: THEME.font,
    }).setOrigin(0, 0.5);

    // Preview
    this.redPreview = this.add.graphics();
    this.redPreview.fillStyle(COLORS.RED, this.settings.contrastLeft / 100);
    this.redPreview.fillRoundedRect(cx - 35, 165, 30, 30, 4);

    this.cyanPreview = this.add.graphics();
    this.cyanPreview.fillStyle(COLORS.CYAN, this.settings.contrastRight / 100);
    this.cyanPreview.fillRoundedRect(cx + 5, 165, 30, 30, 4);

    createStyledSlider(this, cx, 90, 220, this.settings.contrastLeft, CONTRAST.STEP, (v) => {
      this.settings = createGameSettings({ ...this.settings, contrastLeft: v });
      this.leftLabel.setText(`${v}%`);
      this.redPreview.clear();
      this.redPreview.fillStyle(COLORS.RED, v / 100);
      this.redPreview.fillRoundedRect(cx - 35, 165, 30, 30, 4);
    }, { fillColor: COLORS.RED });

    createStyledSlider(this, cx, 135, 220, this.settings.contrastRight, CONTRAST.STEP, (v) => {
      this.settings = createGameSettings({ ...this.settings, contrastRight: v });
      this.rightLabel.setText(`${v}%`);
      this.cyanPreview.clear();
      this.cyanPreview.fillStyle(COLORS.CYAN, v / 100);
      this.cyanPreview.fillRoundedRect(cx + 5, 165, 30, 30, 4);
    }, { fillColor: COLORS.CYAN });

    // Speed section
    createCard(this, cx, 290, 560, 90);
    createLabel(this, cx, 260, t('settings.speed'), { color: THEME.textPrimary, fontSize: '16px' });

    const speedKeys = Object.keys(SPEEDS);
    speedKeys.forEach((key, i) => {
      const bx = cx - 195 + i * 130;
      const isActive = this.settings.speed === key;

      const btnG = this.add.graphics();
      btnG.fillStyle(isActive ? THEME.accent : THEME.border, isActive ? 0.2 : 0.15);
      btnG.lineStyle(1, isActive ? THEME.accent : THEME.border, isActive ? 0.7 : 0.3);
      btnG.fillRoundedRect(bx - 55, 290, 110, 34, 8);
      btnG.strokeRoundedRect(bx - 55, 290, 110, 34, 8);

      const btnText = this.add.text(bx, 307, SPEEDS[key].label, {
        fontSize: '13px',
        color: isActive ? '#00DDFF' : THEME.textSecondary,
        fontFamily: THEME.font,
      }).setOrigin(0.5);

      const hit = this.add.rectangle(bx, 307, 110, 34, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        this.settings = createGameSettings({ ...this.settings, speed: key });
        this.create();
      });
    });

    // Eye selection
    createCard(this, cx, 390, 560, 80);
    createLabel(this, cx, 365, t('settings.eyeSelect'), { color: THEME.textPrimary, fontSize: '16px' });

    const eyeOpts = [
      { key: 'platform_left', label: t('settings.eyeLeft') },
      { key: 'platform_right', label: t('settings.eyeRight') },
    ];
    eyeOpts.forEach((opt, i) => {
      const bx = cx - 95 + i * 190;
      const isActive = this.settings.eyeConfig === opt.key;

      const g = this.add.graphics();
      g.fillStyle(isActive ? THEME.accent : THEME.border, isActive ? 0.2 : 0.15);
      g.lineStyle(1, isActive ? THEME.accent : THEME.border, isActive ? 0.7 : 0.3);
      g.fillRoundedRect(bx - 80, 390, 160, 34, 8);
      g.strokeRoundedRect(bx - 80, 390, 160, 34, 8);

      this.add.text(bx, 407, opt.label, {
        fontSize: '13px',
        color: isActive ? '#00DDFF' : THEME.textSecondary,
        fontFamily: THEME.font,
      }).setOrigin(0.5);

      this.add.rectangle(bx, 407, 160, 34, 0, 0).setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          this.settings = createGameSettings({ ...this.settings, eyeConfig: opt.key });
          this.create();
        });
    });

    // Start button
    createStyledButton(this, cx, 500, 260, 54, t('settings.startGame'), () => {
      this.scene.start('GameScene', { settings: this.settings });
    }, { fontSize: '20px', delay: 200 });
  }
}
