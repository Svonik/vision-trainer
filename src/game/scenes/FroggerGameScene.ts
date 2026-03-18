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

const OBSTACLE_SPEEDS = { slow: 60, normal: 100, fast: 150, pro: 200 };
const LANE_COUNT = 5;
const LANE_H = 50;
const SAFE_ZONE_H = 50;
const OBSTACLE_W = 60;
const OBSTACLE_H = 30;
const PLAYER_W = 30;
const PLAYER_H = 30;
const MAX_LIVES = 3;
const WIN_CROSSINGS = 10;

export default class FroggerGameScene extends Phaser.Scene {
    constructor() {
        super('FroggerGameScene');
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

        EventBus.on('start-frogger-game', this.startGameHandler);
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

        // Fellow eye (player) uses clinical contrast; amblyopic eye (obstacles) always 100%
        this.platformAlpha = this.contrastState.fellowEyeContrast / 100;
        this.ballAlpha = 1.0; // Amblyopic eye always 100% per clinical protocol

        this.level = 1;
        this.baseSpeed = OBSTACLE_SPEEDS[this.settings.speed] || 100;
        this.speedMultiplier = 1;
        this.lives = MAX_LIVES;
        this.crossings = 0;
        this.deaths = 0;

        // Frame (both eyes)
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

        // Layout: safe zone at bottom, 5 lanes, safe zone at top
        // Total used height = SAFE_ZONE_H + LANE_COUNT * LANE_H + SAFE_ZONE_H
        const totalContentH = SAFE_ZONE_H * 2 + LANE_COUNT * LANE_H;
        const layoutOffsetY = fy + (fh - totalContentH) / 2;

        this.goalY = layoutOffsetY + SAFE_ZONE_H / 2;
        this.startY =
            layoutOffsetY + SAFE_ZONE_H + LANE_COUNT * LANE_H + SAFE_ZONE_H / 2;

        this.laneTopY = [];
        for (let i = 0; i < LANE_COUNT; i++) {
            this.laneTopY.push(layoutOffsetY + SAFE_ZONE_H + i * LANE_H);
        }

        // Grid cell width for player movement
        this.cellW = fw / 10;
        this.cellH = LANE_H;

        // Draw safe zones (both eyes — gray)
        this.add
            .rectangle(
                fx + fw / 2,
                this.goalY,
                fw,
                SAFE_ZONE_H,
                COLORS.GRAY,
                0.15,
            )
            .setStrokeStyle(1, COLORS.GRAY);
        this.add
            .rectangle(
                fx + fw / 2,
                this.startY,
                fw,
                SAFE_ZONE_H,
                COLORS.GRAY,
                0.15,
            )
            .setStrokeStyle(1, COLORS.GRAY);

        // "Goal" label
        this.add
            .text(fx + fw / 2, this.goalY, 'ЦЕЛЬ', {
                fontSize: '12px',
                color: COLORS.GRAY_HEX,
                fontFamily: 'Arial, sans-serif',
            })
            .setOrigin(0.5);

        // Draw lane separators (both eyes — gray)
        for (let i = 0; i <= LANE_COUNT; i++) {
            const ly = layoutOffsetY + SAFE_ZONE_H + i * LANE_H;
            this.add.rectangle(fx + fw / 2, ly, fw, 1, COLORS.GRAY, 0.3);
        }

        // Obstacles group
        this.obstacles = [];
        this.obstacleObjects = [];

        // Fix: store per-lane random speed factors at init time so they aren't
        // re-randomized on each goal crossing (speed multiplier applied multiplicatively)
        this.laneSpeedFactors = [];
        for (let i = 0; i < LANE_COUNT; i++) {
            this.laneSpeedFactors.push(0.8 + Math.random() * 0.4);
        }

        for (let i = 0; i < LANE_COUNT; i++) {
            const laneY = this.laneTopY[i] + LANE_H / 2;
            const goRight = i % 2 === 0;
            const speed =
                this.baseSpeed *
                this.speedMultiplier *
                this.laneSpeedFactors[i];
            const obstaclesInLane = 2 + Math.floor(Math.random() * 2);

            for (let j = 0; j < obstaclesInLane; j++) {
                const startX =
                    fx +
                    (j / obstaclesInLane) * fw +
                    Math.random() * (fw / obstaclesInLane / 2);
                const obs = GameVisuals.glowRect(
                    this,
                    startX,
                    laneY,
                    OBSTACLE_W,
                    OBSTACLE_H,
                    this.ballColor,
                    this.ballAlpha,
                    3,
                );
                this.obstacleObjects.push({
                    obj: obs,
                    laneY,
                    goRight,
                    speed,
                    laneIndex: i,
                });
            }
        }

        // Player (platformColor — one eye) — glow rect
        this.player = GameVisuals.glowRect(
            this,
            ccx,
            this.startY,
            PLAYER_W,
            PLAYER_H,
            this.platformColor,
            this.platformAlpha,
            4,
        );

        // Eyes on the player — use platformColor to preserve dichoptic separation
        this.playerEyeL = this.add.circle(
            ccx - 6,
            this.startY - 4,
            4,
            this.platformColor,
            0.8,
        );
        this.playerEyeR = this.add.circle(
            ccx + 6,
            this.startY - 4,
            4,
            this.platformColor,
            0.8,
        );

        // Player grid position (col is discrete, row tracks which zone)
        this.playerGridCol = 5;
        this.playerZone = 'start'; // 'start', 0..4 (lane index), 'goal'

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

        // Touch controls (tablet support — only shown when touch device detected)
        this.touchDPad = TouchControls.createDPad(this, this.field);
        this._touchMoveFired = null;

        // Input — grid-based movement
        this.cursors = this.input.keyboard.createCursorKeys();
        this.escKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC,
        );
        this.moveReady = true;

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
        this.isDead = false;
        this.isInGoalAnimation = false;
        this.gameEnded = false;

        // Tab blur → auto-pause (store reference for cleanup)
        this.blurHandler = () => {
            if (!this.isPaused) this.togglePause();
        };
        this.game.events.on('blur', this.blurHandler);

        this.layoutOffsetY = layoutOffsetY;

        // Pause gameplay until countdown finishes
        this.isPaused = true;
        GameVFX.countdown(this, ccx, ccy, () => {
            this.isPaused = false;
            this.input.setDefaultCursor('none');
            this.safetyTimer.start();
        });
    }

    shutdown() {
        EventBus.removeListener('start-frogger-game', this.startGameHandler);
        EventBus.removeListener('safety-finish', this.safetyFinishHandler);
        EventBus.removeListener('safety-extend', this.safetyExtendHandler);
        if (this.safetyTimer) this.safetyTimer.stop();
        if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
        this.input.setDefaultCursor('default');
    }

    update(_time, delta) {
        // Separate isDead (collision freeze) from isInGoalAnimation (goal freeze)
        if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.togglePause();
            return;
        }
        if (
            this.isPaused ||
            !this.player ||
            this.isDead ||
            this.isInGoalAnimation
        )
            return;

        // Move obstacles
        const dt = delta / 1000;
        const fw = this.field.w;
        const fx = this.field.x;

        for (const lane of this.obstacleObjects) {
            if (lane.goRight) {
                lane.obj.x += lane.speed * dt;
                if (lane.obj.x > fx + fw + OBSTACLE_W / 2) {
                    lane.obj.x = fx - OBSTACLE_W / 2;
                }
            } else {
                lane.obj.x -= lane.speed * dt;
                if (lane.obj.x < fx - OBSTACLE_W / 2) {
                    lane.obj.x = fx + fw + OBSTACLE_W / 2;
                }
            }
        }

        // Keyboard — one step per press; touch — one-shot per press
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

        const up =
            Phaser.Input.Keyboard.JustDown(this.cursors.up) || touchUpJust;
        const down =
            Phaser.Input.Keyboard.JustDown(this.cursors.down) || touchDownJust;
        const left =
            Phaser.Input.Keyboard.JustDown(this.cursors.left) || touchLeftJust;
        const right =
            Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
            touchRightJust;

        if (up || down || left || right) {
            this.movePlayer(up, down, left, right);
        }

        // Collision detection against obstacles
        this.checkCollisions();

        // HUD update
        if (this.safetyTimer && this.hud) {
            GameVisuals.updateHUD(
                this.hud,
                this.level,
                this.safetyTimer.getElapsedMs(),
                `★ ${this.crossings}/${WIN_CROSSINGS}`,
                this.lives,
            );
        }
    }

    movePlayer(up, down, left, right) {
        const fw = this.field.w;
        const fx = this.field.x;
        const cellW = fw / 10;

        if (left) {
            this.playerGridCol = Math.max(0, this.playerGridCol - 1);
        } else if (right) {
            this.playerGridCol = Math.min(9, this.playerGridCol + 1);
        }

        const newX = fx + (this.playerGridCol + 0.5) * cellW;

        if (up) {
            if (this.playerZone === 'start') {
                this.playerZone = LANE_COUNT - 1; // enter bottom lane
            } else if (
                typeof this.playerZone === 'number' &&
                this.playerZone > 0
            ) {
                this.playerZone = this.playerZone - 1;
            } else if (this.playerZone === 0) {
                // Reached goal!
                this.playerZone = 'goal';
                this.onPlayerReachedGoal();
                return;
            }
        } else if (down) {
            if (this.playerZone === 'goal') {
                this.playerZone = 0;
            } else if (
                typeof this.playerZone === 'number' &&
                this.playerZone < LANE_COUNT - 1
            ) {
                this.playerZone = this.playerZone + 1;
            } else if (
                typeof this.playerZone === 'number' &&
                this.playerZone === LANE_COUNT - 1
            ) {
                this.playerZone = 'start';
            }
        }

        const newY = this.getPlayerY();
        this.player.x = newX;
        this.player.y = newY;
        this.playerEyeL.x = newX - 6;
        this.playerEyeL.y = newY - 4;
        this.playerEyeR.x = newX + 6;
        this.playerEyeR.y = newY - 4;

        SynthSounds.tick();
    }

    getPlayerY() {
        if (this.playerZone === 'start') return this.startY;
        if (this.playerZone === 'goal') return this.goalY;
        return this.laneTopY[this.playerZone] + LANE_H / 2;
    }

    checkCollisions() {
        if (typeof this.playerZone !== 'number') return; // safe zones

        for (const lane of this.obstacleObjects) {
            if (lane.laneIndex !== this.playerZone) continue;

            const dx = Math.abs(this.player.x - lane.obj.x);
            const dy = Math.abs(this.player.y - lane.obj.y);

            if (
                dx < (PLAYER_W + OBSTACLE_W) / 2 - 4 &&
                dy < (PLAYER_H + OBSTACLE_H) / 2 - 4
            ) {
                this.playerHit();
                return;
            }
        }
    }

    playerHit() {
        this.isDead = true;
        this.deaths++;
        this.lives--;

        SynthSounds.miss();
        GameVFX.screenShake(this);
        GameVFX.particleBurst(
            this,
            this.player.x,
            this.player.y,
            this.platformColor,
            6,
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

        // Respawn at bottom
        this.time.delayedCall(400, () => {
            this.respawnPlayer();
        });
    }

    respawnPlayer() {
        this.playerGridCol = 5;
        this.playerZone = 'start';
        this.player.x =
            this.field.x + (this.playerGridCol + 0.5) * (this.field.w / 10);
        this.player.y = this.startY;
        this.playerEyeL.x = this.player.x - 6;
        this.playerEyeL.y = this.player.y - 4;
        this.playerEyeR.x = this.player.x + 6;
        this.playerEyeR.y = this.player.y - 4;
        this.isDead = false;
    }

    onPlayerReachedGoal() {
        this.crossings++;
        if (this.hud)
            this.hud.scoreText.setText(`★ ${this.crossings}/${WIN_CROSSINGS}`);

        SynthSounds.score();
        GameVFX.scorePopup(this, this.player.x, this.player.y - 20, '+1');
        GameVFX.circleFlash(
            this,
            this.player.x,
            this.player.y,
            20,
            COLORS.WHITE,
        );

        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            true,
        );
        this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

        // Fix: apply speed multiplier multiplicatively using per-lane stored factors
        this.speedMultiplier = 1 + this.crossings * 0.08;
        for (const lane of this.obstacleObjects) {
            lane.speed =
                this.baseSpeed *
                this.speedMultiplier *
                this.laneSpeedFactors[lane.laneIndex];
        }

        if (this.crossings >= WIN_CROSSINGS) {
            this.nextLevel();
            return;
        }

        // Use isInGoalAnimation to freeze update without triggering collision logic
        this.isInGoalAnimation = true;
        this.time.delayedCall(300, () => {
            this.isInGoalAnimation = false;
            this.respawnPlayer();
        });
    }

    updateFellowEyeAlpha(alpha) {
        if (this.player) this.player.setAlpha(alpha);
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
        this.isInGoalAnimation = true;

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
                this.isInGoalAnimation = false;
                this.resetForNextLevel();
            },
        });
    }

    resetForNextLevel() {
        this.crossings = 0;
        if (this.hud)
            this.hud.scoreText.setText(`★ ${this.crossings}/${WIN_CROSSINGS}`);
        this.speedMultiplier *= 1.15;
        for (const lane of this.obstacleObjects) {
            lane.speed =
                this.baseSpeed *
                this.speedMultiplier *
                this.laneSpeedFactors[lane.laneIndex];
        }
        this.respawnPlayer();
    }

    endGame(won) {
        if (this.gameEnded) return;
        this.gameEnded = true;

        this.safetyTimer.stop();

        const totalSpawned = this.crossings + this.deaths;
        const result = {
            game: 'frogger',
            timestamp: new Date().toISOString(),
            duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
            caught: this.crossings,
            total_spawned: totalSpawned,
            hit_rate:
                totalSpawned > 0
                    ? Math.round((this.crossings / totalSpawned) * 100) / 100
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
