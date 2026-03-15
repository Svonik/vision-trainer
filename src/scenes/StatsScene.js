import { t } from '../modules/i18n.js';
import { COLORS, SPEEDS } from '../config/constants.js';

export default class StatsScene extends Phaser.Scene {
  constructor() {
    super('StatsScene');
  }

  init(data) {
    this.result = data.result;
    this.settings = data.settings;
  }

  create() {
    const cx = this.cameras.main.centerX;
    const r = this.result;

    this.add.text(cx, 40, t('stats.title'), {
      fontSize: '24px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const stats = [
      { label: t('stats.sessionTime'), value: this.formatTime(r.duration_s) },
      { label: t('stats.caught'), value: `${r.caught} / ${r.total_spawned}` },
      { label: t('stats.hitRate'), value: `${Math.round(r.hit_rate * 100)}%` },
      { label: t('stats.contrastLevel'), value: `L: ${r.contrast_left}% / R: ${r.contrast_right}%` },
      { label: t('stats.speed'), value: SPEEDS[r.speed]?.label || r.speed },
    ];

    stats.forEach((stat, i) => {
      const y = 120 + i * 50;
      this.add.text(cx - 180, y, stat.label, {
        fontSize: '18px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      });
      this.add.text(cx + 180, y, stat.value, {
        fontSize: '18px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
      }).setOrigin(1, 0);
    });

    this.add.rectangle(cx, 380, 400, 1, COLORS.GRAY);

    this.createButton(cx, 420, t('stats.playAgain'), () => {
      this.scene.start('GameScene', { settings: this.settings });
    });
    this.createButton(cx, 475, t('stats.changeSettings'), () => {
      this.scene.start('SettingsScene', { settings: this.settings });
    });
    this.createButton(cx, 530, t('stats.exit'), () => {
      this.scene.start('GameSelectScene');
    });
  }

  formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  createButton(x, y, label, callback) {
    const bg = this.add.rectangle(x, y, 280, 42, COLORS.GRAY, 0.15)
      .setStrokeStyle(1, COLORS.GRAY)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '16px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    bg.on('pointerup', callback);
    bg.on('pointerover', () => bg.setFillStyle(COLORS.GRAY, 0.3));
    bg.on('pointerout', () => bg.setFillStyle(COLORS.GRAY, 0.15));
  }
}
