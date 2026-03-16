// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';

const MAX_LIVES = 3;
const INITIAL_ASTEROID_COUNT = 5;
const FIRE_COOLDOWN_MS = 300;
const INVULNERABILITY_MS = 2000;
const SHIP_ROTATION_SPEED = 180; // degrees per second
const SHIP_THRUST = 220;
const SHIP_FRICTION = 0.985;
const BULLET_SPEED = 480;
const BULLET_LIFETIME_MS = 1600;

const ASTEROID_SIZES = {
  large:  { radius: 30, speed: 1.0, score: 1 },
  medium: { radius: 18, speed: 1.4, score: 2 },
  small:  { radius: 10, speed: 2.0, score: 4 },
};

const ASTEROID_SPEED_MULTIPLIERS = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.4,
  pro: 1.8,
};

export default class AsteroidGameScene extends Phaser.Scene {
  constructor() {
    super('AsteroidGameScene');
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

    EventBus.on('start-asteroid-game', this.startGameHandler);
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
    this.ballColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.ballAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    // State
    this.lives = MAX_LIVES;
    this.asteroidsDestroyed = 0;
    this.totalAsteroids = 0;
    this.isPaused = false;
    this.pauseOverlay = null;
    this.gameOver = false;
    this.gameEnded = false;
    this.invulnerableUntilMs = 0;
    this.lastFireMs = -FIRE_COOLDOWN_MS;

    // Ship physics state (manual, no arcade physics — ship wraps)
    this.shipX = fx + fw / 2;
    this.shipY = fy + fh / 2;
    this.shipAngleDeg = 0; // 0 = pointing up
    this.shipVX = 0;
    this.shipVY = 0;

    // Collections
    this.asteroids = [];
    this.bullets = [];

    // Graphics objects — redrawn each frame
    this.shipGraphics = this.add.graphics();
    this.bulletsGraphics = this.add.graphics();
    this.asteroidsGraphics = this.add.graphics();

    // Field frame (both eyes — gray)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Lives display (GRAY — both eyes)
    this.livesIcons = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      const icon = this.add.circle(fx + 20 + i * 22, fy + 15, 6, COLORS.GRAY);
      this.livesIcons.push(icon);
    }

    // Score text (GRAY — both eyes)
    this.scoreText = GameVisuals.scoreText(this, fx + fw - 10, fy + 10, '0', 1);

    // Timer (GRAY — both eyes)
    this.timerText = GameVisuals.scoreText(this, ccx, fy + 10, '00:00', 0.5);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Controls hint
    this.controlsHint = this.add.text(ccx, fy + fh - 20, '← → вращение  ↑ тяга  Пробел/клик огонь', {
      fontSize: '12px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 1).setAlpha(0.7);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerup', () => {
      if (!this.isPaused) this.firePlayerBullet();
    });

    // Spawn initial asteroids
    this.speedMultiplier = ASTEROID_SPEED_MULTIPLIERS[this.settings.speed] || 1.0;
    for (let i = 0; i < INITIAL_ASTEROID_COUNT; i++) {
      this.spawnAsteroid('large', null, null);
    }

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.trailFrameCounter = 0;

    // Tab blur → auto-pause (store reference for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Pause gameplay until countdown finishes
    this.isPaused = true;
    GameVFX.countdown(this, ccx, ccy, () => {
      this.isPaused = false;
      this.safetyTimer.start();
    });
  }

  shutdown() {
    EventBus.removeListener('start-asteroid-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
  }

  // ---- Asteroid spawning ----

  spawnAsteroid(size, x, y) {
    const def = ASTEROID_SIZES[size];
    const { x: fx, y: fy, w: fw, h: fh } = this.field;

    // If no position provided, spawn near a random edge, safely away from ship center
    let ax = x;
    let ay = y;
    if (ax === null || ay === null) {
      let attempts = 0;
      do {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { ax = fx + Math.random() * fw; ay = fy + def.radius; }
        else if (edge === 1) { ax = fx + fw - def.radius; ay = fy + Math.random() * fh; }
        else if (edge === 2) { ax = fx + Math.random() * fw; ay = fy + fh - def.radius; }
        else { ax = fx + def.radius; ay = fy + Math.random() * fh; }
        attempts++;
      } while (
        attempts < 10 &&
        Math.hypot(ax - (fx + fw / 2), ay - (fy + fh / 2)) < 120
      );
    }

    // Random velocity direction
    const angleDeg = Math.random() * 360;
    const rad = (angleDeg * Math.PI) / 180;
    const baseSpeed = def.speed * 60 * this.speedMultiplier;
    const vx = Math.cos(rad) * baseSpeed;
    const vy = Math.sin(rad) * baseSpeed;

    // Distortion factors for irregular shape (slight ellipse)
    const scaleX = 0.85 + Math.random() * 0.3;
    const scaleY = 0.85 + Math.random() * 0.3;
    const rotOffset = Math.random() * 360;

    const asteroid = { x: ax, y: ay, vx, vy, size, radius: def.radius, scaleX, scaleY, rotOffset, active: true };
    this.asteroids.push(asteroid);
    this.totalAsteroids++;
  }

  // ---- Update loop ----

  update(time, delta) {
    if (this.isPaused || this.gameOver) return;
    if (!this.shipGraphics) return;

    const dt = delta / 1000;
    const { x: fx, y: fy, w: fw, h: fh } = this.field;

    // Ship rotation
    if (this.cursors.left.isDown) {
      this.shipAngleDeg -= SHIP_ROTATION_SPEED * dt;
    } else if (this.cursors.right.isDown) {
      this.shipAngleDeg += SHIP_ROTATION_SPEED * dt;
    }

    // Thrust
    if (this.cursors.up.isDown) {
      const rad = ((this.shipAngleDeg - 90) * Math.PI) / 180;
      this.shipVX += Math.cos(rad) * SHIP_THRUST * dt;
      this.shipVY += Math.sin(rad) * SHIP_THRUST * dt;
    }

    // Friction — normalize to 60fps to be frame-rate independent
    this.shipVX *= Math.pow(SHIP_FRICTION, delta / 16.667);
    this.shipVY *= Math.pow(SHIP_FRICTION, delta / 16.667);

    // Move ship
    this.shipX += this.shipVX * dt;
    this.shipY += this.shipVY * dt;

    // Wrap ship around field edges
    const margin = 20;
    if (this.shipX < fx - margin) this.shipX = fx + fw + margin;
    if (this.shipX > fx + fw + margin) this.shipX = fx - margin;
    if (this.shipY < fy - margin) this.shipY = fy + fh + margin;
    if (this.shipY > fy + fh + margin) this.shipY = fy - margin;

    // Fire on Space key
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.firePlayerBullet();
    }

    // Move and age bullets
    const aliveBullets = [];
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.age += delta;

      // Wrap bullets too
      if (b.x < fx - 20) b.x = fx + fw + 20;
      if (b.x > fx + fw + 20) b.x = fx - 20;
      if (b.y < fy - 20) b.y = fy + fh + 20;
      if (b.y > fy + fh + 20) b.y = fy - 20;

      if (b.age < BULLET_LIFETIME_MS) {
        aliveBullets.push(b);
      }
    }
    this.bullets = aliveBullets;

    // Bullet trail every 3rd frame
    this.trailFrameCounter = (this.trailFrameCounter || 0) + 1;
    if (this.trailFrameCounter % 3 === 0) {
      for (const b of this.bullets) {
        if (b.age < BULLET_LIFETIME_MS) {
          GameVFX.addTrailDot(this, b.x, b.y, this.platformColor, 2);
        }
      }
    }

    // Move asteroids
    for (const a of this.asteroids) {
      if (!a.active) continue;
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // Wrap asteroids
      if (a.x < fx - a.radius) a.x = fx + fw + a.radius;
      if (a.x > fx + fw + a.radius) a.x = fx - a.radius;
      if (a.y < fy - a.radius) a.y = fy + fh + a.radius;
      if (a.y > fy + fh + a.radius) a.y = fy - a.radius;
    }

    // Bullet-asteroid collisions
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.active) continue;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < a.radius + 3) {
          b.age = BULLET_LIFETIME_MS; // mark bullet as expired
          this.hitAsteroid(a);
          break;
        }
      }
    }

    // Ship-asteroid collisions (only if not invulnerable)
    if (time > this.invulnerableUntilMs) {
      for (const a of this.asteroids) {
        if (!a.active) continue;
        const dist = Math.hypot(this.shipX - a.x, this.shipY - a.y);
        if (dist < a.radius + 12) {
          this.loseLife(time);
          break;
        }
      }
    }

    // Remove inactive asteroids
    this.asteroids = this.asteroids.filter((a) => a.active);

    // Win check
    if (this.asteroids.length === 0 && !this.gameOver) {
      this.endGame(true);
      return;
    }

    // Render
    this.renderShip(time);
    this.renderBullets();
    this.renderAsteroids();

    // Timer display
    if (this.safetyTimer) {
      const elapsed = this.safetyTimer.getElapsedMs();
      const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      this.timerText.setText(`${mins}:${secs}`);
    }
  }

  // ---- Rendering ----

  renderShip(time) {
    const g = this.shipGraphics;
    g.clear();

    // Blink when invulnerable
    if (time < this.invulnerableUntilMs) {
      const blinkOn = Math.floor(time / 150) % 2 === 0;
      if (!blinkOn) return;
    }

    const rad = (this.shipAngleDeg * Math.PI) / 180;
    const size = 16;

    // Triangle points: tip forward, base behind
    const tipX = this.shipX + Math.cos(rad - Math.PI / 2) * size;
    const tipY = this.shipY + Math.sin(rad - Math.PI / 2) * size;
    const leftX = this.shipX + Math.cos(rad + Math.PI * 5 / 6) * size;
    const leftY = this.shipY + Math.sin(rad + Math.PI * 5 / 6) * size;
    const rightX = this.shipX + Math.cos(rad - Math.PI * 5 / 6) * size;
    const rightY = this.shipY + Math.sin(rad - Math.PI * 5 / 6) * size;

    // Glow halo around ship
    g.lineStyle(6, this.platformColor, this.platformAlpha * 0.06);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(leftX, leftY);
    g.lineTo(rightX, rightY);
    g.closePath();
    g.strokePath();

    g.lineStyle(3, this.platformColor, this.platformAlpha * 0.15);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(leftX, leftY);
    g.lineTo(rightX, rightY);
    g.closePath();
    g.strokePath();

    // Core ship outline
    g.lineStyle(2, this.platformColor, this.platformAlpha);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(leftX, leftY);
    g.lineTo(rightX, rightY);
    g.closePath();
    g.strokePath();
  }

  renderBullets() {
    const g = this.bulletsGraphics;
    g.clear();
    for (const b of this.bullets) {
      if (b.age < BULLET_LIFETIME_MS) {
        // Glow around bullet
        g.fillStyle(this.platformColor, this.platformAlpha * 0.15);
        g.fillCircle(b.x, b.y, 6);
        g.fillStyle(this.platformColor, this.platformAlpha * 0.3);
        g.fillCircle(b.x, b.y, 4);
        // Core bullet
        g.fillStyle(this.platformColor, this.platformAlpha);
        g.fillCircle(b.x, b.y, 3);
      }
    }
  }

  renderAsteroids() {
    const g = this.asteroidsGraphics;
    g.clear();
    for (const a of this.asteroids) {
      if (!a.active) continue;

      const numPoints = 10;

      // Outer glow layer
      g.fillStyle(this.ballColor, this.ballAlpha * 0.06);
      g.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const wobble = 0.85 + 0.15 * Math.sin(theta * 3 + a.rotOffset);
        const px = a.x + Math.cos(theta) * a.radius * a.scaleX * wobble * 1.5;
        const py = a.y + Math.sin(theta) * a.radius * a.scaleY * wobble * 1.5;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();

      // Mid glow layer
      g.fillStyle(this.ballColor, this.ballAlpha * 0.12);
      g.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const wobble = 0.85 + 0.15 * Math.sin(theta * 3 + a.rotOffset);
        const px = a.x + Math.cos(theta) * a.radius * a.scaleX * wobble * 1.2;
        const py = a.y + Math.sin(theta) * a.radius * a.scaleY * wobble * 1.2;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();

      // Core fill
      g.fillStyle(this.ballColor, this.ballAlpha);
      g.lineStyle(1.5, this.ballColor, this.ballAlpha);
      g.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const wobble = 0.85 + 0.15 * Math.sin(theta * 3 + a.rotOffset);
        const px = a.x + Math.cos(theta) * a.radius * a.scaleX * wobble;
        const py = a.y + Math.sin(theta) * a.radius * a.scaleY * wobble;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
  }

  // ---- Game logic ----

  firePlayerBullet() {
    const now = this.time.now;
    if (now - this.lastFireMs < FIRE_COOLDOWN_MS) return;
    this.lastFireMs = now;

    SynthSounds.launch();

    const rad = ((this.shipAngleDeg - 90) * Math.PI) / 180;
    const bullet = {
      x: this.shipX + Math.cos(rad) * 18,
      y: this.shipY + Math.sin(rad) * 18,
      vx: Math.cos(rad) * BULLET_SPEED + this.shipVX,
      vy: Math.sin(rad) * BULLET_SPEED + this.shipVY,
      age: 0,
    };
    this.bullets.push(bullet);
  }

  hitAsteroid(asteroid) {
    asteroid.active = false;
    this.asteroidsDestroyed++;
    this.scoreText.setText(String(this.asteroidsDestroyed));

    SynthSounds.hit();
    GameVFX.particleBurst(this, asteroid.x, asteroid.y, this.ballColor, 10);
    GameVFX.scorePopup(this, asteroid.x, asteroid.y);

    // Flash effect at asteroid position
    this.spawnFlash(asteroid.x, asteroid.y, asteroid.radius);

    // Split into smaller asteroids
    if (asteroid.size === 'large') {
      this.spawnAsteroid('medium', asteroid.x, asteroid.y);
      this.spawnAsteroid('medium', asteroid.x, asteroid.y);
    } else if (asteroid.size === 'medium') {
      this.spawnAsteroid('small', asteroid.x, asteroid.y);
      this.spawnAsteroid('small', asteroid.x, asteroid.y);
    }
    // small: fully destroyed, no split
  }

  spawnFlash(x, y, radius) {
    const flash = this.add.circle(x, y, radius, COLORS.WHITE, 0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  loseLife(time) {
    this.lives--;
    if (this.lives >= 0 && this.lives < this.livesIcons.length) {
      this.livesIcons[this.lives].setFillStyle(0x333333);
    }
    SynthSounds.miss();
    GameVFX.screenShake(this, 4, 150);

    // Reset ship to center with brief invulnerability
    this.shipX = this.field.x + this.field.w / 2;
    this.shipY = this.field.y + this.field.h / 2;
    this.shipVX = 0;
    this.shipVY = 0;
    this.invulnerableUntilMs = time + INVULNERABILITY_MS;

    if (this.lives <= 0) {
      this.endGame(false);
    }
  }

  // ---- Pause / UI ----

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
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.gameOver = true;
    this.safetyTimer.stop();
    if (won) {
      SynthSounds.victory();
    } else {
      SynthSounds.gameOver();
    }

    const result = {
      game: 'asteroid',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.asteroidsDestroyed,
      total_spawned: this.totalAsteroids,
      hit_rate: this.totalAsteroids > 0
        ? Math.round((this.asteroidsDestroyed / this.totalAsteroids) * 100) / 100
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
