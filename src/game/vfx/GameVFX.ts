export const GameVFX = {
  /**
   * Particle burst at position — uses the COLOR of the destroyed object
   * to maintain dichoptic separation (red particles = one eye only)
   */
  particleBurst: (scene: Phaser.Scene, x: number, y: number, color: number, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      const size = 2 + Math.random() * 3;

      const particle = scene.add.circle(x, y, size, color, 0.8);

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  },

  /**
   * Screen shake — subtle camera shake on impact
   */
  screenShake: (scene: Phaser.Scene, intensity: number = 3, duration: number = 100) => {
    scene.cameras.main.shake(duration, intensity / 1000);
  },

  /**
   * Flash effect — brief white flash at position (visible to both eyes)
   */
  flash: (scene: Phaser.Scene, x: number, y: number, width: number = 30, height: number = 30, duration: number = 100) => {
    const flash = scene.add.rectangle(x, y, width, height, 0xFFFFFF, 0.8);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration,
      onComplete: () => flash.destroy(),
    });
  },

  /**
   * Circle flash — for round objects (ball, food, etc.)
   */
  circleFlash: (scene: Phaser.Scene, x: number, y: number, radius: number = 15, color: number = 0xFFFFFF, duration: number = 150) => {
    const flash = scene.add.circle(x, y, radius, color, 0.7);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration,
      onComplete: () => flash.destroy(),
    });
  },

  /**
   * Trail effect — leave fading dots behind a moving object
   * Call this each frame for the object you want to trail
   */
  addTrailDot: (scene: Phaser.Scene, x: number, y: number, color: number, radius: number = 3, alpha: number = 0.4) => {
    const dot = scene.add.circle(x, y, radius, color, alpha);
    scene.tweens.add({
      targets: dot,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 200,
      onComplete: () => dot.destroy(),
    });
  },

  /**
   * Score popup — floating "+1" text that rises and fades
   */
  scorePopup: (scene: Phaser.Scene, x: number, y: number, text: string = '+1', color: string = '#FFFFFF') => {
    const popup = scene.add.text(x, y, text, {
      fontSize: '16px',
      color,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    scene.tweens.add({
      targets: popup,
      y: y - 40,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  },

  /**
   * Countdown 3-2-1-GO animation
   */
  countdown: (scene: Phaser.Scene, x: number, y: number, onComplete: () => void) => {
    const items = ['3', '2', '1', 'GO!'];
    let index = 0;

    const showNext = () => {
      if (index >= items.length) {
        onComplete();
        return;
      }

      const text = scene.add.text(x, y, items[index], {
        fontSize: index < 3 ? '64px' : '48px',
        color: index < 3 ? '#808080' : '#00DDFF',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);

      scene.tweens.add({
        targets: text,
        alpha: 1,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        hold: 400,
        onComplete: () => {
          text.destroy();
          index++;
          showNext();
        },
      });
    };

    showNext();
  },
};
