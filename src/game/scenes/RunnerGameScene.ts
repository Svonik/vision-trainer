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

const SCROLL_SPEEDS = { slow: 140, normal: 200, fast: 270, pro: 350 };
const GRAVITY = 900; // px/s² — snappy jump feel
const JUMP_IMPULSE = -380; // px/s (first jump)
const DOUBLE_JUMP_IMPULSE = -340; // px/s (second jump — slightly weaker)
const OBSTACLE_SPAWN_MIN = 1200; // ms
const OBSTACLE_SPAWN_MAX = 2400; // ms
const RUNNER_X_RATIO = 0.18; // runner horizontal position within field
const GROUND_THICKNESS = 4;
const TRIAL_INTERVAL = 5; // record a "hit" trial every N obstacles passed

export default class RunnerGameScene extends Phaser.Scene {
    constructor() {
        super('RunnerGameScene');
    }

    create() {
        SynthSounds.resume();

        this.startGameHandler = (settings) => {
            this.settings = createGameSettings(settings || {});
            this.startGameplay();
        };
        this.safetyFinishHandler = () => {
            this.endGame();
        };
        this.safetyExtendHandler = () => {
            if (this.safetyTimer?.canExtend()) {
                this.safetyTimer.extend();
                this.isPaused = false;
            }
        };

        EventBus.on('start-runner-game', this.startGameHandler);
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

        // Eye colors — dichoptic split
        const eyeColors = getEyeColors(this.settings.glassesType || 'red-cyan');
        const isLeftPlatform = this.settings.eyeConfig === 'platform_left';
        // Runner → platformColor (one eye), Obstacles → ballColor (other eye)
        this.runnerColor = isLeftPlatform
            ? eyeColors.leftColor
            : eyeColors.rightColor;
        this.obstacleColor = isLeftPlatform
            ? eyeColors.rightColor
            : eyeColors.leftColor;
        this.runnerAlpha =
            (isLeftPlatform
                ? this.settings.contrastLeft
                : this.settings.contrastRight) / 100;
        this.obstacleAlpha =
            (isLeftPlatform
                ? this.settings.contrastRight
                : this.settings.contrastLeft) / 100;

        // Contrast engine
        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            this.settings.fellowEyeContrast ?? 30,
        );

        // Game state
        this.scrollSpeed = SCROLL_SPEEDS[this.settings.speed] || 200;
        this.score = 0;
        this.obstaclesPassed = 0;
        this.totalSpawned = 0;
        this.isPaused = false;
        this.pauseOverlay = null;
        this.gameOver = false;
        this.gameEnded = false;
        this.level = 1;
        this.obstaclesForNextLevel = 10;
        this.jumpsRemaining = 2;
        this.trailTimer = 0;

        // Background (BLACK — both eyes)
        this.add.rectangle(fx + fw / 2, fy + fh / 2, fw, fh, COLORS.BLACK);

        // Field border & grid (GRAY — both eyes)
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

        // Ground line (GRAY — both eyes)
        this.groundY = fy + fh - GROUND_THICKNESS;
        this.add.rectangle(
            fx + fw / 2,
            this.groundY + GROUND_THICKNESS / 2,
            fw,
            GROUND_THICKNESS,
            COLORS.GRAY,
            0.4,
        );

        // Runner character (platformColor — one eye)
        const runnerSize = Math.round(fw * 0.04);
        const runnerX = fx + fw * RUNNER_X_RATIO;
        const runnerStartY = this.groundY - runnerSize / 2;
        this.runner = { x: runnerX, y: runnerStartY, vy: 0, size: runnerSize };
        this.runnerVisual = GameVisuals.glowRect(
            this,
            runnerX,
            runnerStartY,
            runnerSize,
            runnerSize,
            this.runnerColor,
            this.runnerAlpha,
            3,
        );
        GameVisuals.pulse(this, this.runnerVisual, 0.94, 1.06, 500);

        // Obstacles array
        this.obstacles = [];
        this.obstacleGraphics = [];
        this.lastSpawnTime = 0;
        this.nextSpawnDelay = this.randomSpawnDelay();

        // HUD (GRAY — both eyes)
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

        // Input: click / tap to jump
        this.input.on('pointerup', () => {
            if (this.isPaused || this.gameOver) return;
            this.jump();
        });

        // Keyboard input
        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE,
        );
        this.upKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.UP,
        );
        this.wKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.W,
        );
        this.escKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC,
        );

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

        // Tab blur → auto-pause
        this.blurHandler = () => {
            if (!this.isPaused) this.togglePause();
        };
        this.game.events.on('blur', this.blurHandler);

        // Pause until countdown finishes
        this.isPaused = true;
        GameVFX.countdown(this, ccx, ccy, () => {
            this.isPaused = false;
            this.input.setDefaultCursor('none');
            this.safetyTimer.start();
            this.lastSpawnTime = this.time.now;
        });
    }

    shutdown() {
        EventBus.removeListener('start-runner-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        this.input.setDefaultCursor('default');
    }

    update(time, delta) {
        if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.togglePause();
            return;
        }
        if (this.isPaused || this.gameOver) return;
        if (!this.runner) return;

        const dt = delta / 1000;

        // Jump input (Space / Up / W)
        if (
            (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
            (this.upKey && Phaser.Input.Keyboard.JustDown(this.upKey)) ||
            (this.wKey && Phaser.Input.Keyboard.JustDown(this.wKey))
        ) {
            this.jump();
        }

        // Runner physics — gravity
        const newVy = this.runner.vy + GRAVITY * dt;
        const newY = this.runner.y + newVy * dt;
        this.runner = { ...this.runner, vy: newVy, y: newY };

        // Ground collision
        const groundHitY = this.groundY - this.runner.size / 2;
        if (this.runner.y >= groundHitY) {
            this.runner = { ...this.runner, y: groundHitY, vy: 0 };
            this.jumpsRemaining = 2;
        }

        // Ceiling collision
        const ceilY = this.field.y + this.runner.size / 2;
        if (this.runner.y < ceilY) {
            this.runner = { ...this.runner, y: ceilY, vy: 0 };
        }

        // Update runner visual position
        if (this.runnerVisual) {
            this.runnerVisual.y = this.runner.y;
        }

        // Particle trail behind runner (throttled)
        this.trailTimer += delta;
        if (this.trailTimer > 60) {
            this.trailTimer = 0;
            const isAirborne = this.runner.y < groundHitY - 2;
            if (isAirborne) {
                GameVFX.addTrailDot(
                    this,
                    this.runner.x - this.runner.size / 2,
                    this.runner.y,
                    this.runnerColor,
                    2,
                    this.runnerAlpha * 0.5,
                );
            }
        }

        // Spawn obstacles
        const now = time;
        if (now - this.lastSpawnTime >= this.nextSpawnDelay) {
            this.spawnObstacle();
            this.lastSpawnTime = now;
            this.nextSpawnDelay = this.randomSpawnDelay();
        }

        // Move obstacles and check collisions
        const moveAmount = this.scrollSpeed * dt;
        const toRemove = [];

        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            const updated = { ...obs, x: obs.x - moveAmount };
            this.obstacles[i] = updated;

            // Update graphic position
            const gfx = this.obstacleGraphics[i];
            if (gfx) gfx.x = updated.x;

            // Score: runner passed the obstacle
            if (
                !updated.scored &&
                updated.x + updated.w / 2 < this.runner.x - this.runner.size / 2
            ) {
                this.obstacles[i] = { ...updated, scored: true };
                this.obstaclesPassed++;
                this.score++;
                if (this.hud) this.hud.scoreText.setText(`${this.score}m`);
                SynthSounds.score();

                // Record trial every TRIAL_INTERVAL obstacles
                if (this.obstaclesPassed % TRIAL_INTERVAL === 0) {
                    this.contrastState = recordTrial(
                        this.contrastState,
                        this.contrastConfig,
                        true,
                    );
                    this.updateFellowEyeAlpha(
                        this.contrastState.fellowEyeContrast / 100,
                    );
                }

                // Level up
                if (this.obstaclesPassed >= this.obstaclesForNextLevel) {
                    this.levelUp();
                }
            }

            // Collision detection (AABB)
            if (this.checkCollision(this.runner, updated)) {
                this.triggerGameOver();
                return;
            }

            // Remove off-screen obstacles
            if (updated.x + updated.w / 2 < this.field.x) {
                toRemove.push(i);
            }
        }

        // Remove off-screen (reverse order)
        for (let ri = toRemove.length - 1; ri >= 0; ri--) {
            const idx = toRemove[ri];
            if (this.obstacleGraphics[idx])
                this.obstacleGraphics[idx].destroy();
            this.obstacles.splice(idx, 1);
            this.obstacleGraphics.splice(idx, 1);
        }

        // Distance-based score (increases with time)
        const distanceScore = Math.floor(
            (this.scrollSpeed * (this.safetyTimer?.getElapsedMs() ?? 0)) / 5000,
        );
        this.score = Math.max(this.score, distanceScore);

        // HUD update
        if (this.safetyTimer && this.hud) {
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                `${this.score}m`,
            );
        }
    }

    jump() {
        if (!this.runner || this.jumpsRemaining <= 0) return;

        const isFirstJump = this.jumpsRemaining === 2;
        const impulse = isFirstJump ? JUMP_IMPULSE : DOUBLE_JUMP_IMPULSE;
        this.runner = { ...this.runner, vy: impulse };
        this.jumpsRemaining--;

        SynthSounds.launch();

        // Double-jump VFX — small burst at feet
        if (!isFirstJump) {
            GameVFX.circleFlash(
                this,
                this.runner.x,
                this.runner.y + this.runner.size / 2,
                this.runner.size * 0.6,
                this.runnerColor,
                150,
            );
        }
    }

    spawnObstacle() {
        const { x: fx, y: fy, w: fw, h: fh } = this.field;

        // Randomize obstacle type: short, medium, tall
        const types = [
            { wRatio: 0.03, hRatio: 0.06 }, // short
            { wRatio: 0.03, hRatio: 0.1 }, // medium
            { wRatio: 0.04, hRatio: 0.14 }, // tall
        ];

        // Higher levels can spawn taller obstacles
        const maxType = this.level >= 3 ? 3 : this.level >= 2 ? 2 : 2;
        const typeIdx = Phaser.Math.Between(0, maxType - 1);
        const obsType = types[typeIdx];

        const obsW = Math.round(fw * obsType.wRatio);
        const obsH = Math.round(fh * obsType.hRatio);
        const obsX = fx + fw + obsW;
        const obsY = this.groundY - obsH / 2;

        // Create glow rect for obstacle (obstacleColor — other eye)
        const gfx = GameVisuals.glowRect(
            this,
            obsX,
            obsY,
            obsW,
            obsH,
            this.obstacleColor,
            this.obstacleAlpha,
            2,
        );

        this.obstacles.push({
            x: obsX,
            y: obsY,
            w: obsW,
            h: obsH,
            scored: false,
        });
        this.obstacleGraphics.push(gfx);
        this.totalSpawned++;
    }

    randomSpawnDelay() {
        // Decrease spawn interval as level increases
        const levelFactor = Math.max(0.4, 1 - (this.level - 1) * 0.08);
        const min = OBSTACLE_SPAWN_MIN * levelFactor;
        const max = OBSTACLE_SPAWN_MAX * levelFactor;
        return Phaser.Math.Between(Math.round(min), Math.round(max));
    }

    checkCollision(runner, obstacle) {
        const rHalfW = runner.size / 2;
        const rHalfH = runner.size / 2;
        const oHalfW = obstacle.w / 2;
        const oHalfH = obstacle.h / 2;

        // Shrink hitbox slightly for forgiving collisions
        const margin = rHalfW * 0.2;

        const rLeft = runner.x - rHalfW + margin;
        const rRight = runner.x + rHalfW - margin;
        const rTop = runner.y - rHalfH + margin;
        const rBot = runner.y + rHalfH;

        const oLeft = obstacle.x - oHalfW;
        const oRight = obstacle.x + oHalfW;
        const oTop = obstacle.y - oHalfH;
        const oBot = obstacle.y + oHalfH;

        return rRight > oLeft && rLeft < oRight && rBot > oTop && rTop < oBot;
    }

    levelUp() {
        this.level++;
        this.obstaclesForNextLevel += 10;
        this.scrollSpeed *= 1.08;
        if (this.hud) this.hud.levelText.setText(`Ур.${this.level}`);

        const cx = this.field.x + this.field.w / 2;
        const cy = this.field.y + this.field.h / 2;
        const flashText = this.add
            .text(cx, cy, `Уровень ${this.level}!`, {
                fontSize: '32px',
                color: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setAlpha(0);
        this.tweens.add({
            targets: flashText,
            alpha: 1,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            yoyo: true,
            hold: 1000,
            onComplete: () => flashText.destroy(),
        });
    }

    triggerGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;

        // Flash runner visual
        if (this.runnerVisual) {
            this.tweens.killTweensOf(this.runnerVisual);
            this.runnerVisual.setAlpha(0.5);
        }

        SynthSounds.gameOver();
        GameVFX.screenShake(this, 5, 150);
        GameVFX.particleBurst(
            this,
            this.runner.x,
            this.runner.y,
            this.runnerColor,
            10,
        );

        // Record miss trial
        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            false,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        this.time.delayedCall(400, () => {
            this.endGame();
        });
    }

    updateFellowEyeAlpha(alpha) {
        this.obstacleAlpha = alpha;
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
        quitBtn.on('pointerup', () => this.endGame());

        this.pauseOverlay = [
            bg,
            title,
            resumeBtn,
            resumeText,
            quitBtn,
            quitText,
        ];
    }

    endGame() {
        if (this.gameEnded) return;
        this.gameEnded = true;

        if (this.safetyTimer) this.safetyTimer.stop();

        const result = {
            game: 'runner',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(
                (this.safetyTimer?.getElapsedMs() ?? 0) / 1000,
            ),
            caught: this.obstaclesPassed,
            total_spawned: this.totalSpawned,
            hit_rate:
                this.totalSpawned > 0
                    ? Math.round(
                          (this.obstaclesPassed / this.totalSpawned) * 100,
                      ) / 100
                    : 0,
            contrast_left: this.settings.contrastLeft,
            contrast_right: this.settings.contrastRight,
            speed: this.settings.speed,
            eye_config: this.settings.eyeConfig,
            completed: false,
            level: this.level,
            fellow_contrast_start: this.settings?.fellowEyeContrast ?? 30,
            fellow_contrast_end: this.contrastState.fellowEyeContrast,
            window_accuracy: getAccuracy(this.contrastState),
            total_trials: this.contrastState.totalTrials,
        };

        EventBus.emit('game-complete', { result, settings: this.settings });
    }
}
