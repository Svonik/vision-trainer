// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';

const ALIEN_COLS = 8;
const ALIEN_ROWS = 5;
const TOTAL_ALIENS = ALIEN_COLS * ALIEN_ROWS;
const MAX_LIVES = 3;
const SHIP_WIDTH_RATIO = 0.08;
const SHIP_HEIGHT_RATIO = 0.03;
const ALIEN_W = 36;
const ALIEN_H = 24;
const BULLET_W = 3;
const BULLET_H = 12;
const PLAYER_BULLET_SPEED = 500;
const ENEMY_BULLET_SPEED = 220;
const FIRE_COOLDOWN_MS = 500;
const ALIEN_STEP_DOWN = 18;

const ALIEN_STEP_INTERVALS = {
  slow: 1500,
  normal: 1000,
  fast: 700,
  pro: 500,
};

const ENEMY_FIRE_MIN_MS = 2000;
const ENEMY_FIRE_MAX_MS = 3000;

export default class InvadersGameScene extends Phaser.Scene {
  constructor() {
    super('InvadersGameScene');
  }

  create() {
    SynthSounds.resume();

    this.startGameHandler = (settings) => {
      this.settings = createGameSettings(settings || {});
      this.startGameplay();
    };
    this.safetyFinishHandler = () => { this.endGame(false); };
    this.safetyExtendHandler = () => {
      if (this.safetyTimer && this.safetyTimer.canExtend()) {
        this.safetyTimer.extend();
        this.isPaused = false;
      }
    };

    EventBus.on('start-invaders-game', this.startGameHandler);
    EventBus.on('safety-finish', this.safetyFinishHandler);
    EventBus.on('safety-extend', this.safetyExtendHandler);

    this.events.on('shutdown', this.shutdown, this);

    EventBus.emit('current-scene-ready', this);
  }

  startGameplay() {
    const fw = GAME.WIDTH * GAME.FIELD_WIDTH_RATIO;
    const fh = GAME.HEIGHT * GAME.FIELD_HEIGHT_RATIO;
    const fx = (GAME.WIDTH - fw) / 2;
    const fy = (GAME.HEIGHT - fh) / 2;
    this.field = { x: fx, y: fy, w: fw, h: fh };

    const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
    const isLeftPlatform = this.settings.eyeConfig === 'platform_left';
    this.platformColor = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.alienColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.alienAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    // State
    this.lives = MAX_LIVES;
    this.enemiesDestroyed = 0;
    this.isPaused = false;
    this.pauseOverlay = null;
    this.lastPlayerFireMs = -FIRE_COOLDOWN_MS;
    this.alienDirection = 1; // 1 = right, -1 = left
    this.alienStepInterval = ALIEN_STEP_INTERVALS[this.settings.speed] || 1000;
    this.lastAlienStepMs = 0;
    this.nextEnemyFireMs = this.randomEnemyFireDelay();
    this.lastEnemyFireMs = 0;
    this.gameOver = false;

    // Frame (both eyes)
    this.add.rectangle(fx + fw / 2, fy + fh / 2, fw, fh)
      .setStrokeStyle(2, COLORS.GRAY)
      .setFillStyle(COLORS.BLACK, 0);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    this.add.rectangle(ccx, ccy, crossSize, 2, COLORS.WHITE);
    this.add.rectangle(ccx, ccy, 2, crossSize, COLORS.WHITE);

    // Ship (platformColor — one eye)
    const shipW = fw * SHIP_WIDTH_RATIO;
    const shipH = fh * SHIP_HEIGHT_RATIO;
    const shipY = fy + fh - shipH / 2 - 10;
    this.ship = this.add.rectangle(ccx, shipY, shipW, shipH, this.platformColor)
      .setAlpha(this.platformAlpha);
    this.physics.add.existing(this.ship, false);
    this.ship.body.setImmovable(false);

    // Aliens grid (alienColor — other eye)
    this.aliens = [];
    this.alienGroup = this.physics.add.staticGroup();
    const totalGridW = ALIEN_COLS * ALIEN_W + (ALIEN_COLS - 1) * 8;
    const alienStartX = fx + (fw - totalGridW) / 2 + ALIEN_W / 2;
    const alienStartY = fy + 60;

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        const ax = alienStartX + col * (ALIEN_W + 8);
        const ay = alienStartY + row * (ALIEN_H + 8);
        const alien = this.add.rectangle(ax, ay, ALIEN_W, ALIEN_H, this.alienColor)
          .setAlpha(this.alienAlpha);
        // small "eye" notches for visual interest
        this.add.rectangle(ax - 8, ay - 4, 6, 6, this.alienColor)
          .setAlpha(this.alienAlpha * 0.8);
        this.add.rectangle(ax + 8, ay - 4, 6, 6, this.alienColor)
          .setAlpha(this.alienAlpha * 0.8);
        this.physics.add.existing(alien, true);
        this.aliens.push(alien);
        this.alienGroup.add(alien);
      }
    }

    // Bullet pools
    this.playerBullets = [];
    this.enemyBullets = [];

    // Lives display (GRAY — both eyes)
    this.livesIcons = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      const icon = this.add.rectangle(fx + 20 + i * 22, fy + 15, 10, 16, COLORS.GRAY);
      this.livesIcons.push(icon);
    }

    // Score text (GRAY — both eyes)
    this.scoreText = this.add.text(fx + fw - 10, fy + 10, `0 / ${TOTAL_ALIENS}`, {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0);

    // Timer (GRAY — both eyes)
    this.timerText = this.add.text(ccx, fy + 10, '00:00', {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

    // Pause button (GRAY)
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused && this.ship) {
        this.ship.x = Phaser.Math.Clamp(
          pointer.x,
          this.field.x + this.ship.width / 2,
          this.field.x + this.field.w - this.ship.width / 2,
        );
      }
    });
    this.input.on('pointerup', () => {
      if (!this.isPaused) this.firePlayerBullet();
    });

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });
    this.safetyTimer.start();

    // Tab blur → auto-pause
    this.game.events.on('blur', () => {
      if (!this.isPaused) this.togglePause();
    });

  }

  shutdown() {
    EventBus.removeListener('start-invaders-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
  }

  update(time, delta) {
    if (this.isPaused || this.gameOver) return;
    if (!this.ship) return;

    // Ship keyboard movement
    if (this.cursors.left.isDown) {
      this.ship.x -= PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    } else if (this.cursors.right.isDown) {
      this.ship.x += PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    }
    this.ship.x = Phaser.Math.Clamp(
      this.ship.x,
      this.field.x + this.ship.width / 2,
      this.field.x + this.field.w - this.ship.width / 2,
    );

    // Space to fire
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.firePlayerBullet();
    }

    // Alien march
    if (time - this.lastAlienStepMs >= this.alienStepInterval) {
      this.lastAlienStepMs = time;
      this.marchAliens();
    }

    // Enemy fire
    if (time - this.lastEnemyFireMs >= this.nextEnemyFireMs) {
      this.lastEnemyFireMs = time;
      this.nextEnemyFireMs = this.randomEnemyFireDelay();
      this.fireEnemyBullet();
    }

    // Move player bullets upward
    const alivePlayerBullets = [];
    for (const b of this.playerBullets) {
      b.y -= PLAYER_BULLET_SPEED * (delta / 1000);
      if (b.y < this.field.y - BULLET_H) {
        b.destroy();
        continue;
      }
      // Check collision with aliens
      let hit = false;
      for (let i = this.aliens.length - 1; i >= 0; i--) {
        const alien = this.aliens[i];
        if (!alien.active) continue;
        if (this.rectsOverlap(b, alien, BULLET_W, BULLET_H, ALIEN_W, ALIEN_H)) {
          this.destroyAlien(alien, i);
          b.destroy();
          hit = true;
          break;
        }
      }
      if (!hit) alivePlayerBullets.push(b);
    }
    this.playerBullets = alivePlayerBullets;

    // Move enemy bullets downward
    const aliveEnemyBullets = [];
    for (const b of this.enemyBullets) {
      b.y += ENEMY_BULLET_SPEED * (delta / 1000);
      if (b.y > this.field.y + this.field.h + BULLET_H) {
        b.destroy();
        continue;
      }
      // Check collision with ship
      if (this.ship && this.rectsOverlap(b, this.ship, BULLET_W, BULLET_H, this.ship.width, this.ship.height)) {
        b.destroy();
        this.loseLife();
        continue;
      }
      aliveEnemyBullets.push(b);
    }
    this.enemyBullets = aliveEnemyBullets;

    // Check if any alien reached the bottom
    for (const alien of this.aliens) {
      if (!alien.active) continue;
      if (alien.y + ALIEN_H / 2 >= this.field.y + this.field.h - 30) {
        this.endGame(false);
        return;
      }
    }

    // Timer display
    if (this.safetyTimer) {
      const elapsed = this.safetyTimer.getElapsedMs();
      const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      this.timerText.setText(`${mins}:${secs}`);
    }
  }

  marchAliens() {
    const liveAliens = this.aliens.filter((a) => a.active);
    if (liveAliens.length === 0) return;

    // Find current left/right extent
    let minX = Infinity;
    let maxX = -Infinity;
    for (const a of liveAliens) {
      if (a.x - ALIEN_W / 2 < minX) minX = a.x - ALIEN_W / 2;
      if (a.x + ALIEN_W / 2 > maxX) maxX = a.x + ALIEN_W / 2;
    }

    const step = 16;
    const rightEdge = this.field.x + this.field.w;
    const leftEdge = this.field.x;

    let reverseAndStep = false;
    if (this.alienDirection === 1 && maxX + step >= rightEdge) {
      reverseAndStep = true;
    } else if (this.alienDirection === -1 && minX - step <= leftEdge) {
      reverseAndStep = true;
    }

    if (reverseAndStep) {
      // Step down first, then reverse
      for (const a of liveAliens) {
        a.y += ALIEN_STEP_DOWN;
        if (a.body) a.body.reset(a.x, a.y);
      }
      this.alienDirection = -this.alienDirection;
    } else {
      for (const a of liveAliens) {
        a.x += step * this.alienDirection;
        if (a.body) a.body.reset(a.x, a.y);
      }
    }

    // Accelerate slightly as aliens are destroyed
    const remaining = liveAliens.length;
    const fraction = remaining / TOTAL_ALIENS;
    const baseInterval = ALIEN_STEP_INTERVALS[this.settings.speed] || 1000;
    this.alienStepInterval = Math.max(150, baseInterval * Math.max(0.3, fraction));
  }

  firePlayerBullet() {
    if (!this.ship) return;
    const now = this.time.now;
    if (now - this.lastPlayerFireMs < FIRE_COOLDOWN_MS) return;
    this.lastPlayerFireMs = now;

    SynthSounds.launch();

    const bullet = this.add.rectangle(
      this.ship.x,
      this.ship.y - this.ship.height / 2 - BULLET_H / 2,
      BULLET_W,
      BULLET_H,
      this.platformColor,
    ).setAlpha(this.platformAlpha);
    this.playerBullets.push(bullet);
  }

  fireEnemyBullet() {
    const liveAliens = this.aliens.filter((a) => a.active);
    if (liveAliens.length === 0) return;

    // Pick a random alien from the bottom row of each column
    const byColumn = {};
    for (const a of liveAliens) {
      const colKey = Math.round(a.x);
      if (!byColumn[colKey] || a.y > byColumn[colKey].y) {
        byColumn[colKey] = a;
      }
    }
    const shooters = Object.values(byColumn);
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];

    const bullet = this.add.rectangle(
      shooter.x,
      shooter.y + ALIEN_H / 2 + BULLET_H / 2,
      BULLET_W,
      BULLET_H,
      this.alienColor,
    ).setAlpha(this.alienAlpha);
    this.enemyBullets.push(bullet);
  }

  destroyAlien(alien, index) {
    // Flash on hit
    const flash = this.add.rectangle(alien.x, alien.y, ALIEN_W, ALIEN_H, COLORS.WHITE)
      .setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy(),
    });

    alien.destroy();
    this.aliens[index] = { active: false };
    this.enemiesDestroyed++;
    this.scoreText.setText(`${this.enemiesDestroyed} / ${TOTAL_ALIENS}`);

    SynthSounds.hit();
    GameVFX.particleBurst(this, alien.x, alien.y, this.alienColor);
    GameVFX.scorePopup(this, alien.x, alien.y);

    if (this.enemiesDestroyed >= TOTAL_ALIENS) {
      SynthSounds.victory();
      this.endGame(true);
    }
  }

  loseLife() {
    this.lives--;
    if (this.lives >= 0 && this.lives < this.livesIcons.length) {
      this.livesIcons[this.lives].setFillStyle(0x333333);
    }
    SynthSounds.miss();
    GameVFX.screenShake(this, 5, 150);

    if (this.lives <= 0) {
      this.endGame(false);
    }
  }

  rectsOverlap(a, b, aw, ah, bw, bh) {
    return (
      Math.abs(a.x - b.x) < (aw + bw) / 2 &&
      Math.abs(a.y - b.y) < (ah + bh) / 2
    );
  }

  randomEnemyFireDelay() {
    return ENEMY_FIRE_MIN_MS + Math.random() * (ENEMY_FIRE_MAX_MS - ENEMY_FIRE_MIN_MS);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.safetyTimer.pause();
      this.showPauseMenu();
    } else {
      this.safetyTimer.resume();
      if (this.pauseOverlay) {
        this.pauseOverlay.forEach((el) => el.destroy());
        this.pauseOverlay = null;
      }
    }
  }

  showPauseMenu() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const bg = this.add.rectangle(cx, cy, 300, 200, COLORS.BLACK, 0.85)
      .setStrokeStyle(2, COLORS.GRAY);
    const title = this.add.text(cx, cy - 50, t('game.pause'), {
      fontSize: '24px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const resumeBtn = this.add.rectangle(cx, cy + 10, 200, 40, COLORS.GRAY, 0.2)
      .setStrokeStyle(1, COLORS.GRAY).setInteractive({ useHandCursor: true });
    const resumeText = this.add.text(cx, cy + 10, t('game.resume'), {
      fontSize: '16px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    resumeBtn.on('pointerup', () => this.togglePause());

    const quitBtn = this.add.rectangle(cx, cy + 60, 200, 40, COLORS.GRAY, 0.2)
      .setStrokeStyle(1, COLORS.GRAY).setInteractive({ useHandCursor: true });
    const quitText = this.add.text(cx, cy + 60, t('game.quit'), {
      fontSize: '16px', color: COLORS.WHITE_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    quitBtn.on('pointerup', () => this.endGame(false));

    this.pauseOverlay = [bg, title, resumeBtn, resumeText, quitBtn, quitText];
  }

  endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.safetyTimer.stop();
    if (!won) SynthSounds.gameOver();

    const result = {
      game: 'invaders',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.enemiesDestroyed,
      total_spawned: TOTAL_ALIENS,
      hit_rate: TOTAL_ALIENS > 0
        ? Math.round((this.enemiesDestroyed / TOTAL_ALIENS) * 100) / 100
        : 0,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      lives_remaining: this.lives,
      completed: won,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
