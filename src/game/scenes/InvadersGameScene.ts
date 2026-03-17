// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';
import { TouchControls } from '../vfx/TouchControls';

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
const INVINCIBILITY_DURATION_MS = 2000;
const BLINK_INTERVAL_MS = 150;

const ALIEN_STEP_INTERVALS = {
  slow: 1500,
  normal: 1000,
  fast: 700,
  pro: 500,
};

const ENEMY_FIRE_MIN_MS = 2000;
const ENEMY_FIRE_MAX_MS = 3000;

const ALIEN_SPRITE_KEYS = ['alien1', 'alien2', 'alien3', 'alien4', 'alien1'];

export default class InvadersGameScene extends Phaser.Scene {
  constructor() {
    super('InvadersGameScene');
  }

  preload() {
    this.load.image('ship', 'assets/sprites/ship.png');
    this.load.image('alien1', 'assets/sprites/alien1.png');
    this.load.image('alien2', 'assets/sprites/alien2.png');
    this.load.image('alien3', 'assets/sprites/alien3.png');
    this.load.image('alien4', 'assets/sprites/alien4.png');
    this.load.image('laser', 'assets/sprites/laser.png');
    this.load.image('laser-red', 'assets/sprites/laser-red.png');
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
    this.level = 1;
    this.lives = MAX_LIVES;
    this.enemiesDestroyed = 0;
    this.isPaused = true; // freeze during countdown
    this.gameEnded = false;
    this.pauseOverlay = null;
    this.lastPlayerFireMs = -FIRE_COOLDOWN_MS;
    this.alienDirection = 1; // 1 = right, -1 = left
    this.alienStepInterval = ALIEN_STEP_INTERVALS[this.settings.speed] || 1000;
    this.lastAlienStepMs = 0;
    this.nextEnemyFireMs = this.randomEnemyFireDelay();
    this.lastEnemyFireMs = 0;
    this.gameOver = false;
    this.invincible = false;
    this.blinkTimer = null;

    // Frame (both eyes)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Ship (platformColor — one eye)
    const shipW = fw * SHIP_WIDTH_RATIO;
    const shipH = fh * SHIP_HEIGHT_RATIO * 3; // taller to match sprite aspect ratio
    const shipY = fy + fh - shipH / 2 - 10;

    if (this.textures.exists('ship')) {
      this.ship = this.add.image(ccx, shipY, 'ship');
      this.ship.setTint(this.platformColor);
      this.ship.setAlpha(this.platformAlpha);
      const shipScale = shipW / this.ship.width;
      this.ship.setScale(shipScale);
      this.physics.add.existing(this.ship, false);
      this.ship.body.setImmovable(false);
    } else {
      // Fallback: rectangle
      this.ship = this.add.rectangle(ccx, shipY, shipW, shipH, this.platformColor, 0);
      this.physics.add.existing(this.ship, false);
      this.ship.body.setImmovable(false);
      this.shipVisual = GameVisuals.glowRect(this, ccx, shipY, shipW, shipH, this.platformColor, this.platformAlpha);
    }

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
        const spriteKey = ALIEN_SPRITE_KEYS[row % ALIEN_SPRITE_KEYS.length];

        let alienSprite;
        if (this.textures.exists(spriteKey)) {
          alienSprite = this.add.image(ax, ay, spriteKey);
          alienSprite.setTint(this.alienColor);
          alienSprite.setAlpha(this.alienAlpha);
          const alienScale = ALIEN_W / alienSprite.width;
          alienSprite.setScale(alienScale);
          this.physics.add.existing(alienSprite, true);
          this.aliens.push({ body: alienSprite, alienVisual: null, notchL: null, notchR: null });
          this.alienGroup.add(alienSprite);
        } else {
          // Fallback: rectangle + notch decorations
          const alien = this.add.rectangle(ax, ay, ALIEN_W, ALIEN_H, this.alienColor, 0);
          const alienVisual = GameVisuals.glowRect(this, ax, ay, ALIEN_W, ALIEN_H, this.alienColor, this.alienAlpha, 3);
          const notchL = this.add.rectangle(ax - 8, ay - 4, 6, 6, this.alienColor)
            .setAlpha(this.alienAlpha * 0.8);
          const notchR = this.add.rectangle(ax + 8, ay - 4, 6, 6, this.alienColor)
            .setAlpha(this.alienAlpha * 0.8);
          this.physics.add.existing(alien, true);
          this.aliens.push({ body: alien, alienVisual, notchL, notchR });
          this.alienGroup.add(alien);
        }
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

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Pause button (GRAY)
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
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

    // Touch controls (tablet support — only shown when touch device detected)
    this.touchLR = TouchControls.createLeftRight(this, this.field);
    this.touchFire = TouchControls.createActionButton(this, this.field, '🔥');
    this._touchFireFired = false;

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    // Tab blur → auto-pause (named handler for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Countdown before gameplay starts
    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;
    GameVFX.countdown(this, cx, cy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
    });
  }

  shutdown() {
    EventBus.removeListener('start-invaders-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    if (this.blinkTimer) { this.blinkTimer.remove(); this.blinkTimer = null; }
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) { this.togglePause(); return; }
    if (this.isPaused || this.gameOver) return;
    if (!this.ship) return;

    // Ship keyboard + touch movement
    if (this.cursors.left.isDown || this.touchLR?.left?.isDown) {
      this.ship.x -= PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    } else if (this.cursors.right.isDown || this.touchLR?.right?.isDown) {
      this.ship.x += PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    }
    this.ship.x = Phaser.Math.Clamp(
      this.ship.x,
      this.field.x + this.ship.width / 2,
      this.field.x + this.field.w - this.ship.width / 2,
    );
    // Sync ship visual (fallback rectangle mode)
    if (this.shipVisual) { this.shipVisual.x = this.ship.x; this.shipVisual.y = this.ship.y; }

    // Space to fire, or touch fire button (one-shot cooldown)
    const touchFireNow = this.touchFire?.isDown && !this._touchFireFired;
    if (touchFireNow) this._touchFireFired = true;
    if (!this.touchFire?.isDown) this._touchFireFired = false;
    if ((this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) || touchFireNow) {
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
        const alienEntry = this.aliens[i];
        if (!alienEntry.body || !alienEntry.body.active) continue;
        if (this.rectsOverlap(b, alienEntry.body, BULLET_W, BULLET_H, ALIEN_W, ALIEN_H)) {
          this.destroyAlien(alienEntry, i);
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
      // Check collision with ship (skip if invincible)
      if (!this.invincible && this.ship && this.rectsOverlap(b, this.ship, BULLET_W, BULLET_H, this.ship.width, this.ship.height)) {
        b.destroy();
        this.loseLife();
        continue;
      }
      aliveEnemyBullets.push(b);
    }
    this.enemyBullets = aliveEnemyBullets;

    // Check if any alien reached the bottom
    for (const alienEntry of this.aliens) {
      if (!alienEntry.body || !alienEntry.body.active) continue;
      if (alienEntry.body.y + ALIEN_H / 2 >= this.field.y + this.field.h - 30) {
        this.endGame(false);
        return;
      }
    }

    // HUD update
    if (this.safetyTimer && this.hud) {
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `★ ${this.enemiesDestroyed}/${TOTAL_ALIENS}`);
    }
  }

  marchAliens() {
    const liveAliens = this.aliens.filter((a) => a.body && a.body.active);
    if (liveAliens.length === 0) return;

    // Find current left/right extent
    let minX = Infinity;
    let maxX = -Infinity;
    for (const a of liveAliens) {
      if (a.body.x - ALIEN_W / 2 < minX) minX = a.body.x - ALIEN_W / 2;
      if (a.body.x + ALIEN_W / 2 > maxX) maxX = a.body.x + ALIEN_W / 2;
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
        a.body.y += ALIEN_STEP_DOWN;
        if (a.body.body) a.body.body.reset(a.body.x, a.body.y);
        // Move notches with the body (fallback mode only)
        if (a.notchL) { a.notchL.x = a.body.x - 8; a.notchL.y = a.body.y - 4; }
        if (a.notchR) { a.notchR.x = a.body.x + 8; a.notchR.y = a.body.y - 4; }
        if (a.alienVisual) { a.alienVisual.x = a.body.x; a.alienVisual.y = a.body.y; }
      }
      this.alienDirection = -this.alienDirection;
    } else {
      for (const a of liveAliens) {
        a.body.x += step * this.alienDirection;
        if (a.body.body) a.body.body.reset(a.body.x, a.body.y);
        // Move notches with the body (fallback mode only)
        if (a.notchL) { a.notchL.x = a.body.x - 8; a.notchL.y = a.body.y - 4; }
        if (a.notchR) { a.notchR.x = a.body.x + 8; a.notchR.y = a.body.y - 4; }
        if (a.alienVisual) { a.alienVisual.x = a.body.x; a.alienVisual.y = a.body.y; }
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

    let bullet;
    if (this.textures.exists('laser')) {
      bullet = this.add.image(
        this.ship.x,
        this.ship.y - this.ship.height / 2 - BULLET_H / 2,
        'laser',
      );
      bullet.setTint(this.platformColor);
      bullet.setAlpha(this.platformAlpha);
      const bulletScale = (BULLET_H * 1.5) / bullet.height;
      bullet.setScale(bulletScale);
    } else {
      bullet = this.add.rectangle(
        this.ship.x,
        this.ship.y - this.ship.height / 2 - BULLET_H / 2,
        BULLET_W,
        BULLET_H,
        this.platformColor,
      ).setAlpha(this.platformAlpha);
    }
    this.playerBullets.push(bullet);
  }

  fireEnemyBullet() {
    const liveAliens = this.aliens.filter((a) => a.body && a.body.active);
    if (liveAliens.length === 0) return;

    // Pick a random alien from the bottom row of each column
    const byColumn = {};
    for (const a of liveAliens) {
      const colKey = Math.round(a.body.x);
      if (!byColumn[colKey] || a.body.y > byColumn[colKey].body.y) {
        byColumn[colKey] = a;
      }
    }
    const shooters = Object.values(byColumn);
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];

    let bullet;
    const laserKey = this.textures.exists('laser-red') ? 'laser-red' : (this.textures.exists('laser') ? 'laser' : null);
    if (laserKey) {
      bullet = this.add.image(
        shooter.body.x,
        shooter.body.y + ALIEN_H / 2 + BULLET_H / 2,
        laserKey,
      );
      bullet.setTint(this.alienColor);
      bullet.setAlpha(this.alienAlpha);
      const bulletScale = (BULLET_H * 1.5) / bullet.height;
      bullet.setScale(bulletScale);
    } else {
      bullet = this.add.rectangle(
        shooter.body.x,
        shooter.body.y + ALIEN_H / 2 + BULLET_H / 2,
        BULLET_W,
        BULLET_H,
        this.alienColor,
      ).setAlpha(this.alienAlpha);
    }
    this.enemyBullets.push(bullet);
  }

  destroyAlien(alienEntry, index) {
    const alien = alienEntry.body;
    // Flash on hit
    const flash = this.add.rectangle(alien.x, alien.y, ALIEN_W, ALIEN_H, COLORS.WHITE)
      .setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy(),
    });

    // Destroy notches and visual together with the alien body (fallback mode)
    if (alienEntry.notchL) { alienEntry.notchL.destroy(); alienEntry.notchL = null; }
    if (alienEntry.notchR) { alienEntry.notchR.destroy(); alienEntry.notchR = null; }
    if (alienEntry.alienVisual) { alienEntry.alienVisual.destroy(); alienEntry.alienVisual = null; }
    alien.destroy();
    this.aliens[index] = { body: { active: false }, notchL: null, notchR: null };
    this.enemiesDestroyed++;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.enemiesDestroyed}/${TOTAL_ALIENS}`);

    SynthSounds.hit();
    GameVFX.particleBurst(this, alien.x, alien.y, this.alienColor);
    GameVFX.scorePopup(this, alien.x, alien.y);

    if (this.enemiesDestroyed >= TOTAL_ALIENS) {
      this.nextLevel();
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
      return;
    }

    // Grant 2s invincibility with blinking effect
    this.invincible = true;
    let blinkCount = 0;
    const totalBlinks = Math.floor(INVINCIBILITY_DURATION_MS / BLINK_INTERVAL_MS);
    this.blinkTimer = this.time.addEvent({
      delay: BLINK_INTERVAL_MS,
      repeat: totalBlinks - 1,
      callback: () => {
        blinkCount++;
        const visible = blinkCount % 2 === 0;
        // Sprite mode
        if (this.ship && this.ship.setAlpha) {
          this.ship.setAlpha(visible ? this.platformAlpha : 0);
        }
        // Fallback visual mode
        if (this.shipVisual) {
          this.shipVisual.setAlpha(visible ? this.platformAlpha : 0);
        }
      },
    });
    this.time.delayedCall(INVINCIBILITY_DURATION_MS, () => {
      this.invincible = false;
      if (this.ship && this.ship.setAlpha) this.ship.setAlpha(this.platformAlpha);
      if (this.shipVisual) this.shipVisual.setAlpha(this.platformAlpha);
      if (this.blinkTimer) { this.blinkTimer.remove(); this.blinkTimer = null; }
    });
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
      this.input.setDefaultCursor('default');
      this.showPauseMenu();
    } else {
      this.safetyTimer.resume();
      this.input.setDefaultCursor('none');
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

  nextLevel() {
    this.level++;
    this.isPaused = true;

    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;

    const levelText = this.add.text(cx, cy, `Уровень ${this.level}!`, {
      fontSize: '36px', color: '#FFFFFF', fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    SynthSounds.victory();

    this.tweens.add({
      targets: levelText,
      alpha: 1, scaleX: 1.3, scaleY: 1.3,
      duration: 300, yoyo: true, hold: 1500,
      onComplete: () => {
        levelText.destroy();
        this.isPaused = false;
        this.resetForNextLevel();
      },
    });
  }

  resetForNextLevel() {
    // Destroy existing aliens
    for (const alienEntry of this.aliens) {
      if (alienEntry.notchL) { alienEntry.notchL.destroy(); alienEntry.notchL = null; }
      if (alienEntry.notchR) { alienEntry.notchR.destroy(); alienEntry.notchR = null; }
      if (alienEntry.alienVisual) { alienEntry.alienVisual.destroy(); alienEntry.alienVisual = null; }
      if (alienEntry.body && alienEntry.body.active) alienEntry.body.destroy();
    }
    this.alienGroup.clear(true, true);
    this.aliens = [];

    // Destroy remaining bullets
    for (const b of this.playerBullets) b.destroy();
    for (const b of this.enemyBullets) b.destroy();
    this.playerBullets = [];
    this.enemyBullets = [];

    // Respawn aliens
    const { x: fx, y: fy, w: fw } = this.field;
    const totalGridW = ALIEN_COLS * ALIEN_W + (ALIEN_COLS - 1) * 8;
    const alienStartX = fx + (fw - totalGridW) / 2 + ALIEN_W / 2;
    const alienStartY = fy + 60;

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        const ax = alienStartX + col * (ALIEN_W + 8);
        const ay = alienStartY + row * (ALIEN_H + 8);
        const spriteKey = ALIEN_SPRITE_KEYS[row % ALIEN_SPRITE_KEYS.length];

        if (this.textures.exists(spriteKey)) {
          const alienSprite = this.add.image(ax, ay, spriteKey);
          alienSprite.setTint(this.alienColor);
          alienSprite.setAlpha(this.alienAlpha);
          const alienScale = ALIEN_W / alienSprite.width;
          alienSprite.setScale(alienScale);
          this.physics.add.existing(alienSprite, true);
          this.aliens.push({ body: alienSprite, alienVisual: null, notchL: null, notchR: null });
          this.alienGroup.add(alienSprite);
        } else {
          const alien = this.add.rectangle(ax, ay, ALIEN_W, ALIEN_H, this.alienColor, 0);
          const alienVisual = GameVisuals.glowRect(this, ax, ay, ALIEN_W, ALIEN_H, this.alienColor, this.alienAlpha, 3);
          const notchL = this.add.rectangle(ax - 8, ay - 4, 6, 6, this.alienColor)
            .setAlpha(this.alienAlpha * 0.8);
          const notchR = this.add.rectangle(ax + 8, ay - 4, 6, 6, this.alienColor)
            .setAlpha(this.alienAlpha * 0.8);
          this.physics.add.existing(alien, true);
          this.aliens.push({ body: alien, alienVisual, notchL, notchR });
          this.alienGroup.add(alien);
        }
      }
    }

    this.enemiesDestroyed = 0;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.enemiesDestroyed}/${TOTAL_ALIENS}`);

    // Faster march interval
    this.alienStepInterval = Math.max(150, this.alienStepInterval * 0.85);
    this.alienDirection = 1;
    this.lastAlienStepMs = 0;

    // Respawn ship at center
    const ccx = fx + fw / 2;
    this.ship.x = ccx;
    if (this.shipVisual) { this.shipVisual.x = ccx; }
  }

  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;
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
      level: this.level,
      completed: won,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
