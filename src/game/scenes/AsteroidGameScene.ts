// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { createContrastState, createContrastConfig, recordTrial, getAccuracy } from '../../modules/contrastEngine';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';
import { TouchControls } from '../vfx/TouchControls';

const MAX_LIVES = 3;
const INITIAL_ASTEROID_COUNT = 5;
const FIRE_COOLDOWN_MS = 300;
const INVULNERABILITY_MS = 2000;
const SHIP_ROTATION_SPEED = 180; // degrees per second
const SHIP_THRUST = 220;
const SHIP_FRICTION = 0.985;
const BULLET_SPEED = 480;
const BULLET_LIFETIME_MS = 1600;
const SHIP_SPRITE_SIZE = 32;

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

const ASTEROID_SPRITE_KEYS = {
  large: 'asteroid-large',
  medium: 'asteroid-medium',
  small: 'asteroid-small',
};

const ASTEROID_ROT_SPEED = 45; // degrees per second, base rotation for sprites

export default class AsteroidGameScene extends Phaser.Scene {
  constructor() {
    super('AsteroidGameScene');
  }

  preload() {
    this.load.image('ship2', 'assets/sprites/ship2.png');
    this.load.image('asteroid-large', 'assets/sprites/asteroid-large.png');
    this.load.image('asteroid-medium', 'assets/sprites/asteroid-medium.png');
    this.load.image('asteroid-small', 'assets/sprites/asteroid-small.png');
    this.load.image('laser', 'assets/sprites/laser.png');
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

    this.contrastConfig = createContrastConfig();
    this.contrastState = createContrastState(this.settings.fellowEyeContrast ?? 30);

    // Sync initial asteroid alpha with fellowEyeContrast (clinical contrast)
    this.ballAlpha = this.contrastState.fellowEyeContrast / 100;

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
    this.level = 1;

    // Ship physics state (manual, no arcade physics — ship wraps)
    this.shipX = fx + fw / 2;
    this.shipY = fy + fh / 2;
    this.shipAngleDeg = 0; // 0 = pointing up
    this.shipVX = 0;
    this.shipVY = 0;

    // Collections
    this.asteroids = [];
    this.bullets = [];

    // Ship sprite (or fallback graphics)
    if (this.textures.exists('ship2')) {
      this.shipSprite = this.add.image(this.shipX, this.shipY, 'ship2');
      this.shipSprite.setTint(this.platformColor);
      this.shipSprite.setAlpha(this.platformAlpha);
      const shipScale = SHIP_SPRITE_SIZE / Math.max(this.shipSprite.width, this.shipSprite.height);
      this.shipSprite.setScale(shipScale);
      this.shipGraphics = null;
    } else {
      // Fallback: draw with graphics
      this.shipSprite = null;
      this.shipGraphics = this.add.graphics();
    }

    // Bullets graphics — only used in fallback bullet mode
    this.bulletsGraphics = this.add.graphics();

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

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

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
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.on('pointerup', () => {
      if (!this.isPaused) this.firePlayerBullet();
    });

    // Touch controls (tablet support — only shown when touch device detected)
    this.touchDPad = TouchControls.createDPad(this, this.field);
    this.touchFire = TouchControls.createActionButton(this, this.field, '●');
    this._touchFireFired = false;

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
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
    });
  }

  shutdown() {
    EventBus.removeListener('start-asteroid-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');

    // Destroy all asteroid sprites
    if (this.asteroids) {
      for (const a of this.asteroids) {
        if (a.sprite) { a.sprite.destroy(); a.sprite = null; }
      }
    }
    // Destroy all bullet sprites
    if (this.bullets) {
      for (const b of this.bullets) {
        if (b.sprite) { b.sprite.destroy(); b.sprite = null; }
      }
    }
    // Destroy ship sprite
    if (this.shipSprite) { this.shipSprite.destroy(); this.shipSprite = null; }
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

    // Distortion factors for irregular shape (slight ellipse) — kept for fallback graphics
    const scaleX = 0.85 + Math.random() * 0.3;
    const scaleY = 0.85 + Math.random() * 0.3;
    const rotOffset = Math.random() * 360;
    // Per-asteroid rotation speed for sprites (varies by size, random direction)
    const rotDir = Math.random() < 0.5 ? 1 : -1;
    const rotSpeed = rotDir * ASTEROID_ROT_SPEED * (0.5 + Math.random()) * (size === 'small' ? 2 : size === 'medium' ? 1.4 : 1);

    // Create sprite if texture available
    let sprite = null;
    const spriteKey = ASTEROID_SPRITE_KEYS[size];
    if (this.textures.exists(spriteKey)) {
      sprite = this.add.image(ax, ay, spriteKey);
      sprite.setTint(this.ballColor);
      sprite.setAlpha(this.ballAlpha);
      const astScale = (def.radius * 2) / Math.max(sprite.width, sprite.height);
      sprite.setScale(astScale);
      sprite.setAngle(rotOffset); // random start angle
    }

    const asteroid = { x: ax, y: ay, vx, vy, size, radius: def.radius, scaleX, scaleY, rotOffset, active: true, sprite, rotSpeed };
    this.asteroids.push(asteroid);
    this.totalAsteroids++;
  }

  // ---- Update loop ----

  update(time, delta) {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) { this.togglePause(); return; }
    if (this.isPaused || this.gameOver) return;
    if (!this.shipSprite && !this.shipGraphics) return;

    const dt = delta / 1000;
    const { x: fx, y: fy, w: fw, h: fh } = this.field;

    // Ship rotation (keyboard or touch D-pad left/right)
    if (this.cursors.left.isDown || this.touchDPad?.left?.isDown) {
      this.shipAngleDeg -= SHIP_ROTATION_SPEED * dt;
    } else if (this.cursors.right.isDown || this.touchDPad?.right?.isDown) {
      this.shipAngleDeg += SHIP_ROTATION_SPEED * dt;
    }

    // Thrust (keyboard or touch D-pad up)
    if (this.cursors.up.isDown || this.touchDPad?.up?.isDown) {
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

    // Update ship sprite position and rotation
    if (this.shipSprite) {
      this.shipSprite.x = this.shipX;
      this.shipSprite.y = this.shipY;
      this.shipSprite.setAngle(this.shipAngleDeg);

      // Invulnerability blink
      if (time < this.invulnerableUntilMs) {
        this.shipSprite.visible = Math.floor(time / 150) % 2 === 0;
      } else {
        this.shipSprite.visible = true;
      }
    } else if (this.shipGraphics) {
      this.renderShip(time);
    }

    // Fire on Space key or touch fire button (one-shot cooldown for touch)
    const touchFireNow = this.touchFire?.isDown && !this._touchFireFired;
    if (touchFireNow) this._touchFireFired = true;
    if (!this.touchFire?.isDown) this._touchFireFired = false;
    if ((this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) || touchFireNow) {
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
        // Update bullet sprite position if present
        if (b.sprite) {
          b.sprite.x = b.x;
          b.sprite.y = b.y;
        }
        aliveBullets.push(b);
      } else {
        // Expired — destroy sprite
        if (b.sprite) { b.sprite.destroy(); b.sprite = null; }
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

    // Render fallback bullets (graphics mode)
    if (this.bulletsGraphics) {
      this.bulletsGraphics.clear();
      for (const b of this.bullets) {
        if (!b.sprite && b.age < BULLET_LIFETIME_MS) {
          this.bulletsGraphics.fillStyle(this.platformColor, this.platformAlpha * 0.3);
          this.bulletsGraphics.fillCircle(b.x, b.y, 4);
          this.bulletsGraphics.fillStyle(this.platformColor, this.platformAlpha);
          this.bulletsGraphics.fillCircle(b.x, b.y, 3);
        }
      }
    }

    // Move asteroids and update sprites
    for (const a of this.asteroids) {
      if (!a.active) continue;
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // Wrap asteroids
      if (a.x < fx - a.radius) a.x = fx + fw + a.radius;
      if (a.x > fx + fw + a.radius) a.x = fx - a.radius;
      if (a.y < fy - a.radius) a.y = fy + fh + a.radius;
      if (a.y > fy + fh + a.radius) a.y = fy - a.radius;

      // Update asteroid sprite
      if (a.sprite) {
        a.sprite.x = a.x;
        a.sprite.y = a.y;
        a.sprite.setAngle(a.sprite.angle + a.rotSpeed * dt);
      }
    }

    // Render fallback asteroids (graphics mode — only for asteroids without sprites)
    const hasGraphicsAsteroids = this.asteroids.some((a) => a.active && !a.sprite);
    if (hasGraphicsAsteroids) {
      this.renderAsteroidsFallback();
    }

    // Bullet-asteroid collisions
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.active) continue;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < a.radius + 3) {
          b.age = BULLET_LIFETIME_MS; // mark bullet as expired
          if (b.sprite) { b.sprite.destroy(); b.sprite = null; }
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

    // Wave clear check — start next wave instead of ending
    if (this.asteroids.length === 0 && !this.gameOver) {
      this.nextWave();
      return;
    }

    // HUD update
    if (this.safetyTimer && this.hud) {
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `★ ${this.asteroidsDestroyed}`);
    }
  }

  // ---- Rendering (fallback graphics mode) ----

  renderShip(time) {
    const g = this.shipGraphics;
    g.clear();

    // Blink when invulnerable
    if (time < this.invulnerableUntilMs) {
      const blinkOn = Math.floor(time / 150) % 2 === 0;
      if (!blinkOn) return;
    }

    const heading = (this.shipAngleDeg - 90) * (Math.PI / 180);
    const size = 16;

    const tipX = this.shipX + Math.cos(heading) * size;
    const tipY = this.shipY + Math.sin(heading) * size;
    const leftX = this.shipX + Math.cos(heading + Math.PI * 0.78) * size;
    const leftY = this.shipY + Math.sin(heading + Math.PI * 0.78) * size;
    const rightX = this.shipX + Math.cos(heading - Math.PI * 0.78) * size;
    const rightY = this.shipY + Math.sin(heading - Math.PI * 0.78) * size;

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

    g.lineStyle(2, this.platformColor, this.platformAlpha);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(leftX, leftY);
    g.lineTo(rightX, rightY);
    g.closePath();
    g.strokePath();
  }

  renderAsteroidsFallback() {
    // Render only asteroids that don't have a sprite (fallback case)
    // We use a temporary graphics object so we don't clear the shared bulletsGraphics
    if (!this._asteroidsFallbackGraphics) {
      this._asteroidsFallbackGraphics = this.add.graphics();
    }
    const g = this._asteroidsFallbackGraphics;
    g.clear();

    for (const a of this.asteroids) {
      if (!a.active || a.sprite) continue;

      const numPoints = 10;

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

    const heading = (this.shipAngleDeg - 90) * (Math.PI / 180);
    const tipX = this.shipX + Math.cos(heading) * 18;
    const tipY = this.shipY + Math.sin(heading) * 18;
    const vx = Math.cos(heading) * BULLET_SPEED + this.shipVX;
    const vy = Math.sin(heading) * BULLET_SPEED + this.shipVY;

    let sprite = null;
    if (this.textures.exists('laser')) {
      sprite = this.add.image(tipX, tipY, 'laser');
      sprite.setTint(this.platformColor);
      sprite.setAlpha(this.platformAlpha);
      const laserScale = 20 / sprite.height;
      sprite.setScale(laserScale);
      sprite.setAngle(this.shipAngleDeg);
    }

    const bullet = { x: tipX, y: tipY, vx, vy, age: 0, sprite };
    this.bullets.push(bullet);
  }

  hitAsteroid(asteroid) {
    asteroid.active = false;
    // Destroy sprite
    if (asteroid.sprite) { asteroid.sprite.destroy(); asteroid.sprite = null; }

    this.asteroidsDestroyed++;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.asteroidsDestroyed}`);

    SynthSounds.hit();
    GameVFX.particleBurst(this, asteroid.x, asteroid.y, this.ballColor, 10);
    GameVFX.scorePopup(this, asteroid.x, asteroid.y);

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, true);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

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

  nextWave() {
    this.level++;
    this.speedMultiplier *= 1.15;

    // Reset ship to center
    this.shipX = this.field.x + this.field.w / 2;
    this.shipY = this.field.y + this.field.h / 2;
    this.shipVX = 0;
    this.shipVY = 0;

    // Update HUD level
    if (this.hud) this.hud.levelText.setText(`Ур.${this.level}`);

    // Spawn new wave of large asteroids (capped at 10)
    const count = Math.min(INITIAL_ASTEROID_COUNT + this.level - 1, 10);
    for (let i = 0; i < count; i++) {
      this.spawnAsteroid('large', null, null);
    }

    SynthSounds.score();

    // Wave flash
    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;
    const flashText = this.add.text(cx, cy, `Волна ${this.level}!`, {
      fontSize: '32px', color: '#FFFFFF', fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: flashText,
      alpha: 1, scaleX: 1.2, scaleY: 1.2,
      duration: 200, yoyo: true, hold: 1000,
      onComplete: () => flashText.destroy(),
    });
  }

  loseLife(time) {
    this.lives--;
    if (this.lives >= 0 && this.lives < this.livesIcons.length) {
      this.livesIcons[this.lives].setFillStyle(0x333333);
    }
    SynthSounds.miss();
    GameVFX.screenShake(this, 4, 150);

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, false);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

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

  updateFellowEyeAlpha(alpha) {
    this.ballAlpha = alpha;
  }

  // ---- Pause / UI ----

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

    // Clean up sprites
    if (this.asteroids) {
      for (const a of this.asteroids) {
        if (a.sprite) { a.sprite.destroy(); a.sprite = null; }
      }
    }
    if (this.bullets) {
      for (const b of this.bullets) {
        if (b.sprite) { b.sprite.destroy(); b.sprite = null; }
      }
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
      level: this.level,
      fellow_contrast_start: this.settings?.fellowEyeContrast ?? 30,
      fellow_contrast_end: this.contrastState.fellowEyeContrast,
      window_accuracy: getAccuracy(this.contrastState),
      total_trials: this.contrastState.totalTrials,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
