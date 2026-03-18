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

// ── Tuning constants ────────────────────────────────────────────────
const KNIVES_PER_LEVEL = 8;
const TARGET_RADIUS = 70;
const KNIFE_LENGTH = 36;
const KNIFE_WIDTH = 4;
const THROW_DURATION_MS = 150;
const MIN_ANGLE_DEG = 18;
const LIVES_TOTAL = 3;

// Speed profiles: rotation degrees-per-frame at 60 fps
const ROTATION_SPEED = { slow: 1.2, normal: 2.0, fast: 3.0, pro: 4.5 };
const PRE_PLACED_KNIVES = { slow: 0, normal: 1, fast: 2, pro: 3 };
const ROTATION_VARIATION = { slow: 0.5, normal: 1.0, fast: 1.5, pro: 2.0 };
const DIRECTION_CHANGE_MS = 2500;

export default class KnifeHitGameScene extends Phaser.Scene {
    constructor() {
        super('KnifeHitGameScene');
    }

    // ── Phaser lifecycle ──────────────────────────────────────────────
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

        EventBus.on('start-knifehit-game', this.startGameHandler);
        EventBus.on('safety-finish', this.safetyFinishHandler);
        EventBus.on('safety-extend', this.safetyExtendHandler);

        this.events.on('shutdown', this.shutdown, this);

        EventBus.emit('current-scene-ready', this);
    }

    // ── Game setup ────────────────────────────────────────────────────
    startGameplay() {
        const fw = GAME.WIDTH * GAME.FIELD_WIDTH_RATIO;
        const fh = GAME.HEIGHT * GAME.FIELD_HEIGHT_RATIO;
        const fx = (GAME.WIDTH - fw) / 2;
        const fy = (GAME.HEIGHT - fh) / 2;
        this.field = { x: fx, y: fy, w: fw, h: fh };

        // Dichoptic colour assignment
        const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
        const isKnifeLeft = this.settings.eyeConfig === 'platform_left';
        this.knifeColor = isKnifeLeft
            ? eyeColors.leftColor
            : eyeColors.rightColor;
        this.stuckColor = isKnifeLeft
            ? eyeColors.rightColor
            : eyeColors.leftColor;
        this.knifeAlpha =
            (isKnifeLeft
                ? this.settings.contrastLeft
                : this.settings.contrastRight) / 100;
        this.stuckAlpha =
            (isKnifeLeft
                ? this.settings.contrastRight
                : this.settings.contrastLeft) / 100;

        // Contrast engine
        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        // Level state
        this.level = 1;
        this.lives = LIVES_TOTAL;
        this.knivesStuck = 0;

        const speed = this.settings.speed || 'normal';
        this.baseRotationSpeed = ROTATION_SPEED[speed] || ROTATION_SPEED.normal;
        this.currentRotationSpeed = this.baseRotationSpeed;
        this.targetRotationSpeed = this.baseRotationSpeed;
        this.rotationVariation =
            ROTATION_VARIATION[speed] || ROTATION_VARIATION.normal;
        this.prePlacedCount = PRE_PLACED_KNIVES[speed] || 0;

        this.canThrow = true;
        this.isThrowAnimating = false;

        // ── Background grid + border (both eyes, gray) ──
        GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
        GameVisuals.styledBorder(this, fx, fy, fw, fh);

        // Fixation cross
        const crossSize = Math.max(
            fw * GAME.FIXATION_CROSS_RATIO,
            GAME.FIXATION_CROSS_MIN_PX,
        );
        const ccx = fx + fw / 2;
        const ccy = fy + fh / 2;
        GameVisuals.styledCross(this, ccx, ccy, crossSize);

        // ── Target (spinning circle) — gray, both eyes ──
        this.targetX = ccx;
        this.targetY = fy + fh * 0.35;
        this.targetAngle = 0;

        this.targetGfx = this.add.graphics();
        this.drawTarget();

        // ── Stuck knives container ──
        this.stuckKnives = []; // { angle, graphics }

        // ── Waiting knife (player's knife at bottom) ──
        this.waitingKnifeX = ccx;
        this.waitingKnifeY = fy + fh * 0.82;
        this.waitingKnife = this.add.graphics();
        this.drawWaitingKnife();

        // ── HUD ──
        this.hud = GameVisuals.createHUD(this, this.field, LIVES_TOTAL);

        // ── Pause button ──
        const pauseBtn = this.add
            .text(fx + 10, fy + fh - 20, t('game.pause'), {
                fontSize: '14px',
                color: COLORS.GRAY_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setInteractive({ useHandCursor: true });
        pauseBtn.on('pointerup', () => this.togglePause());

        // ── Input ──
        this.input.on('pointerup', () => {
            if (!this.isPaused) this.throwKnife();
        });
        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE,
        );

        // ── Safety timer ──
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

        // Direction-change timer
        this.directionTimer = this.time.addEvent({
            delay: DIRECTION_CHANGE_MS,
            callback: this.changeRotationSpeed,
            callbackScope: this,
            loop: true,
        });

        // Pre-place some knives on level 1
        this.placeInitialKnives(this.prePlacedCount);

        // Countdown then start
        this.isPaused = true;
        GameVFX.countdown(this, ccx, ccy, () => {
            this.isPaused = false;
            this.safetyTimer.start();
        });
    }

    // ── Drawing helpers ───────────────────────────────────────────────
    drawTarget() {
        this.targetGfx.clear();
        // Outer glow
        this.targetGfx.fillStyle(COLORS.GRAY, 0.06);
        this.targetGfx.fillCircle(
            this.targetX,
            this.targetY,
            TARGET_RADIUS + 10,
        );
        // Main circle
        this.targetGfx.fillStyle(COLORS.GRAY, 0.25);
        this.targetGfx.fillCircle(this.targetX, this.targetY, TARGET_RADIUS);
        // Inner rings for texture
        this.targetGfx.lineStyle(1, COLORS.GRAY, 0.15);
        this.targetGfx.strokeCircle(
            this.targetX,
            this.targetY,
            TARGET_RADIUS * 0.7,
        );
        this.targetGfx.strokeCircle(
            this.targetX,
            this.targetY,
            TARGET_RADIUS * 0.4,
        );
        // Center dot
        this.targetGfx.fillStyle(COLORS.GRAY, 0.4);
        this.targetGfx.fillCircle(this.targetX, this.targetY, 4);
    }

    drawWaitingKnife() {
        this.waitingKnife.clear();
        const x = this.waitingKnifeX;
        const y = this.waitingKnifeY;
        // Blade (tall narrow rect)
        this.waitingKnife.fillStyle(this.knifeColor, this.knifeAlpha);
        this.waitingKnife.fillRect(
            x - KNIFE_WIDTH / 2,
            y - KNIFE_LENGTH,
            KNIFE_WIDTH,
            KNIFE_LENGTH,
        );
        // Handle (slightly wider, below)
        this.waitingKnife.fillStyle(this.knifeColor, this.knifeAlpha * 0.6);
        this.waitingKnife.fillRect(
            x - KNIFE_WIDTH,
            y,
            KNIFE_WIDTH * 2,
            KNIFE_LENGTH * 0.5,
        );
        // Glow
        this.waitingKnife.fillStyle(this.knifeColor, this.knifeAlpha * 0.08);
        this.waitingKnife.fillCircle(
            x,
            y - KNIFE_LENGTH / 2,
            KNIFE_LENGTH * 0.8,
        );
    }

    drawStuckKnife(angleDeg) {
        const rad = Phaser.Math.DegToRad(angleDeg - 90); // -90 so 0 deg = top
        const tipX = this.targetX + Math.cos(rad) * TARGET_RADIUS;
        const tipY = this.targetY + Math.sin(rad) * TARGET_RADIUS;
        const baseX =
            this.targetX + Math.cos(rad) * (TARGET_RADIUS + KNIFE_LENGTH);
        const baseY =
            this.targetY + Math.sin(rad) * (TARGET_RADIUS + KNIFE_LENGTH);

        const g = this.add.graphics();
        g.lineStyle(KNIFE_WIDTH, this.stuckColor, this.stuckAlpha);
        g.beginPath();
        g.moveTo(tipX, tipY);
        g.lineTo(baseX, baseY);
        g.strokePath();

        // Small handle circle at end
        g.fillStyle(this.stuckColor, this.stuckAlpha * 0.6);
        g.fillCircle(baseX, baseY, KNIFE_WIDTH * 1.5);

        // Glow at tip
        g.fillStyle(this.stuckColor, this.stuckAlpha * 0.1);
        g.fillCircle(tipX, tipY, 6);

        return g;
    }

    // ── Target rotation management ────────────────────────────────────
    changeRotationSpeed() {
        const sign = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        const variation = Phaser.Math.FloatBetween(
            -this.rotationVariation,
            this.rotationVariation,
        );
        const maxSpeed = this.baseRotationSpeed * 2;
        this.targetRotationSpeed = Phaser.Math.Clamp(
            (this.currentRotationSpeed + variation) * sign,
            -maxSpeed,
            maxSpeed,
        );
    }

    placeInitialKnives(count) {
        for (let i = 0; i < count; i++) {
            const angle = (360 / count) * i + Phaser.Math.FloatBetween(-20, 20);
            const normalised = ((angle % 360) + 360) % 360;
            const gfx = this.drawStuckKnife(normalised);
            this.stuckKnives = [
                ...this.stuckKnives,
                { angle: normalised, graphics: gfx },
            ];
        }
    }

    // ── Throwing ──────────────────────────────────────────────────────
    throwKnife() {
        if (!this.canThrow || this.isThrowAnimating || this.gameEnded) return;
        this.canThrow = false;
        this.isThrowAnimating = true;

        SynthSounds.launch();

        // Animate waiting knife upward to target edge
        const targetEdgeY = this.targetY + TARGET_RADIUS;
        const knifeObj = { y: this.waitingKnifeY };

        this.tweens.add({
            targets: [knifeObj],
            y: targetEdgeY,
            duration: THROW_DURATION_MS,
            ease: 'Power2',
            onUpdate: () => {
                this.waitingKnife.clear();
                const x = this.waitingKnifeX;
                const y = knifeObj.y;
                this.waitingKnife.fillStyle(this.knifeColor, this.knifeAlpha);
                this.waitingKnife.fillRect(
                    x - KNIFE_WIDTH / 2,
                    y - KNIFE_LENGTH,
                    KNIFE_WIDTH,
                    KNIFE_LENGTH,
                );
                this.waitingKnife.fillStyle(
                    this.knifeColor,
                    this.knifeAlpha * 0.6,
                );
                this.waitingKnife.fillRect(
                    x - KNIFE_WIDTH,
                    y,
                    KNIFE_WIDTH * 2,
                    KNIFE_LENGTH * 0.5,
                );
            },
            onComplete: () => {
                this.isThrowAnimating = false;
                this.onKnifeArrived();
            },
        });
    }

    onKnifeArrived() {
        // The knife hits at the bottom of the circle (angle = 180 relative to current rotation)
        // In our coordinate system, the impact angle in "target space" is the
        // current target rotation + 180 (bottom).
        const impactAngle = (((this.targetAngle + 180) % 360) + 360) % 360;

        // Check collision with all stuck knives
        const collision = this.stuckKnives.some((sk) => {
            const diff = Math.abs(
                Phaser.Math.Angle.ShortestBetween(impactAngle, sk.angle),
            );
            return diff < MIN_ANGLE_DEG;
        });

        if (collision) {
            this.onCollision();
        } else {
            this.onSuccessfulStick(impactAngle);
        }
    }

    onSuccessfulStick(angleDeg) {
        const gfx = this.drawStuckKnife(angleDeg);
        this.stuckKnives = [
            ...this.stuckKnives,
            { angle: angleDeg, graphics: gfx },
        ];
        this.knivesStuck++;

        SynthSounds.hit();

        // Particle burst at the impact point on target edge
        const rad = Phaser.Math.DegToRad(angleDeg - 90);
        const impactX = this.targetX + Math.cos(rad) * TARGET_RADIUS;
        const impactY = this.targetY + Math.sin(rad) * TARGET_RADIUS;
        GameVFX.particleBurst(this, impactX, impactY, this.knifeColor, 6);
        GameVFX.scorePopup(this, impactX, impactY - 10);

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            true,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        if (this.knivesStuck >= KNIVES_PER_LEVEL) {
            this.nextLevel();
        } else {
            this.resetWaitingKnife();
        }
    }

    onCollision() {
        SynthSounds.miss();
        GameVFX.screenShake(this, 5, 200);

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            false,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        this.lives--;

        if (this.lives <= 0) {
            SynthSounds.gameOver();
            this.endGame(false);
            return;
        }

        // Animate the knife falling away
        const fallKnife = this.add.graphics();
        const x = this.waitingKnifeX;
        fallKnife.fillStyle(this.knifeColor, this.knifeAlpha);
        fallKnife.fillRect(
            x - KNIFE_WIDTH / 2,
            this.targetY + TARGET_RADIUS - KNIFE_LENGTH,
            KNIFE_WIDTH,
            KNIFE_LENGTH,
        );

        const fallObj = { y: 0, rotation: 0 };
        this.tweens.add({
            targets: [fallObj],
            y: GAME.HEIGHT,
            rotation: 5,
            duration: 600,
            ease: 'Power2',
            onUpdate: () => {
                fallKnife.clear();
                fallKnife.fillStyle(this.knifeColor, this.knifeAlpha * 0.6);
                fallKnife.fillRect(
                    x - KNIFE_WIDTH / 2,
                    this.targetY + TARGET_RADIUS + fallObj.y,
                    KNIFE_WIDTH,
                    KNIFE_LENGTH,
                );
            },
            onComplete: () => {
                fallKnife.destroy();
                this.resetWaitingKnife();
            },
        });
    }

    resetWaitingKnife() {
        this.waitingKnife.clear();
        this.drawWaitingKnife();
        this.canThrow = true;
    }

    // ── Level progression ─────────────────────────────────────────────
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
        // Clear all stuck knives
        this.stuckKnives.forEach((sk) => sk.graphics.destroy());
        this.stuckKnives = [];
        this.knivesStuck = 0;

        // Increase difficulty
        this.baseRotationSpeed = Math.min(this.baseRotationSpeed * 1.2, 6);
        this.currentRotationSpeed = this.baseRotationSpeed;
        this.targetRotationSpeed = this.baseRotationSpeed;
        this.rotationVariation = Math.min(this.rotationVariation * 1.15, 3);

        // More pre-placed knives each level
        const extraKnives = Math.min(this.level, 5);
        this.placeInitialKnives(extraKnives);

        this.resetWaitingKnife();
    }

    // ── Redraw stuck knives at rotated positions ──────────────────────
    redrawStuckKnives() {
        this.stuckKnives.forEach((sk) => {
            sk.graphics.clear();
            const displayAngle = sk.angle + this.targetAngle;
            const rad = Phaser.Math.DegToRad(displayAngle - 90);
            const tipX = this.targetX + Math.cos(rad) * TARGET_RADIUS;
            const tipY = this.targetY + Math.sin(rad) * TARGET_RADIUS;
            const baseX =
                this.targetX + Math.cos(rad) * (TARGET_RADIUS + KNIFE_LENGTH);
            const baseY =
                this.targetY + Math.sin(rad) * (TARGET_RADIUS + KNIFE_LENGTH);

            sk.graphics.lineStyle(
                KNIFE_WIDTH,
                this.stuckColor,
                this.stuckAlpha,
            );
            sk.graphics.beginPath();
            sk.graphics.moveTo(tipX, tipY);
            sk.graphics.lineTo(baseX, baseY);
            sk.graphics.strokePath();

            sk.graphics.fillStyle(this.stuckColor, this.stuckAlpha * 0.6);
            sk.graphics.fillCircle(baseX, baseY, KNIFE_WIDTH * 1.5);
        });
    }

    // ── Update loop ───────────────────────────────────────────────────
    update(_time, delta) {
        if (this.isPaused || this.gameEnded) return;
        if (!this.safetyTimer) return;

        // Space key to throw
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.throwKnife();
        }

        // Smooth rotation speed interpolation
        this.currentRotationSpeed = Phaser.Math.Linear(
            this.currentRotationSpeed,
            this.targetRotationSpeed,
            delta / 1000,
        );

        // Rotate target
        this.targetAngle += this.currentRotationSpeed;

        // Redraw stuck knives at new rotation
        this.redrawStuckKnives();

        // HUD
        if (this.hud) {
            const scoreStr = `\u2605 ${this.knivesStuck}/${KNIVES_PER_LEVEL}`;
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                scoreStr,
                this.lives,
            );
        }
    }

    // ── Contrast engine callback ──────────────────────────────────────
    updateFellowEyeAlpha(alpha) {
        this.stuckAlpha = alpha;
    }

    // ── Pause ─────────────────────────────────────────────────────────
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

    // ── End game & cleanup ────────────────────────────────────────────
    endGame(won) {
        if (this.gameEnded) return;
        this.gameEnded = true;

        this.safetyTimer.stop();

        const totalAttempts = this.contrastState.totalTrials;
        const result = {
            game: 'knifehit',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
            caught: this.contrastState.totalHits,
            total_spawned: totalAttempts,
            hit_rate:
                totalAttempts > 0
                    ? Math.round(
                          (this.contrastState.totalHits / totalAttempts) * 100,
                      ) / 100
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

    shutdown() {
        EventBus.removeListener('start-knifehit-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        if (this.directionTimer) this.directionTimer.destroy();
    }
}
