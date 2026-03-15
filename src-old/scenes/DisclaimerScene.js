import { acceptDisclaimer } from '../modules/storage.js';
import { t } from '../modules/i18n.js';
import {
  THEME, applySceneBackground, createTitle, createLabel,
  createStyledButton, createCard, drawRoundedRect,
} from '../modules/uiTheme.js';

export default class DisclaimerScene extends Phaser.Scene {
  constructor() {
    super('DisclaimerScene');
  }

  create() {
    applySceneBackground(this);
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Card background
    createCard(this, cx, cy, 640, 420, { delay: 0 });

    // Icon
    const icon = this.add.text(cx, cy - 150, '\u2695', {
      fontSize: '40px', color: THEME.warningHex,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: icon, alpha: 1, duration: 500, delay: 100 });

    // Title
    createTitle(this, cx, cy - 100, 'Важная информация', { delay: 150 });

    // Body text
    const body = createLabel(this, cx, cy - 10, t('disclaimer.text'), {
      fontSize: '15px',
      color: THEME.textSecondary,
      wordWrap: { width: 540 },
    });
    body.setAlpha(0);
    this.tweens.add({ targets: body, alpha: 1, duration: 400, delay: 250 });

    // Checkbox
    let accepted = false;
    const checkBg = drawRoundedRect(this, cx - 150, cy + 90, 22, 22, 4, THEME.border, 0.4, THEME.accent, 0.3);
    const checkmark = this.add.text(cx - 150, cy + 90, '\u2713', {
      fontSize: '16px', color: '#00DDFF',
    }).setOrigin(0.5).setVisible(false);

    const checkLabel = createLabel(this, cx - 130, cy + 90, t('disclaimer.accept'), {
      fontSize: '15px', color: THEME.textSecondary, align: 0,
    });

    const checkHit = this.add.rectangle(cx - 60, cy + 90, 220, 30, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    // Continue button (starts disabled)
    const btnContainer = createStyledButton(this, cx, cy + 155, 240, 48, t('disclaimer.continue'), () => {
      if (accepted) {
        acceptDisclaimer();
        this.scene.start('CalibrationScene');
      }
    }, { delay: 400 });
    btnContainer.setAlpha(0.3);

    checkHit.on('pointerup', () => {
      accepted = !accepted;
      checkmark.setVisible(accepted);
      if (accepted) {
        checkBg.clear();
        checkBg.fillStyle(THEME.accent, 0.15);
        checkBg.lineStyle(1.5, THEME.accent, 0.8);
        checkBg.fillRoundedRect(cx - 150 - 11, cy + 90 - 11, 22, 22, 4);
        checkBg.strokeRoundedRect(cx - 150 - 11, cy + 90 - 11, 22, 22, 4);
        this.tweens.add({ targets: btnContainer, alpha: 1, duration: 200 });
      } else {
        checkBg.clear();
        checkBg.fillStyle(THEME.border, 0.4);
        checkBg.lineStyle(1.5, THEME.accent, 0.3);
        checkBg.fillRoundedRect(cx - 150 - 11, cy + 90 - 11, 22, 22, 4);
        checkBg.strokeRoundedRect(cx - 150 - 11, cy + 90 - 11, 22, 22, 4);
        this.tweens.add({ targets: btnContainer, alpha: 0.3, duration: 200 });
      }
    });
  }
}
