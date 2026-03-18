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
import { getCalibration } from '../../modules/storage';
import { getProtocol } from '../../modules/therapyProtocol';
import { SynthSounds } from '../audio/SynthSounds';
import { EventBus } from '../EventBus';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';
import { TouchControls } from '../vfx/TouchControls';

// --- Maze data: 0=path, 1=wall, 2=dot, 3=power pellet, 4=ghost spawn, 5=player spawn ---
const MAZE_LAYOUTS = [
    // Layout 0 — 15 cols x 13 rows
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 2, 2, 2, 2, 1, 2, 1, 2, 2, 2, 2, 3, 1],
        [1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 1, 2, 1, 1, 0, 0, 0, 1, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 0, 0, 4, 0, 0, 1, 2, 1, 2, 1],
        [0, 2, 2, 2, 0, 0, 4, 0, 4, 0, 0, 2, 2, 2, 0],
        [1, 2, 1, 2, 1, 0, 0, 0, 0, 0, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1],
        [1, 5, 2, 2, 2, 2, 1, 2, 1, 2, 2, 2, 2, 3, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Layout 1 — alternate maze
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 3, 1],
        [1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [1, 1, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 1, 1],
        [0, 2, 2, 2, 0, 0, 0, 4, 0, 0, 0, 2, 2, 2, 0],
        [1, 2, 1, 2, 0, 4, 0, 0, 0, 4, 0, 2, 1, 2, 1],
        [0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
        [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1],
        [1, 5, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 3, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Layout 2 — open maze
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1],
        [1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1],
        [1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1],
        [1, 2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1],
        [0, 2, 1, 2, 0, 0, 4, 0, 4, 0, 0, 2, 1, 2, 0],
        [1, 2, 1, 2, 0, 0, 0, 4, 0, 0, 0, 2, 1, 2, 1],
        [0, 2, 1, 2, 0, 0, 0, 0, 0, 0, 0, 2, 1, 2, 0],
        [1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1],
        [1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1],
        [1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1],
        [1, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
];

const COLS = 15;
const ROWS = 13;
const MAX_LIVES = 3;
const _DOTS_TO_WIN = -1; // -1 = eat all dots to clear level
const POWER_DURATION_MS = 5000;
const GHOST_EATEN_BONUS = 50;
const DOT_SCORE = 10;
const POWER_SCORE = 20;

const PACMAN_SPEEDS = { slow: 4, normal: 5, fast: 6, pro: 7 };
const GHOST_BASE_SPEED_RATIO = 0.85; // ghosts slightly slower than pacman
const GHOST_FRIGHTENED_RATIO = 0.5;

// Direction vectors: [dx, dy]
const DIR_VECS = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, -1],
    down: [0, 1],
    none: [0, 0],
};
const OPPOSITES = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
    none: 'none',
};

export default class PacmanGameScene extends Phaser.Scene {
    constructor() {
        super('PacmanGameScene');
    }

    create() {
        SynthSounds.resume();

        this.startGameHandler = (settings) => {
            console.log(
                '[PacmanScene] start-pacman-game received, settings:',
                settings,
            );
            try {
                this.settings = createGameSettings(settings || {});
                this.startGameplay();
                console.log('[PacmanScene] startGameplay completed OK');
            } catch (err) {
                console.error('[PacmanScene] startGameplay CRASHED:', err);
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

        EventBus.on('start-pacman-game', this.startGameHandler);
        EventBus.on('safety-finish', this.safetyFinishHandler);
        EventBus.on('safety-extend', this.safetyExtendHandler);

        this.events.on('shutdown', this.shutdown, this);

        console.log(
            '[PacmanScene] create() called, emitting current-scene-ready',
        );
        EventBus.emit('current-scene-ready', this);
    }

    startGameplay() {
        console.log('[PacmanScene] startGameplay() called');
        const fw = GAME.WIDTH * GAME.FIELD_WIDTH_RATIO;
        const fh = GAME.HEIGHT * GAME.FIELD_HEIGHT_RATIO;
        const fx = (GAME.WIDTH - fw) / 2;
        const fy = (GAME.HEIGHT - fh) / 2;
        this.field = { x: fx, y: fy, w: fw, h: fh };

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

        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        this.level = 1;
        this.score = 0;
        this.lives = MAX_LIVES;
        this.dotsEaten = 0;
        this.ghostsEaten = 0;
        this.totalDeaths = 0;
        this.gameEnded = false;
        this.isPaused = false;
        this.isDead = false;
        this.isLevelTransition = false;

        // Pac-Man movement speed (cells per second)
        this.pacSpeed = PACMAN_SPEEDS[this.settings.speed] || 5;

        // Visual setup
        GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
        GameVisuals.styledBorder(this, fx, fy, fw, fh);

        const crossSize = Math.max(
            fw * GAME.FIXATION_CROSS_RATIO,
            GAME.FIXATION_CROSS_MIN_PX,
        );
        GameVisuals.styledCross(this, fx + fw / 2, fy + fh / 2, crossSize);

        // Calculate cell size to fit maze in field
        this.cellW = fw / COLS;
        this.cellH = fh / ROWS;
        this.mazeOffsetX = fx;
        this.mazeOffsetY = fy;

        // Build maze for current level
        this.buildMaze();

        // HUD
        this.hud = GameVisuals.createHUD(this, this.field, MAX_LIVES);

        // Pause button
        const pauseBtn = this.add
            .text(fx + 10, fy + fh - 20, t('game.pause'), {
                fontSize: '14px',
                color: COLORS.GRAY_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setInteractive({ useHandCursor: true });
        pauseBtn.on('pointerup', () => this.togglePause());

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
        const calibration = getCalibration();
        const protocol = getProtocol(calibration.age_group || '8-12');
        this.safetyTimer = createSafetyTimer({
            onWarning: () =>
                EventBus.emit('safety-timer-warning', { type: 'warning' }),
            onBreak: () =>
                EventBus.emit('safety-timer-warning', { type: 'break' }),
            protocol,
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
        const layoutIndex = (this.level - 1) % MAZE_LAYOUTS.length;
        this.mazeData = MAZE_LAYOUTS[layoutIndex].map((row) => [...row]);

        // Clear any previous maze graphics
        if (this.mazeGraphics) this.mazeGraphics.destroy();
        if (this.dotObjects) this.dotObjects.forEach((d) => d.destroy());
        if (this.powerObjects)
            this.powerObjects.forEach((p) => p.obj.destroy());
        if (this.pacmanObj) this.pacmanObj.destroy();
        if (this.pacmanMouth) this.pacmanMouth.destroy();
        if (this.ghostObjs)
            this.ghostObjs.forEach((g) => {
                g.body.destroy();
                g.eyes.destroy();
            });

        this.dotObjects = [];
        this.powerObjects = [];
        this.ghostSpawns = [];
        this.playerSpawn = { col: 1, row: 11 };
        this.totalDots = 0;

        // Draw walls (gray — both eyes)
        this.mazeGraphics = this.add.graphics();
        this.mazeGraphics.fillStyle(COLORS.GRAY, 0.25);
        this.mazeGraphics.lineStyle(1, COLORS.GRAY, 0.4);

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.mazeData[r][c];
                const cx = this.cellToX(c);
                const cy = this.cellToY(r);

                if (cell === 1) {
                    // Wall
                    this.mazeGraphics.fillRoundedRect(
                        cx - this.cellW / 2 + 1,
                        cy - this.cellH / 2 + 1,
                        this.cellW - 2,
                        this.cellH - 2,
                        3,
                    );
                } else if (cell === 2) {
                    // Dot (platformColor — one eye)
                    const dot = this.add.circle(
                        cx,
                        cy,
                        3,
                        this.platformColor,
                        this.platformAlpha,
                    );
                    this.dotObjects.push(dot);
                    dot._col = c;
                    dot._row = r;
                    this.totalDots++;
                } else if (cell === 3) {
                    // Power pellet (platformColor — one eye, larger + pulsing)
                    const pellet = GameVisuals.glowCircle(
                        this,
                        cx,
                        cy,
                        6,
                        this.platformColor,
                        this.platformAlpha,
                    );
                    GameVisuals.pulse(this, pellet, 0.8, 1.2, 600);
                    this.powerObjects.push({
                        obj: pellet,
                        col: c,
                        row: r,
                        active: true,
                    });
                    this.totalDots++; // power pellets count toward total for clearing
                } else if (cell === 4) {
                    this.ghostSpawns.push({ col: c, row: r });
                } else if (cell === 5) {
                    this.playerSpawn = { col: c, row: r };
                }
            }
        }

        this.dotsEaten = 0;

        // Create Pac-Man (platformColor — one eye)
        this.spawnPacman();

        // Create ghosts (ballColor — other eye)
        this.spawnGhosts();
    }

    cellToX(col) {
        return this.mazeOffsetX + (col + 0.5) * this.cellW;
    }

    cellToY(row) {
        return this.mazeOffsetY + (row + 0.5) * this.cellH;
    }

    xToCol(x) {
        return Math.floor((x - this.mazeOffsetX) / this.cellW);
    }

    yToRow(y) {
        return Math.floor((y - this.mazeOffsetY) / this.cellH);
    }

    isWalkable(col, row) {
        if (row < 0 || row >= ROWS) return false;
        // Horizontal wrap — tunnels at row 6 (cols -1 and 15)
        if (col < 0 || col >= COLS) {
            // Check if it's a tunnel row (row with 0 at edges)
            const layout = this.mazeData;
            if (layout[row][0] === 0 || layout[row][COLS - 1] === 0)
                return true;
            return false;
        }
        return this.mazeData[row][col] !== 1;
    }

    // --- Pac-Man ---

    spawnPacman() {
        const cx = this.cellToX(this.playerSpawn.col);
        const cy = this.cellToY(this.playerSpawn.row);
        const radius = Math.min(this.cellW, this.cellH) * 0.38;

        this.pacmanObj = this.add.circle(
            cx,
            cy,
            radius,
            this.platformColor,
            this.platformAlpha,
        );

        // Mouth — a small black wedge drawn as a triangle via graphics
        this.pacmanMouth = this.add.graphics();
        this.drawPacmanMouth(cx, cy, radius, 'left');

        this.pacCol = this.playerSpawn.col;
        this.pacRow = this.playerSpawn.row;
        this.pacTargetCol = this.pacCol;
        this.pacTargetRow = this.pacRow;
        this.pacDir = 'none';
        this.pacNextDir = 'none';
        this.pacMoving = false;
        this.pacMoveProgress = 0; // 0..1 progress between current cell and target cell
        this.mouthOpen = true;
        this.mouthTimer = 0;
    }

    drawPacmanMouth(x, y, radius, dir) {
        this.pacmanMouth.clear();
        this.pacmanMouth.fillStyle(0x000000, 1);

        const angle =
            dir === 'right'
                ? 0
                : dir === 'down'
                  ? Math.PI / 2
                  : dir === 'up'
                    ? -Math.PI / 2
                    : Math.PI;
        const spread = this.mouthOpen ? 0.4 : 0.05;

        const x1 = x + Math.cos(angle - spread) * radius;
        const y1 = y + Math.sin(angle - spread) * radius;
        const x2 = x + Math.cos(angle + spread) * radius;
        const y2 = y + Math.sin(angle + spread) * radius;

        this.pacmanMouth.fillTriangle(x, y, x1, y1, x2, y2);
    }

    // --- Ghosts ---

    spawnGhosts() {
        this.ghostObjs = [];
        // Use only 2 ghosts (as spec says — simpler for children)
        const spawnCount = Math.min(2, this.ghostSpawns.length);
        const ghostRadius = Math.min(this.cellW, this.cellH) * 0.36;

        for (let i = 0; i < spawnCount; i++) {
            const spawn = this.ghostSpawns[i];
            const cx = this.cellToX(spawn.col);
            const cy = this.cellToY(spawn.row);

            // Ghost body (ballColor — other eye)
            const body = this.add.graphics();
            this.drawGhostBody(
                body,
                cx,
                cy,
                ghostRadius,
                this.ballColor,
                this.ballAlpha,
            );

            // Ghost eyes (white — both eyes, small)
            const eyes = this.add.graphics();
            this.drawGhostEyes(eyes, cx, cy, ghostRadius, false);

            const ghost = {
                body,
                eyes,
                col: spawn.col,
                row: spawn.row,
                targetCol: spawn.col,
                targetRow: spawn.row,
                dir: i === 0 ? 'left' : 'right',
                moveProgress: 0,
                moving: false,
                frightened: false,
                frightenedTimer: 0,
                eaten: false,
                respawnTimer: 0,
                spawnCol: spawn.col,
                spawnRow: spawn.row,
                type: i === 0 ? 'chaser' : 'random', // one chases, one random
                radius: ghostRadius,
                baseSpeed: this.pacSpeed * GHOST_BASE_SPEED_RATIO,
            };
            this.ghostObjs.push(ghost);
        }

        this.powerModeActive = false;
        this.powerModeTimer = 0;
    }

    drawGhostBody(gfx, x, y, radius, color, alpha) {
        gfx.clear();
        gfx.fillStyle(color, alpha);
        // Rounded top + wavy bottom
        gfx.fillCircle(x, y - radius * 0.2, radius);
        gfx.fillRect(x - radius, y - radius * 0.2, radius * 2, radius * 1.0);
        // Wavy bottom edge
        const waveY = y + radius * 0.8;
        const segments = 4;
        const segW = (radius * 2) / segments;
        for (let s = 0; s < segments; s++) {
            const sx = x - radius + s * segW + segW / 2;
            gfx.fillCircle(sx, waveY, segW / 2);
        }
    }

    drawGhostEyes(gfx, x, y, radius, frightened) {
        gfx.clear();
        if (frightened) {
            // Frightened: simple white circles
            gfx.fillStyle(0xffffff, 0.8);
            gfx.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.15);
            gfx.fillCircle(x + radius * 0.3, y - radius * 0.3, radius * 0.15);
        } else {
            // Normal: white sclera + black pupil
            gfx.fillStyle(0xffffff, 0.9);
            gfx.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.22);
            gfx.fillCircle(x + radius * 0.3, y - radius * 0.3, radius * 0.22);
            gfx.fillStyle(0x000000, 1);
            gfx.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.1);
            gfx.fillCircle(x + radius * 0.3, y - radius * 0.3, radius * 0.1);
        }
    }

    // --- Update loop ---

    shutdown() {
        EventBus.removeListener('start-pacman-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        this.input.setDefaultCursor('default');
    }

    update(_time, delta) {
        // Guard: update() can fire before startGameplay() completes
        if (!this.ghostObjs) return;

        if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.togglePause();
            return;
        }
        if (
            this.isPaused ||
            this.gameEnded ||
            this.isDead ||
            this.isLevelTransition
        )
            return;

        const dt = delta / 1000;

        this.handleInput();
        this.updatePacman(dt);
        this.updateGhosts(dt);
        this.checkDotCollision();
        this.checkGhostCollision();
        this.updatePowerMode(dt);

        // Mouth animation
        this.mouthTimer += dt;
        if (this.mouthTimer > 0.12) {
            this.mouthOpen = !this.mouthOpen;
            this.mouthTimer = 0;
        }

        // HUD
        if (this.safetyTimer && this.hud) {
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                `${this.score}`,
                this.lives,
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

        if (wantUp) this.pacNextDir = 'up';
        else if (wantDown) this.pacNextDir = 'down';
        else if (wantLeft) this.pacNextDir = 'left';
        else if (wantRight) this.pacNextDir = 'right';
    }

    updatePacman(dt) {
        if (!this.pacMoving) {
            // Try next direction first, then continue current direction
            const tryDirs =
                this.pacNextDir !== 'none'
                    ? [this.pacNextDir, this.pacDir]
                    : [this.pacDir];

            for (const dir of tryDirs) {
                if (dir === 'none') continue;
                const [dx, dy] = DIR_VECS[dir];
                const nextCol = this.pacCol + dx;
                const nextRow = this.pacRow + dy;
                if (this.isWalkable(nextCol, nextRow)) {
                    this.pacDir = dir;
                    if (dir === this.pacNextDir) this.pacNextDir = 'none';
                    this.pacTargetCol = nextCol;
                    this.pacTargetRow = nextRow;
                    this.pacMoving = true;
                    this.pacMoveProgress = 0;
                    break;
                }
            }
        }

        if (this.pacMoving) {
            this.pacMoveProgress += this.pacSpeed * dt;

            if (this.pacMoveProgress >= 1) {
                // Arrived at target cell
                this.pacCol = this.pacTargetCol;
                this.pacRow = this.pacTargetRow;

                // Handle horizontal wrap (tunnel)
                if (this.pacCol < 0) this.pacCol = COLS - 1;
                else if (this.pacCol >= COLS) this.pacCol = 0;

                this.pacMoving = false;
                this.pacMoveProgress = 0;
            }

            // Interpolate position
            this.updatePacmanVisual();
        } else {
            this.updatePacmanVisual();
        }
    }

    updatePacmanVisual() {
        let visualX, visualY;
        if (this.pacMoving) {
            const fromX = this.cellToX(this.pacCol);
            const fromY = this.cellToY(this.pacRow);
            let toX = this.cellToX(this.pacTargetCol);
            const toY = this.cellToY(this.pacTargetRow);

            // Handle tunnel wrap visual interpolation
            if (this.pacTargetCol < 0) {
                toX = this.mazeOffsetX - this.cellW / 2;
            } else if (this.pacTargetCol >= COLS) {
                toX = this.mazeOffsetX + this.field.w + this.cellW / 2;
            }

            const t = Math.min(this.pacMoveProgress, 1);
            visualX = fromX + (toX - fromX) * t;
            visualY = fromY + (toY - fromY) * t;
        } else {
            visualX = this.cellToX(this.pacCol);
            visualY = this.cellToY(this.pacRow);
        }

        this.pacmanObj.x = visualX;
        this.pacmanObj.y = visualY;

        const radius = Math.min(this.cellW, this.cellH) * 0.38;
        const mouthDir = this.pacDir === 'none' ? 'left' : this.pacDir;
        this.drawPacmanMouth(visualX, visualY, radius, mouthDir);
    }

    // --- Ghost AI ---

    updateGhosts(dt) {
        for (const ghost of this.ghostObjs) {
            if (ghost.eaten) {
                ghost.respawnTimer -= dt;
                if (ghost.respawnTimer <= 0) {
                    this.respawnGhost(ghost);
                }
                continue;
            }

            const ghostSpeed = ghost.frightened
                ? ghost.baseSpeed * GHOST_FRIGHTENED_RATIO
                : ghost.baseSpeed + (this.level - 1) * 0.3; // slightly faster each level

            if (!ghost.moving) {
                const dir = this.chooseGhostDirection(ghost);
                const [dx, dy] = DIR_VECS[dir];
                const nextCol = ghost.col + dx;
                const nextRow = ghost.row + dy;
                if (this.isWalkable(nextCol, nextRow)) {
                    ghost.dir = dir;
                    ghost.targetCol = nextCol;
                    ghost.targetRow = nextRow;
                    ghost.moving = true;
                    ghost.moveProgress = 0;
                }
            }

            if (ghost.moving) {
                ghost.moveProgress += ghostSpeed * dt;
                if (ghost.moveProgress >= 1) {
                    ghost.col = ghost.targetCol;
                    ghost.row = ghost.targetRow;
                    // Handle horizontal wrap (tunnel)
                    if (ghost.col < 0) ghost.col = COLS - 1;
                    else if (ghost.col >= COLS) ghost.col = 0;
                    ghost.moving = false;
                    ghost.moveProgress = 0;
                }
            }

            this.updateGhostVisual(ghost);
        }
    }

    chooseGhostDirection(ghost) {
        const possibleDirs = ['up', 'down', 'left', 'right'];
        const opposite = OPPOSITES[ghost.dir];

        // Filter walkable and non-opposite (ghosts shouldn't reverse)
        const validDirs = possibleDirs.filter((d) => {
            if (d === opposite && ghost.dir !== 'none') return false;
            const [dx, dy] = DIR_VECS[d];
            return this.isWalkable(ghost.col + dx, ghost.row + dy);
        });

        if (validDirs.length === 0) {
            // Dead end — allow reverse
            const [dx, dy] = DIR_VECS[opposite];
            if (this.isWalkable(ghost.col + dx, ghost.row + dy))
                return opposite;
            return 'none';
        }

        if (ghost.frightened || ghost.type === 'random') {
            // Random direction
            return validDirs[Math.floor(Math.random() * validDirs.length)];
        }

        // Chaser ghost — pick direction that gets closest to Pac-Man
        let bestDir = validDirs[0];
        let bestDist = Infinity;
        for (const d of validDirs) {
            const [dx, dy] = DIR_VECS[d];
            const nc = ghost.col + dx;
            const nr = ghost.row + dy;
            const dist =
                Math.abs(nc - this.pacCol) + Math.abs(nr - this.pacRow);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        }
        return bestDir;
    }

    updateGhostVisual(ghost) {
        let visualX, visualY;
        if (ghost.moving) {
            const fromX = this.cellToX(ghost.col);
            const fromY = this.cellToY(ghost.row);
            let toX = this.cellToX(ghost.targetCol);
            const toY = this.cellToY(ghost.targetRow);
            if (ghost.targetCol < 0) toX = this.mazeOffsetX - this.cellW / 2;
            else if (ghost.targetCol >= COLS)
                toX = this.mazeOffsetX + this.field.w + this.cellW / 2;
            const p = Math.min(ghost.moveProgress, 1);
            visualX = fromX + (toX - fromX) * p;
            visualY = fromY + (toY - fromY) * p;
        } else {
            visualX = this.cellToX(ghost.col);
            visualY = this.cellToY(ghost.row);
        }

        if (ghost.frightened) {
            this.drawGhostBody(
                ghost.body,
                visualX,
                visualY,
                ghost.radius,
                COLORS.GRAY,
                0.6,
            );
            this.drawGhostEyes(
                ghost.eyes,
                visualX,
                visualY,
                ghost.radius,
                true,
            );
        } else {
            this.drawGhostBody(
                ghost.body,
                visualX,
                visualY,
                ghost.radius,
                this.ballColor,
                this.ballAlpha,
            );
            this.drawGhostEyes(
                ghost.eyes,
                visualX,
                visualY,
                ghost.radius,
                false,
            );
        }
    }

    respawnGhost(ghost) {
        ghost.col = ghost.spawnCol;
        ghost.row = ghost.spawnRow;
        ghost.targetCol = ghost.col;
        ghost.targetRow = ghost.row;
        ghost.moving = false;
        ghost.moveProgress = 0;
        ghost.eaten = false;
        ghost.frightened = this.powerModeActive;
        ghost.body.setVisible(true);
        ghost.eyes.setVisible(true);
    }

    // --- Collisions ---

    checkDotCollision() {
        const pacCenterCol = this.pacCol;
        const pacCenterRow = this.pacRow;

        // Check dots
        for (let i = this.dotObjects.length - 1; i >= 0; i--) {
            const dot = this.dotObjects[i];
            if (dot._col === pacCenterCol && dot._row === pacCenterRow) {
                // Eat dot
                dot.destroy();
                this.dotObjects.splice(i, 1);
                this.mazeData[dot._row][dot._col] = 0;
                this.dotsEaten++;
                this.score += DOT_SCORE;
                SynthSounds.tick();

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

        // Check power pellets
        for (const pellet of this.powerObjects) {
            if (!pellet.active) continue;
            if (pellet.col === pacCenterCol && pellet.row === pacCenterRow) {
                pellet.active = false;
                pellet.obj.destroy();
                this.mazeData[pellet.row][pellet.col] = 0;
                this.dotsEaten++;
                this.score += POWER_SCORE;
                SynthSounds.score();
                this.activatePowerMode();
            }
        }

        // Check if level cleared
        if (this.dotsEaten >= this.totalDots) {
            this.onLevelClear();
        }
    }

    checkGhostCollision() {
        for (const ghost of this.ghostObjs) {
            if (ghost.eaten) continue;

            // Simple grid-based collision — same cell
            const sameCell =
                ghost.col === this.pacCol && ghost.row === this.pacRow;
            // Also check if they're close enough during movement
            let closeEnough = false;
            if (!sameCell) {
                const gx = ghost.moving
                    ? this.cellToX(ghost.col) +
                      (this.cellToX(ghost.targetCol) -
                          this.cellToX(ghost.col)) *
                          Math.min(ghost.moveProgress, 1)
                    : this.cellToX(ghost.col);
                const gy = ghost.moving
                    ? this.cellToY(ghost.row) +
                      (this.cellToY(ghost.targetRow) -
                          this.cellToY(ghost.row)) *
                          Math.min(ghost.moveProgress, 1)
                    : this.cellToY(ghost.row);
                const px = this.pacmanObj.x;
                const py = this.pacmanObj.y;
                const dist = Math.sqrt((gx - px) ** 2 + (gy - py) ** 2);
                closeEnough = dist < this.cellW * 0.6;
            }

            if (sameCell || closeEnough) {
                if (ghost.frightened) {
                    // Eat ghost
                    this.eatGhost(ghost);
                } else {
                    // Pac-Man hit by ghost
                    this.playerHit();
                    return; // only one hit per frame
                }
            }
        }
    }

    eatGhost(ghost) {
        ghost.eaten = true;
        ghost.moving = false;
        ghost.body.setVisible(false);
        ghost.eyes.setVisible(false);
        ghost.respawnTimer = 3;
        this.ghostsEaten++;
        this.score += GHOST_EATEN_BONUS;

        const gx = this.cellToX(ghost.col);
        const gy = this.cellToY(ghost.row);
        SynthSounds.score();
        GameVFX.scorePopup(this, gx, gy - 10, `+${GHOST_EATEN_BONUS}`);
        GameVFX.particleBurst(this, gx, gy, this.ballColor, 6);

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            true,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);
    }

    playerHit() {
        this.isDead = true;
        this.totalDeaths++;
        this.lives--;

        SynthSounds.miss();
        GameVFX.screenShake(this);
        GameVFX.particleBurst(
            this,
            this.pacmanObj.x,
            this.pacmanObj.y,
            this.platformColor,
            8,
        );

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            false,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        if (this.lives <= 0) {
            SynthSounds.gameOver();
            this.endGame(false);
            return;
        }

        // Respawn after brief delay
        this.time.delayedCall(600, () => {
            this.respawnPacman();
        });
    }

    respawnPacman() {
        this.pacCol = this.playerSpawn.col;
        this.pacRow = this.playerSpawn.row;
        this.pacTargetCol = this.pacCol;
        this.pacTargetRow = this.pacRow;
        this.pacDir = 'none';
        this.pacNextDir = 'none';
        this.pacMoving = false;
        this.pacMoveProgress = 0;
        this.isDead = false;
        this.updatePacmanVisual();
    }

    // --- Power mode ---

    activatePowerMode() {
        this.powerModeActive = true;
        this.powerModeTimer = POWER_DURATION_MS / 1000;

        for (const ghost of this.ghostObjs) {
            if (!ghost.eaten) {
                ghost.frightened = true;
            }
        }
    }

    updatePowerMode(dt) {
        if (!this.powerModeActive) return;
        this.powerModeTimer -= dt;
        if (this.powerModeTimer <= 0) {
            this.powerModeActive = false;
            for (const ghost of this.ghostObjs) {
                ghost.frightened = false;
            }
        }
    }

    // --- Level progression ---

    onLevelClear() {
        this.isLevelTransition = true;
        this.level++;

        const cx = this.field.x + this.field.w / 2;
        const cy = this.field.y + this.field.h / 2;

        SynthSounds.victory();

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
                this.buildMaze();
            },
        });
    }

    // --- Contrast updates ---

    updateFellowEyeAlpha(alpha) {
        // Update Pac-Man + dots (platform color elements) alpha
        if (this.pacmanObj) this.pacmanObj.setAlpha(alpha);
        for (const dot of this.dotObjects) {
            dot.setAlpha(alpha);
        }
        for (const pellet of this.powerObjects) {
            if (pellet.active) pellet.obj.setAlpha(alpha);
        }
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
            this.dotsEaten + this.ghostsEaten + this.totalDeaths;
        const caught = this.dotsEaten + this.ghostsEaten;
        const result = {
            game: 'pacman',
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
            lives_remaining: this.lives,
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
