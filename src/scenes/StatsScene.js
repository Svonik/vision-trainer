import { t } from '../modules/i18n.js';
import { SPEEDS } from '../config/constants.js';
import {
  THEME, applySceneBackground, createTitle, createLabel,
  createStyledButton, createCard,
} from '../modules/uiTheme.js';

export default class StatsScene extends Phaser.Scene {
  constructor() {
    super('StatsScene');
  }

  init(data) {
    this.result = data.result;
    this.settings = data.settings;
  }

  create() {
    applySceneBackground(this);
    const cx = this.cameras.main.centerX;
    const r = this.result;

    createTitle(this, cx, 40, t('stats.title'), { delay: 0 });

    // Stats card
    createCard(this, cx, 230, 480, 280, { delay: 100 });

    const stats = [
      { label: t('stats.sessionTime'), value: this.formatTime(r.duration_s), color: THEME.textPrimary },
      { label: t('stats.caught'), value: `${r.caught} / ${r.total_spawned}`, color: '#00DDFF' },
      { label: t('stats.hitRate'), value: `${Math.round(r.hit_rate * 100)}%`, color: r.hit_rate >= 0.7 ? '#00CC88' : THEME.warningHex },
      { label: t('stats.contrastLevel'), value: `L: ${r.contrast_left}%  R: ${r.contrast_right}%`, color: THEME.textPrimary },
      { label: t('stats.speed'), value: SPEEDS[r.speed]?.label || r.speed, color: THEME.textSecondary },
    ];

    stats.forEach((stat, i) => {
      const y = 125 + i * 44;
      createLabel(this, cx - 170, y, stat.label, { align: 0 });

      const val = this.add.text(cx + 170, y, stat.value, {
        fontSize: '17px', color: stat.color, fontFamily: THEME.font,
      }).setOrigin(1, 0.5);

      val.setAlpha(0);
      this.tweens.add({ targets: val, alpha: 1, duration: 300, delay: 200 + i * 80 });
    });

    // Buttons
    createStyledButton(this, cx, 420, 280, 44, t('stats.playAgain'), () => {
      this.scene.start('GameScene', { settings: this.settings });
    }, { delay: 500 });

    createStyledButton(this, cx, 475, 280, 44, t('stats.changeSettings'), () => {
      this.scene.start('SettingsScene', { settings: this.settings });
    }, { color: THEME.border, delay: 600 });

    createStyledButton(this, cx, 530, 280, 44, t('stats.exit'), () => {
      this.scene.start('GameSelectScene');
    }, { color: THEME.border, delay: 700 });
  }

  formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }
}
