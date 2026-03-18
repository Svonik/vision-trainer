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

// --- Target type definitions ---
const TARGET_TYPES = [
    { key: 'slow', radius: 20, speed: 60, points: 1 },
    { key: 'medium', radius: 14, speed: 110, points: 2 },
    { key: 'fast', radius: 9, speed: 170, points: 3 },
];

const LANE_COUNT = 3;
const MAX_TARGETS = 6;
const AMMO_PER_ROUND = 20;
const POINTS_TO_ADVANCE_BASE = 15;
const SPAWN_INTERVAL_MS = 1200;

export default class ShootingGalleryGameScene extends Phaser.Scene {
    constructor() {
        super('ShootingGalleryGameScene');
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

        EventBus.on('start-shootinggallery-game', this.startGameHandler);
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

        // --- Dichoptic color setup ---
        const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
        const isTargetLeft = this.settings.eyeConfig === 'platform_left';
        this.targetColor = isTargetLeft
            ? eyeColors.leftColor
            : eyeColors.rightColor;
        this.crosshairColor = isTargetLeft
            ? eyeColors.rightColor
            : eyeColors.leftColor;
        // Clinical contrast engine
        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        // Fellow eye (crosshair) uses clinical contrast; amblyopic eye (targets) always 100%
        this.crosshairAlpha = this.contrastState.fellowEyeContrast / 100;
        this.targetAlpha = 1.0; // Amblyopic eye always 100% per clinical protocol

        // Game state
        this.level = 1;
        this.score = 0;
        this.ammo = AMMO_PER_ROUND;
        this.totalShots = 0;
        this.totalHits = 0;
        this.totalSpawned = 0;
        this.pointsToAdvance = POINTS_TO_ADVANCE_BASE;
        this.targets = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = SPAWN_INTERVAL_MS;

        // Speed multiplier from settings
        const speedMultipliers = {
            slow: 0.7,
            normal: 1.0,
            fast: 1.3,
            pro: 1.6,
        };
        this.speedMul = speedMultipliers[this.settings.speed] || 1.0;

        // --- Lane Y positions ---
        this.laneYs = this.computeLaneYs();

        // --- Background (both eyes — gray) ---
        GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
        GameVisuals.styledBorder(this, fx, fy, fw, fh);

        // Draw lane fences (gray, both eyes)
        this.drawLaneFences();

        // Fixation cross (both eyes)
        const crossSize = Math.max(
            fw * GAME.FIXATION_CROSS_RATIO,
            GAME.FIXATION_CROSS_MIN_PX,
        );
        const ccx = fx + fw / 2;
        const ccy = fy + fh / 2;
        GameVisuals.styledCross(this, ccx, ccy, crossSize);

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

        // Crosshair cursor (other eye color — follows mouse/touch)
        this.crosshair = this.add.graphics();
        this.drawCrosshair(ccx, ccy);

        // Input: mouse move updates crosshair, click shoots
        this.input.on('pointermove', (pointer) => {
            if (!this.isPaused) {
                this.drawCrosshair(pointer.x, pointer.y);
            }
        });
        this.input.on('pointerup', (pointer) => {
            if (!this.isPaused) {
                this.shoot(pointer.x, pointer.y);
            }
        });

        // Safety timer
        this.safetyTimer = createSafetyTimer({
            onWarning: () =>
                EventBus.emit('safety-timer-warning', { type: 'warning' }),
            onBreak: () =>
                EventBus.emit('safety-timer-warning', { type: 'break' }),
        });

        this.isPaused = false;
        this.pauseOverlay = null;
        this.gameEnded = false;

        // Tab blur -> auto-pause
        this.blurHandler = () => {
            if (!this.isPaused) this.togglePause();
        };
        this.game.events.on('blur', this.blurHandler);

        // Countdown then start
        this.isPaused = true;
        GameVFX.countdown(this, ccx, ccy, () => {
            this.isPaused = false;
            this.input.setDefaultCursor('none');
            this.safetyTimer.start();
            this.lastSpawnTime = 0;
        });
    }

    // --- Compute lane Y positions evenly distributed ---
    computeLaneYs() {
        const topMargin = this.field.y + 40;
        const bottomMargin = this.field.y + this.field.h - 40;
        const spacing = (bottomMargin - topMargin) / (LANE_COUNT - 1);
        const lanes = [];
        for (let i = 0; i < LANE_COUNT; i++) {
            lanes.push(topMargin + spacing * i);
        }
        return lanes;
    }

    // --- Draw lane fences (gray, both eyes) ---
    drawLaneFences() {
        const g = this.add.graphics();
        g.lineStyle(1, COLORS.GRAY, 0.12);
        for (const ly of this.laneYs) {
            // Dashed line across the lane
            const dashLen = 8;
            const gapLen = 6;
            let cx = this.field.x;
            while (cx < this.field.x + this.field.w) {
                g.moveTo(cx, ly + 25);
                g.lineTo(
                    Math.min(cx + dashLen, this.field.x + this.field.w),
                    ly + 25,
                );
                cx += dashLen + gapLen;
            }
        }
        g.strokePath();

        // Small fence posts at lane edges
        for (const ly of this.laneYs) {
            this.add.rectangle(
                this.field.x + 6,
                ly + 25,
                3,
                12,
                COLORS.GRAY,
                0.15,
            );
            this.add.rectangle(
                this.field.x + this.field.w - 6,
                ly + 25,
                3,
                12,
                COLORS.GRAY,
                0.15,
            );
        }
    }

    // --- Draw the crosshair (other eye color) ---
    drawCrosshair(x, y) {
        this.crosshair.clear();
        this.crosshair.lineStyle(2, this.crosshairColor, this.crosshairAlpha);
        const size = 14;
        // Horizontal line
        this.crosshair.beginPath();
        this.crosshair.moveTo(x - size, y);
        this.crosshair.lineTo(x + size, y);
        this.crosshair.strokePath();
        // Vertical line
        this.crosshair.beginPath();
        this.crosshair.moveTo(x, y - size);
        this.crosshair.lineTo(x, y + size);
        this.crosshair.strokePath();
        // Outer ring
        this.crosshair.strokeCircle(x, y, size + 4);
        // Small center dot
        this.crosshair.fillStyle(this.crosshairColor, this.crosshairAlpha);
        this.crosshair.fillCircle(x, y, 2);
        // Bring crosshair to top
        this.crosshair.setDepth(100);
    }

    // --- Spawn a new target ---
    spawnTarget() {
        if (this.targets.length >= MAX_TARGETS) return;

        // Pick random lane
        const laneIndex = Phaser.Math.Between(0, LANE_COUNT - 1);
        const laneY = this.laneYs[laneIndex];

        // Pick random target type, weighted by level (more fast targets at higher levels)
        const typeIndex = this.pickTargetType();
        const ttype = TARGET_TYPES[typeIndex];

        // Direction: left-to-right or right-to-left
        const goingRight = Math.random() > 0.5;
        const startX = goingRight
            ? this.field.x - ttype.radius
            : this.field.x + this.field.w + ttype.radius;

        // Scale speed by level and settings
        const levelSpeedBoost = 1 + (this.level - 1) * 0.12;
        const speed =
            ttype.speed *
            this.speedMul *
            levelSpeedBoost *
            (goingRight ? 1 : -1);

        // Scale radius down slightly at higher levels
        const levelRadiusShrink = Math.max(0.7, 1 - (this.level - 1) * 0.04);
        const radius = Math.max(
            6,
            Math.round(ttype.radius * levelRadiusShrink),
        );

        // Create target visual (target eye color)
        const visual = GameVisuals.glowCircle(
            this,
            startX,
            laneY,
            radius,
            this.targetColor,
            this.targetAlpha,
        );

        // Points label inside (gray, both eyes)
        const label = this.add
            .text(startX, laneY, `${ttype.points}`, {
                fontSize: `${Math.max(10, radius)}px`,
                color: COLORS.GRAY_HEX,
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setAlpha(0.6);

        const entry = {
            visual,
            label,
            x: startX,
            y: laneY,
            radius,
            speed,
            points: ttype.points,
            typeKey: ttype.key,
        };

        this.targets.push(entry);
        this.totalSpawned++;
    }

    // --- Pick target type index, biased by level ---
    pickTargetType() {
        // At level 1: mostly slow/medium. Higher levels: more fast targets.
        const fastWeight = Math.min(0.5, 0.1 + (this.level - 1) * 0.08);
        const medWeight = Math.min(0.4, 0.3 + (this.level - 1) * 0.02);
        const slowWeight = 1 - fastWeight - medWeight;
        const r = Math.random();
        if (r < slowWeight) return 0;
        if (r < slowWeight + medWeight) return 1;
        return 2;
    }

    // --- Shoot at position ---
    shoot(px, py) {
        if (this.ammo <= 0) return;

        this.ammo--;
        this.totalShots++;
        SynthSounds.launch();

        // Muzzle flash VFX at click position
        GameVFX.circleFlash(this, px, py, 8, COLORS.WHITE, 100);

        // Check hits (iterate backward for safe removal)
        let hitAny = false;
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const tgt = this.targets[i];
            const dx = px - tgt.x;
            const dy = py - tgt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= tgt.radius + 8) {
                this.hitTarget(i);
                hitAny = true;
                break; // Only hit one target per shot
            }
        }

        if (!hitAny) {
            SynthSounds.miss();
            this.contrastState = recordTrial(
                this.contrastState,
                this.contrastConfig,
                false,
            );
            this.updateTargetAlpha();
        }

        // Out of ammo with no advance -> check if round ends
        if (this.ammo <= 0 && this.score < this.pointsToAdvance) {
            this.time.delayedCall(500, () => {
                if (!this.gameEnded) this.endGame(false);
            });
        }
    }

    // --- Hit a target ---
    hitTarget(index) {
        const tgt = this.targets[index];
        const { x, y, points } = tgt;

        // Destroy visuals
        tgt.visual.destroy();
        tgt.label.destroy();
        this.targets.splice(index, 1);

        // Effects
        SynthSounds.hit();
        GameVFX.particleBurst(this, x, y, this.targetColor, 10);
        GameVFX.scorePopup(this, x, y, `+${points}`);
        GameVFX.screenShake(this, 2, 80);

        // Record hit
        this.totalHits++;
        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            true,
        );
        this.updateTargetAlpha();

        // Score
        this.score += points;

        // Check level advance
        if (this.score >= this.pointsToAdvance) {
            this.nextLevel();
        }
    }

    // --- Update crosshair (fellow eye) alpha from contrast engine ---
    updateTargetAlpha() {
        this.crosshairAlpha = this.contrastState.fellowEyeContrast / 100;
    }

    // --- Update loop ---
    update(_time, delta) {
        if (this.isPaused) return;
        if (!this.safetyTimer) return;

        const elapsed = this.safetyTimer.getElapsedMs();

        // Spawn targets at intervals
        if (
            elapsed - this.lastSpawnTime >= this.spawnInterval &&
            this.targets.length < MAX_TARGETS
        ) {
            this.spawnTarget();
            this.lastSpawnTime = elapsed;
        }

        // Move targets horizontally
        const dtSec = delta / 1000;
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const tgt = this.targets[i];
            tgt.x += tgt.speed * dtSec;
            tgt.visual.setPosition(tgt.x, tgt.y);
            tgt.label.setPosition(tgt.x, tgt.y);

            // Update alpha in case contrast changed
            tgt.visual.setAlpha(this.targetAlpha);

            // Remove if off-screen
            if (
                tgt.speed > 0 &&
                tgt.x > this.field.x + this.field.w + tgt.radius + 10
            ) {
                tgt.visual.destroy();
                tgt.label.destroy();
                this.targets.splice(i, 1);
            } else if (
                tgt.speed < 0 &&
                tgt.x < this.field.x - tgt.radius - 10
            ) {
                tgt.visual.destroy();
                tgt.label.destroy();
                this.targets.splice(i, 1);
            }
        }

        // HUD
        if (this.hud) {
            const ammoStr = `${this.score}pt | ${this.ammo}`;
            GameVisuals.updateHUD(this.hud, this.level, elapsed, ammoStr);
        }
    }

    // --- Toggle pause ---
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

    // --- Next level ---
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
        this.score = 0;
        this.ammo = AMMO_PER_ROUND;
        // Increase difficulty: more points needed, faster spawns
        this.pointsToAdvance = POINTS_TO_ADVANCE_BASE + (this.level - 1) * 5;
        this.spawnInterval = Math.max(
            400,
            SPAWN_INTERVAL_MS - (this.level - 1) * 100,
        );
    }

    // --- End game ---
    endGame(won) {
        if (this.gameEnded) return;
        this.gameEnded = true;

        this.safetyTimer.stop();

        const result = {
            game: 'shootinggallery',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
            caught: this.totalHits,
            total_spawned: this.totalSpawned,
            hit_rate:
                this.totalShots > 0
                    ? Math.round((this.totalHits / this.totalShots) * 100) / 100
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

    // --- Cleanup ---
    shutdown() {
        EventBus.removeListener(
            'start-shootinggallery-game',
            this.startGameHandler,
        );
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        this.input.setDefaultCursor('default');
    }
}
