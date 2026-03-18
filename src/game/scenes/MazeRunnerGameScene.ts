// @ts-nocheck

import { COLORS, GAME } from '../../modules/constants';
import {
    createContrastConfig,
    createContrastState,
    getAccuracy,
    recordTrial,
} from '../../modules/contrastEngine';
import { createGameSettings } from '../../modules/gameState';
import { getEyeColors } from '../../modules/glassesColors';
import { t } from '../../modules/i18n';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { SynthSounds } from '../audio/SynthSounds';
import { EventBus } from '../EventBus';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';
import { TouchControls } from '../vfx/TouchControls';

// --- Maze grid sizes by speed setting ---
const MAZE_SIZES = {
    slow: 7,
    normal: 9,
    fast: 11,
    pro: 13,
};

const COIN_COUNTS = {
    slow: 3,
    normal: 5,
    fast: 7,
    pro: 10,
};

const PLAYER_SPEEDS = { slow: 3, normal: 4, fast: 5, pro: 6 };

const COIN_SCORE = 10;
const LEVEL_CLEAR_BONUS = 50;
const TRAIL_ALPHA = 0.12;
const TRAIL_RADIUS_RATIO = 0.15;

// Direction vectors
const DIR_VECS = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, -1],
    down: [0, 1],
    none: [0, 0],
};

// --- Maze generation: Recursive Backtracker (DFS) ---

function generateMaze(cols, rows) {
    // Grid of cells — each cell tracks walls: { top, right, bottom, left, visited }
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push({
                top: true,
                right: true,
                bottom: true,
                left: true,
                visited: false,
            });
        }
        grid.push(row);
    }

    const stack = [];
    const startR = 0;
    const startC = 0;
    grid[startR][startC].visited = true;
    stack.push({ r: startR, c: startC });

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(
            grid,
            current.r,
            current.c,
            rows,
            cols,
        );

        if (neighbors.length > 0) {
            const next =
                neighbors[Math.floor(Math.random() * neighbors.length)];
            removeWall(grid, current.r, current.c, next.r, next.c);
            grid[next.r][next.c].visited = true;
            stack.push(next);
        } else {
            stack.pop();
        }
    }

    return grid;
}

function getUnvisitedNeighbors(grid, r, c, rows, cols) {
    const neighbors = [];
    if (r > 0 && !grid[r - 1][c].visited) neighbors.push({ r: r - 1, c: c });
    if (r < rows - 1 && !grid[r + 1][c].visited)
        neighbors.push({ r: r + 1, c: c });
    if (c > 0 && !grid[r][c - 1].visited) neighbors.push({ r: r, c: c - 1 });
    if (c < cols - 1 && !grid[r][c + 1].visited)
        neighbors.push({ r: r, c: c + 1 });
    return neighbors;
}

function removeWall(grid, r1, c1, r2, c2) {
    if (r2 === r1 - 1) {
        grid[r1][c1].top = false;
        grid[r2][c2].bottom = false;
    }
    if (r2 === r1 + 1) {
        grid[r1][c1].bottom = false;
        grid[r2][c2].top = false;
    }
    if (c2 === c1 - 1) {
        grid[r1][c1].left = false;
        grid[r2][c2].right = false;
    }
    if (c2 === c1 + 1) {
        grid[r1][c1].right = false;
        grid[r2][c2].left = false;
    }
}

/**
 * Convert cell grid to a 2D wall/path array for rendering.
 * Each maze cell becomes a 2x2 block in the render grid (plus border walls).
 * Render grid size: (2*cols+1) x (2*rows+1)
 *   - Odd coords = cell centers (always path)
 *   - Even coords = walls or passages
 */
function mazeToRenderGrid(grid, mazeCols, mazeRows) {
    const rCols = mazeCols * 2 + 1;
    const rRows = mazeRows * 2 + 1;
    // 0 = path, 1 = wall
    const render = [];
    for (let r = 0; r < rRows; r++) {
        render.push(new Array(rCols).fill(1));
    }

    for (let r = 0; r < mazeRows; r++) {
        for (let c = 0; c < mazeCols; c++) {
            const cell = grid[r][c];
            const rr = r * 2 + 1;
            const rc = c * 2 + 1;
            // Cell center is always a path
            render[rr][rc] = 0;
            // Open passages based on removed walls
            if (!cell.top) render[rr - 1][rc] = 0;
            if (!cell.bottom) render[rr + 1][rc] = 0;
            if (!cell.left) render[rr][rc - 1] = 0;
            if (!cell.right) render[rr][rc + 1] = 0;
        }
    }

    return render;
}

/**
 * Place coins on random path cells, avoiding start and exit.
 */
function placeCoins(renderGrid, rCols, rRows, count, startRC, exitRC) {
    const candidates = [];
    for (let r = 0; r < rRows; r++) {
        for (let c = 0; c < rCols; c++) {
            if (renderGrid[r][c] !== 0) continue;
            if (r === startRC.r && c === startRC.c) continue;
            if (r === exitRC.r && c === exitRC.c) continue;
            candidates.push({ r, c });
        }
    }

    // Shuffle and pick
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = tmp;
    }

    return candidates.slice(0, Math.min(count, candidates.length));
}

// =============================================================

export default class MazeRunnerGameScene extends Phaser.Scene {
    constructor() {
        super('MazeRunnerGameScene');
    }

    create() {
        SynthSounds.resume();

        this.startGameHandler = (settings) => {
            console.log('[MazeRunner] start-mazerunner-game received');
            try {
                this.settings = createGameSettings(settings || {});
                this.startGameplay();
                console.log('[MazeRunner] startGameplay completed OK');
            } catch (err) {
                console.error('[MazeRunner] startGameplay CRASHED:', err);
            }
        };
        this.safetyFinishHandler = () => {
            this.endGame(false);
        };
        this.safetyExtendHandler = () => {
            if (this.safetyTimer?.canExtend()) {
                this.safetyTimer.extend();
                this.isPaused = false;
            }
        };

        EventBus.on('start-mazerunner-game', this.startGameHandler);
        EventBus.on('safety-finish', this.safetyFinishHandler);
        EventBus.on('safety-extend', this.safetyExtendHandler);

        this.events.on('shutdown', this.shutdown, this);

        console.log(
            '[MazeRunner] create() called, emitting current-scene-ready',
        );
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
        this.platformColor = isLeftPlatform
            ? eyeColors.leftColor
            : eyeColors.rightColor;
        this.ballColor = isLeftPlatform
            ? eyeColors.rightColor
            : eyeColors.leftColor;
        this.platformAlpha =
            (isLeftPlatform
                ? this.settings.contrastLeft
                : this.settings.contrastRight) / 100;
        this.ballAlpha =
            (isLeftPlatform
                ? this.settings.contrastRight
                : this.settings.contrastLeft) / 100;

        // Contrast engine
        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        // Game state
        this.level = 1;
        this.score = 0;
        this.coinsCollected = 0;
        this.coinsTotal = 0;
        this.totalBacktracks = 0;
        this.totalExits = 0;
        this.gameEnded = false;
        this.isPaused = false;
        this.isLevelTransition = false;

        // Player speed (cells per second in render grid)
        this.playerSpeed = PLAYER_SPEEDS[this.settings.speed] || 4;

        // Maze size from speed
        this.mazeSize = MAZE_SIZES[this.settings.speed] || 9;
        this.coinCount = COIN_COUNTS[this.settings.speed] || 5;

        // Visual setup
        GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
        GameVisuals.styledBorder(this, fx, fy, fw, fh);

        const crossSize = Math.max(
            fw * GAME.FIXATION_CROSS_RATIO,
            GAME.FIXATION_CROSS_MIN_PX,
        );
        GameVisuals.styledCross(this, fx + fw / 2, fy + fh / 2, crossSize);

        // Build the maze
        this.buildMaze();

        // HUD
        this.hud = GameVisuals.createHUD(this, this.field);

        // Pause button
        const pauseBtn = this.add
            .text(fx + 10, fy + fh - 20, t('game.pause'), {
                fontSize: '14px',
                color: COLORS.GRAY_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setInteractive({ useHandCursor: true });
        pauseBtn.on('pointerup', () => this.togglePause());

        // Coin counter display
        this.coinHudText = this.add
            .text(fx + fw - 8, fy + 28, '', {
                fontSize: '13px',
                color: COLORS.GRAY_HEX,
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
            })
            .setOrigin(1, 0);

        // Touch controls
        this.touchDPad = TouchControls.createDPad(this, this.field);
        this._touchMoveFired = null;

        // Keyboard input (optional — may be null on touch-only devices)
        this.cursors = this.input.keyboard?.createCursorKeys() || null;
        this.wasd = this.input.keyboard
            ? {
                  up: this.input.keyboard.addKey(
                      Phaser.Input.Keyboard.KeyCodes.W,
                  ),
                  down: this.input.keyboard.addKey(
                      Phaser.Input.Keyboard.KeyCodes.S,
                  ),
                  left: this.input.keyboard.addKey(
                      Phaser.Input.Keyboard.KeyCodes.A,
                  ),
                  right: this.input.keyboard.addKey(
                      Phaser.Input.Keyboard.KeyCodes.D,
                  ),
              }
            : null;
        this.escKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ||
            null;

        // Safety timer
        this.safetyTimer = createSafetyTimer({
            onWarning: () =>
                EventBus.emit('safety-timer-warning', { type: 'warning' }),
            onBreak: () =>
                EventBus.emit('safety-timer-warning', { type: 'break' }),
        });

        this.pauseOverlay = null;

        // Tab blur auto-pause
        this.blurHandler = () => {
            if (!this.isPaused) this.togglePause();
        };
        this.game.events.on('blur', this.blurHandler);

        // Countdown then start
        this.isPaused = true;
        const ccx = fx + fw / 2;
        const ccy = fy + fh / 2;
        GameVFX.countdown(this, ccx, ccy, () => {
            this.isPaused = false;
            this.input.setDefaultCursor('none');
            this.safetyTimer.start();
        });
    }

    // --- Maze building ---

    buildMaze() {
        // Clean up previous objects
        if (this.mazeGraphics) this.mazeGraphics.destroy();
        if (this.trailGraphics) this.trailGraphics.destroy();
        if (this.playerObj) this.playerObj.destroy();
        if (this.exitObj) this.exitObj.destroy();
        if (this.coinObjects) this.coinObjects.forEach((c) => c.obj.destroy());

        // Generate procedural maze
        const grid = generateMaze(this.mazeSize, this.mazeSize);
        this.renderGrid = mazeToRenderGrid(grid, this.mazeSize, this.mazeSize);
        this.rCols = this.mazeSize * 2 + 1;
        this.rRows = this.mazeSize * 2 + 1;

        // Cell size to fit render grid in field
        this.cellW = this.field.w / this.rCols;
        this.cellH = this.field.h / this.rRows;
        this.mazeOffsetX = this.field.x;
        this.mazeOffsetY = this.field.y;

        // Draw walls (gray — both eyes)
        this.mazeGraphics = this.add.graphics();
        this.mazeGraphics.fillStyle(COLORS.GRAY, 0.22);

        for (let r = 0; r < this.rRows; r++) {
            for (let c = 0; c < this.rCols; c++) {
                if (this.renderGrid[r][c] === 1) {
                    const px = this.mazeOffsetX + c * this.cellW;
                    const py = this.mazeOffsetY + r * this.cellH;
                    this.mazeGraphics.fillRoundedRect(
                        px + 0.5,
                        py + 0.5,
                        this.cellW - 1,
                        this.cellH - 1,
                        2,
                    );
                }
            }
        }

        // Trail layer (drawn below player)
        this.trailGraphics = this.add.graphics();
        this.visitedCells = new Set();

        // Start position: top-left cell center (row 1, col 1 in render grid)
        this.startRC = { r: 1, c: 1 };
        // Exit position: bottom-right cell center
        this.exitRC = { r: this.rRows - 2, c: this.rCols - 2 };

        // Place coins
        const coinPositions = placeCoins(
            this.renderGrid,
            this.rCols,
            this.rRows,
            this.coinCount + (this.level - 1) * 2, // more coins each level
            this.startRC,
            this.exitRC,
        );
        this.coinObjects = [];
        this.coinsTotal = coinPositions.length;

        for (const pos of coinPositions) {
            const cx = this.cellToX(pos.c);
            const cy = this.cellToY(pos.r);
            const coinRadius = Math.min(this.cellW, this.cellH) * 0.25;
            const obj = GameVisuals.glowCircle(
                this,
                cx,
                cy,
                coinRadius,
                this.ballColor,
                this.ballAlpha,
            );
            GameVisuals.pulse(this, obj, 0.85, 1.15, 700);
            this.coinObjects.push({
                obj,
                col: pos.c,
                row: pos.r,
                active: true,
            });
        }

        // Exit marker (ballColor — other eye, pulsing)
        const exitX = this.cellToX(this.exitRC.c);
        const exitY = this.cellToY(this.exitRC.r);
        const exitSize = Math.min(this.cellW, this.cellH) * 0.35;
        this.exitObj = this.add.graphics();
        this.exitObj.fillStyle(this.ballColor, this.ballAlpha);
        this.exitObj.fillStar(exitX, exitY, 5, exitSize * 0.5, exitSize, 0);
        // Pulsing glow around exit
        this.exitGlow = this.add.circle(
            exitX,
            exitY,
            exitSize * 1.2,
            this.ballColor,
            this.ballAlpha * 0.15,
        );
        GameVisuals.pulse(this, this.exitGlow, 0.7, 1.3, 1000);

        // Player (platformColor — one eye)
        const startX = this.cellToX(this.startRC.c);
        const startY = this.cellToY(this.startRC.r);
        const playerRadius = Math.min(this.cellW, this.cellH) * 0.32;
        this.playerObj = this.add.circle(
            startX,
            startY,
            playerRadius,
            this.platformColor,
            this.platformAlpha,
        );

        // Player state
        this.playerCol = this.startRC.c;
        this.playerRow = this.startRC.r;
        this.playerTargetCol = this.playerCol;
        this.playerTargetRow = this.playerRow;
        this.playerDir = 'none';
        this.playerNextDir = 'none';
        this.playerMoving = false;
        this.playerMoveProgress = 0;

        // Mark starting cell as visited
        this.markVisited(this.playerCol, this.playerRow);

        // Track dead-end backtracks for trial events
        this.lastVisitedCount = 1;

        // Reset coin count for this level
        this.levelCoinsCollected = 0;
    }

    cellToX(col) {
        return this.mazeOffsetX + (col + 0.5) * this.cellW;
    }

    cellToY(row) {
        return this.mazeOffsetY + (row + 0.5) * this.cellH;
    }

    isWalkable(col, row) {
        if (row < 0 || row >= this.rRows || col < 0 || col >= this.rCols)
            return false;
        return this.renderGrid[row][col] === 0;
    }

    markVisited(col, row) {
        const key = `${col},${row}`;
        if (this.visitedCells.has(key)) return;
        this.visitedCells.add(key);

        // Draw trail dot
        const cx = this.cellToX(col);
        const cy = this.cellToY(row);
        const radius = Math.min(this.cellW, this.cellH) * TRAIL_RADIUS_RATIO;
        this.trailGraphics.fillStyle(COLORS.GRAY, TRAIL_ALPHA);
        this.trailGraphics.fillCircle(cx, cy, radius);
    }

    // --- Update loop ---

    shutdown() {
        EventBus.removeListener('start-mazerunner-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        this.input.setDefaultCursor('default');
    }

    update(_time, delta) {
        // Guard: update() can fire before startGameplay() completes
        if (!this.renderGrid) return;

        if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.togglePause();
            return;
        }
        if (this.isPaused || this.gameEnded || this.isLevelTransition) return;

        const dt = delta / 1000;

        this.handleInput();
        this.updatePlayer(dt);
        this.checkCoinCollision();
        this.checkExitReached();

        // HUD
        if (this.safetyTimer && this.hud) {
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                `${this.score}`,
            );
        }
        if (this.coinHudText) {
            this.coinHudText.setText(
                `${this.levelCoinsCollected}/${this.coinsTotal}`,
            );
        }
    }

    handleInput() {
        // Touch D-pad
        const touchUpJust =
            this.touchDPad?.up?.isDown && this._touchMoveFired !== 'up';
        const touchDownJust =
            this.touchDPad?.down?.isDown && this._touchMoveFired !== 'down';
        const touchLeftJust =
            this.touchDPad?.left?.isDown && this._touchMoveFired !== 'left';
        const touchRightJust =
            this.touchDPad?.right?.isDown && this._touchMoveFired !== 'right';
        if (
            !this.touchDPad?.up?.isDown &&
            !this.touchDPad?.down?.isDown &&
            !this.touchDPad?.left?.isDown &&
            !this.touchDPad?.right?.isDown
        ) {
            this._touchMoveFired = null;
        }
        if (touchUpJust) this._touchMoveFired = 'up';
        else if (touchDownJust) this._touchMoveFired = 'down';
        else if (touchLeftJust) this._touchMoveFired = 'left';
        else if (touchRightJust) this._touchMoveFired = 'right';

        // Keyboard (arrows + WASD) — with null safety
        const wantUp =
            this.cursors?.up?.isDown || this.wasd?.up?.isDown || touchUpJust;
        const wantDown =
            this.cursors?.down?.isDown ||
            this.wasd?.down?.isDown ||
            touchDownJust;
        const wantLeft =
            this.cursors?.left?.isDown ||
            this.wasd?.left?.isDown ||
            touchLeftJust;
        const wantRight =
            this.cursors?.right?.isDown ||
            this.wasd?.right?.isDown ||
            touchRightJust;

        if (wantUp) this.playerNextDir = 'up';
        else if (wantDown) this.playerNextDir = 'down';
        else if (wantLeft) this.playerNextDir = 'left';
        else if (wantRight) this.playerNextDir = 'right';
    }

    updatePlayer(dt) {
        if (!this.playerMoving) {
            // Try next direction first, then continue current direction
            const tryDirs =
                this.playerNextDir !== 'none'
                    ? [this.playerNextDir, this.playerDir]
                    : [this.playerDir];

            for (const dir of tryDirs) {
                if (dir === 'none') continue;
                const [dx, dy] = DIR_VECS[dir];
                const nextCol = this.playerCol + dx;
                const nextRow = this.playerRow + dy;
                if (this.isWalkable(nextCol, nextRow)) {
                    this.playerDir = dir;
                    if (dir === this.playerNextDir) this.playerNextDir = 'none';
                    this.playerTargetCol = nextCol;
                    this.playerTargetRow = nextRow;
                    this.playerMoving = true;
                    this.playerMoveProgress = 0;
                    break;
                }
            }
        }

        if (this.playerMoving) {
            this.playerMoveProgress += this.playerSpeed * dt;

            if (this.playerMoveProgress >= 1) {
                // Arrived at target cell
                this.playerCol = this.playerTargetCol;
                this.playerRow = this.playerTargetRow;
                this.playerMoving = false;
                this.playerMoveProgress = 0;

                // Mark cell visited and check for backtrack
                const prevCount = this.visitedCells.size;
                this.markVisited(this.playerCol, this.playerRow);

                // If we revisited a cell (no new cells), it's a backtrack (miss trial)
                if (this.visitedCells.size === prevCount) {
                    this.totalBacktracks++;
                    this.contrastState = recordTrial(
                        this.contrastState,
                        this.contrastConfig,
                        false,
                    );
                    this.updateFellowEyeAlpha(
                        this.contrastState.fellowEyeContrast / 100,
                    );
                }
            }

            // Interpolate visual position
            this.updatePlayerVisual();
        } else {
            this.updatePlayerVisual();
        }
    }

    updatePlayerVisual() {
        let visualX, visualY;
        if (this.playerMoving) {
            const fromX = this.cellToX(this.playerCol);
            const fromY = this.cellToY(this.playerRow);
            const toX = this.cellToX(this.playerTargetCol);
            const toY = this.cellToY(this.playerTargetRow);
            const p = Math.min(this.playerMoveProgress, 1);
            visualX = fromX + (toX - fromX) * p;
            visualY = fromY + (toY - fromY) * p;
        } else {
            visualX = this.cellToX(this.playerCol);
            visualY = this.cellToY(this.playerRow);
        }

        this.playerObj.x = visualX;
        this.playerObj.y = visualY;
    }

    // --- Collisions ---

    checkCoinCollision() {
        for (const coin of this.coinObjects) {
            if (!coin.active) continue;
            if (coin.col === this.playerCol && coin.row === this.playerRow) {
                coin.active = false;
                coin.obj.destroy();
                this.coinsCollected++;
                this.levelCoinsCollected++;
                this.score += COIN_SCORE;

                const cx = this.cellToX(coin.col);
                const cy = this.cellToY(coin.row);
                SynthSounds.score();
                GameVFX.scorePopup(this, cx, cy - 10, `+${COIN_SCORE}`);
                GameVFX.particleBurst(this, cx, cy, this.ballColor, 6);

                // Hit trial — coin collected
                this.contrastState = recordTrial(
                    this.contrastState,
                    this.contrastConfig,
                    true,
                );
                this.updateFellowEyeAlpha(
                    this.contrastState.fellowEyeContrast / 100,
                );
            }
        }
    }

    checkExitReached() {
        if (
            this.playerCol === this.exitRC.c &&
            this.playerRow === this.exitRC.r
        ) {
            this.totalExits++;
            this.score += LEVEL_CLEAR_BONUS;

            const ex = this.cellToX(this.exitRC.c);
            const ey = this.cellToY(this.exitRC.r);
            SynthSounds.victory();
            GameVFX.particleBurst(this, ex, ey, this.ballColor, 10);

            // Hit trial — exit reached
            this.contrastState = recordTrial(
                this.contrastState,
                this.contrastConfig,
                true,
            );
            this.updateFellowEyeAlpha(
                this.contrastState.fellowEyeContrast / 100,
            );

            this.onLevelClear();
        }
    }

    // --- Level progression ---

    onLevelClear() {
        this.isLevelTransition = true;
        this.level++;

        // Increase maze size every 2 levels (cap at pro size)
        const sizeKeys = Object.keys(MAZE_SIZES);
        const currentIdx = sizeKeys.indexOf(this.settings.speed);
        const progressIdx = Math.min(
            currentIdx + Math.floor((this.level - 1) / 2),
            sizeKeys.length - 1,
        );
        this.mazeSize = MAZE_SIZES[sizeKeys[progressIdx]];

        const cx = this.field.x + this.field.w / 2;
        const cy = this.field.y + this.field.h / 2;

        const levelText = this.add
            .text(cx, cy, `Уровень ${this.level}!`, {
                fontSize: '36px',
                color: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setAlpha(0);

        this.tweens.add({
            targets: levelText,
            alpha: 1,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 300,
            yoyo: true,
            hold: 1500,
            onComplete: () => {
                levelText.destroy();
                this.isLevelTransition = false;
                // Clean up exit glow from previous level
                if (this.exitGlow) {
                    this.exitGlow.destroy();
                    this.exitGlow = null;
                }
                this.buildMaze();
            },
        });
    }

    // --- Contrast updates ---

    updateFellowEyeAlpha(alpha) {
        if (this.playerObj) this.playerObj.setAlpha(alpha);
    }

    // --- Pause ---

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

        const bg = this.add
            .rectangle(cx, cy, 300, 200, COLORS.BLACK, 0.85)
            .setStrokeStyle(2, COLORS.GRAY);
        const title = this.add
            .text(cx, cy - 50, t('game.pause'), {
                fontSize: '24px',
                color: COLORS.WHITE_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setOrigin(0.5);

        const resumeBtn = this.add
            .rectangle(cx, cy + 10, 200, 40, COLORS.GRAY, 0.2)
            .setStrokeStyle(1, COLORS.GRAY)
            .setInteractive({ useHandCursor: true });
        const resumeText = this.add
            .text(cx, cy + 10, t('game.resume'), {
                fontSize: '16px',
                color: COLORS.WHITE_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setOrigin(0.5);
        resumeBtn.on('pointerup', () => this.togglePause());

        const quitBtn = this.add
            .rectangle(cx, cy + 60, 200, 40, COLORS.GRAY, 0.2)
            .setStrokeStyle(1, COLORS.GRAY)
            .setInteractive({ useHandCursor: true });
        const quitText = this.add
            .text(cx, cy + 60, t('game.quit'), {
                fontSize: '16px',
                color: COLORS.WHITE_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setOrigin(0.5);
        quitBtn.on('pointerup', () => this.endGame(false));

        this.pauseOverlay = [
            bg,
            title,
            resumeBtn,
            resumeText,
            quitBtn,
            quitText,
        ];
    }

    // --- End game ---

    endGame(won) {
        if (this.gameEnded) return;
        this.gameEnded = true;

        this.safetyTimer.stop();

        const totalTrials =
            this.totalExits + this.coinsCollected + this.totalBacktracks;
        const caught = this.totalExits + this.coinsCollected;
        const result = {
            game: 'mazerunner',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
            caught,
            total_spawned: totalTrials,
            hit_rate:
                totalTrials > 0
                    ? Math.round((caught / totalTrials) * 100) / 100
                    : 0,
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
