// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, SPEEDS, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings, createSessionResult } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Store named handler references for cleanup
    this.startGameHandler = (settings) => {
      this.settings = createGameSettings(settings || {});
      this.startGameplay();
    };
    this.safetyFinishHandler = () => { this.endGame(); };
    this.safetyExtendHandler = () => {
      if (this.safetyTimer && this.safetyTimer.canExtend()) {
        this.safetyTimer.extend();
        this.isPaused = false;
        this.physics.resume();
        if (this.spawnTimer) this.spawnTimer.paused = false;
      }
    };

    SynthSounds.resume();

    // Register EventBus listeners
    EventBus.on('start-game', this.startGameHandler);
    EventBus.on('safety-finish', this.safetyFinishHandler);
    EventBus.on('safety-extend', this.safetyExtendHandler);

    // Register shutdown cleanup
    this.events.on('shutdown', this.shutdown, this);

    // Signal to React that the scene is ready
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
    this.targetColor = isLeftPlatform ? eyeColors.rightColor : eyeColors.leftColor;
    this.platformAlpha = (isLeftPlatform ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.targetAlpha = (isLeftPlatform ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

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

    // Platform
    const pw = fw * GAME.PLATFORM_WIDTH_RATIO;
    const ph = fh * GAME.PLATFORM_HEIGHT_RATIO;
    const py = fy + fh - ph / 2 - 10;

    this.platform = this.add.rectangle(ccx, py, pw, ph, this.platformColor)
      .setAlpha(this.platformAlpha);
    this.physics.add.existing(this.platform, false);
    this.platform.body.setImmovable(true);

    // Score
    this.caught = 0;
    this.totalSpawned = 0;
    this.consecutiveHits = 0;
    this.consecutiveMisses = 0;
    this.scoreText = this.add.text(fx + 10, fy + 10, `${t('game.score')}: 0 / ${GAME.TARGET_CATCHES}`, {
      fontSize: '16px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    });

    // Timer display
    this.sessionStartTime = Date.now();
    this.timerText = this.add.text(fx + fw - 10, fy + 10, '00:00', {
      fontSize: '16px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Targets group
    this.targets = this.physics.add.group();

    // Spawn timer
    const speedConfig = SPEEDS[this.settings.speed];
    this.fallSpeed = speedConfig.fallSpeed;
    this.spawnTimer = this.time.addEvent({
      delay: speedConfig.spawnInterval,
      callback: this.spawnTarget,
      callbackScope: this,
      loop: true,
    });

    // Overlap detection
    this.physics.add.overlap(this.platform, this.targets, this.onCatch, null, this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) {
        this.platform.x = Phaser.Math.Clamp(
          pointer.x,
          this.field.x + this.platform.width / 2,
          this.field.x + this.field.w - this.platform.width / 2,
        );
      }
    });

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });
    this.safetyTimer.start();

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.safetyTimer) {
          EventBus.emit('timer-tick', this.safetyTimer.getElapsedMs());
        }
      },
      loop: true,
    });

    // Pause state
    this.isPaused = false;
    this.pauseOverlay = null;

    // Tab blur → auto-pause
    this.game.events.on('blur', () => {
      if (!this.isPaused) this.togglePause();
    });

    // Spawn first target
    this.spawnTarget();
  }

  shutdown() {
    EventBus.removeListener('start-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
  }

  update(time, delta) {
    if (this.isPaused) return;
    if (!this.platform) return;

    // Keyboard
    if (this.cursors.left.isDown) {
      this.platform.x -= PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    } else if (this.cursors.right.isDown) {
      this.platform.x += PLATFORM_KEYBOARD_SPEED * (delta / 1000);
    }
    this.platform.x = Phaser.Math.Clamp(
      this.platform.x,
      this.field.x + this.platform.width / 2,
      this.field.x + this.field.w - this.platform.width / 2,
    );

    // Check misses (objects off bottom)
    this.targets.getChildren().forEach((target) => {
      if (target.active && target.y > this.field.y + this.field.h + 20) {
        this.onMiss(target);
      }
    });

    // Update timer — use safetyTimer to exclude paused time
    const elapsed = this.safetyTimer.getElapsedMs();
    const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
    this.timerText.setText(`${mins}:${secs}`);
  }

  spawnTarget() {
    if (this.isPaused) return;
    if (this.targets.countActive() >= GAME.MAX_OBJECTS) return;

    const objDiameter = this.field.w * GAME.OBJECT_DIAMETER_RATIO;
    const minX = this.field.x + this.field.w * GAME.SPAWN_X_MIN_RATIO;
    const maxX = this.field.x + this.field.w * GAME.SPAWN_X_MAX_RATIO;
    const minSpacing = this.field.w * GAME.MIN_OBJECT_SPACING_RATIO;

    let x;
    let attempts = 0;
    do {
      x = Phaser.Math.Between(minX, maxX);
      attempts++;
    } while (
      attempts < 20 &&
      this.targets.getChildren().some((t) => t.active && Math.abs(t.x - x) < minSpacing)
    );

    const target = this.add.circle(x, this.field.y - objDiameter, objDiameter / 2, this.targetColor)
      .setAlpha(this.targetAlpha);

    this.physics.add.existing(target);
    target.body.setCircle(objDiameter / 2);
    this.targets.add(target);
    // Set velocity AFTER adding to group (group.add resets velocity)
    target.body.setVelocityY(this.fallSpeed);
    this.totalSpawned++;
  }

  onCatch(platform, target) {
    if (!target.active) return;

    // SPEC COLLISION: center X in platform bounds AND bottom edge >= platform top
    const targetCenterX = target.x;
    const targetBottom = target.y + (target.radius || target.height / 2);
    const platLeft = platform.x - platform.width / 2;
    const platRight = platform.x + platform.width / 2;
    const platTop = platform.y - platform.height / 2;

    if (targetCenterX < platLeft || targetCenterX > platRight) return;
    if (targetBottom < platTop) return;

    target.destroy();
    this.caught++;
    this.consecutiveHits++;
    this.consecutiveMisses = 0;
    this.scoreText.setText(`${t('game.score')}: ${this.caught} / ${GAME.TARGET_CATCHES}`);

    // White flash (both eyes)
    const flash = this.add.circle(target.x, target.y, 20, COLORS.WHITE).setAlpha(0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });

    SynthSounds.hit();
    GameVFX.particleBurst(this, target.x, target.y, this.targetColor);
    GameVFX.scorePopup(this, target.x, target.y);
    this.checkDynamicDifficulty();

    if (this.caught >= GAME.TARGET_CATCHES) {
      SynthSounds.victory();
      this.endGame();
    }
  }

  onMiss(target) {
    if (!target.active) return;
    target.destroy();
    this.consecutiveMisses++;
    this.consecutiveHits = 0;
    SynthSounds.miss();
    this.checkDynamicDifficulty();
  }

  checkDynamicDifficulty() {
    // Therapeutic design: targets are always shown to the weak eye.
    // The game forces the weak eye to track falling objects — that IS the therapy.
    // Dynamic difficulty adjusts the TARGET layer (weak eye) alpha.

    if (this.consecutiveHits >= 5) {
      // Player succeeding → reduce weak eye stimulation (make targets dimmer)
      this.targetAlpha = Math.max(this.targetAlpha - 0.05, 0.5);
      this.targets.getChildren().forEach((t) => { if (t.active) t.setAlpha(this.targetAlpha); });
      this.consecutiveHits = 0;
    }

    if (this.consecutiveMisses >= 3) {
      // Player struggling → increase weak eye stimulation (make targets brighter)
      this.targetAlpha = Math.min(this.targetAlpha + 0.05, 1.0);
      this.targets.getChildren().forEach((t) => { if (t.active) t.setAlpha(this.targetAlpha); });
      this.consecutiveMisses = 0;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.spawnTimer.paused = true;
      this.safetyTimer.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.spawnTimer.paused = false;
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

  endGame() {
    this.safetyTimer.stop();
    if (this.spawnTimer) this.spawnTimer.remove();

    const result = createSessionResult({
      settings: this.settings,
      caught: this.caught,
      totalSpawned: this.totalSpawned,
      durationMs: this.safetyTimer.getElapsedMs(),
    });

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
