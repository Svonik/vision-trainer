// @ts-nocheck
const BTN_ALPHA = 0.15;
const BTN_ALPHA_PRESSED = 0.35;
const BTN_COLOR = 0x808080;
const BTN_SIZE = 56;
const BTN_GAP = 8;

interface TouchButton {
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  isDown: boolean;
}

export const TouchControls = {
  /**
   * Detect if device has touch input
   */
  hasTouch: (scene: Phaser.Scene): boolean => {
    return scene.sys.game.device.input.touch;
  },

  /**
   * Create D-pad (←↑→↓) in bottom-left corner of the field.
   * Returns { left, right, up, down } each with .isDown property.
   */
  createDPad: (scene: Phaser.Scene, field: { x: number; y: number; w: number; h: number }) => {
    if (!TouchControls.hasTouch(scene)) return null;

    const baseX = field.x + 70;
    const baseY = field.y + field.h - 70;

    const makeBtn = (x: number, y: number, label: string): TouchButton => {
      const bg = scene.add.graphics();
      bg.fillStyle(BTN_COLOR, BTN_ALPHA);
      bg.fillRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 10);

      const text = scene.add.text(x, y, label, {
        fontSize: '24px', color: '#808080', fontFamily: 'Arial',
      }).setOrigin(0.5).setAlpha(0.5);

      const hitArea = scene.add.rectangle(x, y, BTN_SIZE, BTN_SIZE, 0x000000, 0)
        .setInteractive();

      const btn: TouchButton = { bg, label: text, hitArea, isDown: false };

      hitArea.on('pointerdown', () => {
        btn.isDown = true;
        bg.clear();
        bg.fillStyle(BTN_COLOR, BTN_ALPHA_PRESSED);
        bg.fillRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 10);
      });

      hitArea.on('pointerup', () => {
        btn.isDown = false;
        bg.clear();
        bg.fillStyle(BTN_COLOR, BTN_ALPHA);
        bg.fillRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 10);
      });

      hitArea.on('pointerout', () => {
        btn.isDown = false;
        bg.clear();
        bg.fillStyle(BTN_COLOR, BTN_ALPHA);
        bg.fillRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 10);
      });

      return btn;
    };

    const s = BTN_SIZE + BTN_GAP;
    return {
      left: makeBtn(baseX - s, baseY, '◀'),
      up: makeBtn(baseX, baseY - s, '▲'),
      right: makeBtn(baseX + s, baseY, '▶'),
      down: makeBtn(baseX, baseY + s, '▼'),
    };
  },

  /**
   * Create action button (for fire/rotate/etc) in bottom-right corner.
   */
  createActionButton: (scene: Phaser.Scene, field: { x: number; y: number; w: number; h: number }, label: string = '●') => {
    if (!TouchControls.hasTouch(scene)) return null;

    const x = field.x + field.w - 70;
    const y = field.y + field.h - 70;
    const size = 70;

    const bg = scene.add.graphics();
    bg.fillStyle(BTN_COLOR, BTN_ALPHA);
    bg.fillCircle(x, y, size / 2);

    const text = scene.add.text(x, y, label, {
      fontSize: '28px', color: '#808080', fontFamily: 'Arial',
    }).setOrigin(0.5).setAlpha(0.5);

    const hitArea = scene.add.circle(x, y, size / 2, 0x000000, 0)
      .setInteractive();

    const btn: TouchButton = { bg, label: text, hitArea, isDown: false };

    hitArea.on('pointerdown', () => {
      btn.isDown = true;
      bg.clear();
      bg.fillStyle(BTN_COLOR, BTN_ALPHA_PRESSED);
      bg.fillCircle(x, y, size / 2);
    });
    hitArea.on('pointerup', () => {
      btn.isDown = false;
      bg.clear();
      bg.fillStyle(BTN_COLOR, BTN_ALPHA);
      bg.fillCircle(x, y, size / 2);
    });
    hitArea.on('pointerout', () => {
      btn.isDown = false;
      bg.clear();
      bg.fillStyle(BTN_COLOR, BTN_ALPHA);
      bg.fillCircle(x, y, size / 2);
    });

    return btn;
  },

  /**
   * Create horizontal-only buttons (← →) for simple left-right games
   */
  createLeftRight: (scene: Phaser.Scene, field: { x: number; y: number; w: number; h: number }) => {
    if (!TouchControls.hasTouch(scene)) return null;

    const y = field.y + field.h - 50;
    const leftX = field.x + 50;
    const rightX = field.x + field.w - 50;

    const makeBtn = (x: number, label: string): TouchButton => {
      const bg = scene.add.graphics();
      bg.fillStyle(BTN_COLOR, BTN_ALPHA);
      bg.fillRoundedRect(x - 35, y - 30, 70, 60, 10);

      const text = scene.add.text(x, y, label, {
        fontSize: '28px', color: '#808080', fontFamily: 'Arial',
      }).setOrigin(0.5).setAlpha(0.5);

      const hitArea = scene.add.rectangle(x, y, 70, 60, 0x000000, 0).setInteractive();
      const btn: TouchButton = { bg, label: text, hitArea, isDown: false };

      hitArea.on('pointerdown', () => { btn.isDown = true; bg.clear(); bg.fillStyle(BTN_COLOR, BTN_ALPHA_PRESSED); bg.fillRoundedRect(x - 35, y - 30, 70, 60, 10); });
      hitArea.on('pointerup', () => { btn.isDown = false; bg.clear(); bg.fillStyle(BTN_COLOR, BTN_ALPHA); bg.fillRoundedRect(x - 35, y - 30, 70, 60, 10); });
      hitArea.on('pointerout', () => { btn.isDown = false; bg.clear(); bg.fillStyle(BTN_COLOR, BTN_ALPHA); bg.fillRoundedRect(x - 35, y - 30, 70, 60, 10); });

      return btn;
    };

    return {
      left: makeBtn(leftX, '◀'),
      right: makeBtn(rightX, '▶'),
    };
  },
};
