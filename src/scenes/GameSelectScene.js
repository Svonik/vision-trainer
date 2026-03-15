import { t } from '../modules/i18n.js';
import {
  THEME, applySceneBackground, createTitle, createLabel,
  createStyledButton, createCard,
} from '../modules/uiTheme.js';

export default class GameSelectScene extends Phaser.Scene {
  constructor() {
    super('GameSelectScene');
  }

  create() {
    applySceneBackground(this);
    const cx = this.cameras.main.centerX;

    createTitle(this, cx, 50, t('gameSelect.title'), { delay: 0 });

    // Recalibrate link (top right)
    const recalBtn = this.add.text(710, 30, '\u2699 ' + t('calibration.recalibrate'), {
      fontSize: '13px', color: THEME.textSecondary, fontFamily: THEME.font,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    recalBtn.on('pointerup', () => this.scene.start('CalibrationScene'));
    recalBtn.on('pointerover', () => recalBtn.setColor('#00DDFF'));
    recalBtn.on('pointerout', () => recalBtn.setColor(THEME.textSecondary));

    // Game card
    createCard(this, cx, 280, 520, 220, { delay: 100 });

    // Eye icon
    this.add.text(cx, 200, '\uD83D\uDC41', {
      fontSize: '32px',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: this.children.last,
      alpha: 0.8, duration: 400, delay: 200,
    });

    this.add.text(cx, 245, t('gameSelect.catcher.title'), {
      fontSize: '22px', color: THEME.textPrimary, fontFamily: THEME.font,
    }).setOrigin(0.5);

    createLabel(this, cx, 285, t('gameSelect.catcher.description'), {
      fontSize: '13px', wordWrap: { width: 440 },
    });

    createStyledButton(this, cx, 350, 180, 44, t('gameSelect.play'), () => {
      this.scene.start('SettingsScene');
    }, { delay: 300, fontSize: '18px' });
  }
}
