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

const GRID_SIZE = 4;
const TILE_SPACING = 8;
const TWEEN_SPEED = 100;
const SWIPE_THRESHOLD = 30;
const SWIPE_MAX_TIME = 800;

// Tile value → display label
const TILE_LABELS: Record<number, string> = {
  1: '2', 2: '4', 3: '8', 4: '16', 5: '32', 6: '64',
  7: '128', 8: '256', 9: '512', 10: '1024', 11: '2048',
};

// Background colors for tiles (gray-scale, visible to both eyes)
const TILE_BG_ALPHA: Record<number, number> = {
  1: 0.15, 2: 0.20, 3: 0.25, 4: 0.30, 5: 0.35, 6: 0.40,
  7: 0.45, 8: 0.50, 9: 0.55, 10: 0.60, 11: 0.70,
};

// Odd powers of 2 (2,8,32,128,512) → colorA (e.g. RED eye)
// Even powers of 2 (4,16,64,256,1024,2048) → colorB (e.g. CYAN eye)
function isOddPower(tileValue: number): boolean {
  // tileValue 1=2^1, 2=2^2, 3=2^3, etc.
  return tileValue % 2 === 1;
}

interface CellData {
  readonly tileValue: number;
  readonly canUpgrade: boolean;
}

interface TileSprite {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export default class Game2048Scene extends Phaser.Scene {
  constructor() {
    super('Game2048Scene');
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

    EventBus.on('start-game2048-game', this.startGameHandler);
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

    // Background + border
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Compute grid dimensions (square tiles within field)
    const availW = fw - 40;
    const availH = fh - 80;
    const maxCellSize = Math.min(
      (availW - (GRID_SIZE + 1) * TILE_SPACING) / GRID_SIZE,
      (availH - (GRID_SIZE + 1) * TILE_SPACING) / GRID_SIZE
    );
    this.cellSize = Math.floor(maxCellSize);
    const gridW = this.cellSize * GRID_SIZE + TILE_SPACING * (GRID_SIZE + 1);
    const gridH = gridW;
    this.gridX = fx + (fw - gridW) / 2;
    this.gridY = fy + (fh - gridH) / 2 + 15;

    // Draw grid background
    const gridBg = this.add.graphics();
    gridBg.fillStyle(COLORS.GRAY, 0.12);
    gridBg.fillRoundedRect(this.gridX, this.gridY, gridW, gridH, 6);

    // Draw empty cell slots
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const { x: cx, y: cy } = this.cellCenter(r, c);
        const slot = this.add.graphics();
        slot.fillStyle(COLORS.GRAY, 0.06);
        slot.fillRoundedRect(cx - this.cellSize / 2, cy - this.cellSize / 2, this.cellSize, this.cellSize, 4);
      }
    }

    // Game state
    this.score = 0;
    this.mergeCount = 0;
    this.moveCount = 0;
    this.canMove = false;
    this.movingTiles = 0;
    this.gameEnded = false;
    this.isPaused = false;
    this.pauseOverlay = null;

    // Initialize grid (immutable 2D array of CellData)
    this.grid = [];
    this.tileSprites = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      this.tileSprites[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.grid[r][c] = { tileValue: 0, canUpgrade: true };
        this.tileSprites[r][c] = null;
      }
    }

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    // Input: keyboard
    this.input.keyboard.on('keydown', this.handleKey, this);

    // Input: swipe (touch/mouse)
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Tab blur → auto-pause
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Countdown then start
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVFX.countdown(this, ccx, ccy, () => {
      if (!this.scene.isActive()) return;
      this.safetyTimer.start();
      this.addTile();
      this.addTile();
      this.canMove = true;
    });
  }

  cellCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridX + TILE_SPACING + col * (this.cellSize + TILE_SPACING) + this.cellSize / 2,
      y: this.gridY + TILE_SPACING + row * (this.cellSize + TILE_SPACING) + this.cellSize / 2,
    };
  }

  getTileColor(tileValue: number): { color: number; alpha: number } {
    if (isOddPower(tileValue)) {
      return { color: this.colorA, alpha: this.alphaA };
    }
    return { color: this.colorB, alpha: this.alphaB };
  }

  createTileSprite(row: number, col: number, tileValue: number): TileSprite {
    const { x, y } = this.cellCenter(row, col);
    const { color, alpha } = this.getTileColor(tileValue);
    const bgAlpha = TILE_BG_ALPHA[tileValue] ?? 0.3;

    const bg = this.add.rectangle(x, y, this.cellSize - 4, this.cellSize - 4, color, alpha * bgAlpha)
      .setStrokeStyle(2, color, alpha * 0.6);

    const labelText = TILE_LABELS[tileValue] ?? String(Math.pow(2, tileValue));
    const fontSize = tileValue >= 10 ? '16px' : tileValue >= 7 ? '20px' : '26px';

    const label = this.add.text(x, y, labelText, {
      fontSize,
      color: `rgba(${color === this.colorA ? '255,0,0' : '0,255,255'},${alpha})`,
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Spawn animation
    bg.setScale(0);
    label.setScale(0);
    this.tweens.add({
      targets: [bg, label],
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: 'Back.easeOut',
    });

    return { bg, label };
  }

  destroyTileSprite(row: number, col: number) {
    const sprite = this.tileSprites[row][col];
    if (sprite) {
      sprite.bg.destroy();
      sprite.label.destroy();
      this.tileSprites[row][col] = null;
    }
  }

  updateTileSpriteVisual(row: number, col: number) {
    const tileValue = this.grid[row][col].tileValue;
    if (tileValue === 0) return;

    const sprite = this.tileSprites[row][col];
    if (!sprite) return;

    const { color, alpha } = this.getTileColor(tileValue);
    const bgAlpha = TILE_BG_ALPHA[tileValue] ?? 0.3;
    const labelText = TILE_LABELS[tileValue] ?? String(Math.pow(2, tileValue));
    const fontSize = tileValue >= 10 ? '16px' : tileValue >= 7 ? '20px' : '26px';

    sprite.bg.setFillStyle(color, alpha * bgAlpha);
    sprite.bg.setStrokeStyle(2, color, alpha * 0.6);

    // Update text color — build hex string from the eye color
    const colorHex = color === this.colorA
      ? `rgba(255,0,0,${alpha})`
      : `rgba(0,255,255,${alpha})`;
    sprite.label.setStyle({ fontSize, color: colorHex, fontStyle: 'bold' });
    sprite.label.setText(labelText);
  }

  addTile() {
    const emptyTiles = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].tileValue === 0) {
          emptyTiles.push({ row: r, col: c });
        }
      }
    }
    if (emptyTiles.length === 0) return;

    const chosen = Phaser.Utils.Array.GetRandom(emptyTiles);
    // 90% chance of 2 (value=1), 10% chance of 4 (value=2)
    const newValue = Math.random() < 0.9 ? 1 : 2;
    this.grid[chosen.row][chosen.col] = { tileValue: newValue, canUpgrade: true };
    this.tileSprites[chosen.row][chosen.col] = this.createTileSprite(chosen.row, chosen.col, newValue);
  }

  handleKey(e: KeyboardEvent) {
    if (this.isPaused) return;

    // ESC to toggle pause
    if (e.code === 'Escape') {
      this.togglePause();
      return;
    }

    if (!this.canMove) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.handleMove(0, -1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.handleMove(0, 1);
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.handleMove(-1, 0);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.handleMove(1, 0);
        break;
    }
  }

  onPointerDown(pointer: Phaser.Input.Pointer) {
    this.swipeStart = { x: pointer.x, y: pointer.y, time: pointer.downTime };
  }

  onPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.swipeStart || this.isPaused || !this.canMove) return;

    const dx = pointer.x - this.swipeStart.x;
    const dy = pointer.y - this.swipeStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = pointer.upTime - this.swipeStart.time;

    if (dist < SWIPE_THRESHOLD || elapsed > SWIPE_MAX_TIME) return;

    const angle = Math.atan2(dy, dx);
    // Determine direction from angle
    if (Math.abs(angle) < Math.PI / 4) {
      this.handleMove(0, 1); // right
    } else if (Math.abs(angle) > 3 * Math.PI / 4) {
      this.handleMove(0, -1); // left
    } else if (angle < 0) {
      this.handleMove(-1, 0); // up
    } else {
      this.handleMove(1, 0); // down
    }

    this.swipeStart = null;
  }

  handleMove(deltaRow: number, deltaCol: number) {
    this.canMove = false;
    let somethingMoved = false;
    this.movingTiles = 0;
    let moveScore = 0;
    let mergedThisMove = false;

    // Reset canUpgrade for all cells (immutable update)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.grid[r][c] = { ...this.grid[r][c], canUpgrade: true };
      }
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const colToWatch = deltaCol === 1 ? (GRID_SIZE - 1) - j : j;
        const rowToWatch = deltaRow === 1 ? (GRID_SIZE - 1) - i : i;
        const tileValue = this.grid[rowToWatch][colToWatch].tileValue;

        if (tileValue === 0) continue;

        let colSteps = deltaCol;
        let rowSteps = deltaRow;

        // Slide as far as possible into empty cells
        while (
          this.isInsideBoard(rowToWatch + rowSteps, colToWatch + colSteps) &&
          this.grid[rowToWatch + rowSteps][colToWatch + colSteps].tileValue === 0
        ) {
          colSteps += deltaCol;
          rowSteps += deltaRow;
        }

        // Check if we can merge
        if (
          this.isInsideBoard(rowToWatch + rowSteps, colToWatch + colSteps) &&
          this.grid[rowToWatch + rowSteps][colToWatch + colSteps].tileValue === tileValue &&
          this.grid[rowToWatch + rowSteps][colToWatch + colSteps].canUpgrade &&
          this.grid[rowToWatch][colToWatch].canUpgrade
        ) {
          // Merge
          const newVal = tileValue + 1;
          this.grid[rowToWatch + rowSteps][colToWatch + colSteps] = { tileValue: newVal, canUpgrade: false };
          this.grid[rowToWatch][colToWatch] = { tileValue: 0, canUpgrade: true };
          moveScore += Math.pow(2, newVal);
          mergedThisMove = true;

          this.animateTileMove(
            rowToWatch, colToWatch,
            rowToWatch + rowSteps, colToWatch + colSteps,
            Math.abs(rowSteps + colSteps),
            true
          );
          somethingMoved = true;
        } else {
          // Slide without merge
          colSteps -= deltaCol;
          rowSteps -= deltaRow;

          if (colSteps !== 0 || rowSteps !== 0) {
            this.grid[rowToWatch + rowSteps][colToWatch + colSteps] = { tileValue, canUpgrade: this.grid[rowToWatch][colToWatch].canUpgrade };
            this.grid[rowToWatch][colToWatch] = { tileValue: 0, canUpgrade: true };

            this.animateTileMove(
              rowToWatch, colToWatch,
              rowToWatch + rowSteps, colToWatch + colSteps,
              Math.abs(rowSteps + colSteps),
              false
            );
            somethingMoved = true;
          }
        }
      }
    }

    if (!somethingMoved) {
      this.canMove = true;
      return;
    }

    this.moveCount++;
    SynthSounds.move();

    // Record trial for contrastEngine
    if (mergedThisMove) {
      this.mergeCount++;
      this.contrastState = recordTrial(this.contrastState, this.contrastConfig, true);
    } else {
      this.contrastState = recordTrial(this.contrastState, this.contrastConfig, false);
    }
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    this.score += moveScore;

    // If no animations are pending (shouldn't happen, but safety), finalize
    if (this.movingTiles === 0) {
      this.finalizeTurn();
    }
  }

  animateTileMove(fromRow: number, fromCol: number, toRow: number, toCol: number, distance: number, isMerge: boolean) {
    this.movingTiles++;
    const sprite = this.tileSprites[fromRow][fromCol];
    if (!sprite) {
      this.movingTiles--;
      return;
    }

    // Clear the source slot
    this.tileSprites[fromRow][fromCol] = null;

    const { x: targetX, y: targetY } = this.cellCenter(toRow, toCol);

    this.tweens.add({
      targets: [sprite.bg, sprite.label],
      x: targetX,
      y: targetY,
      duration: TWEEN_SPEED * distance,
      ease: 'Power1',
      onComplete: () => {
        this.movingTiles--;

        if (isMerge) {
          // Destroy the moving sprite
          sprite.bg.destroy();
          sprite.label.destroy();

          // Destroy existing sprite at destination (the one that was already there)
          this.destroyTileSprite(toRow, toCol);

          // Create new merged tile
          const newValue = this.grid[toRow][toCol].tileValue;
          this.tileSprites[toRow][toCol] = this.createTileSprite(toRow, toCol, newValue);

          // Merge pop animation
          const mergedSprite = this.tileSprites[toRow][toCol];
          if (mergedSprite) {
            // Override spawn anim with pop
            this.tweens.killTweensOf(mergedSprite.bg);
            this.tweens.killTweensOf(mergedSprite.label);
            mergedSprite.bg.setScale(1);
            mergedSprite.label.setScale(1);

            this.tweens.add({
              targets: [mergedSprite.bg, mergedSprite.label],
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 80,
              yoyo: true,
              ease: 'Quad.easeOut',
            });
          }

          SynthSounds.score();

          // Score popup
          const { x, y } = this.cellCenter(toRow, toCol);
          GameVFX.scorePopup(this, x, y - this.cellSize / 2, `+${Math.pow(2, newValue)}`);
        } else {
          // Just place sprite at new location
          this.tileSprites[toRow][toCol] = sprite;
        }

        if (this.movingTiles === 0) {
          this.finalizeTurn();
        }
      },
    });
  }

  finalizeTurn() {
    // Sync all sprite positions and visuals to grid state
    this.syncSprites();
    this.addTile();

    // Check game over
    if (!this.hasMovesLeft()) {
      this.endGame();
      return;
    }

    this.canMove = true;
  }

  syncSprites() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = this.grid[r][c].tileValue;
        const sprite = this.tileSprites[r][c];

        if (val === 0 && sprite) {
          this.destroyTileSprite(r, c);
        } else if (val > 0 && sprite) {
          const { x, y } = this.cellCenter(r, c);
          sprite.bg.setPosition(x, y);
          sprite.label.setPosition(x, y);
          this.updateTileSpriteVisual(r, c);
        }
      }
    }
  }

  isInsideBoard(row: number, col: number): boolean {
    return row >= 0 && col >= 0 && row < GRID_SIZE && col < GRID_SIZE;
  }

  hasMovesLeft(): boolean {
    // Check for any empty cell
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].tileValue === 0) return true;
      }
    }
    // Check for any adjacent same-value tiles
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = this.grid[r][c].tileValue;
        if (c < GRID_SIZE - 1 && this.grid[r][c + 1].tileValue === val) return true;
        if (r < GRID_SIZE - 1 && this.grid[r + 1][c].tileValue === val) return true;
      }
    }
    return false;
  }

  updateFellowEyeAlpha(alpha: number) {
    this.alphaA = alpha;
    // Refresh all tile visuals with new alpha
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].tileValue > 0 && this.tileSprites[r][c]) {
          this.updateTileSpriteVisual(r, c);
        }
      }
    }
  }

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
    quitBtn.on('pointerup', () => this.endGame());

    this.pauseOverlay = [bg, title, resumeBtn, resumeText, quitBtn, quitText];
  }

  update() {
    if (!this.safetyTimer) return;

    // HUD update
    if (this.hud) {
      GameVisuals.updateHUD(
        this.hud,
        1, // 2048 has no levels — always "1"
        this.safetyTimer.getElapsedMs(),
        `${this.score}`
      );
    }
  }

  endGame() {
    if (this.gameEnded) return;
    this.gameEnded = true;

    if (this.safetyTimer) this.safetyTimer.stop();

    // Find highest tile on the board
    let maxTileValue = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].tileValue > maxTileValue) {
          maxTileValue = this.grid[r][c].tileValue;
        }
      }
    }

    const result = {
      game: 'game2048',
      timestamp: new Date().toISOString(),
      duration_s: Math.round((this.safetyTimer?.getElapsedMs() ?? 0) / 1000),
      caught: this.mergeCount,
      total_spawned: this.moveCount,
      hit_rate: this.moveCount > 0
        ? Math.round((this.mergeCount / this.moveCount) * 100) / 100
        : 0,
      score: this.score,
      max_tile: Math.pow(2, maxTileValue),
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      completed: maxTileValue >= 11, // reached 2048
      fellow_contrast_start: this.settings?.fellowEyeContrast ?? 30,
      fellow_contrast_end: this.contrastState.fellowEyeContrast,
      window_accuracy: getAccuracy(this.contrastState),
      total_trials: this.contrastState.totalTrials,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }

  shutdown() {
    EventBus.removeListener('start-game2048-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    if (this.input.keyboard) this.input.keyboard.off('keydown', this.handleKey, this);
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointerup', this.onPointerUp, this);
  }
}
