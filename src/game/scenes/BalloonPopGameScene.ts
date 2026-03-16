// @ts-nocheck
import { t } from '../../modules/i18n';
import { COLORS, GAME } from '../../modules/constants';
import { createGameSettings } from '../../modules/gameState';
import { createSafetyTimer } from '../../modules/safetyTimer';
import { getEyeColors } from '../../modules/glassesColors';
import { EventBus } from '../EventBus';
import { SynthSounds } from '../audio/SynthSounds';
import { GameVFX } from '../vfx/GameVFX';

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

    this.balloonLifespan = LIFESPAN_MS[this.settings.speed] || LIFESPAN_MS.normal;

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

    // Score text
    this.popped = 0;
    this.totalBalloons = 0;
    this.scoreText = this.add.text(fx + fw - 10, fy + 10, `0 / ${WIN_COUNT}`, {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(1, 0);

    // Timer text
    this.timerText = this.add.text(fx + fw / 2, fy + 10, '00:00', {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0);

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
    this.safetyTimer.start();

    this.isPaused = false;
    this.pauseOverlay = null;

    this.game.events.on('blur', () => {
      if (!this.isPaused) this.togglePause();
    });

    // Spawn first balloon immediately
    this.spawnBalloon();
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

    // Balloon circle
    const circle = this.add.circle(bx, by, BALLOON_RADIUS, this.balloonColor, this.balloonAlpha);

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

    this.popped++;
    this.scoreText.setText(`${this.popped} / ${WIN_COUNT}`);

    if (this.popped >= WIN_COUNT) {
      SynthSounds.victory();
      this.endGame(true);
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

    this.time.delayedCall(200, () => {
      if (!this.isPaused) this.spawnBalloon();
    });
  }

  shutdown() {
    EventBus.removeListener('start-balloonpop-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
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

    // Ensure we always try to maintain up to MAX_BALLOONS
    if (this.balloons.length < MAX_BALLOONS && this.balloons.length < 1) {
      this.spawnBalloon();
    }

    // Timer display
    const elapsed = this.safetyTimer.getElapsedMs();
    const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
    this.timerText.setText(`${mins}:${secs}`);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.safetyTimer.pause();
      // Pause all balloon oscillation tweens
      this.balloons.forEach((b) => b.tweenY.pause());
      this.showPauseMenu();
    } else {
      this.safetyTimer.resume();
      this.balloons.forEach((b) => b.tweenY.resume());
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
      completed: won,
    };

    EventBus.emit('game-complete', { result, settings: this.settings });
  }
}
