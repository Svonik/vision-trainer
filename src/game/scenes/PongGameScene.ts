// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';

const BALL_SPEEDS = { slow: 180, normal: 260, fast: 360, pro: 460 };
const AI_TRACKING = { slow: 0.40, normal: 0.60, fast: 0.80, pro: 0.95 };
const WINNING_SCORE = 11;
const BALL_SPEED_INCREMENT = 8;

// Paddle dimensions: 3% field width × 20% field height
const PADDLE_W_RATIO = 0.03;
const PADDLE_H_RATIO = 0.20;
const PADDLE_EDGE_RATIO = 0.05;

export default class PongGameScene extends Phaser.Scene {
  constructor() {
    super('PongGameScene');
  }

  create() {
    SynthSounds.resume();

    this.startGameHandler = (settings) => {
      this.settings = createGameSettings(settings || {});
      this.startGameplay();
    };
    this.safetyFinishHandler = () => { this.endGame(); };
    this.safetyExtendHandler = () => {
      if (this.safetyTimer && this.safetyTimer.canExtend()) {
        this.safetyTimer.extend();
        this.isPaused = false;
        this.physics.resume();
      }
    };

    EventBus.on('start-pong-game', this.startGameHandler);
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

    // Dichoptic color assignment:
    // Left paddle (player) → platformColor (one eye)
    // Right paddle (AI)    → ballColor (other eye)
    // Ball                 → WHITE (both eyes)
    const isLeftPlatform = this.settings.eyeConfig === 'platform_left';
    this.platformColor = isLeftPlatform ? COLORS.RED : COLORS.CYAN;
    this.ballColor = isLeftPlatform ? COLORS.CYAN : COLORS.RED;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.ballAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    this.playerScore = 0;
    this.aiScore = 0;
    this.volleyCount = 0;
    this.ballSpeed = BALL_SPEEDS[this.settings.speed] || 260;
    this.aiTracking = AI_TRACKING[this.settings.speed] || 0.60;
    this.isPaused = false;
    this.pauseOverlay = null;
    this.ballActive = false;

    this.buildField();
    this.buildPaddles();
    this.buildBall();
    this.buildUI();
    this.buildInput();

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

    this.trailFrameCounter = 0;

    // Launch the ball after a short delay
    this.time.delayedCall(800, () => { this.serveBall(); });
  }

  buildField() {
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;

    // Border (both eyes — gray)
    this.add.rectangle(ccx, ccy, fw, fh)
      .setStrokeStyle(2, COLORS.GRAY)
      .setFillStyle(COLORS.BLACK, 0);

    // Center dashed line (both eyes — gray)
    const dashCount = 15;
    const dashH = (fh / dashCount) * 0.5;
    for (let i = 0; i < dashCount; i++) {
      const dy = fy + (fh / dashCount) * i + dashH / 2;
      this.add.rectangle(ccx, dy, 2, dashH, COLORS.GRAY, 0.5);
    }

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    this.add.rectangle(ccx, ccy, crossSize, 2, COLORS.WHITE);
    this.add.rectangle(ccx, ccy, 2, crossSize, COLORS.WHITE);
  }

  buildPaddles() {
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const pw = fw * PADDLE_W_RATIO;
    const ph = fh * PADDLE_H_RATIO;
    const ccy = fy + fh / 2;
    const edgeOffset = fw * PADDLE_EDGE_RATIO;

    // Left paddle — player — platformColor (one eye)
    const lx = fx + edgeOffset + pw / 2;
    this.playerPaddle = this.add.rectangle(lx, ccy, pw, ph, this.platformColor)
      .setAlpha(this.platformAlpha);
    this.physics.add.existing(this.playerPaddle, false);
    this.playerPaddle.body.setImmovable(true);

    // Right paddle — AI — ballColor (other eye)
    const rx = fx + fw - edgeOffset - pw / 2;
    this.aiPaddle = this.add.rectangle(rx, ccy, pw, ph, this.ballColor)
      .setAlpha(this.ballAlpha);
    this.physics.add.existing(this.aiPaddle, false);
    this.aiPaddle.body.setImmovable(true);
  }

  buildBall() {
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const ballR = fw * 0.015;
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;

    // Ball — WHITE (both eyes)
    this.ball = this.add.circle(ccx, ccy, ballR, COLORS.WHITE);
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(ballR);
    this.ball.body.setBounce(1, 1);
    this.ball.body.setCollideWorldBounds(false);

    // Colliders
    this.physics.add.collider(this.ball, this.playerPaddle, this.onBallHitPlayer, null, this);
    this.physics.add.collider(this.ball, this.aiPaddle, this.onBallHitAI, null, this);
  }

  buildUI() {
    const { x: fx, y: fy, w: fw } = this.field;
    const ccx = fx + fw / 2;
    const scoreY = fy + 20;

    this.playerScoreText = this.add.text(ccx - 60, scoreY, '0', {
      fontSize: '28px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

    this.aiScoreText = this.add.text(ccx + 60, scoreY, '0', {
      fontSize: '28px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

    const { y: fy2, h: fh } = this.field;
    this.timerText = this.add.text(ccx, fy2 + 10, '00:00', {
      fontSize: '13px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

    const pauseBtn = this.add.text(fx + 10, fy2 + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    this.serveHint = this.add.text(ccx, fy2 + fh / 2 + 50, t('pong.serveHint') || 'Подача…', {
      fontSize: '13px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();

    // Mouse Y → player paddle
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) {
        this.playerPaddle.y = Phaser.Math.Clamp(
          pointer.y,
          this.field.y + this.playerPaddle.height / 2,
          this.field.y + this.field.h - this.playerPaddle.height / 2,
        );
      }
    });
  }

  serveBall() {
    if (this.serveHint) {
      this.serveHint.destroy();
      this.serveHint = null;
    }

    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    this.ball.x = fx + fw / 2;
    this.ball.y = fy + fh / 2;
    this.ball.body.setVelocity(0, 0);

    // Random horizontal direction, non-extreme vertical angle
    const dirX = Math.random() < 0.5 ? 1 : -1;
    const angleDeg = Phaser.Math.Between(-30, 30);
    const rad = angleDeg * (Math.PI / 180);
    this.ball.body.setVelocity(
      dirX * Math.cos(rad) * this.ballSpeed,
      Math.sin(rad) * this.ballSpeed,
    );
    this.volleyCount = 0;
    this.ballActive = true;
  }

  onBallHitPlayer(ball, paddle) {
    this.volleyCount++;
    const currentSpeed = this.ballSpeed + this.volleyCount * BALL_SPEED_INCREMENT;
    const hitFraction = (ball.y - paddle.y) / (paddle.height / 2);
    const angleDeg = Phaser.Math.Clamp(hitFraction * 60, -60, 60);
    const rad = angleDeg * (Math.PI / 180);
    ball.body.setVelocity(
      Math.abs(Math.cos(rad) * currentSpeed),
      Math.sin(rad) * currentSpeed,
    );
    SynthSounds.tick();
  }

  onBallHitAI(ball, paddle) {
    this.volleyCount++;
    const currentSpeed = this.ballSpeed + this.volleyCount * BALL_SPEED_INCREMENT;
    const hitFraction = (ball.y - paddle.y) / (paddle.height / 2);
    const angleDeg = Phaser.Math.Clamp(hitFraction * 60, -60, 60);
    const rad = angleDeg * (Math.PI / 180);
    ball.body.setVelocity(
      -Math.abs(Math.cos(rad) * currentSpeed),
      Math.sin(rad) * currentSpeed,
    );
    SynthSounds.tick();
  }

  updateAI(delta) {
    if (!this.aiPaddle || !this.ball) return;
    const { y: fy, h: fh } = this.field;
    const ph = this.aiPaddle.height;
    const lerp = this.aiTracking;
    const targetY = this.ball.y;
    const newY = Phaser.Math.Linear(this.aiPaddle.y, targetY, lerp * (delta / 1000) * 6);
    this.aiPaddle.y = Phaser.Math.Clamp(newY, fy + ph / 2, fy + fh - ph / 2);
    this.aiPaddle.body.reset(this.aiPaddle.x, this.aiPaddle.y);
  }

  checkBallOutOfBounds() {
    if (!this.ballActive) return;
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const r = this.ball.radius;

    // Top / bottom wall bounce (gray border)
    if (this.ball.y - r <= fy) {
      this.ball.body.setVelocityY(Math.abs(this.ball.body.velocity.y));
    }
    if (this.ball.y + r >= fy + fh) {
      this.ball.body.setVelocityY(-Math.abs(this.ball.body.velocity.y));
    }

    // Left edge → AI scores
    if (this.ball.x - r <= fx) {
      this.ballActive = false;
      this.aiScore++;
      SynthSounds.miss();
      this.aiScoreText.setText(String(this.aiScore));
      this.checkWinCondition();
      return;
    }

    // Right edge → Player scores
    if (this.ball.x + r >= fx + fw) {
      this.ballActive = false;
      this.playerScore++;
      SynthSounds.score();
      this.playerScoreText.setText(String(this.playerScore));
      this.checkWinCondition();
    }
  }

  checkWinCondition() {
    if (this.playerScore >= WINNING_SCORE || this.aiScore >= WINNING_SCORE) {
      this.endGame();
      return;
    }
    // Re-serve after short delay
    this.ball.body.setVelocity(0, 0);
    this.ball.x = this.field.x + this.field.w / 2;
    this.ball.y = this.field.y + this.field.h / 2;
    this.time.delayedCall(1000, () => { this.serveBall(); });
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
    quitBtn.on('pointerup', () => this.endGame());

    this.pauseOverlay = [bg, title, resumeBtn, resumeText, quitBtn, quitText];
  }

  update(time, delta) {
    if (this.isPaused) return;
    if (!this.playerPaddle) return;

    // Keyboard movement for player paddle (up/down arrows)
    const ph = this.playerPaddle.height;
    const { y: fy, h: fh } = this.field;
    if (this.cursors.up.isDown) {
      this.playerPaddle.y -= PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    } else if (this.cursors.down.isDown) {
      this.playerPaddle.y += PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    }
    this.playerPaddle.y = Phaser.Math.Clamp(
      this.playerPaddle.y,
      fy + ph / 2,
      fy + fh - ph / 2,
    );
    this.playerPaddle.body.reset(this.playerPaddle.x, this.playerPaddle.y);

    // AI update
    this.updateAI(delta);

    // Ball boundary checks (walls + scoring)
    this.checkBallOutOfBounds();

    // Ball trail every 3rd frame
    if (this.ball && this.ballActive) {
      this.trailFrameCounter = (this.trailFrameCounter || 0) + 1;
      if (this.trailFrameCounter % 3 === 0) {
        GameVFX.addTrailDot(this, this.ball.x, this.ball.y, COLORS.WHITE, 2);
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

  endGame() {
    this.safetyTimer.stop();
    if (this.playerScore >= WINNING_SCORE) {
      SynthSounds.victory();
    } else {
      SynthSounds.gameOver();
    }

    const total = this.playerScore + this.aiScore;
    const result = {
      game: 'pong',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.playerScore,
      total_spawned: total,
      hit_rate: total > 0
        ? Math.round((this.playerScore / total) * 100) / 100
        : 0,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      player_score: this.playerScore,
      ai_score: this.aiScore,
      completed: this.playerScore >= WINNING_SCORE,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }

  shutdown() {
    EventBus.removeListener('start-pong-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
  }
}
