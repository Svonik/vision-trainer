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

// Grid configs per speed
const GRID_CONFIG = {
  slow: 3,
  normal: 4,
  fast: 4,
  pro: 4,
};

// Time limits per speed (ms) — fast/pro have tighter time pressure
const TIME_LIMIT = {
  slow: 0,
  normal: 0,
  fast: 180000,
  pro: 120000,
};

const TILE_GAP = 6;
const SLIDE_DURATION = 120;

/**
 * Count inversions in a flat array of tile values (0 = empty).
 * An inversion is a pair (a, b) where a appears before b but a > b,
 * ignoring the empty tile (0).
 */
function countInversions(tiles: number[]): number {
  let inversions = 0;
  const values = tiles.filter(v => v !== 0);
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) inversions++;
    }
  }
  return inversions;
}

/**
 * Check if a puzzle configuration is solvable.
 * For odd-width grids (3x3): solvable if inversions count is even.
 * For even-width grids (4x4): solvable if (inversions + row of blank from bottom) is even.
 */
function isSolvable(tiles: number[], gridSize: number): boolean {
  const inversions = countInversions(tiles);
  if (gridSize % 2 === 1) {
    return inversions % 2 === 0;
  }
  const blankIndex = tiles.indexOf(0);
  const blankRowFromBottom = gridSize - Math.floor(blankIndex / gridSize);
  return (inversions + blankRowFromBottom) % 2 === 0;
}

/**
 * Generate a solvable shuffled puzzle.
 * Returns a flat array of tile values (1..N, 0 for empty) in row-major order.
 */
function generateSolvablePuzzle(gridSize: number): number[] {
  const totalTiles = gridSize * gridSize;
  const solved = [];
  for (let i = 1; i < totalTiles; i++) solved.push(i);
  solved.push(0);

  // Fisher-Yates shuffle (creates new array)
  const shuffled = [...solved];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Ensure solvable — if not, swap two non-empty tiles
  if (!isSolvable(shuffled, gridSize)) {
    // Find two non-empty adjacent tiles and swap them
    const nonEmpty = [];
    for (let i = 0; i < shuffled.length; i++) {
      if (shuffled[i] !== 0) nonEmpty.push(i);
    }
    const a = nonEmpty[0];
    const b = nonEmpty[1];
    const temp = shuffled[a];
    shuffled[a] = shuffled[b];
    shuffled[b] = temp;
  }

  // Don't start already solved
  if (isPuzzleSolved(shuffled, gridSize)) {
    return generateSolvablePuzzle(gridSize);
  }

  return shuffled;
}

/**
 * Check if the puzzle is in the solved state.
 */
function isPuzzleSolved(tiles: number[], gridSize: number): boolean {
  const totalTiles = gridSize * gridSize;
  for (let i = 0; i < totalTiles - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[totalTiles - 1] === 0;
}

/**
 * Get the correct position value for a grid index.
 * Index 0 should have value 1, index 1 value 2, ..., last index value 0 (empty).
 */
function correctValueAt(index: number, gridSize: number): number {
  const totalTiles = gridSize * gridSize;
  return index === totalTiles - 1 ? 0 : index + 1;
}

export default class SlidingPuzzleGameScene extends Phaser.Scene {
  constructor() {
    super('SlidingPuzzleGameScene');
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

    EventBus.on('start-slidingpuzzle-game', this.startGameHandler);
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

    // Eye color setup
    const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
    const isLeftPlatform = this.settings.eyeConfig === 'platform_left';
    this.platformColor = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.ballColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.alphaA = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.alphaB = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    // Contrast engine
    this.contrastConfig = createContrastConfig();
    this.contrastState = createContrastState(this.settings.fellowEyeContrast ?? 30);

    // Grid size from speed
    this.gridSize = GRID_CONFIG[this.settings.speed] || GRID_CONFIG.normal;
    this.level = 1;
    this.moves = 0;
    this.isAnimating = false;

    // Frame
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Moves text
    this.movesText = GameVisuals.scoreText(this, fx + 10, fy + 28, 'Ходы: 0', 0);

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Calculate tile size to fit within field
    this.tileSize = this.calculateTileSize();

    // Generate and render puzzle
    this.tiles = generateSolvablePuzzle(this.gridSize);
    this.tileObjects = [];
    this.renderGrid();

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = false;
    this.pauseOverlay = null;
    this.gameEnded = false;

    // Tab blur -> auto-pause
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;

    // Countdown then start
    GameVFX.countdown(this, ccx, ccy, () => {
      if (!this.scene.isActive()) return;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
    });
  }

  calculateTileSize() {
    // Available space for the grid (leaving margins for HUD)
    const availW = this.field.w - 40;
    const availH = this.field.h - 80;
    const maxTileW = (availW - (this.gridSize - 1) * TILE_GAP) / this.gridSize;
    const maxTileH = (availH - (this.gridSize - 1) * TILE_GAP) / this.gridSize;
    return Math.floor(Math.min(maxTileW, maxTileH, 120));
  }

  gridStartPosition() {
    const gridW = this.gridSize * (this.tileSize + TILE_GAP) - TILE_GAP;
    const gridH = this.gridSize * (this.tileSize + TILE_GAP) - TILE_GAP;
    const startX = this.field.x + (this.field.w - gridW) / 2;
    const startY = this.field.y + (this.field.h - gridH) / 2 + 15;
    return { startX, startY };
  }

  tilePosition(col, row) {
    const { startX, startY } = this.gridStartPosition();
    return {
      x: startX + col * (this.tileSize + TILE_GAP) + this.tileSize / 2,
      y: startY + row * (this.tileSize + TILE_GAP) + this.tileSize / 2,
    };
  }

  renderGrid() {
    // Destroy old objects if re-rendering
    for (const obj of this.tileObjects) {
      if (obj) {
        obj.container.destroy();
      }
    }
    this.tileObjects = [];

    for (let i = 0; i < this.tiles.length; i++) {
      const value = this.tiles[i];
      const col = i % this.gridSize;
      const row = Math.floor(i / this.gridSize);
      const { x, y } = this.tilePosition(col, row);

      if (value === 0) {
        // Empty space — no visible tile
        this.tileObjects.push(null);
        continue;
      }

      const container = this.createTileContainer(x, y, value, i);
      this.tileObjects.push({ container, value });
    }
  }

  createTileContainer(x, y, value, index) {
    const container = this.add.container(x, y);
    const halfSize = this.tileSize / 2;

    // Determine color: odd values = platformColor, even values = ballColor
    const isOdd = value % 2 === 1;
    const tileColor = isOdd ? this.platformColor : this.ballColor;
    const tileAlpha = isOdd ? this.alphaA : this.alphaB;

    // Tile background
    const bg = this.add.graphics();
    bg.fillStyle(tileColor, tileAlpha * 0.25);
    bg.fillRoundedRect(-halfSize, -halfSize, this.tileSize, this.tileSize, 6);
    bg.lineStyle(2, tileColor, tileAlpha * 0.6);
    bg.strokeRoundedRect(-halfSize, -halfSize, this.tileSize, this.tileSize, 6);
    container.add(bg);

    // Number text
    const fontSize = this.gridSize === 3 ? '28px' : '22px';
    const hexColor = isOdd
      ? (this.platformColor === COLORS.RED ? COLORS.RED_HEX : COLORS.CYAN_HEX)
      : (this.ballColor === COLORS.RED ? COLORS.RED_HEX : COLORS.CYAN_HEX);
    const text = this.add.text(0, 0, String(value), {
      fontSize,
      color: hexColor,
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(tileAlpha);
    container.add(text);

    // Correct position indicator (subtle dot at bottom-right when in place)
    const correctVal = correctValueAt(index, this.gridSize);
    if (value === correctVal) {
      const dot = this.add.circle(halfSize - 8, halfSize - 8, 3, COLORS.WHITE, 0.3);
      container.add(dot);
    }

    // Interactive hit area
    const hitArea = this.add.rectangle(0, 0, this.tileSize, this.tileSize, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerup', () => {
      if (!this.isPaused && !this.isAnimating && !this.gameEnded) {
        this.onTileClick(index);
      }
    });

    // Hover highlight
    hitArea.on('pointerover', () => {
      if (!this.isAnimating && !this.gameEnded) {
        bg.clear();
        bg.fillStyle(tileColor, tileAlpha * 0.35);
        bg.fillRoundedRect(-halfSize, -halfSize, this.tileSize, this.tileSize, 6);
        bg.lineStyle(2, COLORS.WHITE, 0.5);
        bg.strokeRoundedRect(-halfSize, -halfSize, this.tileSize, this.tileSize, 6);
      }
    });
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(tileColor, tileAlpha * 0.25);
      bg.fillRoundedRect(-halfSize, -halfSize, this.tileSize, this.tileSize, 6);
      bg.lineStyle(2, tileColor, tileAlpha * 0.6);
      bg.strokeRoundedRect(-halfSize, -halfSize, this.tileSize, this.tileSize, 6);
    });

    return container;
  }

  onTileClick(index) {
    const emptyIndex = this.tiles.indexOf(0);
    if (!this.isAdjacentToEmpty(index, emptyIndex)) return;

    this.slideTile(index, emptyIndex);
  }

  isAdjacentToEmpty(tileIndex, emptyIndex) {
    const tileCol = tileIndex % this.gridSize;
    const tileRow = Math.floor(tileIndex / this.gridSize);
    const emptyCol = emptyIndex % this.gridSize;
    const emptyRow = Math.floor(emptyIndex / this.gridSize);

    const colDiff = Math.abs(tileCol - emptyCol);
    const rowDiff = Math.abs(tileRow - emptyRow);

    // Must be exactly one step away in one direction only
    return (colDiff === 1 && rowDiff === 0) || (colDiff === 0 && rowDiff === 1);
  }

  slideTile(tileIndex, emptyIndex) {
    this.isAnimating = true;

    const tileValue = this.tiles[tileIndex];
    const tileObj = this.tileObjects[tileIndex];

    // Target position (where empty space is)
    const emptyCol = emptyIndex % this.gridSize;
    const emptyRow = Math.floor(emptyIndex / this.gridSize);
    const { x: targetX, y: targetY } = this.tilePosition(emptyCol, emptyRow);

    // Animate slide
    this.tweens.add({
      targets: tileObj.container,
      x: targetX,
      y: targetY,
      duration: SLIDE_DURATION,
      ease: 'Power2',
      onComplete: () => {
        // Update tile array immutably concept — but array swap is needed for state
        const newTiles = [...this.tiles];
        newTiles[emptyIndex] = tileValue;
        newTiles[tileIndex] = 0;
        this.tiles = newTiles;

        // Swap object references
        const newObjects = [...this.tileObjects];
        newObjects[emptyIndex] = tileObj;
        newObjects[tileIndex] = null;
        this.tileObjects = newObjects;

        // Update move count
        this.moves++;
        this.movesText.setText(`Ходы: ${this.moves}`);

        // Check if tile landed in correct position
        const isCorrect = tileValue === correctValueAt(emptyIndex, this.gridSize);
        this.contrastState = recordTrial(this.contrastState, this.contrastConfig, isCorrect);
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        if (isCorrect) {
          SynthSounds.score();
          GameVFX.scorePopup(this, targetX, targetY - this.tileSize / 2, '+1');
        } else {
          SynthSounds.miss();
        }

        this.isAnimating = false;

        // Check win condition
        if (isPuzzleSolved(this.tiles, this.gridSize)) {
          this.onPuzzleSolved();
        }
      },
    });
  }

  onPuzzleSolved() {
    this.isAnimating = true;
    SynthSounds.victory();

    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;

    // Flash all tiles
    for (const obj of this.tileObjects) {
      if (obj) {
        GameVFX.flash(this, obj.container.x, obj.container.y, this.tileSize, this.tileSize, 300);
      }
    }

    this.nextLevel();
  }

  nextLevel() {
    this.level++;

    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;

    const levelText = this.add.text(cx, cy, `\u0423\u0440\u043E\u0432\u0435\u043D\u044C ${this.level}!`, {
      fontSize: '36px', color: '#FFFFFF', fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: levelText,
      alpha: 1, scaleX: 1.3, scaleY: 1.3,
      duration: 300, yoyo: true, hold: 1500,
      onComplete: () => {
        levelText.destroy();
        this.resetForNextLevel();
      },
    });
  }

  resetForNextLevel() {
    // Destroy existing tile objects
    for (const obj of this.tileObjects) {
      if (obj) obj.container.destroy();
    }
    this.tileObjects = [];

    // Increase grid size on certain levels (stay capped at 5x5)
    if (this.level === 3 && this.gridSize < 4) {
      this.gridSize = 4;
      this.tileSize = this.calculateTileSize();
    } else if (this.level === 5 && this.gridSize < 5) {
      this.gridSize = 5;
      this.tileSize = this.calculateTileSize();
    }

    // Generate new puzzle
    this.tiles = generateSolvablePuzzle(this.gridSize);
    this.renderGrid();
    this.isAnimating = false;
  }

  updateFellowEyeAlpha(alpha) {
    this.alphaA = alpha;
  }

  shutdown() {
    EventBus.removeListener('start-slidingpuzzle-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update() {
    if (!this.safetyTimer) return;

    // ESC to toggle pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
      return;
    }

    // HUD update
    if (this.hud) {
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `Ходы: ${this.moves}`);
    }
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

  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.safetyTimer.stop();

    const totalTiles = this.gridSize * this.gridSize - 1;
    const solvedCount = this.tiles.reduce((count, val, idx) => {
      return count + (val === correctValueAt(idx, this.gridSize) ? 1 : 0);
    }, 0);

    const result = {
      game: 'slidingpuzzle',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: solvedCount,
      total_spawned: totalTiles,
      hit_rate: totalTiles > 0
        ? Math.round((solvedCount / totalTiles) * 100) / 100
        : 0,
      moves: this.moves,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
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
