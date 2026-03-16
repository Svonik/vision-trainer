// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME, SPEEDS, PLATFORM_KEYBOARD_SPEED } from '../../modules/constants';
import { createGameSettings, createSessionResult } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';

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
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Platform
    const pw = fw * GAME.PLATFORM_WIDTH_RATIO;
    const ph = fh * GAME.PLATFORM_HEIGHT_RATIO;
    const py = fy + fh - ph / 2 - 10;

    const platformContainer = GameVisuals.glowRect(this, ccx, py, pw, ph, this.platformColor, this.platformAlpha);
    // Create a plain rectangle for physics (invisible, same bounds)
    this.platform = this.add.rectangle(ccx, py, pw, ph, this.platformColor, 0);
    this.physics.add.existing(this.platform, false);
    this.platform.body.setImmovable(true);
    // Keep the visual container synced in update
    this.platformVisual = platformContainer;

    // Score
    this.caught = 0;
    this.totalSpawned = 0;
    this.consecutiveHits = 0;
    this.consecutiveMisses = 0;
    this.scoreText = GameVisuals.scoreText(this, fx + 10, fy + 10, `${t('game.score')}: 0 / ${GAME.TARGET_CATCHES}`);

    // Timer display
    this.sessionStartTime = Date.now();
    this.timerText = GameVisuals.scoreText(this, fx + fw - 10, fy + 10, '00:00', 1);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Targets group
    this.targets = this.physics.add.group();

    // Overlap detection
    this.physics.add.overlap(this.platform, this.targets, this.onCatch, null, this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) {
        this.platform.x = Phaser.Math.Clamp(
          pointer.x,
          this.field.x + this.platform.width / 2,
          this.field.x + this.field.w - this.platform.width / 2,
        );
        this.platform.body.reset(this.platform.x, this.platform.y);
      }
    });

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

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
    this.isPaused = true; // freeze during countdown
    this.pauseOverlay = null;
    this.gameEnded = false;

    // Tab blur → auto-pause (named handler for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Countdown before gameplay starts
    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;
    GameVFX.countdown(this, cx, cy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');

      // Spawn timer
      const speedConfig = SPEEDS[this.settings.speed];
      this.fallSpeed = speedConfig.fallSpeed;
      this.spawnTimer = this.time.addEvent({
        delay: speedConfig.spawnInterval,
        callback: this.spawnTarget,
        callbackScope: this,
        loop: true,
      });

      this.safetyTimer.start();

      // Spawn first target
      this.spawnTarget();
    });
  }

  shutdown() {
    EventBus.removeListener('start-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    // ESC to toggle pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
      return;
    }
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
    this.platform.body.reset(this.platform.x, this.platform.y);

    // Sync platform visual container
    if (this.platformVisual) {
      this.platformVisual.x = this.platform.x;
      this.platformVisual.y = this.platform.y;
    }

    // Check misses (objects off bottom) + sync visuals
    this.targets.getChildren().forEach((target) => {
      if (target.active) {
        if (target._visual) {
          target._visual.x = target.x;
          target._visual.y = target.y;
        }
        if (target.y > this.field.y + this.field.h + 20) {
          this.onMiss(target);
        }
      }
    });

    // Update timer — use safetyTimer to exclude paused time
    const elapsed = this.safetyTimer.getElapsedMs();
    const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
    this.timerText.setText(`${mins}:${secs}`);
  }

  spawnTarget() {
    // ESC to toggle pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
      return;
    }
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

    // Create a plain circle for physics collision detection
    const target = this.add.circle(x, this.field.y - objDiameter, objDiameter / 2, this.targetColor, 0);
    this.physics.add.existing(target);
    target.body.setCircle(objDiameter / 2);
    // Visual glow circle rendered on top
    const targetVisual = GameVisuals.glowCircle(this, x, this.field.y - objDiameter, objDiameter / 2, this.targetColor, this.targetAlpha);
    target._visual = targetVisual;
    GameVisuals.pulse(this, targetVisual, 0.93, 1.07, 700 + Math.random() * 300);
    this.targets.add(target);
    // Set velocity AFTER adding to group (group.add resets velocity)
    target.body.setVelocityY(this.fallSpeed);
    this.totalSpawned++;
  }

  onCatch(platform, target) {
    if (!target.active) return;
    if (this.caught >= GAME.TARGET_CATCHES) return;

    // SPEC COLLISION: center X in platform bounds AND bottom edge >= platform top
    const targetCenterX = target.x;
    const targetBottom = target.y + (target.radius || target.height / 2);
    const platLeft = platform.x - platform.width / 2;
    const platRight = platform.x + platform.width / 2;
    const platTop = platform.y - platform.height / 2;

    if (targetCenterX < platLeft || targetCenterX > platRight) return;
    if (targetBottom < platTop) return;

    if (target._visual) { target._visual.destroy(); target._visual = null; }
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
    if (target._visual) { target._visual.destroy(); target._visual = null; }
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
      this.targets.getChildren().forEach((t) => { if (t.active && t._visual) t._visual.setAlpha(this.targetAlpha); });
      this.consecutiveHits = 0;
    }

    if (this.consecutiveMisses >= 3) {
      // Player struggling → increase weak eye stimulation (make targets brighter)
      this.targetAlpha = Math.min(this.targetAlpha + 0.05, 1.0);
      this.targets.getChildren().forEach((t) => { if (t.active && t._visual) t._visual.setAlpha(this.targetAlpha); });
      this.consecutiveMisses = 0;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      if (this.spawnTimer) this.spawnTimer.paused = true;
      this.safetyTimer.pause();
      this.input.setDefaultCursor('default');
      this.showPauseMenu();
    } else {
      this.physics.resume();
      if (this.spawnTimer) this.spawnTimer.paused = false;
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
    if (this.gameEnded) return;
    this.gameEnded = true;

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
