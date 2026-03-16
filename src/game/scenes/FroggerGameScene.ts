// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';

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
    this.safetyFinishHandler = () => { this.endGame(false); };
    this.safetyExtendHandler = () => {
      if (this.safetyTimer && this.safetyTimer.canExtend()) {
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
    this.platformColor = isLeftPlatform ? eyeColors.leftColor : eyeColors.rightColor;
    this.ballColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.ballAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    this.baseSpeed = OBSTACLE_SPEEDS[this.settings.speed] || 100;
    this.speedMultiplier = 1;
    this.lives = MAX_LIVES;
    this.crossings = 0;
    this.deaths = 0;

    // Frame (both eyes)
    this.add.rectangle(fx + fw / 2, fy + fh / 2, fw, fh)
      .setStrokeStyle(2, COLORS.GRAY)
      .setFillStyle(COLORS.BLACK, 0);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    this.add.rectangle(ccx, ccy, crossSize, 2, COLORS.WHITE);
    this.add.rectangle(ccx, ccy, 2, crossSize, COLORS.WHITE);

    // Layout: safe zone at bottom, 5 lanes, safe zone at top
    // Total used height = SAFE_ZONE_H + LANE_COUNT * LANE_H + SAFE_ZONE_H
    const totalContentH = SAFE_ZONE_H * 2 + LANE_COUNT * LANE_H;
    const layoutOffsetY = fy + (fh - totalContentH) / 2;

    this.goalY = layoutOffsetY + SAFE_ZONE_H / 2;
    this.startY = layoutOffsetY + SAFE_ZONE_H + LANE_COUNT * LANE_H + SAFE_ZONE_H / 2;

    this.laneTopY = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      this.laneTopY.push(layoutOffsetY + SAFE_ZONE_H + i * LANE_H);
    }

    // Grid cell width for player movement
    this.cellW = fw / 10;
    this.cellH = LANE_H;

    // Draw safe zones (both eyes — gray)
    this.add.rectangle(fx + fw / 2, this.goalY, fw, SAFE_ZONE_H, COLORS.GRAY, 0.15)
      .setStrokeStyle(1, COLORS.GRAY);
    this.add.rectangle(fx + fw / 2, this.startY, fw, SAFE_ZONE_H, COLORS.GRAY, 0.15)
      .setStrokeStyle(1, COLORS.GRAY);

    // "Goal" label
    this.add.text(fx + fw / 2, this.goalY, 'ЦЕЛЬ', {
      fontSize: '12px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    // Draw lane separators (both eyes — gray)
    for (let i = 0; i <= LANE_COUNT; i++) {
      const ly = layoutOffsetY + SAFE_ZONE_H + i * LANE_H;
      this.add.rectangle(fx + fw / 2, ly, fw, 1, COLORS.GRAY, 0.3);
    }

    // Obstacles group
    this.obstacles = [];
    this.obstacleObjects = [];

    for (let i = 0; i < LANE_COUNT; i++) {
      const laneY = this.laneTopY[i] + LANE_H / 2;
      const goRight = i % 2 === 0;
      const speed = this.baseSpeed * this.speedMultiplier * (0.8 + Math.random() * 0.4);
      const obstaclesInLane = 2 + Math.floor(Math.random() * 2);

      for (let j = 0; j < obstaclesInLane; j++) {
        const startX = fx + (j / obstaclesInLane) * fw + Math.random() * (fw / obstaclesInLane / 2);
        const obs = this.add.rectangle(startX, laneY, OBSTACLE_W, OBSTACLE_H, this.ballColor)
          .setAlpha(this.ballAlpha);
        this.obstacleObjects.push({ obj: obs, laneY, goRight, speed, laneIndex: i });
      }
    }

    // Player (platformColor — one eye)
    this.player = this.add.rectangle(ccx, this.startY, PLAYER_W, PLAYER_H, this.platformColor)
      .setAlpha(this.platformAlpha);

    // Eyes on the player rectangle
    this.playerEyeL = this.add.circle(ccx - 6, this.startY - 4, 4, COLORS.WHITE, 0.8);
    this.playerEyeR = this.add.circle(ccx + 6, this.startY - 4, 4, COLORS.WHITE, 0.8);

    // Player grid position (col is discrete, row tracks which zone)
    this.playerGridCol = 5;
    this.playerZone = 'start'; // 'start', 0..4 (lane index), 'goal'

    // Lives display (both eyes — gray)
    this.livesIcons = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      const icon = this.add.circle(fx + 20 + i * 22, fy + 15, 6, COLORS.GRAY);
      this.livesIcons.push(icon);
    }

    // Score text (both eyes — gray)
    this.scoreText = this.add.text(fx + fw - 10, fy + 10, `${this.crossings} / ${WIN_CROSSINGS}`, {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0);

    // Timer
    this.timerText = this.add.text(fx + fw / 2, fy + 10, '00:00', {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Input — grid-based movement
    this.cursors = this.input.keyboard.createCursorKeys();
    this.moveReady = true;

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });
    this.safetyTimer.start();

    this.isPaused = false;
    this.pauseOverlay = null;
    this.isDead = false;

    this.game.events.on('blur', () => {
      if (!this.isPaused) this.togglePause();
    });

    this.layoutOffsetY = layoutOffsetY;
  }

  shutdown() {
    EventBus.removeListener('start-frogger-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
  }

  update(time, delta) {
    if (this.isPaused || !this.player || this.isDead) return;

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

    // Keyboard — one step per press
    const up = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    const down = Phaser.Input.Keyboard.JustDown(this.cursors.down);
    const left = Phaser.Input.Keyboard.JustDown(this.cursors.left);
    const right = Phaser.Input.Keyboard.JustDown(this.cursors.right);

    if (up || down || left || right) {
      this.movePlayer(up, down, left, right);
    }

    // Collision detection against obstacles
    this.checkCollisions();

    // Timer update
    if (this.safetyTimer) {
      const elapsed = this.safetyTimer.getElapsedMs();
      const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
      const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      this.timerText.setText(`${mins}:${secs}`);
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
      } else if (typeof this.playerZone === 'number' && this.playerZone > 0) {
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
      } else if (typeof this.playerZone === 'number' && this.playerZone < LANE_COUNT - 1) {
        this.playerZone = this.playerZone + 1;
      } else if (typeof this.playerZone === 'number' && this.playerZone === LANE_COUNT - 1) {
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

      if (dx < (PLAYER_W + OBSTACLE_W) / 2 - 4 && dy < (PLAYER_H + OBSTACLE_H) / 2 - 4) {
        this.playerHit();
        return;
      }
    }
  }

  playerHit() {
    this.isDead = true;
    this.deaths++;
    this.lives--;

    if (this.lives >= 0 && this.lives < this.livesIcons.length) {
      this.livesIcons[this.lives].setFillStyle(0x333333);
    }

    SynthSounds.miss();
    GameVFX.screenShake(this);
    GameVFX.particleBurst(this, this.player.x, this.player.y, this.platformColor, 6);

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
    this.player.x = this.field.x + (this.playerGridCol + 0.5) * (this.field.w / 10);
    this.player.y = this.startY;
    this.playerEyeL.x = this.player.x - 6;
    this.playerEyeL.y = this.player.y - 4;
    this.playerEyeR.x = this.player.x + 6;
    this.playerEyeR.y = this.player.y - 4;
    this.isDead = false;
  }

  onPlayerReachedGoal() {
    this.crossings++;
    this.scoreText.setText(`${this.crossings} / ${WIN_CROSSINGS}`);

    SynthSounds.score();
    GameVFX.scorePopup(this, this.player.x, this.player.y - 20, '+1');
    GameVFX.circleFlash(this, this.player.x, this.player.y, 20, COLORS.WHITE);

    // Increase speed slightly each crossing
    this.speedMultiplier = 1 + this.crossings * 0.08;
    for (const lane of this.obstacleObjects) {
      lane.speed = this.baseSpeed * this.speedMultiplier * (0.8 + Math.random() * 0.4);
    }

    if (this.crossings >= WIN_CROSSINGS) {
      SynthSounds.victory();
      this.endGame(true);
      return;
    }

    // Respawn player at bottom
    this.isDead = true;
    this.time.delayedCall(300, () => {
      this.respawnPlayer();
    });
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
    quitBtn.on('pointerup', () => this.endGame(false));

    this.pauseOverlay = [bg, title, resumeBtn, resumeText, quitBtn, quitText];
  }

  endGame(won) {
    this.safetyTimer.stop();

    const totalSpawned = this.crossings + this.deaths;
    const result = {
      game: 'frogger',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.crossings,
      total_spawned: totalSpawned,
      hit_rate: totalSpawned > 0
        ? Math.round((this.crossings / totalSpawned) * 100) / 100
        : 0,
      contrast_left: this.settings.contrastLeft,
      contrast_right: this.settings.contrastRight,
      speed: this.settings.speed,
      eye_config: this.settings.eyeConfig,
      lives_remaining: this.lives,
      completed: won,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
