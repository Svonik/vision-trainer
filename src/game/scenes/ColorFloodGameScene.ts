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

// --- Grid sizes per speed ---
const GRID_CONFIG = {
  slow: { size: 8, maxMoves: 28 },
  normal: { size: 8, maxMoves: 25 },
  fast: { size: 10, maxMoves: 28 },
  pro: { size: 10, maxMoves: 24 },
};

// 6 dichoptic types: 3 red-tinted (left eye), 3 cyan-tinted (right eye)
// Each type has a unique shape for accessibility
const TYPE_COUNT = 6;

// Shape draw functions keyed by type index (0-5)
// 0-2: colorA (e.g. red), 3-5: colorB (e.g. cyan)
const SHAPE_NAMES = ['square', 'circle', 'triangle', 'diamond', 'star', 'hexagon'];

// Brightness variants: light, medium, dark
const BRIGHTNESS_MULT = [1.0, 0.7, 0.45];

export default class ColorFloodGameScene extends Phaser.Scene {
  constructor() {
    super('ColorFloodGameScene');
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

    EventBus.on('start-colorflood-game', this.startGameHandler);
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
    this.colorA = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.colorB = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.alphaA = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.alphaB = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    // Contrast engine
    this.contrastConfig = createContrastConfig();
    this.contrastState = createContrastState(this.settings.fellowEyeContrast ?? 30);

    // Level / grid
    this.level = 1;
    const gridConfig = GRID_CONFIG[this.settings.speed] || GRID_CONFIG.normal;
    this.gridSize = gridConfig.size;
    this.maxMoves = gridConfig.maxMoves;

    // Build type colors: 3 shades of colorA + 3 shades of colorB
    this.typeColors = this.buildTypeColors();

    // Frame
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // HUD
    this.movesUsed = 0;
    this.hud = GameVisuals.createHUD(this, this.field);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Build grid data
    this.grid = this.buildGrid();

    // Compute initial flood region from top-left
    this.floodRegion = new Set();
    this.expandFlood(this.grid[0][0]);

    // Render
    this.cellObjects = [];
    this.renderGrid();

    // Button bar
    this.buttonObjects = [];
    this.renderButtons();

    // Highlight flood region
    this.updateFloodHighlight();

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = false;
    this.pauseOverlay = null;
    this.gameEnded = false;
    this.isLocked = true;

    // Tab blur auto-pause
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;

    GameVFX.countdown(this, ccx, ccy, () => {
      if (!this.scene.isActive()) return;
      this.isLocked = false;
      this.safetyTimer.start();
    });
  }

  // --- Type colors: 3 shades colorA + 3 shades colorB ---
  buildTypeColors() {
    const colors = [];
    for (let i = 0; i < 3; i++) {
      colors.push({
        color: this.colorA,
        alpha: this.alphaA * BRIGHTNESS_MULT[i],
        isColorA: true,
      });
    }
    for (let i = 0; i < 3; i++) {
      colors.push({
        color: this.colorB,
        alpha: this.alphaB * BRIGHTNESS_MULT[i],
        isColorA: false,
      });
    }
    return colors;
  }

  // --- Build NxN grid with random type indices 0-5 ---
  buildGrid() {
    const grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      const row = [];
      for (let c = 0; c < this.gridSize; c++) {
        row.push(Math.floor(Math.random() * TYPE_COUNT));
      }
      grid.push(row);
    }
    return grid;
  }

  // --- Flood fill from top-left: find all connected cells with same type ---
  expandFlood(targetType) {
    // BFS from all cells already in the flood region + cell (0,0)
    const visited = new Set();
    const queue = [];

    if (this.floodRegion.size === 0) {
      queue.push('0,0');
      visited.add('0,0');
    } else {
      for (const key of this.floodRegion) {
        const [r, c] = key.split(',').map(Number);
        // Check neighbors of existing flood cells
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nc < 0 || nr >= this.gridSize || nc >= this.gridSize) continue;
          const nk = `${nr},${nc}`;
          if (this.floodRegion.has(nk)) continue;
          if (!visited.has(nk) && this.grid[nr][nc] === targetType) {
            visited.add(nk);
            queue.push(nk);
          }
        }
      }
    }

    // BFS to expand into all connected same-type cells
    while (queue.length > 0) {
      const key = queue.shift();
      this.floodRegion.add(key);
      const [r, c] = key.split(',').map(Number);
      const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nc < 0 || nr >= this.gridSize || nc >= this.gridSize) continue;
        const nk = `${nr},${nc}`;
        if (this.floodRegion.has(nk) || visited.has(nk)) continue;
        if (this.grid[nr][nc] === targetType) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
  }

  // --- Render grid cells ---
  renderGrid() {
    // Destroy existing
    for (const obj of this.cellObjects) {
      if (obj.gfx) obj.gfx.destroy();
      if (obj.hit) obj.hit.destroy();
    }
    this.cellObjects = [];

    // Compute cell size to fit in field with space for buttons at bottom
    const buttonAreaH = 60;
    const hudAreaH = 35;
    const availW = this.field.w - 20;
    const availH = this.field.h - buttonAreaH - hudAreaH - 20;
    const cellSize = Math.floor(Math.min(availW / this.gridSize, availH / this.gridSize));
    this.cellSize = cellSize;

    const gridW = cellSize * this.gridSize;
    const gridH = cellSize * this.gridSize;
    const startX = this.field.x + (this.field.w - gridW) / 2;
    const startY = this.field.y + hudAreaH + (availH - gridH) / 2 + 10;
    this.gridOriginX = startX;
    this.gridOriginY = startY;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const typeIdx = this.grid[r][c];
        const cx = startX + c * cellSize + cellSize / 2;
        const cy = startY + r * cellSize + cellSize / 2;

        const gfx = this.add.graphics();
        this.drawCell(gfx, cx, cy, cellSize, typeIdx);

        this.cellObjects.push({ gfx, r, c, cx, cy });
      }
    }
  }

  // --- Draw a single cell: colored bg + shape ---
  drawCell(gfx, cx, cy, size, typeIdx) {
    gfx.clear();
    const tc = this.typeColors[typeIdx];
    const half = size / 2 - 1;

    // Background fill
    gfx.fillStyle(tc.color, tc.alpha * 0.3);
    gfx.fillRect(cx - half, cy - half, half * 2, half * 2);

    // Border
    gfx.lineStyle(1, tc.color, tc.alpha * 0.5);
    gfx.strokeRect(cx - half, cy - half, half * 2, half * 2);

    // Shape in center
    this.drawShape(gfx, SHAPE_NAMES[typeIdx], cx, cy, size * 0.25, tc.color, tc.alpha);
  }

  // --- Draw shape by name ---
  drawShape(gfx, shape, x, y, s, color, alpha) {
    gfx.fillStyle(color, alpha);
    gfx.lineStyle(1.5, color, alpha);

    switch (shape) {
      case 'square':
        gfx.fillRect(x - s, y - s, s * 2, s * 2);
        break;
      case 'circle':
        gfx.fillCircle(x, y, s);
        break;
      case 'triangle': {
        const pts = [
          { x: x, y: y - s },
          { x: x + s, y: y + s },
          { x: x - s, y: y + s },
        ];
        gfx.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        break;
      }
      case 'diamond':
        gfx.fillTriangle(x, y - s, x + s, y, x - s, y);
        gfx.fillTriangle(x, y + s, x + s, y, x - s, y);
        break;
      case 'star': {
        const outerR = s;
        const innerR = s * 0.45;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          points.push({ x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r });
        }
        gfx.fillPoints(points, true);
        break;
      }
      case 'hexagon': {
        const points = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          points.push({ x: x + Math.cos(angle) * s, y: y + Math.sin(angle) * s });
        }
        gfx.fillPoints(points, true);
        break;
      }
      default:
        gfx.fillCircle(x, y, s);
    }
  }

  // --- Render 6 type-selection buttons at bottom ---
  renderButtons() {
    for (const obj of this.buttonObjects) {
      if (obj.gfx) obj.gfx.destroy();
      if (obj.hit) obj.hit.destroy();
    }
    this.buttonObjects = [];

    const btnSize = 40;
    const btnGap = 12;
    const totalW = TYPE_COUNT * btnSize + (TYPE_COUNT - 1) * btnGap;
    const startX = this.field.x + (this.field.w - totalW) / 2;
    const btnY = this.field.y + this.field.h - 38;

    for (let i = 0; i < TYPE_COUNT; i++) {
      const bx = startX + i * (btnSize + btnGap) + btnSize / 2;
      const by = btnY;

      const gfx = this.add.graphics();
      this.drawButtonCell(gfx, bx, by, btnSize, i, false);

      const hit = this.add.rectangle(bx, by, btnSize, btnSize, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.onButtonClick(i));
      hit.on('pointerover', () => {
        if (!this.isPaused && !this.isLocked) {
          this.drawButtonCell(gfx, bx, by, btnSize, i, true);
        }
      });
      hit.on('pointerout', () => {
        this.drawButtonCell(gfx, bx, by, btnSize, i, false);
      });

      this.buttonObjects.push({ gfx, hit, bx, by, typeIdx: i });
    }
  }

  drawButtonCell(gfx, cx, cy, size, typeIdx, hovered) {
    gfx.clear();
    const tc = this.typeColors[typeIdx];
    const half = size / 2 - 1;

    // Border
    const borderAlpha = hovered ? tc.alpha * 0.9 : tc.alpha * 0.5;
    const borderWidth = hovered ? 2 : 1;
    gfx.lineStyle(borderWidth, tc.color, borderAlpha);
    gfx.strokeRect(cx - half, cy - half, half * 2, half * 2);

    // Background
    gfx.fillStyle(tc.color, hovered ? tc.alpha * 0.2 : tc.alpha * 0.1);
    gfx.fillRect(cx - half, cy - half, half * 2, half * 2);

    // Shape
    this.drawShape(gfx, SHAPE_NAMES[typeIdx], cx, cy, size * 0.22, tc.color, tc.alpha);
  }

  // --- Update flood highlight: brighter borders for flood region cells ---
  updateFloodHighlight() {
    for (const obj of this.cellObjects) {
      const key = `${obj.r},${obj.c}`;
      const typeIdx = this.grid[obj.r][obj.c];
      const tc = this.typeColors[typeIdx];
      const inFlood = this.floodRegion.has(key);

      obj.gfx.clear();
      const half = this.cellSize / 2 - 1;

      // Background
      const bgAlpha = inFlood ? tc.alpha * 0.45 : tc.alpha * 0.3;
      obj.gfx.fillStyle(tc.color, bgAlpha);
      obj.gfx.fillRect(obj.cx - half, obj.cy - half, half * 2, half * 2);

      // Border — flood region gets white highlight
      if (inFlood) {
        obj.gfx.lineStyle(1.5, COLORS.WHITE, 0.25);
      } else {
        obj.gfx.lineStyle(1, tc.color, tc.alpha * 0.5);
      }
      obj.gfx.strokeRect(obj.cx - half, obj.cy - half, half * 2, half * 2);

      // Shape
      this.drawShape(obj.gfx, SHAPE_NAMES[typeIdx], obj.cx, obj.cy, this.cellSize * 0.25, tc.color, tc.alpha);
    }
  }

  // --- Button click: flood with chosen type ---
  onButtonClick(typeIdx) {
    if (this.isPaused || this.isLocked || this.gameEnded) return;

    // Get the current type of the flood region
    const firstKey = this.floodRegion.values().next().value;
    const [fr, fc] = firstKey.split(',').map(Number);
    const currentType = this.grid[fr][fc];

    // Clicking the same type as current flood = no-op
    if (typeIdx === currentType) return;

    this.movesUsed++;
    const prevSize = this.floodRegion.size;

    // Change all flood region cells to the new type
    const newGrid = this.grid.map(row => [...row]);
    for (const key of this.floodRegion) {
      const [r, c] = key.split(',').map(Number);
      newGrid[r][c] = typeIdx;
    }
    this.grid = newGrid;

    // Expand flood into newly adjacent same-type cells
    this.expandFlood(typeIdx);

    const newSize = this.floodRegion.size;
    const expanded = newSize > prevSize;

    // Record trial: Hit if flood expanded, Miss if wasted move
    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, expanded);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    if (expanded) {
      SynthSounds.score();
      // Animate newly absorbed cells
      this.animateFloodWave(prevSize);
    } else {
      SynthSounds.miss();
    }

    // Redraw grid
    this.updateFloodHighlight();

    // Check win/lose
    const totalCells = this.gridSize * this.gridSize;
    if (this.floodRegion.size >= totalCells) {
      // Win!
      this.time.delayedCall(300, () => {
        if (!this.scene.isActive()) return;
        this.nextLevel();
      });
    } else if (this.movesUsed >= this.maxMoves) {
      // Out of moves
      this.time.delayedCall(300, () => {
        if (!this.scene.isActive()) return;
        this.endGame(false);
      });
    }
  }

  // --- Animate newly absorbed cells with a wave effect ---
  animateFloodWave(prevSize) {
    let idx = 0;
    for (const key of this.floodRegion) {
      if (idx >= prevSize) {
        const [r, c] = key.split(',').map(Number);
        const obj = this.cellObjects.find(o => o.r === r && o.c === c);
        if (obj) {
          GameVFX.flash(this, obj.cx, obj.cy, this.cellSize - 2, this.cellSize - 2, 200);
        }
      }
      idx++;
    }
  }

  // --- Fellow eye alpha update ---
  updateFellowEyeAlpha(alpha) {
    this.alphaA = alpha;
    this.typeColors = this.buildTypeColors();
  }

  // --- Pause ---
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

  // --- Level progression ---
  nextLevel() {
    this.level++;
    this.isLocked = true;

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
        this.resetForNextLevel();
      },
    });
  }

  resetForNextLevel() {
    // Destroy existing cell objects
    for (const obj of this.cellObjects) {
      if (obj.gfx) obj.gfx.destroy();
    }
    this.cellObjects = [];

    // Increase difficulty: reduce max moves
    this.maxMoves = Math.max(18, this.maxMoves - 1);

    // Reset moves
    this.movesUsed = 0;

    // Rebuild grid
    this.grid = this.buildGrid();
    this.floodRegion = new Set();
    this.expandFlood(this.grid[0][0]);

    this.renderGrid();
    this.updateFloodHighlight();
    this.isLocked = false;
  }

  // --- End game ---
  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.safetyTimer.stop();

    const totalCells = this.gridSize * this.gridSize;
    const result = {
      game: 'colorflood',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.floodRegion.size,
      total_spawned: totalCells,
      hit_rate: totalCells > 0
        ? Math.round((this.floodRegion.size / totalCells) * 100) / 100
        : 0,
      moves: this.movesUsed,
      max_moves: this.maxMoves,
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

  // --- Update loop ---
  update() {
    if (!this.safetyTimer) return;

    // HUD update
    const movesRemaining = this.maxMoves - this.movesUsed;
    if (this.hud) {
      GameVisuals.updateHUD(
        this.hud,
        this.level,
        this.safetyTimer.getElapsedMs(),
        `${movesRemaining} ходов`,
      );
    }
  }

  // --- Cleanup ---
  shutdown() {
    EventBus.removeListener('start-colorflood-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
  }
}
