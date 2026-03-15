import { t } from '../modules/i18n.js';
import { COLORS } from '../config/constants.js';

export default class GameSelectScene extends Phaser.Scene {
  constructor() {
    super('GameSelectScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;

    this.add.text(centerX, 50, t('gameSelect.title'), {
      fontSize: '28px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const recalBtn = this.add.text(700, 30, t('calibration.recalibrate'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    recalBtn.on('pointerup', () => this.scene.start('CalibrationScene'));
    recalBtn.on('pointerover', () => recalBtn.setColor(COLORS.WHITE_HEX));
    recalBtn.on('pointerout', () => recalBtn.setColor(COLORS.GRAY_HEX));

    this.createGameCard(
      centerX, 280,
      t('gameSelect.catcher.title'),
      t('gameSelect.catcher.description'),
      () => this.scene.start('SettingsScene'),
    );
  }

  createGameCard(x, y, title, description, onPlay) {
    this.add.rectangle(x, y, 500, 200, COLORS.GRAY, 0.1)
      .setStrokeStyle(2, COLORS.GRAY);

    this.add.text(x, y - 50, title, {
      fontSize: '24px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.add.text(x, y + 10, description, {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      wordWrap: { width: 440 }, align: 'center',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(x, y + 70, 160, 40, COLORS.WHITE, 0.15)
      .setStrokeStyle(1, COLORS.WHITE)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y + 70, t('gameSelect.play'), {
      fontSize: '18px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    btn.on('pointerup', onPlay);
    btn.on('pointerover', () => btn.setFillStyle(COLORS.WHITE, 0.3));
    btn.on('pointerout', () => btn.setFillStyle(COLORS.WHITE, 0.15));
  }
}
