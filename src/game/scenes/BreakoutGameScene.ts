// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { createContrastState, createContrastConfig, recordTrial, getAccuracy } from '../../modules/contrastEngine';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';

const BALL_SPEEDS = { slow: 200, normal: 300, fast: 400, pro: 500 };
const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const MAX_LIVES = 3;
const WALL_BOUNCE_COOLDOWN_MS = 100;

const POWERUP_CHANCE = 0.20;
const POWERUP_FALL_SPEED = 100;
const POWERUP_TYPES = ['wide', 'multi', 'slow', 'life'] as const;
const POWERUP_LABELS = { wide: '◇', multi: '⊕', slow: '▽', life: '♥' };
const POWERUP_DURATIONS = { wide: 8000, multi: 0, slow: 6000, life: 0 };

// 5 rows x 8 cols patterns (true = brick exists)
const BRICK_PATTERNS = [
  // Level 1: Full grid
  Array.from({ length: 5 }, () => Array(8).fill(true)),

  // Level 2: Diamond
  [
    [false, false, false, true, true, false, false, false],
    [false, false, true, true, true, true, false, false],
    [false, true, true, true, true, true, true, false],
    [false, false, true, true, true, true, false, false],
    [false, false, false, true, true, false, false, false],
  ],

  // Level 3: Checkerboard
  Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => (r + c) % 2 === 0)
  ),

  // Level 4: V-Shape
  [
    [true, false, false, false, false, false, false, true],
    [true, true, false, false, false, false, true, true],
    [true, true, true, false, false, true, true, true],
    [true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true],
  ],

  // Level 5: Walls + top
  [
    [true, true, true, true, true, true, true, true],
    [true, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, true],
    [true, false, false, false, false, false, false, true],
    [true, true, true, true, true, true, true, true],
  ],
];

function getPattern(level: number): boolean[][] {
  if (level <= BRICK_PATTERNS.length) return BRICK_PATTERNS[level - 1];
  // Level 6+: random pattern from the list
  return BRICK_PATTERNS[Math.floor(Math.random() * BRICK_PATTERNS.length)];
}

export default class BreakoutGameScene extends Phaser.Scene {
  constructor() {
    super('BreakoutGameScene');
  }

  preload() {
    this.load.image('paddle', 'assets/sprites/paddle.png');
    this.load.image('ball', 'assets/sprites/ball.png');
    this.load.image('powerup-bg', 'assets/sprites/powerup-bg.png');
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
        this.physics.resume();
      }
    };

    EventBus.on('start-breakout-game', this.startGameHandler);
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

    // Sync initial platform alpha with fellowEyeContrast (clinical contrast)
    this.platformAlpha = this.contrastState.fellowEyeContrast / 100;

    // Frame (both eyes)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Platform
    const pw = fw * GAME.PLATFORM_WIDTH_RATIO;
    const ph = fh * GAME.PLATFORM_HEIGHT_RATIO;
    const py = fy + fh - ph / 2 - 10;
    // Sprite (IS the visual) with physics body
    if (this.textures.exists('paddle')) {
      this.platform = this.add.image(ccx, py, 'paddle');
      this.platform.setTint(this.platformColor);
      this.platform.setAlpha(this.platformAlpha);
      this.platform.setDisplaySize(pw, ph);
    } else {
      this.platform = this.add.rectangle(ccx, py, pw, ph, this.platformColor, this.platformAlpha);
    }
    this.physics.add.existing(this.platform, false);
    this.platform.body.setImmovable(true);

    // Remember original platform dimensions and ball radius for later reference
    this.originalPlatformWidth = pw;
    this.platformW = pw;
    this.platformH = ph;

    // Ball — sprite (IS the visual) with invisible physics circle
    const ballRadius = fw * 0.0125;
    this.ballRadius = ballRadius;
    const ballStartY = py - ph / 2 - ballRadius - 2;
    if (this.textures.exists('ball')) {
      this.ball = this.add.image(ccx, ballStartY, 'ball');
      this.ball.setTint(this.ballColor);
      this.ball.setAlpha(this.ballAlpha);
      this.ball.setDisplaySize(ballRadius * 2, ballRadius * 2);
    } else {
      this.ball = this.add.circle(ccx, ballStartY, ballRadius, this.ballColor, this.ballAlpha);
    }
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(ballRadius);
    this.ball.body.setBounce(1, 1);
    this.ball.body.setCollideWorldBounds(false);
    this.ballSpeed = BALL_SPEEDS[this.settings.speed] || 200;
    this.ballLaunched = false;

    // Bricks (both eyes — gray)
    this.bricks = this.physics.add.staticGroup();
    this.level = 1;
    this._spawnBricks();

    // Power-up state
    this.powerups = [];
    this.extraBalls = [];
    this.activePowerups = { wide: false, slow: false };

    // Lives
    this.lives = MAX_LIVES;
    this.livesIcons = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      const icon = this.add.circle(fx + 20 + i * 22, fy + 15, 6, COLORS.GRAY);
      this.livesIcons.push(icon);
    }

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Launch hint
    this.launchHint = this.add.text(ccx, ccy + 60, t('breakout.launchHint'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Collisions
    this.physics.add.collider(this.ball, this.platform, this.onBallHitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.onBallHitBrick, null, this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) {
        this.platform.x = Phaser.Math.Clamp(
          pointer.x,
          this.field.x + this.platformW / 2,
          this.field.x + this.field.w - this.platformW / 2,
        );
        this.platform.body.reset(this.platform.x, this.platform.y);
      }
    });
    this.input.on('pointerup', () => {
      if (!this.ballLaunched && !this.isPaused) this.launchBall();
    });

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = true; // freeze during countdown
    this.gameEnded = false;
    this.pauseOverlay = null;
    this.lastWallBounceTime = -WALL_BOUNCE_COOLDOWN_MS;

    // Tab blur → auto-pause (named handler for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    this.trailFrameCounter = 0;

    // Countdown before first ball launch
    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;
    GameVFX.countdown(this, cx, cy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
    });
  }

  _spawnBricks() {
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const pattern = getPattern(this.level);
    const rows = pattern.length;
    const cols = pattern[0].length;
    const brickW = (fw * 0.88) / cols;
    const brickH = (fh * 0.2) / rows;
    const brickStartX = fx + (fw - brickW * cols) / 2 + brickW / 2;
    const brickStartY = fy + 50;

    let brickCount = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!pattern[row][col]) continue;
        const bx = brickStartX + col * brickW;
        const by = brickStartY + row * brickH;
        const shade = row % 2 === 0 ? 0x909090 : 0x707070;
        // Invisible physics rect + visual glow rect
        const brick = this.add.rectangle(bx, by, brickW - 4, brickH - 4, shade, 0);
        const brickVisual = GameVisuals.glowRect(this, bx, by, brickW - 6, brickH - 6, shade, 0.85, 3);
        brick._visual = brickVisual;
        this.physics.add.existing(brick, true);
        this.bricks.add(brick);
        brickCount++;
      }
    }

    this.totalBricks = brickCount;
    this.bricksDestroyed = 0;
  }

  shutdown() {
    EventBus.removeListener('start-breakout-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    // ESC to toggle pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
      return;
    }
    if (this.isPaused) return;
    if (!this.platform) return;

    // Keyboard movement
    if (this.cursors.left.isDown) {
      this.platform.x -= PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    } else if (this.cursors.right.isDown) {
      this.platform.x += PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    }
    this.platform.x = Phaser.Math.Clamp(
      this.platform.x,
      this.field.x + this.platformW / 2,
      this.field.x + this.field.w - this.platformW / 2,
    );
    this.platform.body.reset(this.platform.x, this.platform.y);

    // Space to launch
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.ballLaunched) {
      this.launchBall();
    }

    // Ball follows platform before launch
    if (!this.ballLaunched && this.ball) {
      this.ball.x = this.platform.x;
      this.ball.y = this.platform.y - this.platformH / 2 - this.ballRadius - 2;
    }

    // Ball out of bounds (bottom)
    if (this.ball && this.ball.y > this.field.y + this.field.h + 40) {
      // Only lose life if no extra balls remain
      const hasExtraBalls = this.extraBalls && this.extraBalls.length > 0;
      if (!hasExtraBalls) {
        this.loseLife();
      } else {
        // Just reset main ball without losing life
        this.ballLaunched = false;
        this.ball.body.setVelocity(0, 0);
        this.ball.x = this.platform.x;
        this.ball.y = this.platform.y - this.platformH / 2 - this.ballRadius - 2;
      }
    }

    // Ball bouncing off walls (top, left, right)
    if (this.ball && this.ballLaunched) {
      const r = this.ballRadius;
      const now = this.time.now;
      if (this.ball.y - r <= this.field.y) {
        this.ball.body.setVelocityY(Math.abs(this.ball.body.velocity.y));
        if (now - this.lastWallBounceTime > WALL_BOUNCE_COOLDOWN_MS) {
          SynthSounds.tick();
          this.lastWallBounceTime = now;
        }
      }
      if (this.ball.x - r <= this.field.x) {
        this.ball.body.setVelocityX(Math.abs(this.ball.body.velocity.x));
        if (now - this.lastWallBounceTime > WALL_BOUNCE_COOLDOWN_MS) {
          SynthSounds.tick();
          this.lastWallBounceTime = now;
        }
      }
      if (this.ball.x + r >= this.field.x + this.field.w) {
        this.ball.body.setVelocityX(-Math.abs(this.ball.body.velocity.x));
        if (now - this.lastWallBounceTime > WALL_BOUNCE_COOLDOWN_MS) {
          SynthSounds.tick();
          this.lastWallBounceTime = now;
        }
      }

      // Ball trail every 3rd frame
      this.trailFrameCounter = (this.trailFrameCounter || 0) + 1;
      if (this.trailFrameCounter % 3 === 0) {
        GameVFX.addTrailDot(this, this.ball.x, this.ball.y, this.ballColor, 2);
      }
    }

    // Extra ball updates
    if (this.extraBalls) {
      const now = this.time.now;
      for (let i = this.extraBalls.length - 1; i >= 0; i--) {
        const eb = this.extraBalls[i];
        if (eb._visual) { eb._visual.x = eb.x; eb._visual.y = eb.y; }

        // Wall bouncing for extra balls
        const r = eb._ballRadius || this.ballRadius;
        if (eb.y - r <= this.field.y) {
          eb.body.setVelocityY(Math.abs(eb.body.velocity.y));
          if (now - this.lastWallBounceTime > WALL_BOUNCE_COOLDOWN_MS) {
            SynthSounds.tick();
            this.lastWallBounceTime = now;
          }
        }
        if (eb.x - r <= this.field.x) {
          eb.body.setVelocityX(Math.abs(eb.body.velocity.x));
          if (now - this.lastWallBounceTime > WALL_BOUNCE_COOLDOWN_MS) {
            SynthSounds.tick();
            this.lastWallBounceTime = now;
          }
        }
        if (eb.x + r >= this.field.x + this.field.w) {
          eb.body.setVelocityX(-Math.abs(eb.body.velocity.x));
          if (now - this.lastWallBounceTime > WALL_BOUNCE_COOLDOWN_MS) {
            SynthSounds.tick();
            this.lastWallBounceTime = now;
          }
        }

        // Remove if off bottom
        if (eb.y > this.field.y + this.field.h + 40) {
          if (eb._visual) eb._visual.destroy();
          eb.destroy();
          this.extraBalls.splice(i, 1);
        }
      }
    }

    // Move and check powerups
    if (this.powerups) {
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        pu.container.y += pu.vy * (delta / 1000);

        // Check if caught by platform
        if (
          pu.container.y >= this.platform.y - this.platformH / 2 &&
          Math.abs(pu.container.x - this.platform.x) < this.platformW / 2
        ) {
          this.activatePowerup(pu.type);
          pu.container.destroy();
          this.powerups.splice(i, 1);
          continue;
        }

        // Remove if off screen
        if (pu.container.y > this.field.y + this.field.h + 20) {
          pu.container.destroy();
          this.powerups.splice(i, 1);
        }
      }
    }

    // HUD update
    if (this.safetyTimer && this.hud) {
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `★ ${this.bricksDestroyed}/${this.totalBricks}`);
    }
  }

  launchBall() {
    this.ballLaunched = true;
    SynthSounds.launch();
    if (this.launchHint) {
      this.launchHint.destroy();
      this.launchHint = null;
    }
    // Random angle between -120 and -60 degrees (upward)
    const angleDeg = Phaser.Math.Between(-120, -60);
    const rad = angleDeg * (Math.PI / 180);
    this.ball.body.setVelocity(
      Math.cos(rad) * this.ballSpeed,
      Math.sin(rad) * this.ballSpeed,
    );
  }

  onBallHitPaddle(ball, paddle) {
    // Angle depends on where ball hits paddle: -1 to 1
    const hitPoint = (ball.x - paddle.x) / (this.platformW / 2);
    const angleDeg = Phaser.Math.Clamp(hitPoint * 60, -60, 60);
    const rad = (angleDeg - 90) * (Math.PI / 180);
    ball.body.setVelocity(
      Math.cos(rad) * this.ballSpeed,
      Math.sin(rad) * this.ballSpeed,
    );
    SynthSounds.tick();
  }

  onBallHitBrick(ball, brick) {
    const flash = this.add.rectangle(brick.x, brick.y, brick.width, brick.height, COLORS.WHITE)
      .setAlpha(0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    if (brick._visual) { brick._visual.destroy(); brick._visual = null; }
    brick.destroy();
    this.bricksDestroyed++;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.bricksDestroyed}/${this.totalBricks}`);

    SynthSounds.hit();
    GameVFX.particleBurst(this, brick.x, brick.y, 0x808080, 6);
    GameVFX.scorePopup(this, brick.x, brick.y);

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, true);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    // Power-up drop chance
    if (Math.random() < POWERUP_CHANCE) {
      this.spawnPowerup(brick.x, brick.y);
    }

    if (this.bricksDestroyed >= this.totalBricks) {
      this.nextLevel();
    }
  }

  spawnPowerup(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const label = POWERUP_LABELS[type];

    // Diamond sprite with label (both eyes — doesn't break dichoptic)
    const container = this.add.container(x, y);
    let bg;
    if (this.textures.exists('powerup-bg')) {
      bg = this.add.image(0, 0, 'powerup-bg');
      bg.setTint(0xFFFFFF);
      bg.setDisplaySize(24, 24);
    } else {
      bg = this.add.circle(0, 0, 12, 0x808080, 0.6);
    }
    const text = this.add.text(0, 0, label, { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    container.add([bg, text]);

    this.powerups.push({ container, type, vy: POWERUP_FALL_SPEED });
  }

  activatePowerup(type) {
    SynthSounds.score();
    GameVFX.scorePopup(this, this.platform.x, this.platform.y - 30, type === 'life' ? '+1 ♥' : type.toUpperCase());

    switch (type) {
      case 'wide': {
        if (!this.activePowerups.wide) {
          this.activePowerups.wide = true;
          const newW = this.originalPlatformWidth * 1.5;
          this.platformW = newW;
          this.platform.setDisplaySize(newW, this.platformH);
          this.platform.body.setSize(newW, this.platformH);
          this.time.delayedCall(POWERUP_DURATIONS.wide, () => {
            this.activePowerups.wide = false;
            this.platformW = this.originalPlatformWidth;
            this.platform.setDisplaySize(this.originalPlatformWidth, this.platformH);
            this.platform.body.setSize(this.originalPlatformWidth, this.platformH);
          });
        }
        break;
      }
      case 'multi': {
        // Spawn 2 extra balls from current ball position
        for (let i = 0; i < 2; i++) {
          const angle = Phaser.Math.Between(-150, -30);
          const rad = angle * (Math.PI / 180);
          const extraBall = this.add.circle(this.ball.x, this.ball.y, this.ballRadius, this.ballColor, 0);
          this.physics.add.existing(extraBall);
          extraBall.body.setCircle(this.ballRadius);
          extraBall.body.setBounce(1, 1);
          extraBall.body.setCollideWorldBounds(false);
          extraBall.body.setVelocity(Math.cos(rad) * this.ballSpeed, Math.sin(rad) * this.ballSpeed);
          extraBall._ballRadius = this.ballRadius;

          const visual = GameVisuals.glowCircle(this, extraBall.x, extraBall.y, this.ballRadius, this.ballColor, this.ballAlpha);
          extraBall._visual = visual;

          this.extraBalls.push(extraBall);

          // Add colliders for extra ball
          this.physics.add.collider(extraBall, this.platform, this.onBallHitPaddle, null, this);
          this.physics.add.collider(extraBall, this.bricks, this.onBallHitBrick, null, this);
        }
        break;
      }
      case 'slow': {
        if (!this.activePowerups.slow) {
          this.activePowerups.slow = true;
          const savedSpeed = this.ballSpeed;
          this.ballSpeed *= 0.6;
          // Slow all active balls
          if (this.ball?.body) {
            const v = this.ball.body.velocity;
            const speed = Math.sqrt(v.x * v.x + v.y * v.y);
            if (speed > 0) {
              const ratio = this.ballSpeed / savedSpeed;
              this.ball.body.setVelocity(v.x * ratio, v.y * ratio);
            }
          }
          // Slow extra balls too
          if (this.extraBalls) {
            for (const eb of this.extraBalls) {
              if (eb?.body) {
                const v = eb.body.velocity;
                const speed = Math.sqrt(v.x * v.x + v.y * v.y);
                if (speed > 0) {
                  const ratio = this.ballSpeed / savedSpeed;
                  eb.body.setVelocity(v.x * ratio, v.y * ratio);
                }
              }
            }
          }
          this.time.delayedCall(POWERUP_DURATIONS.slow, () => {
            this.activePowerups.slow = false;
            this.ballSpeed = savedSpeed;
          });
        }
        break;
      }
      case 'life': {
        if (this.lives < 5) {
          this.lives++;
          // Add life icon if space
          if (this.lives <= this.livesIcons.length) {
            this.livesIcons[this.lives - 1].setFillStyle(0x808080);
          }
        }
        break;
      }
    }
  }

  loseLife() {
    this.lives--;
    if (this.lives >= 0 && this.lives < this.livesIcons.length) {
      this.livesIcons[this.lives].setFillStyle(0x333333);
    }
    SynthSounds.miss();
    GameVFX.screenShake(this);

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, false);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    if (this.lives <= 0) {
      SynthSounds.gameOver();
      this.endGame(false);
      return;
    }

    // Respawn ball on platform
    this.ballLaunched = false;
    this.ball.body.setVelocity(0, 0);
    this.ball.x = this.platform.x;
    this.ball.y = this.platform.y - this.platformH / 2 - this.ballRadius - 2;

    if (!this.launchHint) {
      const ccx = this.field.x + this.field.w / 2;
      const ccy = this.field.y + this.field.h / 2;
      this.launchHint = this.add.text(ccx, ccy + 60, t('breakout.launchHint'), {
        fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);
    }
  }

  updateFellowEyeAlpha(alpha) {
    if (this.platform) this.platform.setAlpha(alpha);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.safetyTimer.pause();
      this.input.setDefaultCursor('default');
      this.showPauseMenu();
    } else {
      this.physics.resume();
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
    // Destroy existing bricks
    this.bricks.getChildren().forEach((brick) => {
      if (brick._visual) { brick._visual.destroy(); brick._visual = null; }
      brick.destroy();
    });
    this.bricks.clear(true, true);

    // Clean up extra balls
    if (this.extraBalls) {
      for (const eb of this.extraBalls) {
        if (eb._visual) eb._visual.destroy();
        eb.destroy();
      }
      this.extraBalls = [];
    }

    // Clean up powerups
    if (this.powerups) {
      for (const pu of this.powerups) {
        pu.container.destroy();
      }
      this.powerups = [];
    }

    // Reset active powerup state
    this.activePowerups = { wide: false, slow: false };

    // Reset platform width to original
    this.platformW = this.originalPlatformWidth;
    this.platform.setDisplaySize(this.originalPlatformWidth, this.platformH);
    this.platform.body.setSize(this.originalPlatformWidth, this.platformH);

    // Spawn bricks with pattern for this level
    this._spawnBricks();

    // Re-add collider for main ball against new bricks
    this.physics.add.collider(this.ball, this.bricks, this.onBallHitBrick, null, this);

    if (this.hud) this.hud.scoreText.setText(`★ ${this.bricksDestroyed}/${this.totalBricks}`);

    // Speed up ball
    this.ballSpeed *= 1.15;

    // Reset ball to platform
    this.ballLaunched = false;
    this.ball.body.setVelocity(0, 0);
    this.ball.x = this.platform.x;
    this.ball.y = this.platform.y - this.platformH / 2 - this.ballRadius - 2;

    if (!this.launchHint) {
      const ccx = this.field.x + this.field.w / 2;
      const ccy = this.field.y + this.field.h / 2;
      this.launchHint = this.add.text(ccx, ccy + 60, t('breakout.launchHint'), {
        fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);
    }
  }

  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.safetyTimer.stop();

    // Clean up extra balls
    if (this.extraBalls) {
      for (const eb of this.extraBalls) {
        if (eb._visual) eb._visual.destroy();
        eb.destroy();
      }
      this.extraBalls = [];
    }

    // Clean up powerups
    if (this.powerups) {
      for (const pu of this.powerups) {
        pu.container.destroy();
      }
      this.powerups = [];
    }

    const result = {
      game: 'breakout',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.bricksDestroyed,
      total_spawned: this.totalBricks,
      hit_rate: this.totalBricks > 0
        ? Math.round((this.bricksDestroyed / this.totalBricks) * 100) / 100
        : 0,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      lives_remaining: this.lives,
      level: this.level,
      completed: won,
      fellow_contrast_start: this.settings?.fellowEyeContrast ?? 30,
      fellow_contrast_end: this.contrastState.fellowEyeContrast,
      window_accuracy: getAccuracy(this.contrastState),
      total_trials: this.contrastState.totalTrials,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
