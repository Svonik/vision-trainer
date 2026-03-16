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

const SCROLL_SPEEDS = { slow: 100, normal: 150, fast: 200, pro: 260 };
const GRAVITY = 400;          // px/s²
const FLAP_IMPULSE = -200;    // px/s (upward)
const PIPE_SPAWN_INTERVAL = 2500; // ms
const GAP_RATIO = 0.40;        // 40% of field height

export default class FlappyGameScene extends Phaser.Scene {
  constructor() {
    super('FlappyGameScene');
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
      }
    };

    EventBus.on('start-flappy-game', this.startGameHandler);
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
    // Bird → platformColor, Pipes → ballColor (dichoptic split)
    this.birdColor = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.pipeColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.birdAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.pipeAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    this.scrollSpeed = SCROLL_SPEEDS[this.settings.speed] || 150;
    this.score = 0;
    this.totalSpawned = 0;
    this.isPaused = false;
    this.pauseOverlay = null;
    this.gameOver = false;
    this.gameEnded = false;

    // Background (BLACK — both eyes)
    this.add.rectangle(fx + fw / 2, fy + fh / 2, fw, fh, COLORS.BLACK);

    // Field border (GRAY — both eyes)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Ground line (GRAY — both eyes)
    this.groundY = fy + fh - 4;
    this.groundLine = this.add.rectangle(fx + fw / 2, this.groundY, fw, 2, COLORS.GRAY);

    // Bird (platformColor — one eye) — glow circle container
    const birdRadius = Math.round(fw * 0.03);
    const birdX = fx + fw * 0.25;
    const birdStartY = fy + fh / 2;
    this.bird = { x: birdX, y: birdStartY, vy: 0, radius: birdRadius };
    // Keep plain circle for setFillStyle on game over
    this.birdGfx = this.add.circle(birdX, birdStartY, birdRadius, this.birdColor, 0);
    this.birdVisual = GameVisuals.glowCircle(this, birdX, birdStartY, birdRadius, this.birdColor, this.birdAlpha);
    GameVisuals.pulse(this, this.birdVisual, 0.92, 1.08, 600);

    // Score text (GRAY — both eyes)
    this.scoreText = this.add.text(fx + fw / 2, fy + 10, '0', {
      fontSize: '18px', color: '#808080', fontFamily: '"JetBrains Mono", "Courier New", monospace',
    }).setOrigin(0.5, 0);

    // Timer text (GRAY — both eyes)
    this.timerText = GameVisuals.scoreText(this, fx + fw - 10, fy + 10, '00:00', 1);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Pipe container
    this.pipes = [];
    this.pipeGraphics = [];
    // Fix: don't spawn pipe immediately — wait for first interval
    this.lastPipeTime = 0;

    // Input: click / tap — guard against pause click-through
    this.input.on('pointerup', () => {
      if (this.isPaused || this.gameOver) return;
      this.flap();
    });

    // Input: Space / ArrowUp
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    // Tab blur → auto-pause (store reference for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Pause gameplay until countdown finishes
    this.isPaused = true;
    GameVFX.countdown(this, ccx, ccy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
      // Seed lastPipeTime so first pipe spawns after one interval
      this.lastPipeTime = this.time.now;
    });
  }

  shutdown() {
    EventBus.removeListener('start-flappy-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) { this.togglePause(); return; }
    if (this.isPaused || this.gameOver) return;
    if (!this.bird) return;

    const dt = delta / 1000;

    // Space / ArrowUp to flap
    if (
      (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
      (this.upKey && Phaser.Input.Keyboard.JustDown(this.upKey))
    ) {
      this.flap();
    }

    // Bird physics
    this.bird = { ...this.bird, vy: this.bird.vy + GRAVITY * dt };
    const newY = this.bird.y + this.bird.vy * dt;
    this.bird = { ...this.bird, y: newY };
    this.birdGfx.y = this.bird.y;
    if (this.birdVisual) { this.birdVisual.x = this.bird.x; this.birdVisual.y = this.bird.y; }

    // Boundary: ceiling collision
    const ceilY = this.field.y + this.bird.radius;
    if (this.bird.y < ceilY) {
      this.bird = { ...this.bird, y: ceilY, vy: 0 };
      this.birdGfx.y = this.bird.y;
      if (this.birdVisual) this.birdVisual.y = this.bird.y;
    }

    // Boundary: ground collision
    const groundHitY = this.groundY - this.bird.radius;
    if (this.bird.y >= groundHitY) {
      this.bird = { ...this.bird, y: groundHitY };
      this.birdGfx.y = this.bird.y;
      if (this.birdVisual) this.birdVisual.y = this.bird.y;
      this.triggerGameOver();
      return;
    }

    // Spawn pipes
    const now = time; // ms
    if (now - this.lastPipeTime >= PIPE_SPAWN_INTERVAL) {
      this.spawnPipe();
      this.lastPipeTime = now;
    }

    // Move pipes and check collisions
    const pipeWidth = this.field.w * 0.10;
    const moveAmount = this.scrollSpeed * dt;
    const toRemove = [];

    for (let i = 0; i < this.pipes.length; i++) {
      const pipe = this.pipes[i];
      const updatedPipe = { ...pipe, x: pipe.x - moveAmount };
      this.pipes[i] = updatedPipe;

      const [topGfx, botGfx] = this.pipeGraphics[i];
      topGfx.x = updatedPipe.x;
      botGfx.x = updatedPipe.x;

      // Score: bird passed the right edge of pipe
      if (!updatedPipe.scored && updatedPipe.x + pipeWidth / 2 < this.bird.x - this.bird.radius) {
        this.pipes[i] = { ...updatedPipe, scored: true };
        this.score++;
        this.scoreText.setText(String(this.score));
        SynthSounds.score();
        GameVFX.scorePopup(this, this.bird.x, this.bird.y);
      }

      // Collision detection (AABB vs circle)
      if (this.checkBirdPipeCollision(this.bird, updatedPipe, pipeWidth)) {
        this.triggerGameOver();
        return;
      }

      // Remove pipes that scrolled fully off-screen
      if (updatedPipe.x + pipeWidth / 2 < this.field.x) {
        toRemove.push(i);
      }
    }

    // Remove off-screen pipes (reverse order to keep indices stable)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.pipeGraphics[idx][0].destroy();
      this.pipeGraphics[idx][1].destroy();
      this.pipes.splice(idx, 1);
      this.pipeGraphics.splice(idx, 1);
    }

    // Timer display
    if (this.safetyTimer) {
      const elapsed = this.safetyTimer.getElapsedMs();
      const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      this.timerText.setText(`${mins}:${secs}`);
    }
  }

  flap() {
    if (!this.bird) return;
    this.bird = { ...this.bird, vy: FLAP_IMPULSE };
    SynthSounds.launch();
  }

  spawnPipe() {
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const pipeWidth = fw * 0.10;
    const gapHeight = fh * GAP_RATIO;
    const groundLineThickness = 6;
    const usableFh = fh - groundLineThickness;

    // Random gap center within bounds (keep some margin)
    const margin = gapHeight * 0.5 + 20;
    const minCenter = fy + margin;
    const maxCenter = fy + usableFh - margin;
    const gapCenterY = Phaser.Math.Between(Math.round(minCenter), Math.round(maxCenter));

    const topH = gapCenterY - gapHeight / 2 - fy;
    const botY = gapCenterY + gapHeight / 2;
    const botH = fy + usableFh - botY;
    const startX = fx + fw + pipeWidth / 2;

    // Top pipe — glow rect container
    const topGfx = GameVisuals.glowRect(this, startX, fy + topH / 2, pipeWidth, topH, this.pipeColor, this.pipeAlpha, 2);
    // Bottom pipe — glow rect container
    const botGfx = GameVisuals.glowRect(this, startX, botY + botH / 2, pipeWidth, botH, this.pipeColor, this.pipeAlpha, 2);

    this.pipes.push({
      x: startX,
      gapCenterY,
      gapHeight,
      topH,
      botY,
      botH,
      scored: false,
    });
    this.pipeGraphics.push([topGfx, botGfx]);
    this.totalSpawned++;
  }

  checkBirdPipeCollision(bird, pipe, pipeWidth) {
    const { x: fx, y: fy, h: fh } = this.field;
    const halfPW = pipeWidth / 2;
    const r = bird.radius;

    const bLeft = bird.x - r;
    const bRight = bird.x + r;
    const pLeft = pipe.x - halfPW;
    const pRight = pipe.x + halfPW;

    // No horizontal overlap → no collision
    if (bRight < pLeft || bLeft > pRight) return false;

    // Horizontal overlap — check vertical gap
    const gapTop = pipe.gapCenterY - pipe.gapHeight / 2;
    const gapBot = pipe.gapCenterY + pipe.gapHeight / 2;

    // Bird circle intersects top pipe or bottom pipe
    const bTop = bird.y - r;
    const bBot = bird.y + r;

    if (bTop < gapTop || bBot > gapBot) return true;

    return false;
  }

  triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    // Flash the bird visual gray to preserve dichoptic integrity
    if (this.birdVisual) {
      this.tweens.killTweensOf(this.birdVisual);
      this.birdVisual.setAlpha(0.5);
    }
    SynthSounds.gameOver();
    GameVFX.screenShake(this);
    this.time.delayedCall(300, () => {
      this.endGame();
    });
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
    quitBtn.on('pointerup', () => this.endGame());

    this.pauseOverlay = [bg, title, resumeBtn, resumeText, quitBtn, quitText];
  }

  endGame() {
    if (this.gameEnded) return;
    this.gameEnded = true;

    if (this.safetyTimer) this.safetyTimer.stop();

    const result = {
      game: 'flappy',
      timestamp: new Date().toISOString(),
      duration_s: Math.round((this.safetyTimer?.getElapsedMs() ?? 0) / 1000),
      caught: this.score,
      total_spawned: this.totalSpawned,
      hit_rate: this.totalSpawned > 0
        ? Math.round((this.score / this.totalSpawned) * 100) / 100
        : 0,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      completed: false,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
