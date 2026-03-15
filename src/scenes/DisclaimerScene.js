import { acceptDisclaimer } from '../modules/storage.js';
import { t } from '../modules/i18n.js';
import { COLORS } from '../config/constants.js';

export default class DisclaimerScene extends Phaser.Scene {
  constructor() {
    super('DisclaimerScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, 80, 'Важная информация', {
      fontSize: '28px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 60, t('disclaimer.text'), {
      fontSize: '16px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      wordWrap: { width: 600 }, align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    let accepted = false;

    const checkboxBg = this.add.rectangle(centerX - 140, centerY + 80, 24, 24, COLORS.GRAY)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, COLORS.WHITE);

    const checkmark = this.add.text(centerX - 140, centerY + 80, '✓', {
      fontSize: '18px', color: COLORS.WHITE_HEX,
    }).setOrigin(0.5).setVisible(false);

    this.add.text(centerX - 115, centerY + 80, t('disclaimer.accept'), {
      fontSize: '16px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5);

    const btnBg = this.add.rectangle(centerX, centerY + 160, 220, 50, COLORS.GRAY, 0.3)
      .setStrokeStyle(2, COLORS.GRAY);

    const btnText = this.add.text(centerX, centerY + 160, t('disclaimer.continue'), {
      fontSize: '20px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    checkboxBg.on('pointerup', () => {
      accepted = !accepted;
      checkmark.setVisible(accepted);
      btnBg.setFillStyle(accepted ? COLORS.WHITE : COLORS.GRAY, accepted ? 0.2 : 0.3);
      btnText.setColor(accepted ? COLORS.WHITE_HEX : COLORS.GRAY_HEX);
      if (accepted) {
        btnBg.setInteractive({ useHandCursor: true });
      } else {
        btnBg.disableInteractive();
      }
    });

    btnBg.on('pointerup', () => {
      if (accepted) {
        acceptDisclaimer();
        this.scene.start('CalibrationScene');
      }
    });
  }
}
