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

const TILE_SIZE = 60;
const TILE_GAP = 10;

// Grid configs per speed: { cols, rows }
const GRID_CONFIG = {
  slow: { cols: 4, rows: 3 },
  normal: { cols: 4, rows: 4 },
  fast: { cols: 5, rows: 4 },
  pro: { cols: 6, rows: 4 },
};

// Symbols drawn as simple shapes: 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'heart'
const SYMBOL_TYPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'];

// How long (ms) a mismatched pair stays face-up before flipping back
const MISMATCH_SHOW_MS = 900;

// How long tiles are shown face-up at start before flipping face-down
const PREVIEW_MS = 2000;

export default class MemoryTilesGameScene extends Phaser.Scene {
  constructor() {
    super('MemoryTilesGameScene');
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

    EventBus.on('start-memorytiles-game', this.startGameHandler);
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
    this.colorA = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.colorB = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.alphaA = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.alphaB = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    this.level = 1;
    const gridConfig = GRID_CONFIG[this.settings.speed] || GRID_CONFIG.normal;
    this.cols = gridConfig.cols;
    this.rows = gridConfig.rows;
    this.totalPairs = (this.cols * this.rows) / 2;

    // Frame
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Score / moves
    this.pairsMatched = 0;
    this.moves = 0;
    this.movesText = GameVisuals.scoreText(this, fx + 10, fy + 28, 'Ходы: 0', 0);

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Build shuffled tile data
    this.tileData = this.buildTileData();

    // Render grid
    this.tileObjects = [];
    this.renderGrid();

    // Flip state
    this.flippedTiles = [];    // indices of currently face-up (unmatched) tiles
    this.isLocked = true;      // locked during preview

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = false;
    this.pauseOverlay = null;
    this.gameEnded = false;

    // Tab blur → auto-pause (store reference for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;

    // Show all tiles face-up for PREVIEW_MS, then countdown, then start
    this.showAllTilesFaceUp();
    this.time.delayedCall(PREVIEW_MS, () => {
      if (!this.scene.isActive()) return;
      this.hideAllTilesFaceDown();
      GameVFX.countdown(this, ccx, ccy, () => {
        if (!this.scene.isActive()) return;
        this.isLocked = false;
        this.input.setDefaultCursor('none');
        this.safetyTimer.start();
      });
    });
  }

  showAllTilesFaceUp() {
    for (let i = 0; i < this.tileData.length; i++) {
      const data = this.tileData[i];
      const obj = this.tileObjects[i];
      obj.back.setVisible(false);
      obj.front.setVisible(true);
      const color = data.isColorA ? this.colorA : this.colorB;
      const alpha = data.isColorA ? this.alphaA : this.alphaB;
      this.drawSymbol(obj.front, data.symbol, obj.tx, obj.ty, color, alpha);
    }
  }

  hideAllTilesFaceDown() {
    for (let i = 0; i < this.tileData.length; i++) {
      const obj = this.tileObjects[i];
      obj.front.setVisible(false);
      obj.front.clear();
      obj.back.setVisible(true);
      obj.back.setStrokeStyle(1, COLORS.GRAY);
    }
  }

  buildTileData() {
    const total = this.cols * this.rows;
    const pairs = total / 2;

    // Cycle through symbols if more pairs than symbol types
    const symbols = [];
    for (let i = 0; i < pairs; i++) {
      symbols.push(SYMBOL_TYPES[i % SYMBOL_TYPES.length]);
    }

    // Each pair: tile A (colorA) and tile B (colorB)
    const tiles = [];
    symbols.forEach((symbol, pairIndex) => {
      tiles.push({ symbol, pairIndex, isColorA: true, flipped: false, matched: false });
      tiles.push({ symbol, pairIndex, isColorA: false, flipped: false, matched: false });
    });

    // Shuffle using Fisher-Yates (produces new array, no mutation of original)
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  }

  renderGrid() {
    const gridW = this.cols * (TILE_SIZE + TILE_GAP) - TILE_GAP;
    const gridH = this.rows * (TILE_SIZE + TILE_GAP) - TILE_GAP;
    const startX = this.field.x + (this.field.w - gridW) / 2 + TILE_SIZE / 2;
    const startY = this.field.y + (this.field.h - gridH) / 2 + TILE_SIZE / 2 + 15;

    for (let i = 0; i < this.tileData.length; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const tx = startX + col * (TILE_SIZE + TILE_GAP);
      const ty = startY + row * (TILE_SIZE + TILE_GAP);

      const tileObj = this.createTileObject(tx, ty, i);
      this.tileObjects.push(tileObj);
    }
  }

  createTileObject(tx, ty, index) {
    // Subtle glow backdrop for each tile slot (drawn below back face)
    const tileGlow = this.add.graphics();
    tileGlow.fillStyle(COLORS.GRAY, 0.04);
    tileGlow.fillRoundedRect(tx - TILE_SIZE / 2 - 4, ty - TILE_SIZE / 2 - 4, TILE_SIZE + 8, TILE_SIZE + 8, 8);

    // Back face (gray, both eyes) — plain rect for setVisible/setStrokeStyle compatibility
    const back = this.add.rectangle(tx, ty, TILE_SIZE - 4, TILE_SIZE - 4, COLORS.GRAY, 0.3)
      .setStrokeStyle(1, COLORS.GRAY);

    // Front face graphics (hidden until flipped)
    const front = this.add.graphics();
    front.setVisible(false);

    // Hit area for clicks
    const hitArea = this.add.rectangle(tx, ty, TILE_SIZE - 4, TILE_SIZE - 4, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => {
      if (!this.isPaused && !this.isLocked) {
        this.onTileClick(index);
      }
    });
    // Hover highlight
    hitArea.on('pointerover', () => {
      if (!this.tileData[index].flipped && !this.tileData[index].matched) {
        back.setStrokeStyle(2, COLORS.WHITE);
      }
    });
    hitArea.on('pointerout', () => {
      if (!this.tileData[index].flipped && !this.tileData[index].matched) {
        back.setStrokeStyle(1, COLORS.GRAY);
      }
    });

    return { back, front, hitArea, tx, ty };
  }

  drawSymbol(graphics, symbol, x, y, color, alpha) {
    graphics.clear();
    graphics.fillStyle(color, alpha);
    graphics.lineStyle(2, color, alpha);

    const s = TILE_SIZE * 0.3;

    switch (symbol) {
      case 'circle':
        graphics.fillCircle(x, y, s);
        break;
      case 'square':
        graphics.fillRect(x - s, y - s, s * 2, s * 2);
        break;
      case 'triangle': {
        const pts = [
          { x: x, y: y - s },
          { x: x + s, y: y + s },
          { x: x - s, y: y + s },
        ];
        graphics.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        break;
      }
      case 'star': {
        const outerR = s;
        const innerR = s * 0.45;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          points.push({ x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r });
        }
        graphics.fillPoints(points, true);
        break;
      }
      case 'diamond':
        graphics.fillTriangle(x, y - s, x + s, y, x - s, y);
        graphics.fillTriangle(x, y + s, x + s, y, x - s, y);
        break;
      case 'heart': {
        // Approximation: two circles + triangle
        const r = s * 0.55;
        graphics.fillCircle(x - r * 0.5, y - r * 0.2, r);
        graphics.fillCircle(x + r * 0.5, y - r * 0.2, r);
        graphics.fillTriangle(x - s * 0.9, y + r * 0.4, x + s * 0.9, y + r * 0.4, x, y + s);
        break;
      }
      default:
        graphics.fillCircle(x, y, s);
    }
  }

  onTileClick(index) {
    const data = this.tileData[index];
    if (data.matched || data.flipped) return;

    // Flip tile face-up
    this.flipTileFaceUp(index);

    this.flippedTiles.push(index);

    if (this.flippedTiles.length === 2) {
      this.moves++;
      this.movesText.setText(`Ходы: ${this.moves}`);
      this.checkMatch();
    }
  }

  flipTileFaceUp(index) {
    const data = this.tileData[index];
    const obj = this.tileObjects[index];

    // Immutably update tileData entry
    this.tileData[index] = { ...data, flipped: true };

    obj.back.setVisible(false);
    obj.front.setVisible(true);

    const color = data.isColorA ? this.colorA : this.colorB;
    const alpha = data.isColorA ? this.alphaA : this.alphaB;
    this.drawSymbol(obj.front, data.symbol, obj.tx, obj.ty, color, alpha);

    // Brief scale pop
    this.tweens.add({
      targets: obj.hitArea,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 80,
      yoyo: true,
    });
  }

  flipTileFaceDown(index) {
    const data = this.tileData[index];
    const obj = this.tileObjects[index];

    this.tileData[index] = { ...data, flipped: false };

    obj.front.setVisible(false);
    obj.front.clear();
    obj.back.setVisible(true);
    obj.back.setStrokeStyle(1, COLORS.GRAY);
  }

  checkMatch() {
    const [idxA, idxB] = this.flippedTiles;
    const dA = this.tileData[idxA];
    const dB = this.tileData[idxB];

    if (dA.symbol === dB.symbol) {
      // Match!
      SynthSounds.score();
      this.pairsMatched++;
      if (this.hud) this.hud.scoreText.setText(`★ ${this.pairsMatched}/${this.totalPairs}`);

      // White flash on both tiles, then remove
      this.time.delayedCall(120, () => {
        if (!this.scene.isActive()) return;
        [idxA, idxB].forEach((idx) => {
          const obj = this.tileObjects[idx];
          GameVFX.flash(this, obj.tx, obj.ty, TILE_SIZE - 4, TILE_SIZE - 4, 200);
          obj.front.setVisible(false);
          obj.front.clear();
          obj.back.setVisible(false);
          obj.hitArea.disableInteractive();
          // Immutable update
          this.tileData[idx] = { ...this.tileData[idx], matched: true, flipped: false };
        });

        this.flippedTiles = [];
        this.isLocked = false;

        if (this.pairsMatched >= this.totalPairs) {
          this.nextLevel();
        }
      });

      this.isLocked = true;
    } else {
      // Mismatch — show briefly then flip back
      this.isLocked = true;
      this.time.delayedCall(MISMATCH_SHOW_MS, () => {
        if (!this.scene.isActive()) return;
        SynthSounds.miss();
        [idxA, idxB].forEach((idx) => this.flipTileFaceDown(idx));
        this.flippedTiles = [];
        this.isLocked = false;
      });
    }
  }

  shutdown() {
    EventBus.removeListener('start-memorytiles-game', this.startGameHandler);
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
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `★ ${this.pairsMatched}/${this.totalPairs}`);
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
    // Destroy existing tile objects
    for (const obj of this.tileObjects) {
      obj.back.destroy();
      obj.front.destroy();
      obj.hitArea.destroy();
    }
    this.tileObjects = [];

    // Increase grid: add one pair (bump cols if cols <= rows, else bump rows)
    if (this.cols <= this.rows) {
      this.cols += 1;
    } else {
      this.rows += 1;
    }
    // Ensure total tiles remains even
    if ((this.cols * this.rows) % 2 !== 0) {
      this.rows += 1;
    }

    this.totalPairs = (this.cols * this.rows) / 2;
    this.pairsMatched = 0;
    this.flippedTiles = [];
    if (this.hud) this.hud.scoreText.setText(`★ ${this.pairsMatched}/${this.totalPairs}`);

    // Rebuild tile data and grid
    this.tileData = this.buildTileData();
    this.renderGrid();

    // Show all face-up briefly, then flip down and unlock
    this.showAllTilesFaceUp();
    this.time.delayedCall(PREVIEW_MS, () => {
      if (!this.scene.isActive()) return;
      this.hideAllTilesFaceDown();
      this.isLocked = false;
    });
  }

  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.safetyTimer.stop();

    const result = {
      game: 'memorytiles',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.pairsMatched,
      total_spawned: this.totalPairs,
      hit_rate: this.totalPairs > 0
        ? Math.round((this.pairsMatched / this.totalPairs) * 100) / 100
        : 0,
      moves: this.moves,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      level: this.level,
      completed: won,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
