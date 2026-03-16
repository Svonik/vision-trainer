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

// Fall intervals in ms per speed level
const FALL_INTERVALS = { slow: 1000, normal: 600, fast: 400, pro: 250 };

const COLS = 10;
const ROWS = 20;

// Standard tetromino shapes (each piece: array of [col, row] offsets from pivot)
const TETROMINOES = {
  I: { cells: [[0,1],[1,1],[2,1],[3,1]], color: 0x00ffff },
  O: { cells: [[0,0],[1,0],[0,1],[1,1]], color: 0xffff00 },
  T: { cells: [[0,1],[1,1],[2,1],[1,0]], color: 0x800080 },
  S: { cells: [[1,0],[2,0],[0,1],[1,1]], color: 0x00ff00 },
  Z: { cells: [[0,0],[1,0],[1,1],[2,1]], color: 0xff0000 },
  L: { cells: [[0,1],[1,1],[2,1],[2,0]], color: 0xff7f00 },
  J: { cells: [[0,0],[0,1],[1,1],[2,1]], color: 0x0000ff },
};
const PIECE_KEYS = Object.keys(TETROMINOES);

export default class TetrisGameScene extends Phaser.Scene {
  constructor() {
    super('TetrisGameScene');
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

    EventBus.on('start-tetris-game', this.startGameHandler);
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

    // Dichoptic color assignment
    const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
    const isLeftActive = this.settings.eyeConfig === 'platform_left';
    this.activeColor = isLeftActive ? eyeColors.leftColor : eyeColors.rightColor;
    this.placedColor = isLeftActive ? eyeColors.rightColor : eyeColors.leftColor;
    this.activeAlpha = (isLeftActive ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.placedAlpha = (isLeftActive ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    // Grid cell size — fit COLS x ROWS inside field with some padding
    const gridPadX = 10;
    const gridPadY = 40; // room for score at top
    const maxCellW = Math.floor((fw - gridPadX * 2) / COLS);
    const maxCellH = Math.floor((fh - gridPadY - 10) / ROWS);
    this.cellSize = Math.min(maxCellW, maxCellH);

    // Grid origin (top-left of grid)
    this.gridOriginX = fx + Math.floor((fw - this.cellSize * COLS) / 2);
    this.gridOriginY = fy + gridPadY;

    // Board state: null = empty, 'placed' = locked cell
    this.board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));

    // Graphics layers
    this.gridGraphics = this.add.graphics();
    this.placedGraphics = this.add.graphics();
    this.ghostGraphics = this.add.graphics();
    this.activeGraphics = this.add.graphics();

    // Game state
    this.linesCleared = 0;
    this.piecesPlaced = 0;
    this.fallAccum = 0;
    this.fallInterval = FALL_INTERVALS[this.settings.speed] || 600;
    this.gameOver = false;
    this.isPaused = true; // freeze during countdown
    this.gameEnded = false;
    this.pauseOverlay = null;
    this.flashingRows = null;

    // Frame (both eyes)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Score text (left-aligned at grid left)
    this.scoreText = GameVisuals.scoreText(this, this.gridOriginX, fy + 10, this.scoreLabel(), 0);

    // Timer text (right-aligned at grid right edge)
    this.timerText = GameVisuals.scoreText(this, this.gridOriginX + this.cellSize * COLS, fy + 10, '00:00', 1);

    // Next piece label + preview area
    const previewX = this.gridOriginX + this.cellSize * COLS + 12;
    const previewY = this.gridOriginY + 10;
    this.add.text(previewX, previewY, t('tetris.nextPiece'), {
      fontSize: '11px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0);
    this.previewGraphics = this.add.graphics();
    this.previewX = previewX;
    this.previewY = previewY + 16;

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '13px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // DAS (delayed auto shift) state
    this.das = { left: false, right: false, timer: 0, delay: 150, rate: 50, accum: 0 };

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    // Tab blur → auto-pause (named handler for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Prepare first two pieces (for preview) but don't start falling yet
    this.nextPieceKey = this.randomPieceKey();
    this.activePiece = null;
    this.drawAll();

    // Countdown before first piece starts falling
    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;
    GameVFX.countdown(this, cx, cy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
      this.spawnPiece();
      this.drawAll();
    });
  }

  scoreLabel() {
    return `${t('tetris.linesCleared')}: ${this.linesCleared}`;
  }

  randomPieceKey() {
    return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  }

  // Current active piece: { key, cells: [[col,row],...] }
  spawnPiece() {
    const key = this.nextPieceKey;
    this.nextPieceKey = this.randomPieceKey();

    const template = TETROMINOES[key].cells;
    // Offset piece to spawn at top-center of grid
    const spawnCol = Math.floor((COLS - 4) / 2);
    const cells = template.map(([c, r]) => [c + spawnCol, r]);

    this.activePiece = { key, cells };

    // Check game over: if spawn position overlaps existing board cells
    if (!this.isValidPosition(cells)) {
      this.endGame();
      return;
    }

    this.drawAll();
  }

  isValidPosition(cells) {
    for (const [c, r] of cells) {
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && this.board[r][c] !== null) return false;
    }
    return true;
  }

  rotateCells(cells) {
    // Rotate cells 90° clockwise using proper pivot (center of bounding box)
    // Collect min/max to find bounding box
    const minC = Math.min(...cells.map(([c]) => c));
    const maxC = Math.max(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r));
    const maxR = Math.max(...cells.map(([, r]) => r));
    // Use integer size to avoid drift: take max span so the bounding box is square
    const size = Math.max(maxC - minC, maxR - minR);
    // CW rotation formula: (c, r) → (r, size - c) relative to top-left of bounding box
    const rotated = cells.map(([c, r]) => [minC + (r - minR), minR + (size - (c - minC))]);
    // Re-center: compute new bounding box and shift to match old top-left origin
    const newMinC = Math.min(...rotated.map(([c]) => c));
    const newMinR = Math.min(...rotated.map(([, r]) => r));
    const shiftC = minC - newMinC;
    const shiftR = minR - newMinR;
    return rotated.map(([c, r]) => [c + shiftC, r + shiftR]);
  }

  getGhostCells() {
    if (!this.activePiece) return [];
    let cells = this.activePiece.cells.map(c => [...c]);
    while (true) {
      const dropped = cells.map(([c, r]) => [c, r + 1]);
      if (!this.isValidPosition(dropped)) break;
      cells = dropped;
    }
    return cells;
  }

  lockPiece() {
    if (!this.activePiece) return;
    for (const [c, r] of this.activePiece.cells) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        this.board[r][c] = 'placed';
      }
    }
    this.piecesPlaced++;
    SynthSounds.tick();
    this.activePiece = null;
    this.checkLines();
  }

  checkLines() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length === 0) {
      this.spawnPiece();
      return;
    }

    // Flash animation then clear
    this.flashingRows = fullRows;
    this.drawAll(); // draw with flash

    this.time.delayedCall(200, () => {
      // Skip if paused or game already ended to avoid running during pause
      if (this.isPaused || this.gameOver) return;
      this.clearLines(fullRows);
      this.flashingRows = null;
      this.drawAll(); // immediately render cleared board
      this.spawnPiece();
    });
  }

  clearLines(rows) {
    // Sort descending so we can splice correctly
    const sorted = [...rows].sort((a, b) => b - a);
    let count = 0;
    for (const r of sorted) {
      this.board.splice(r, 1);
      this.board.unshift(new Array(COLS).fill(null));
      count++;
    }
    // Scoring: +1 per line, +4 bonus for tetris
    const bonus = count === 4 ? 4 : 0;
    this.linesCleared += count + bonus;
    this.scoreText.setText(this.scoreLabel());
    SynthSounds.score();
    if (count === 4) {
      GameVFX.screenShake(this, 4, 150);
    }
  }

  // Draw everything
  drawAll() {
    this.drawGrid();
    this.drawPlaced();
    this.drawGhost();
    this.drawActive();
    this.drawPreview();
  }

  drawGrid() {
    const g = this.gridGraphics;
    g.clear();
    g.lineStyle(0.5, COLORS.GRAY, 0.15);
    const ox = this.gridOriginX;
    const oy = this.gridOriginY;
    const cs = this.cellSize;
    // Vertical lines
    for (let c = 0; c <= COLS; c++) {
      g.moveTo(ox + c * cs, oy);
      g.lineTo(ox + c * cs, oy + ROWS * cs);
    }
    // Horizontal lines
    for (let r = 0; r <= ROWS; r++) {
      g.moveTo(ox, oy + r * cs);
      g.lineTo(ox + COLS * cs, oy + r * cs);
    }
    g.strokePath();

    // Grid border (styled corners via styledBorder-like accents)
    g.lineStyle(1.5, COLORS.GRAY, 0.4);
    g.strokeRect(ox, oy, COLS * cs, ROWS * cs);
  }

  drawPlaced() {
    const g = this.placedGraphics;
    g.clear();
    const ox = this.gridOriginX;
    const oy = this.gridOriginY;
    const cs = this.cellSize;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] !== null) {
          // Flash rows shown in white
          const isFlashing = this.flashingRows && this.flashingRows.includes(r);
          const fillColor = isFlashing ? COLORS.WHITE : this.placedColor;
          const fillAlpha = isFlashing ? 1.0 : this.placedAlpha;
          g.fillStyle(fillColor, fillAlpha);
          g.fillRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
        }
      }
    }
  }

  drawGhost() {
    const g = this.ghostGraphics;
    g.clear();
    if (!this.activePiece) return;

    const cells = this.getGhostCells();
    const ox = this.gridOriginX;
    const oy = this.gridOriginY;
    const cs = this.cellSize;

    g.fillStyle(this.activeColor, this.activeAlpha * 0.2);
    for (const [c, r] of cells) {
      if (r >= 0) {
        g.fillRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
      }
    }
  }

  drawActive() {
    const g = this.activeGraphics;
    g.clear();
    if (!this.activePiece) return;

    const ox = this.gridOriginX;
    const oy = this.gridOriginY;
    const cs = this.cellSize;

    // Subtle outer glow for active piece
    g.fillStyle(this.activeColor, this.activeAlpha * 0.12);
    for (const [c, r] of this.activePiece.cells) {
      if (r >= 0) {
        g.fillRect(ox + c * cs - 2, oy + r * cs - 2, cs + 2, cs + 2);
      }
    }
    // Core fill
    g.fillStyle(this.activeColor, this.activeAlpha);
    for (const [c, r] of this.activePiece.cells) {
      if (r >= 0) {
        g.fillRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
      }
    }
    // Inner highlight strip
    g.fillStyle(this.activeColor, Math.min(this.activeAlpha * 1.25, 1));
    for (const [c, r] of this.activePiece.cells) {
      if (r >= 0) {
        g.fillRect(ox + c * cs + 2, oy + r * cs + 2, cs - 4, 2);
      }
    }
  }

  drawPreview() {
    const g = this.previewGraphics;
    g.clear();
    if (!this.nextPieceKey) return;

    const template = TETROMINOES[this.nextPieceKey].cells;
    const smallCell = Math.max(10, this.cellSize - 4);
    const px = this.previewX;
    const py = this.previewY;

    // Draw in gray (both eyes)
    g.fillStyle(COLORS.GRAY, 1);
    for (const [c, r] of template) {
      g.fillRect(px + c * smallCell + 1, py + r * smallCell + 1, smallCell - 2, smallCell - 2);
    }
  }

  // Input handling
  tryMove(dc, dr) {
    if (!this.activePiece) return false;
    const newCells = this.activePiece.cells.map(([c, r]) => [c + dc, r + dr]);
    if (this.isValidPosition(newCells)) {
      this.activePiece = { ...this.activePiece, cells: newCells };
      this.drawAll();
      return true;
    }
    return false;
  }

  tryRotate() {
    if (!this.activePiece) return;
    const rotated = this.rotateCells(this.activePiece.cells);
    // Wall kick: try original, then shift right, then left
    const kicks = [[0,0],[1,0],[-1,0],[2,0],[-2,0]];
    for (const [dc, dr] of kicks) {
      const kicked = rotated.map(([c, r]) => [c + dc, r + dr]);
      if (this.isValidPosition(kicked)) {
        this.activePiece = { ...this.activePiece, cells: kicked };
        this.drawAll();
        return;
      }
    }
  }

  hardDrop() {
    if (!this.activePiece) return;
    const ghost = this.getGhostCells();
    this.activePiece = { ...this.activePiece, cells: ghost };
    this.lockPiece();
    this.fallAccum = 0;
  }

  update(time, delta) {
    if (this.gameOver) return;
    if (this.isPaused) return;
    if (!this.activePiece) return;
    if (this.flashingRows) return; // wait for flash animation

    // Rotate: Up arrow or W — use JustDown to avoid repeat
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wKey)) {
      this.tryRotate();
    }

    // Hard drop: Space
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.hardDrop();
      return;
    }

    // Horizontal movement with DAS
    const leftDown = this.cursors.left.isDown || this.aKey.isDown;
    const rightDown = this.cursors.right.isDown || this.dKey.isDown;

    if (leftDown && !rightDown) {
      if (!this.das.left) {
        this.das.left = true;
        this.das.right = false; // explicit reset of opposing direction
        this.das.timer = 0;
        this.das.accum = 0;
        this.tryMove(-1, 0);
      } else {
        this.das.timer += delta;
        if (this.das.timer >= this.das.delay) {
          this.das.accum += delta;
          while (this.das.accum >= this.das.rate) {
            this.tryMove(-1, 0);
            this.das.accum -= this.das.rate;
          }
        }
      }
    } else if (rightDown && !leftDown) {
      if (!this.das.right) {
        this.das.right = true;
        this.das.left = false; // explicit reset of opposing direction
        this.das.timer = 0;
        this.das.accum = 0;
        this.tryMove(1, 0);
      } else {
        this.das.timer += delta;
        if (this.das.timer >= this.das.delay) {
          this.das.accum += delta;
          while (this.das.accum >= this.das.rate) {
            this.tryMove(1, 0);
            this.das.accum -= this.das.rate;
          }
        }
      }
    } else {
      // Neither or both pressed — reset both
      this.das.left = false;
      this.das.right = false;
    }

    // Soft drop: Down arrow or S (2× speed)
    const isSoftDrop = this.cursors.down.isDown || this.sKey.isDown;
    const effectiveInterval = isSoftDrop ? this.fallInterval / 5 : this.fallInterval;

    // Auto-fall
    this.fallAccum += delta;
    if (this.fallAccum >= effectiveInterval) {
      this.fallAccum = 0;
      const moved = this.tryMove(0, 1);
      if (!moved) {
        this.lockPiece();
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
    this.gameOver = true;

    SynthSounds.gameOver();
    if (this.safetyTimer) this.safetyTimer.stop();

    const result = {
      game: 'tetris',
      timestamp: new Date().toISOString(),
      duration_s: this.safetyTimer ? Math.round(this.safetyTimer.getElapsedMs() / 1000) : 0,
      caught: this.linesCleared,
      total_spawned: this.piecesPlaced,
      hit_rate: this.piecesPlaced > 0
        ? Math.round((this.linesCleared / this.piecesPlaced) * 100) / 100
        : 0,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }

  shutdown() {
    EventBus.removeListener('start-tetris-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }
}
