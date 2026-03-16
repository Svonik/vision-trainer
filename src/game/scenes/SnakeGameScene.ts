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

const GRID_COLS = 20;
const GRID_ROWS = 15;
const MOVE_INTERVALS = { slow: 200, normal: 150, fast: 100, pro: 70 };

const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export default class SnakeGameScene extends Phaser.Scene {
  constructor() {
    super('SnakeGameScene');
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

    EventBus.on('start-snake-game', this.startGameHandler);
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

    // Cell dimensions
    this.cellW = fw / GRID_COLS;
    this.cellH = fh / GRID_ROWS;

    const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
    const isLeftPlatform = this.settings.eyeConfig === 'platform_left';
    this.platformColor = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.ballColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.ballAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    // Background fill
    this.add.rectangle(fx + fw / 2, fy + fh / 2, fw, fh, COLORS.BLACK, 1);

    // Grid lines (very subtle)
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, COLORS.GRAY, 0.1);
    for (let col = 0; col <= GRID_COLS; col++) {
      const lx = fx + col * this.cellW;
      gridGraphics.lineBetween(lx, fy, lx, fy + fh);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      const ly = fy + row * this.cellH;
      gridGraphics.lineBetween(fx, ly, fx + fw, ly);
    }

    // Field border (both eyes)
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Score (both eyes — gray)
    this.score = 0;
    this.scoreText = GameVisuals.scoreText(this, fx + fw - 10, fy + 10, `${t('game.score')}: 0`, 1);

    // Timer (both eyes — gray)
    this.timerText = GameVisuals.scoreText(this, fx + fw / 2, fy + 10, '00:00', 0.5);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Snake graphics container
    this.snakeGraphics = this.add.graphics();
    this.foodGraphics = this.add.graphics();

    // Initialize snake: length 3, center, moving right
    const startCol = Math.floor(GRID_COLS / 2) - 1;
    const startRow = Math.floor(GRID_ROWS / 2);
    this.snake = [
      { x: startCol, y: startRow },
      { x: startCol - 1, y: startRow },
      { x: startCol - 2, y: startRow },
    ];
    this.direction = { ...DIR.RIGHT };
    this.nextDirection = { ...DIR.RIGHT };

    // Food
    this.food = null;
    this.totalSpawned = 0;
    this.spawnFood();

    // Food pulse tween (scale-based via a container)
    this.foodPulseScale = 1.0;
    this.foodPulseDir = 1;

    // Move timer — starts frozen, enabled after countdown
    this.moveInterval = MOVE_INTERVALS[this.settings.speed] || 150;
    this.timeSinceLastMove = 0;

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = true; // freeze during countdown
    this.gameEnded = false;
    this.isGameOver = false;
    this.pauseOverlay = null;

    // Tab blur → auto-pause (named handler for cleanup)
    this.blurHandler = () => { if (!this.isPaused && !this.isGameOver) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    this.renderSnake();
    this.renderFood();

    // Countdown before snake starts moving
    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;
    GameVFX.countdown(this, cx, cy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
    });
  }

  shutdown() {
    EventBus.removeListener('start-snake-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    if (this.isPaused || this.isGameOver) return;
    if (!this.snake) return;

    // Handle direction input — check against nextDirection to prevent reversal on buffered inputs
    if (
      (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.up)) &&
      this.nextDirection.y !== 1
    ) {
      this.nextDirection = { ...DIR.UP };
    } else if (
      (Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.down)) &&
      this.nextDirection.y !== -1
    ) {
      this.nextDirection = { ...DIR.DOWN };
    } else if (
      (Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.left)) &&
      this.nextDirection.x !== 1
    ) {
      this.nextDirection = { ...DIR.LEFT };
    } else if (
      (Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.right)) &&
      this.nextDirection.x !== -1
    ) {
      this.nextDirection = { ...DIR.RIGHT };
    }

    // Move timer — use while loop to handle frame spikes correctly
    this.timeSinceLastMove += delta;
    while (this.timeSinceLastMove >= this.moveInterval) {
      this.timeSinceLastMove -= this.moveInterval;
      this.moveSnake();
      // Stop processing moves if game ended mid-loop
      if (this.isGameOver) break;
    }

    // Food pulse animation
    this.foodPulseScale += this.foodPulseDir * delta * 0.002;
    if (this.foodPulseScale >= 1.2) { this.foodPulseScale = 1.2; this.foodPulseDir = -1; }
    if (this.foodPulseScale <= 0.8) { this.foodPulseScale = 0.8; this.foodPulseDir = 1; }
    this.renderFood();

    // Timer update
    if (this.safetyTimer) {
      const elapsed = this.safetyTimer.getElapsedMs();
      const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      this.timerText.setText(`${mins}:${secs}`);
    }
  }

  moveSnake() {
    // Apply next direction
    this.direction = { ...this.nextDirection };

    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // Wall collision
    if (
      newHead.x < 0 || newHead.x >= GRID_COLS ||
      newHead.y < 0 || newHead.y >= GRID_ROWS
    ) {
      this.isGameOver = true;
      SynthSounds.gameOver();
      GameVFX.screenShake(this, 5, 200);
      this.endGame();
      return;
    }

    // Self collision
    for (const seg of this.snake) {
      if (seg.x === newHead.x && seg.y === newHead.y) {
        this.isGameOver = true;
        SynthSounds.gameOver();
        GameVFX.screenShake(this, 5, 200);
        this.endGame();
        return;
      }
    }

    // Build new snake (immutable: prepend head, conditionally drop tail)
    let ate = false;
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      ate = true;
      this.score++;
      this.scoreText.setText(`${t('game.score')}: ${this.score}`);
      const { x: foodPx, y: foodPy } = this.cellToPixel(this.food.x, this.food.y);
      SynthSounds.score();
      GameVFX.particleBurst(this, foodPx, foodPy, this.ballColor);
      GameVFX.scorePopup(this, foodPx, foodPy);
    }

    const newSnake = ate
      ? [newHead, ...this.snake]
      : [newHead, ...this.snake.slice(0, -1)];

    this.snake = newSnake;

    if (ate) {
      this.spawnFood();
    }

    this.renderSnake();
  }

  spawnFood() {
    // Collect occupied cells
    const occupied = new Set(this.snake.map((seg) => `${seg.x},${seg.y}`));

    // Collect all empty cells
    const empty = [];
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (!occupied.has(`${col},${row}`)) {
          empty.push({ x: col, y: row });
        }
      }
    }

    if (empty.length === 0) {
      // Snake fills the entire board — player wins
      this.isGameOver = true;
      this.endGame();
      return;
    }

    const idx = Phaser.Math.Between(0, empty.length - 1);
    this.food = empty[idx];
    this.totalSpawned++;
    this.foodPulseScale = 1.0;
    this.foodPulseDir = 1;
  }

  cellToPixel(col, row) {
    return {
      x: this.field.x + col * this.cellW + this.cellW / 2,
      y: this.field.y + row * this.cellH + this.cellH / 2,
    };
  }

  renderSnake() {
    if (!this.snakeGraphics) return;
    this.snakeGraphics.clear();

    const pad = 2;
    const w = this.cellW - pad * 2;
    const h = this.cellH - pad * 2;

    this.snake.forEach((seg, index) => {
      const { x: px, y: py } = this.cellToPixel(seg.x, seg.y);
      if (index === 0) {
        // Head — outer glow layer
        this.snakeGraphics.fillStyle(this.platformColor, this.platformAlpha * 0.15);
        this.snakeGraphics.fillRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6);
        // Head — core (brighter)
        this.snakeGraphics.fillStyle(this.platformColor, Math.min(1, this.platformAlpha * 1.3));
        this.snakeGraphics.fillRect(px - w / 2, py - h / 2, w, h);
        // Head highlight strip
        this.snakeGraphics.fillStyle(this.platformColor, Math.min(1, this.platformAlpha * 1.5));
        this.snakeGraphics.fillRect(px - w / 2 + 2, py - h / 2 + 2, w - 4, 2);
      } else {
        // Body — subtle outer glow
        this.snakeGraphics.fillStyle(this.platformColor, this.platformAlpha * 0.08);
        this.snakeGraphics.fillRect(px - w / 2 - 2, py - h / 2 - 2, w + 4, h + 4);
        // Body fill
        this.snakeGraphics.fillStyle(this.platformColor, this.platformAlpha);
        this.snakeGraphics.fillRect(px - w / 2, py - h / 2, w, h);
      }
    });
  }

  renderFood() {
    if (!this.foodGraphics || !this.food) return;
    this.foodGraphics.clear();

    const { x: px, y: py } = this.cellToPixel(this.food.x, this.food.y);
    const radius = (Math.min(this.cellW, this.cellH) / 2 - 2) * this.foodPulseScale;

    // Outer glow layers
    this.foodGraphics.fillStyle(this.ballColor, this.ballAlpha * 0.06);
    this.foodGraphics.fillCircle(px, py, radius * 2.0);
    this.foodGraphics.fillStyle(this.ballColor, this.ballAlpha * 0.10);
    this.foodGraphics.fillCircle(px, py, radius * 1.5);
    this.foodGraphics.fillStyle(this.ballColor, this.ballAlpha * 0.14);
    this.foodGraphics.fillCircle(px, py, radius * 1.2);
    // Core
    this.foodGraphics.fillStyle(this.ballColor, this.ballAlpha);
    this.foodGraphics.fillCircle(px, py, radius);
    // Inner highlight
    this.foodGraphics.fillStyle(this.ballColor, Math.min(this.ballAlpha * 1.3, 1));
    this.foodGraphics.fillCircle(px, py, radius * 0.4);
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
    this.isGameOver = true;

    if (this.safetyTimer) this.safetyTimer.stop();

    // total_spawned = food eaten + 1 (the uneaten food when game ends counts as 1 miss)
    const totalSpawned = this.score + 1;

    const result = {
      game: 'snake',
      timestamp: new Date().toISOString(),
      duration_s: Math.round((this.safetyTimer ? this.safetyTimer.getElapsedMs() : 0) / 1000),
      caught: this.score,
      total_spawned: totalSpawned,
      hit_rate: Math.round((this.score / totalSpawned) * 100) / 100,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
