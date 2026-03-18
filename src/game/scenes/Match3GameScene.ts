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

// Grid size per speed
const GRID_CONFIG = {
    slow: 6,
    normal: 6,
    fast: 7,
    pro: 7,
};

// 6 gem types: 3 red shapes, 3 cyan shapes
const GEM_SHAPES = [
    'circle',
    'square',
    'triangle',
    'diamond',
    'star',
    'hexagon',
] as const;
type GemShape = (typeof GEM_SHAPES)[number];

// Red eye: circle, square, triangle (indices 0-2)
// Cyan eye: diamond, star, hexagon (indices 3-5)
const _RED_GEMS: GemShape[] = ['circle', 'square', 'triangle'];
const _CYAN_GEMS: GemShape[] = ['diamond', 'star', 'hexagon'];

const CELL_SIZE = 56;
const CELL_GAP = 4;
const SWAP_DURATION = 180;
const FALL_DURATION = 150;
const POP_DURATION = 200;

// Score thresholds per level
const LEVEL_SCORE_BASE = 500;

interface GemData {
    readonly shape: GemShape;
    readonly isColorA: boolean;
    readonly typeIndex: number; // 0-5
}

interface CellPos {
    readonly row: number;
    readonly col: number;
}

export default class Match3GameScene extends Phaser.Scene {
    constructor() {
        super('Match3GameScene');
    }

    create() {
        SynthSounds.resume();

        this.startGameHandler = (settings) => {
            this.settings = createGameSettings(settings || {});
            this.startGameplay();
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

        EventBus.on('start-match3-game', this.startGameHandler);
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
        this.colorA = isLeftPlatform
            ? eyeColors.leftColor
            : eyeColors.rightColor;
        this.colorB = isLeftPlatform
            ? eyeColors.rightColor
            : eyeColors.leftColor;
        this.alphaA =
            (isLeftPlatform
                ? this.settings.contrastLeft
                : this.settings.contrastRight) / 100;
        this.alphaB =
            (isLeftPlatform
                ? this.settings.contrastRight
                : this.settings.contrastLeft) / 100;

        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        this.level = 1;
        this.gridSize = GRID_CONFIG[this.settings.speed] || GRID_CONFIG.normal;
        this.score = 0;
        this.totalMatches = 0;
        this.totalFailedSwaps = 0;
        this.levelTarget = LEVEL_SCORE_BASE;

        // Field visuals
        GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
        GameVisuals.styledBorder(this, fx, fy, fw, fh);

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

        // Score bar under HUD
        this.scoreBarBg = this.add.rectangle(
            fx + fw / 2,
            fy + 28,
            fw - 20,
            6,
            COLORS.GRAY,
            0.15,
        );
        this.scoreBarFill = this.add
            .rectangle(fx + 11, fy + 28, 0, 6, COLORS.WHITE, 0.3)
            .setOrigin(0, 0.5);
        this.scoreBarMaxW = fw - 22;

        // Build grid
        this.grid = []; // 2D array [row][col] of GemData | null
        this.gemObjects = []; // 2D array [row][col] of { container, graphics }
        this.selectedCell = null; // CellPos | null
        this.isLocked = true;
        this.isPaused = false;
        this.pauseOverlay = null;
        this.gameEnded = false;

        this.initGrid();
        this.renderAllGems();

        // Remove initial matches silently
        this.resolveInitialMatches();

        // Safety timer
        this.safetyTimer = createSafetyTimer({
            onWarning: () =>
                EventBus.emit('safety-timer-warning', { type: 'warning' }),
            onBreak: () =>
                EventBus.emit('safety-timer-warning', { type: 'break' }),
        });

        // Tab blur -> auto-pause
        this.blurHandler = () => {
            if (!this.isPaused) this.togglePause();
        };
        this.game.events.on('blur', this.blurHandler);

        const ccx = fx + fw / 2;
        const ccy = fy + fh / 2;

        GameVFX.countdown(this, ccx, ccy, () => {
            if (!this.scene.isActive()) return;
            this.isLocked = false;
            this.safetyTimer.start();
        });
    }

    // --- Grid geometry ---

    getGridOrigin(): { x: number; y: number } {
        const totalW = this.gridSize * (CELL_SIZE + CELL_GAP) - CELL_GAP;
        const totalH = this.gridSize * (CELL_SIZE + CELL_GAP) - CELL_GAP;
        return {
            x: this.field.x + (this.field.w - totalW) / 2,
            y: this.field.y + (this.field.h - totalH) / 2 + 18,
        };
    }

    getCellCenter(row: number, col: number): { x: number; y: number } {
        const origin = this.getGridOrigin();
        return {
            x: origin.x + col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
            y: origin.y + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
        };
    }

    // --- Grid initialization ---

    randomGem(): GemData {
        const typeIndex = Math.floor(Math.random() * 6);
        return {
            shape: GEM_SHAPES[typeIndex],
            isColorA: typeIndex < 3,
            typeIndex,
        };
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.gridSize; r++) {
            const row: (GemData | null)[] = [];
            for (let c = 0; c < this.gridSize; c++) {
                row.push(this.randomGem());
            }
            this.grid.push(row);
        }
    }

    resolveInitialMatches() {
        // Keep replacing gems that form matches until board is clean
        let hasMatches = true;
        let iterations = 0;
        while (hasMatches && iterations < 100) {
            const matches = this.findAllMatches();
            if (matches.length === 0) {
                hasMatches = false;
            } else {
                for (const cell of matches) {
                    this.grid[cell.row][cell.col] = this.randomGem();
                }
                iterations++;
            }
        }
        // Re-render after cleanup
        this.destroyAllGemObjects();
        this.renderAllGems();
    }

    // --- Rendering ---

    renderAllGems() {
        this.gemObjects = [];
        for (let r = 0; r < this.gridSize; r++) {
            const row = [];
            for (let c = 0; c < this.gridSize; c++) {
                const gem = this.grid[r][c];
                if (gem) {
                    row.push(this.createGemObject(r, c, gem));
                } else {
                    row.push(null);
                }
            }
            this.gemObjects.push(row);
        }
    }

    createGemObject(row: number, col: number, gem: GemData) {
        const pos = this.getCellCenter(row, col);

        // Cell background (gray, both eyes)
        const cellBg = this.add.rectangle(
            pos.x,
            pos.y,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
            COLORS.GRAY,
            0.08,
        );

        // Gem graphics
        const graphics = this.add.graphics();
        const color = gem.isColorA ? this.colorA : this.colorB;
        const alpha = gem.isColorA ? this.alphaA : this.alphaB;
        this.drawGemShape(graphics, pos.x, pos.y, gem.shape, color, alpha);

        // Hit area
        const hitArea = this.add
            .rectangle(pos.x, pos.y, CELL_SIZE - 2, CELL_SIZE - 2, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        hitArea.on('pointerup', () => {
            if (!this.isPaused && !this.isLocked) {
                this.onCellClick(row, col);
            }
        });
        hitArea.on('pointerover', () => {
            if (!this.isLocked) cellBg.setFillStyle(COLORS.GRAY, 0.18);
        });
        hitArea.on('pointerout', () => {
            cellBg.setFillStyle(COLORS.GRAY, 0.08);
        });

        return { cellBg, graphics, hitArea, row, col };
    }

    drawGemShape(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        shape: GemShape,
        color: number,
        alpha: number,
    ) {
        graphics.clear();
        graphics.fillStyle(color, alpha);
        graphics.lineStyle(1.5, color, alpha * 0.7);

        const s = CELL_SIZE * 0.28;

        switch (shape) {
            case 'circle':
                graphics.fillCircle(x, y, s);
                graphics.strokeCircle(x, y, s);
                break;
            case 'square':
                graphics.fillRect(x - s, y - s, s * 2, s * 2);
                graphics.strokeRect(x - s, y - s, s * 2, s * 2);
                break;
            case 'triangle': {
                const pts = [
                    { x: x, y: y - s * 1.1 },
                    { x: x + s, y: y + s * 0.7 },
                    { x: x - s, y: y + s * 0.7 },
                ];
                graphics.fillTriangle(
                    pts[0].x,
                    pts[0].y,
                    pts[1].x,
                    pts[1].y,
                    pts[2].x,
                    pts[2].y,
                );
                graphics.strokeTriangle(
                    pts[0].x,
                    pts[0].y,
                    pts[1].x,
                    pts[1].y,
                    pts[2].x,
                    pts[2].y,
                );
                break;
            }
            case 'diamond': {
                const dPts = [
                    { x: x, y: y - s * 1.2 },
                    { x: x + s * 0.8, y: y },
                    { x: x, y: y + s * 1.2 },
                    { x: x - s * 0.8, y: y },
                ];
                graphics.fillPoints(dPts, true);
                graphics.beginPath();
                graphics.moveTo(dPts[0].x, dPts[0].y);
                for (let i = 1; i < dPts.length; i++)
                    graphics.lineTo(dPts[i].x, dPts[i].y);
                graphics.closePath();
                graphics.strokePath();
                break;
            }
            case 'star': {
                const outerR = s;
                const innerR = s * 0.45;
                const starPts = [];
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? outerR : innerR;
                    const angle = (Math.PI / 5) * i - Math.PI / 2;
                    starPts.push({
                        x: x + Math.cos(angle) * r,
                        y: y + Math.sin(angle) * r,
                    });
                }
                graphics.fillPoints(starPts, true);
                graphics.beginPath();
                graphics.moveTo(starPts[0].x, starPts[0].y);
                for (let i = 1; i < starPts.length; i++)
                    graphics.lineTo(starPts[i].x, starPts[i].y);
                graphics.closePath();
                graphics.strokePath();
                break;
            }
            case 'hexagon': {
                const hexPts = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    hexPts.push({
                        x: x + Math.cos(angle) * s,
                        y: y + Math.sin(angle) * s,
                    });
                }
                graphics.fillPoints(hexPts, true);
                graphics.beginPath();
                graphics.moveTo(hexPts[0].x, hexPts[0].y);
                for (let i = 1; i < hexPts.length; i++)
                    graphics.lineTo(hexPts[i].x, hexPts[i].y);
                graphics.closePath();
                graphics.strokePath();
                break;
            }
            default:
                graphics.fillCircle(x, y, s);
        }
    }

    destroyGemObject(row: number, col: number) {
        const obj = this.gemObjects[row]?.[col];
        if (!obj) return;
        obj.cellBg.destroy();
        obj.graphics.destroy();
        obj.hitArea.destroy();
        this.gemObjects[row][col] = null;
    }

    destroyAllGemObjects() {
        for (let r = 0; r < this.gemObjects.length; r++) {
            for (let c = 0; c < (this.gemObjects[r]?.length || 0); c++) {
                this.destroyGemObject(r, c);
            }
        }
        this.gemObjects = [];
    }

    // --- Selection & Swapping ---

    onCellClick(row: number, col: number) {
        if (!this.grid[row][col]) return;

        if (!this.selectedCell) {
            // First selection
            this.selectedCell = { row, col };
            this.highlightCell(row, col, true);
            SynthSounds.tick();
            return;
        }

        const prev = this.selectedCell;
        this.highlightCell(prev.row, prev.col, false);

        // Clicked same cell -> deselect
        if (prev.row === row && prev.col === col) {
            this.selectedCell = null;
            return;
        }

        // Check adjacency
        const dr = Math.abs(prev.row - row);
        const dc = Math.abs(prev.col - col);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            // Adjacent -> try swap
            this.selectedCell = null;
            this.isLocked = true;
            this.trySwap(prev, { row, col });
        } else {
            // Not adjacent -> select new cell
            this.selectedCell = { row, col };
            this.highlightCell(row, col, true);
            SynthSounds.tick();
        }
    }

    highlightCell(row: number, col: number, active: boolean) {
        const obj = this.gemObjects[row]?.[col];
        if (!obj) return;
        if (active) {
            obj.cellBg.setStrokeStyle(2, COLORS.WHITE, 0.6);
        } else {
            obj.cellBg.setStrokeStyle(0);
        }
    }

    async trySwap(cellA: CellPos, cellB: CellPos) {
        // Animate swap
        await this.animateSwap(cellA, cellB);

        // Swap in grid
        const newGrid = this.grid.map((row) => [...row]);
        const temp = newGrid[cellA.row][cellA.col];
        newGrid[cellA.row][cellA.col] = newGrid[cellB.row][cellB.col];
        newGrid[cellB.row][cellB.col] = temp;
        this.grid = newGrid;

        // Check for matches
        const matches = this.findAllMatches();
        if (matches.length > 0) {
            // Valid swap
            this.contrastState = recordTrial(
                this.contrastState,
                this.contrastConfig,
                true,
            );
            this.updateFellowEyeAlpha();
            await this.resolveMatches(matches);
        } else {
            // Invalid swap -> swap back
            SynthSounds.miss();
            this.totalFailedSwaps++;
            this.contrastState = recordTrial(
                this.contrastState,
                this.contrastConfig,
                false,
            );
            this.updateFellowEyeAlpha();

            // Swap back in grid
            const revertGrid = this.grid.map((row) => [...row]);
            const tmp = revertGrid[cellA.row][cellA.col];
            revertGrid[cellA.row][cellA.col] = revertGrid[cellB.row][cellB.col];
            revertGrid[cellB.row][cellB.col] = tmp;
            this.grid = revertGrid;

            await this.animateSwap(cellA, cellB);
        }

        // Rebuild visuals after all settling
        this.destroyAllGemObjects();
        this.renderAllGems();
        this.isLocked = false;
    }

    animateSwap(cellA: CellPos, cellB: CellPos): Promise<void> {
        return new Promise((resolve) => {
            const objA = this.gemObjects[cellA.row]?.[cellA.col];
            const objB = this.gemObjects[cellB.row]?.[cellB.col];

            if (!objA || !objB) {
                resolve();
                return;
            }

            const posA = this.getCellCenter(cellA.row, cellA.col);
            const posB = this.getCellCenter(cellB.row, cellB.col);
            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;

            let completed = 0;
            const checkDone = () => {
                completed++;
                if (completed >= 2) resolve();
            };

            // Move A to B position
            this.tweens.add({
                targets: [objA.cellBg, objA.graphics, objA.hitArea],
                x: `+=${dx}`,
                y: `+=${dy}`,
                duration: SWAP_DURATION,
                ease: 'Power2',
                onComplete: checkDone,
            });
            // Move B to A position
            this.tweens.add({
                targets: [objB.cellBg, objB.graphics, objB.hitArea],
                x: `-=${dx}`,
                y: `-=${dy}`,
                duration: SWAP_DURATION,
                ease: 'Power2',
                onComplete: checkDone,
            });
        });
    }

    // --- Match detection ---

    findAllMatches(): CellPos[] {
        const matched = new Set<string>();

        // Horizontal
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c <= this.gridSize - 3; c++) {
                const g0 = this.grid[r][c];
                const g1 = this.grid[r][c + 1];
                const g2 = this.grid[r][c + 2];
                if (
                    g0 &&
                    g1 &&
                    g2 &&
                    g0.typeIndex === g1.typeIndex &&
                    g1.typeIndex === g2.typeIndex
                ) {
                    // Extend run
                    let end = c + 2;
                    while (
                        end + 1 < this.gridSize &&
                        this.grid[r][end + 1] &&
                        this.grid[r][end + 1].typeIndex === g0.typeIndex
                    ) {
                        end++;
                    }
                    for (let k = c; k <= end; k++) {
                        matched.add(`${r},${k}`);
                    }
                    c = end; // skip ahead
                }
            }
        }

        // Vertical
        for (let c = 0; c < this.gridSize; c++) {
            for (let r = 0; r <= this.gridSize - 3; r++) {
                const g0 = this.grid[r][c];
                const g1 = this.grid[r + 1][c];
                const g2 = this.grid[r + 2][c];
                if (
                    g0 &&
                    g1 &&
                    g2 &&
                    g0.typeIndex === g1.typeIndex &&
                    g1.typeIndex === g2.typeIndex
                ) {
                    let end = r + 2;
                    while (
                        end + 1 < this.gridSize &&
                        this.grid[end + 1][c] &&
                        this.grid[end + 1][c].typeIndex === g0.typeIndex
                    ) {
                        end++;
                    }
                    for (let k = r; k <= end; k++) {
                        matched.add(`${k},${c}`);
                    }
                    r = end;
                }
            }
        }

        return Array.from(matched).map((key) => {
            const [row, col] = key.split(',').map(Number);
            return { row, col };
        });
    }

    // --- Match resolution with cascading ---

    async resolveMatches(matches: CellPos[]) {
        let currentMatches = matches;
        let chainMultiplier = 1;

        while (currentMatches.length > 0) {
            // Score
            const points = currentMatches.length * 10 * chainMultiplier;
            this.score += points;
            this.totalMatches += currentMatches.length;

            // Pop VFX + sound
            SynthSounds.score();
            for (const cell of currentMatches) {
                const pos = this.getCellCenter(cell.row, cell.col);
                const gem = this.grid[cell.row][cell.col];
                const color = gem?.isColorA ? this.colorA : this.colorB;
                GameVFX.particleBurst(this, pos.x, pos.y, color, 6);
                GameVFX.flash(
                    this,
                    pos.x,
                    pos.y,
                    CELL_SIZE - 4,
                    CELL_SIZE - 4,
                    POP_DURATION,
                );
            }

            // Score popup for chain
            if (chainMultiplier > 1) {
                const midCell =
                    currentMatches[Math.floor(currentMatches.length / 2)];
                const midPos = this.getCellCenter(midCell.row, midCell.col);
                GameVFX.scorePopup(
                    this,
                    midPos.x,
                    midPos.y,
                    `x${chainMultiplier}`,
                    '#FFFFFF',
                );
            }

            // Clear matched cells
            const newGrid = this.grid.map((row) => [...row]);
            for (const cell of currentMatches) {
                newGrid[cell.row][cell.col] = null;
            }
            this.grid = newGrid;

            // Wait for pop animation
            await this.delay(POP_DURATION + 50);

            // Gravity: drop gems down
            this.applyGravity();

            // Fill empty top cells with new gems
            this.fillEmptyCells();

            // Re-render
            this.destroyAllGemObjects();
            this.renderAllGems();

            // Wait for visual settle
            await this.delay(FALL_DURATION + 50);

            // Check for new cascading matches
            currentMatches = this.findAllMatches();
            chainMultiplier++;
        }

        // Check level progression
        if (this.score >= this.levelTarget) {
            this.advanceLevel();
        }
    }

    applyGravity() {
        // Process column by column: gems fall to fill gaps
        const newGrid = this.grid.map((row) => [...row]);

        for (let c = 0; c < this.gridSize; c++) {
            // Collect non-null gems from bottom to top
            const gems: GemData[] = [];
            for (let r = this.gridSize - 1; r >= 0; r--) {
                if (newGrid[r][c] !== null) {
                    gems.push(newGrid[r][c]);
                }
            }
            // Place them at the bottom
            for (let r = this.gridSize - 1; r >= 0; r--) {
                const idx = this.gridSize - 1 - r;
                newGrid[r][c] = idx < gems.length ? gems[idx] : null;
            }
        }

        this.grid = newGrid;
    }

    fillEmptyCells() {
        const newGrid = this.grid.map((row) => [...row]);
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (newGrid[r][c] === null) {
                    newGrid[r][c] = this.randomGem();
                }
            }
        }
        this.grid = newGrid;
    }

    delay(ms: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.scene.isActive()) {
                resolve();
                return;
            }
            this.time.delayedCall(ms, resolve);
        });
    }

    // --- Level progression ---

    advanceLevel() {
        this.level++;
        this.levelTarget = this.level * LEVEL_SCORE_BASE;

        const cx = this.field.x + this.field.w / 2;
        const cy = this.field.y + this.field.h / 2;

        SynthSounds.victory();

        const levelText = this.add
            .text(cx, cy, `${t('game.score')} ${this.level}!`, {
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
            hold: 1200,
            onComplete: () => levelText.destroy(),
        });
    }

    // --- Contrast engine integration ---

    updateFellowEyeAlpha() {
        this.alphaA = this.contrastState.fellowEyeContrast / 100;
    }

    // --- Score bar ---

    updateScoreBar() {
        if (!this.scoreBarFill) return;
        const progress = Math.min(this.score / this.levelTarget, 1);
        this.scoreBarFill.width = this.scoreBarMaxW * progress;
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

    // --- Game loop ---

    update() {
        if (!this.safetyTimer) return;

        if (this.hud) {
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                `${this.score}/${this.levelTarget}`,
            );
        }

        this.updateScoreBar();
    }

    // --- End game ---

    endGame(won: boolean) {
        if (this.gameEnded) return;
        this.gameEnded = true;

        this.safetyTimer.stop();

        const totalSwaps = this.totalMatches + this.totalFailedSwaps;

        const result = {
            game: 'match3',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
            caught: this.totalMatches,
            total_spawned: totalSwaps,
            hit_rate:
                totalSwaps > 0
                    ? Math.round((this.totalMatches / totalSwaps) * 100) / 100
                    : 0,
            score: this.score,
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

    // --- Cleanup ---

    shutdown() {
        EventBus.removeListener('start-match3-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    }
}
