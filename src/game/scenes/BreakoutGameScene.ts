// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { EventBus } from '../EventBus';

const BALL_SPEEDS = { slow: 200, normal: 300, fast: 400, pro: 500 };
const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const MAX_LIVES = 3;

export default class BreakoutGameScene extends Phaser.Scene {
  constructor() {
    super('BreakoutGameScene');
  }

  create() {
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

    const isLeftPlatform = this.settings.eyeConfig === 'platform_left';
    this.platformColor = isLeftPlatform ? COLORS.RED : COLORS.CYAN;
    this.ballColor = isLeftPlatform ? COLORS.CYAN : COLORS.RED;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.ballAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

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

    // Platform
    const pw = fw * GAME.PLATFORM_WIDTH_RATIO;
    const ph = fh * GAME.PLATFORM_HEIGHT_RATIO;
    const py = fy + fh - ph / 2 - 10;
    this.platform = this.add.rectangle(ccx, py, pw, ph, this.platformColor)
      .setAlpha(this.platformAlpha);
    this.physics.add.existing(this.platform, false);
    this.platform.body.setImmovable(true);

    // Ball
    const ballRadius = fw * 0.0125;
    this.ball = this.add.circle(ccx, py - ph / 2 - ballRadius - 2, ballRadius, this.ballColor)
      .setAlpha(this.ballAlpha);
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(ballRadius);
    this.ball.body.setBounce(1, 1);
    this.ball.body.setCollideWorldBounds(false);
    this.ballSpeed = BALL_SPEEDS[this.settings.speed] || 200;
    this.ballLaunched = false;

    // Bricks (both eyes — gray)
    this.bricks = this.physics.add.staticGroup();
    const brickW = (fw * 0.88) / BRICK_COLS;
    const brickH = (fh * 0.2) / BRICK_ROWS;
    const brickStartX = fx + (fw - brickW * BRICK_COLS) / 2 + brickW / 2;
    const brickStartY = fy + 50;

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const bx = brickStartX + col * brickW;
        const by = brickStartY + row * brickH;
        const shade = row % 2 === 0 ? 0x909090 : 0x707070;
        const brick = this.add.rectangle(bx, by, brickW - 4, brickH - 4, shade);
        this.physics.add.existing(brick, true);
        this.bricks.add(brick);
      }
    }

    this.totalBricks = BRICK_COLS * BRICK_ROWS;
    this.bricksDestroyed = 0;

    // Lives
    this.lives = MAX_LIVES;
    this.livesIcons = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      const icon = this.add.circle(fx + 20 + i * 22, fy + 15, 6, COLORS.GRAY);
      this.livesIcons.push(icon);
    }

    // Score
    this.scoreText = this.add.text(fx + fw - 10, fy + 10, `0 / ${this.totalBricks}`, {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0);

    // Timer
    this.timerText = this.add.text(fx + fw / 2, fy + 10, '00:00', {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

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
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) {
        this.platform.x = Phaser.Math.Clamp(
          pointer.x,
          this.field.x + this.platform.width / 2,
          this.field.x + this.field.w - this.platform.width / 2,
        );
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
    this.safetyTimer.start();

    this.isPaused = false;
    this.pauseOverlay = null;

    // Tab blur → auto-pause
    this.game.events.on('blur', () => {
      if (!this.isPaused) this.togglePause();
    });

    // Audio (graceful degradation)
    this.catchSound = null;
    this.missSound = null;
    this.completeSound = null;
    try {
      if (this.cache.audio.exists('catch')) this.catchSound = this.sound.add('catch');
      if (this.cache.audio.exists('miss')) this.missSound = this.sound.add('miss');
      if (this.cache.audio.exists('complete')) this.completeSound = this.sound.add('complete');
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  shutdown() {
    EventBus.removeListener('start-breakout-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
  }

  update(time, delta) {
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
      this.field.x + this.platform.width / 2,
      this.field.x + this.field.w - this.platform.width / 2,
    );

    // Space to launch
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.ballLaunched) {
      this.launchBall();
    }

    // Ball follows platform before launch
    if (!this.ballLaunched && this.ball) {
      this.ball.x = this.platform.x;
      this.ball.y = this.platform.y - this.platform.height / 2 - this.ball.radius - 2;
    }

    // Ball out of bounds (bottom)
    if (this.ball && this.ball.y > this.field.y + this.field.h + 20) {
      this.loseLife();
    }

    // Ball bouncing off walls (top, left, right)
    if (this.ball && this.ballLaunched) {
      const r = this.ball.radius;
      if (this.ball.y - r <= this.field.y) {
        this.ball.body.setVelocityY(Math.abs(this.ball.body.velocity.y));
      }
      if (this.ball.x - r <= this.field.x) {
        this.ball.body.setVelocityX(Math.abs(this.ball.body.velocity.x));
      }
      if (this.ball.x + r >= this.field.x + this.field.w) {
        this.ball.body.setVelocityX(-Math.abs(this.ball.body.velocity.x));
      }
    }

    // Timer update
    if (this.safetyTimer) {
      const elapsed = this.safetyTimer.getElapsedMs();
      const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      this.timerText.setText(`${mins}:${secs}`);
    }
  }

  launchBall() {
    this.ballLaunched = true;
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
    const hitPoint = (ball.x - paddle.x) / (paddle.width / 2);
    const angleDeg = Phaser.Math.Clamp(hitPoint * 60, -60, 60);
    const rad = (angleDeg - 90) * (Math.PI / 180);
    ball.body.setVelocity(
      Math.cos(rad) * this.ballSpeed,
      Math.sin(rad) * this.ballSpeed,
    );
    if (this.catchSound) this.catchSound.play();
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

    brick.destroy();
    this.bricksDestroyed++;
    this.scoreText.setText(`${this.bricksDestroyed} / ${this.totalBricks}`);

    if (this.catchSound) this.catchSound.play();

    if (this.bricksDestroyed >= this.totalBricks) {
      this.endGame(true);
    }
  }

  loseLife() {
    this.lives--;
    if (this.lives >= 0 && this.lives < this.livesIcons.length) {
      this.livesIcons[this.lives].setFillStyle(0x333333);
    }
    if (this.missSound) this.missSound.play();

    if (this.lives <= 0) {
      this.endGame(false);
      return;
    }

    // Respawn ball on platform
    this.ballLaunched = false;
    this.ball.body.setVelocity(0, 0);
    this.ball.x = this.platform.x;
    this.ball.y = this.platform.y - this.platform.height / 2 - this.ball.radius - 2;

    if (!this.launchHint) {
      const ccx = this.field.x + this.field.w / 2;
      const ccy = this.field.y + this.field.h / 2;
      this.launchHint = this.add.text(ccx, ccy + 60, t('breakout.launchHint'), {
        fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.safetyTimer.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
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
    this.safetyTimer.stop();
    if (this.completeSound) this.completeSound.play();

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
      completed: won,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
