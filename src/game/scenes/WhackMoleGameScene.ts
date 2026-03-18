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

const WIN_COUNT = 20;
const GRID_COLS = 4;
const GRID_ROWS = 3;
const HOLE_RADIUS = 28;
const MOLE_RADIUS = 22;

const LIFESPAN_MS = { slow: 3000, normal: 2500, fast: 2000, pro: 1500 };
const SPAWN_INTERVAL_MS = { slow: 1800, normal: 1400, fast: 1000, pro: 700 };
const MAX_MOLES = { slow: 1, normal: 2, fast: 2, pro: 3 };

export default class WhackMoleGameScene extends Phaser.Scene {
    constructor() {
        super('WhackMoleGameScene');
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

        EventBus.on('start-whackmole-game', this.startGameHandler);
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
        const isMoleLeft = this.settings.eyeConfig === 'platform_left';
        this.moleColor = isMoleLeft
            ? eyeColors.leftColor
            : eyeColors.rightColor;
        this.crosshairColor = isMoleLeft
            ? eyeColors.rightColor
            : eyeColors.leftColor;
        this.moleAlpha =
            (isMoleLeft
                ? this.settings.contrastLeft
                : this.settings.contrastRight) / 100;
        this.crosshairAlpha =
            (isMoleLeft
                ? this.settings.contrastRight
                : this.settings.contrastLeft) / 100;

        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        this.level = 1;
        const speed = this.settings.speed || 'normal';
        this.moleLifespan = LIFESPAN_MS[speed] || LIFESPAN_MS.normal;
        this.spawnInterval =
            SPAWN_INTERVAL_MS[speed] || SPAWN_INTERVAL_MS.normal;
        this.maxMoles = MAX_MOLES[speed] || MAX_MOLES.normal;

        // Background grid + border (both eyes)
        GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
        GameVisuals.styledBorder(this, fx, fy, fw, fh);

        // Fixation cross (both eyes)
        const crossSize = Math.max(
            fw * GAME.FIXATION_CROSS_RATIO,
            GAME.FIXATION_CROSS_MIN_PX,
        );
        const ccx = fx + fw / 2;
        const ccy = fy + fh / 2;
        GameVisuals.styledCross(this, ccx, ccy, crossSize);

        // Build grid of holes (gray — both eyes)
        this.holes = this.buildHoleGrid();

        // Score tracking
        this.hits = 0;
        this.totalSpawned = 0;

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

        // Crosshair cursor (fellow eye)
        this.crosshair = this.add.graphics();
        this.drawCrosshair(ccx, ccy);

        // Active moles: { holeIndex, container, popTween, spawnTime }
        this.moles = [];
        // Track which holes have moles to prevent double-spawn
        this.occupiedHoles = new Set();

        // Input
        this.input.on('pointermove', (pointer) => {
            if (!this.isPaused) {
                this.drawCrosshair(pointer.x, pointer.y);
            }
        });
        this.input.on('pointerup', (pointer) => {
            if (!this.isPaused) {
                this.tryHitMole(pointer.x, pointer.y);
            }
        });

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

        this.isPaused = false;
        this.pauseOverlay = null;
        this.gameEnded = false;
        this.lastSpawnTime = 0;

        // Tab blur -> auto-pause
        this.blurHandler = () => {
            if (!this.isPaused) this.togglePause();
        };
        this.game.events.on('blur', this.blurHandler);

        // Countdown, then start
        this.isPaused = true;
        GameVFX.countdown(this, ccx, ccy, () => {
            this.isPaused = false;
            this.input.setDefaultCursor('none');
            this.safetyTimer.start();
            this.spawnMole();
        });
    }

    buildHoleGrid() {
        const holes = [];
        const gridW = this.field.w * 0.8;
        const gridH = this.field.h * 0.65;
        const gridX = this.field.x + (this.field.w - gridW) / 2;
        const gridY = this.field.y + (this.field.h - gridH) / 2 + 15;

        const cellW = gridW / GRID_COLS;
        const cellH = gridH / GRID_ROWS;

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cx = gridX + cellW * col + cellW / 2;
                const cy = gridY + cellH * row + cellH / 2;

                // Hole base: dark ellipse (gray, both eyes)
                const holeG = this.add.graphics();
                holeG.fillStyle(COLORS.GRAY, 0.15);
                holeG.fillEllipse(
                    cx,
                    cy + HOLE_RADIUS * 0.3,
                    HOLE_RADIUS * 2.2,
                    HOLE_RADIUS * 1.2,
                );

                // Hole ring
                holeG.lineStyle(1.5, COLORS.GRAY, 0.25);
                holeG.strokeEllipse(
                    cx,
                    cy + HOLE_RADIUS * 0.3,
                    HOLE_RADIUS * 2.2,
                    HOLE_RADIUS * 1.2,
                );

                holes.push({ x: cx, y: cy, graphics: holeG });
            }
        }

        return holes;
    }

    drawCrosshair(x, y) {
        this.crosshair.clear();
        this.crosshair.lineStyle(2, this.crosshairColor, this.crosshairAlpha);
        const size = 12;
        this.crosshair.beginPath();
        this.crosshair.moveTo(x - size, y);
        this.crosshair.lineTo(x + size, y);
        this.crosshair.strokePath();
        this.crosshair.beginPath();
        this.crosshair.moveTo(x, y - size);
        this.crosshair.lineTo(x, y + size);
        this.crosshair.strokePath();
        this.crosshair.strokeCircle(x, y, size + 2);
    }

    spawnMole() {
        if (this.isPaused || this.gameEnded) return;
        if (this.moles.length >= this.maxMoles) return;

        // Pick a random unoccupied hole
        const availableIndices = [];
        for (let i = 0; i < this.holes.length; i++) {
            if (!this.occupiedHoles.has(i)) {
                availableIndices.push(i);
            }
        }
        if (availableIndices.length === 0) return;

        const holeIndex = Phaser.Math.RND.pick(availableIndices);
        const hole = this.holes[holeIndex];

        // Mole visual: colored circle with glow (target eye only)
        const container = this.add.container(hole.x, hole.y);
        container.setScale(0);

        // Mole body — glow circle
        const glowOuter = this.add.circle(
            0,
            0,
            MOLE_RADIUS * 1.5,
            this.moleColor,
            this.moleAlpha * 0.08,
        );
        const glowMid = this.add.circle(
            0,
            0,
            MOLE_RADIUS * 1.2,
            this.moleColor,
            this.moleAlpha * 0.12,
        );
        const body = this.add.circle(
            0,
            0,
            MOLE_RADIUS,
            this.moleColor,
            this.moleAlpha,
        );
        const highlight = this.add.circle(
            0,
            -MOLE_RADIUS * 0.3,
            MOLE_RADIUS * 0.35,
            this.moleColor,
            Math.min(this.moleAlpha * 1.3, 1),
        );

        // Eyes (gray, both eyes — always visible)
        const eyeL = this.add.circle(-7, -5, 3.5, COLORS.BLACK, 0.85);
        const eyeR = this.add.circle(7, -5, 3.5, COLORS.BLACK, 0.85);
        // Nose (gray)
        const nose = this.add.circle(0, 3, 2.5, COLORS.GRAY, 0.5);

        container.add([glowOuter, glowMid, body, highlight, eyeL, eyeR, nose]);

        // Pop-up tween (scale 0 -> 1)
        const popTween = this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Back.easeOut',
        });

        const entry = {
            holeIndex,
            container,
            popTween,
            spawnTime: this.safetyTimer.getElapsedMs(),
        };

        this.moles.push(entry);
        this.occupiedHoles.add(holeIndex);
        this.totalSpawned++;
    }

    tryHitMole(px, py) {
        for (let i = this.moles.length - 1; i >= 0; i--) {
            const m = this.moles[i];
            const dx = px - m.container.x;
            const dy = py - m.container.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= HOLE_RADIUS + 8) {
                this.hitMole(i);
                return;
            }
        }
    }

    hitMole(index) {
        const m = this.moles[index];
        const { x, y } = m.container;

        m.popTween.stop();
        this.occupiedHoles.delete(m.holeIndex);

        // Squash animation then destroy
        this.tweens.add({
            targets: m.container,
            scaleX: 1.3,
            scaleY: 0.2,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => m.container.destroy(),
        });
        this.moles.splice(index, 1);

        SynthSounds.hit();
        GameVFX.particleBurst(this, x, y, this.moleColor, 8);
        GameVFX.scorePopup(this, x, y);

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            true,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        this.hits++;
        if (this.hud)
            this.hud.scoreText.setText(`\u2605 ${this.hits}/${WIN_COUNT}`);

        if (this.hits >= WIN_COUNT) {
            this.nextLevel();
            return;
        }
    }

    expireMole(index) {
        const m = this.moles[index];

        m.popTween.stop();
        this.occupiedHoles.delete(m.holeIndex);

        // Sink back down
        this.tweens.add({
            targets: m.container,
            scaleX: 0,
            scaleY: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => m.container.destroy(),
        });
        this.moles.splice(index, 1);

        SynthSounds.miss();

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            false,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);
    }

    shutdown() {
        EventBus.removeListener('start-whackmole-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        this.input.setDefaultCursor('default');
    }

    update(_time, _delta) {
        if (this.isPaused || this.gameEnded) return;
        if (!this.safetyTimer) return;

        const now = this.safetyTimer.getElapsedMs();

        // Check mole lifespans
        for (let i = this.moles.length - 1; i >= 0; i--) {
            const m = this.moles[i];
            const age = now - m.spawnTime;
            if (age >= this.moleLifespan) {
                this.expireMole(i);
            }
        }

        // Spawn new moles at intervals
        if (
            now - this.lastSpawnTime >= this.spawnInterval &&
            this.moles.length < this.maxMoles
        ) {
            this.lastSpawnTime = now;
            this.spawnMole();
        }

        // HUD update
        if (this.hud) {
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                `\u2605 ${this.hits}/${WIN_COUNT}`,
            );
        }
    }

    updateFellowEyeAlpha(alpha) {
        this.moleAlpha = alpha;
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

    nextLevel() {
        this.level++;
        this.isPaused = true;

        const cx = this.field.x + this.field.w / 2;
        const cy = this.field.y + this.field.h / 2;

        const levelText = this.add
            .text(
                cx,
                cy,
                `\u0423\u0440\u043E\u0432\u0435\u043D\u044C ${this.level}!`,
                {
                    fontSize: '36px',
                    color: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    fontStyle: 'bold',
                },
            )
            .setOrigin(0.5)
            .setAlpha(0);

        SynthSounds.victory();

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
                this.isPaused = false;
                this.resetForNextLevel();
            },
        });
    }

    resetForNextLevel() {
        this.hits = 0;
        if (this.hud)
            this.hud.scoreText.setText(`\u2605 ${this.hits}/${WIN_COUNT}`);
        // Increase difficulty: shorter lifespan, faster spawns
        this.moleLifespan = Math.max(600, Math.round(this.moleLifespan * 0.85));
        this.spawnInterval = Math.max(
            400,
            Math.round(this.spawnInterval * 0.85),
        );
        this.maxMoles = Math.min(this.maxMoles + 1, GRID_COLS * GRID_ROWS - 2);
    }

    endGame(won) {
        if (this.gameEnded) return;
        this.gameEnded = true;

        this.safetyTimer.stop();

        const result = {
            game: 'whackmole',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
            caught: this.hits,
            total_spawned: this.totalSpawned,
            hit_rate:
                this.totalSpawned > 0
                    ? Math.round((this.hits / this.totalSpawned) * 100) / 100
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
