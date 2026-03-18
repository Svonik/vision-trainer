// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { createContrastState, createContrastConfig, recordTrial, getAccuracy } from '../../modules/contrastEngine';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';
import { GameVisuals } from '../vfx/GameVisuals';

const BALLOON_RADIUS = 25;
const WIN_COUNT = 30;
const MAX_BALLOONS = 3;

const LIFESPAN_MS = { slow: 4000, normal: 3000, fast: 2000, pro: 1500 };

export default class BalloonPopGameScene extends Phaser.Scene {
  constructor() {
    super('BalloonPopGameScene');
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

    EventBus.on('start-balloonpop-game', this.startGameHandler);
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
    const isLeftBalloon = this.settings.eyeConfig === 'platform_left';
    this.balloonColor = isLeftBalloon ? eyeColors.leftColor : eyeColors.rightColor;
    this.crosshairColor = isLeftBalloon ? eyeColors.rightColor : eyeColors.leftColor;
    this.balloonAlpha = (isLeftBalloon ? this.settings.contrastLeft : this.settings.contrastRight) / 100;
    this.crosshairAlpha = (isLeftBalloon ? this.settings.contrastRight : this.settings.contrastLeft) / 100;

    this.contrastConfig = createContrastConfig();
    this.contrastState = createContrastState(this.settings.fellowEyeContrast ?? 30);

    this.level = 1;
    this.balloonLifespan = LIFESPAN_MS[this.settings.speed] || LIFESPAN_MS.normal;

    // Frame (both eyes)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // Score
    this.popped = 0;
    this.totalBalloons = 0;

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Crosshair cursor (tracks mouse — other eye)
    this.crosshair = this.add.graphics();
    this.drawCrosshair(ccx, ccy);

    // Active balloons list: { circle, timerBar, tweenY, spawnTime }
    this.balloons = [];

    // Input: click/tap pops balloon
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) {
        this.drawCrosshair(pointer.x, pointer.y);
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (!this.isPaused) {
        this.tryPopBalloon(pointer.x, pointer.y);
      }
    });

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = false;
    this.pauseOverlay = null;
    this.gameEnded = false;

    // Tab blur → auto-pause (store reference for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Pause gameplay until countdown finishes, then spawn first balloon
    this.isPaused = true;
    GameVFX.countdown(this, ccx, ccy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
      this.spawnBalloon();
    });
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
    // Circle around crosshair
    this.crosshair.strokeCircle(x, y, size + 2);
  }

  spawnBalloon() {
    // ESC to toggle pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
      return;
    }
    if (this.isPaused) return;
    if (this.balloons.length >= MAX_BALLOONS) return;

    const margin = BALLOON_RADIUS + 10;
    const bx = Phaser.Math.Between(
      this.field.x + margin,
      this.field.x + this.field.w - margin,
    );
    const by = Phaser.Math.Between(
      this.field.y + margin + 30,
      this.field.y + this.field.h - margin - 30,
    );

    // Balloon — glow circle container (replaces plain circle)
    const circle = GameVisuals.glowCircle(this, bx, by, BALLOON_RADIUS, this.balloonColor, this.balloonAlpha);
    // Attach pulse — slight breathing effect
    GameVisuals.pulse(this, circle, 0.92, 1.08, 900 + Math.random() * 400);

    // Balloon string (gray, both eyes)
    const string = this.add.line(
      0, 0,
      bx, by + BALLOON_RADIUS,
      bx, by + BALLOON_RADIUS + 18,
      COLORS.GRAY, 0.6,
    ).setLineWidth(1);

    // Life timer bar (gray, both eyes)
    const barW = BALLOON_RADIUS * 2;
    const barBg = this.add.rectangle(bx, by + BALLOON_RADIUS + 6, barW, 4, COLORS.GRAY, 0.3);
    const barFill = this.add.rectangle(bx - barW / 2, by + BALLOON_RADIUS + 6, barW, 4, COLORS.GRAY, 0.7)
      .setOrigin(0, 0.5);

    // Floating Y oscillation tween
    const tweenY = this.tweens.add({
      targets: [circle, string, barBg, barFill],
      y: `-=${6}`,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const entry = {
      circle,
      string,
      barBg,
      barFill,
      tweenY,
      spawnTime: this.safetyTimer.getElapsedMs(),
      barW,
    };

    this.balloons.push(entry);
    this.totalBalloons++;
  }

  tryPopBalloon(px, py) {
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const dx = px - b.circle.x;
      const dy = py - b.circle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= BALLOON_RADIUS + 6) {
        this.popBalloon(i);
        return;
      }
    }
  }

  popBalloon(index) {
    const b = this.balloons[index];
    const { x, y } = b.circle;

    b.tweenY.stop();
    b.circle.destroy();
    b.string.destroy();
    b.barBg.destroy();
    b.barFill.destroy();
    this.balloons.splice(index, 1);

    SynthSounds.hit();
    GameVFX.particleBurst(this, x, y, this.balloonColor, 8);
    GameVFX.scorePopup(this, x, y);

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, true);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    this.popped++;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.popped}/${WIN_COUNT}`);

    if (this.popped >= WIN_COUNT) {
      this.nextLevel();
      return;
    }

    // Spawn a replacement soon
    this.time.delayedCall(300, () => {
      if (!this.isPaused) this.spawnBalloon();
    });
  }

  expireBalloon(index) {
    const b = this.balloons[index];
    b.tweenY.stop();
    b.circle.destroy();
    b.string.destroy();
    b.barBg.destroy();
    b.barFill.destroy();
    this.balloons.splice(index, 1);

    SynthSounds.miss();

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, false);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    this.time.delayedCall(200, () => {
      if (!this.isPaused) this.spawnBalloon();
    });
  }

  shutdown() {
    EventBus.removeListener('start-balloonpop-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    if (this.isPaused) return;
    if (!this.safetyTimer) return;

    const now = this.safetyTimer.getElapsedMs();

    // Check balloon lifespans and update life bars
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const age = now - b.spawnTime;
      const ratio = Math.max(0, 1 - age / this.balloonLifespan);

      // Update life bar width
      b.barFill.width = b.barW * ratio;

      if (age >= this.balloonLifespan) {
        this.expireBalloon(i);
      }
    }

    // Fix: refill up to MAX_BALLOONS (not just < 1)
    if (this.balloons.length < MAX_BALLOONS) {
      this.spawnBalloon();
    }

    // HUD update
    if (this.hud) {
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `★ ${this.popped}/${WIN_COUNT}`);
    }
  }

  updateFellowEyeAlpha(alpha) {
    this.balloonAlpha = alpha;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.safetyTimer.pause();
      // Pause all balloon oscillation tweens
      this.balloons.forEach((b) => b.tweenY.pause());
      this.input.setDefaultCursor('default');
      this.showPauseMenu();
    } else {
      this.safetyTimer.resume();
      this.balloons.forEach((b) => b.tweenY.resume());
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
    quitBtn.on('pointerup', () => this.endGame(false));

    this.pauseOverlay = [bg, title, resumeBtn, resumeText, quitBtn, quitText];
  }

  nextLevel() {
    this.level++;
    this.isPaused = true;
    // Pause oscillation tweens
    this.balloons.forEach((b) => b.tweenY.pause());

    const cx = this.field.x + this.field.w / 2;
    const cy = this.field.y + this.field.h / 2;

    const levelText = this.add.text(cx, cy, `Уровень ${this.level}!`, {
      fontSize: '36px', color: '#FFFFFF', fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    SynthSounds.victory();

    this.tweens.add({
      targets: levelText,
      alpha: 1, scaleX: 1.3, scaleY: 1.3,
      duration: 300, yoyo: true, hold: 1500,
      onComplete: () => {
        levelText.destroy();
        this.isPaused = false;
        this.balloons.forEach((b) => b.tweenY.resume());
        this.resetForNextLevel();
      },
    });
  }

  resetForNextLevel() {
    this.popped = 0;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.popped}/${WIN_COUNT}`);
    this.balloonLifespan = Math.max(500, Math.round(this.balloonLifespan * 0.85));
  }

  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.safetyTimer.stop();

    const result = {
      game: 'balloonpop',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.popped,
      total_spawned: this.totalBalloons,
      hit_rate: this.totalBalloons > 0
        ? Math.round((this.popped / this.totalBalloons) * 100) / 100
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
