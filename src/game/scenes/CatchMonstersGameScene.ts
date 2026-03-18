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

const MONSTER_SPEEDS = { slow: 40, normal: 70, fast: 110, pro: 160 };
const MONSTER_COUNT = { slow: 2, normal: 3, fast: 3, pro: 4 };
const WIN_CATCHES = 25;
const DIRECTION_CHANGE_MIN_MS = 1000;
const DIRECTION_CHANGE_MAX_MS = 3000;
const CROSSHAIR_SIZE = 16;
// Difficulty progression: speed increase per 5 catches
const SPEED_BOOST_PER_TIER = 0.05; // 5%
const CATCHES_PER_TIER = 5;

export default class CatchMonstersGameScene extends Phaser.Scene {
  constructor() {
    super('CatchMonstersGameScene');
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

    EventBus.on('start-catchmonsters-game', this.startGameHandler);
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

    this.contrastConfig = createContrastConfig();
    this.contrastState = createContrastState(this.settings.fellowEyeContrast ?? 30);

    this.level = 1;
    this.baseSpeed = MONSTER_SPEEDS[this.settings.speed] || 70;
    this.activeMonsterCount = MONSTER_COUNT[this.settings.speed] || 3;
    this.monstersCaught = 0;
    this.totalMonsters = 0;
    this.speedTier = 0; // tracks difficulty progression tier

    // Frame (both eyes)
    GameVisuals.drawBgGrid(this, fx, fy, fw, fh);
    GameVisuals.styledBorder(this, fx, fy, fw, fh);

    // Fixation cross (both eyes)
    const crossSize = Math.max(fw * GAME.FIXATION_CROSS_RATIO, GAME.FIXATION_CROSS_MIN_PX);
    const ccx = fx + fw / 2;
    const ccy = fy + fh / 2;
    GameVisuals.styledCross(this, ccx, ccy, crossSize);

    // HUD
    this.hud = GameVisuals.createHUD(this, this.field);

    // Pause button
    const pauseBtn = this.add.text(fx + 10, fy + fh - 20, t('game.pause'), {
      fontSize: '14px', color: COLORS.GRAY_HEX, fontFamily: 'Arial, sans-serif',
    }).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // Crosshair (platformColor — one eye)
    this.crosshair = {
      h: this.add.rectangle(ccx, ccy, CROSSHAIR_SIZE * 2, 2, this.platformColor).setAlpha(this.platformAlpha),
      v: this.add.rectangle(ccx, ccy, 2, CROSSHAIR_SIZE * 2, this.platformColor).setAlpha(this.platformAlpha),
      ring: this.add.circle(ccx, ccy, CROSSHAIR_SIZE / 2, this.platformColor, 0)
        .setStrokeStyle(1.5, this.platformColor).setAlpha(this.platformAlpha),
    };

    // Monsters
    this.monsters = [];
    for (let i = 0; i < this.activeMonsterCount; i++) {
      this.spawnMonster();
    }

    // Pointer move → crosshair follows
    this.input.on('pointermove', (pointer) => {
      if (!this.isPaused) this.moveCrosshair(pointer.x, pointer.y);
    });

    // Click → catch monster
    this.input.on('pointerup', (pointer) => {
      if (!this.isPaused) this.tryClick(pointer.x, pointer.y);
    });

    // Safety timer
    this.safetyTimer = createSafetyTimer({
      onWarning: () => EventBus.emit('safety-timer-warning', { type: 'warning' }),
      onBreak: () => EventBus.emit('safety-timer-warning', { type: 'break' }),
    });

    this.isPaused = false;
    this.pauseOverlay = null;
    this.trailCounter = 0;
    this.gameEnded = false;

    // Tab blur → auto-pause (store reference for cleanup)
    this.blurHandler = () => { if (!this.isPaused) this.togglePause(); };
    this.game.events.on('blur', this.blurHandler);

    // Pause gameplay until countdown finishes
    this.isPaused = true;
    GameVFX.countdown(this, ccx, ccy, () => {
      this.isPaused = false;
      this.input.setDefaultCursor('none');
      this.safetyTimer.start();
    });
  }

  spawnMonster() {
    const { x: fx, y: fy, w: fw, h: fh } = this.field;
    const radius = 15 + Math.random() * 10; // 15–25
    const margin = radius + 10;
    const mx = fx + margin + Math.random() * (fw - margin * 2);
    const my = fy + margin + Math.random() * (fh - margin * 2);

    // Compute current speed tier multiplier
    const tierMultiplier = 1 + Math.floor(this.monstersCaught / CATCHES_PER_TIER) * SPEED_BOOST_PER_TIER;
    const effectiveBaseSpeed = this.baseSpeed * tierMultiplier;

    const circle = GameVisuals.glowCircle(this, mx, my, radius, this.ballColor, this.ballAlpha);
    circle.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
    GameVisuals.pulse(this, circle, 0.94, 1.06, 600 + Math.random() * 400);

    // Eyes — use ballColor (monster body color) to preserve dichoptic separation
    const eyeOfsX = radius * 0.3;
    const eyeOfsY = radius * 0.2;
    const eyeRadius = Math.max(2, radius * 0.15);
    const eyeL = this.add.circle(mx - eyeOfsX, my - eyeOfsY, eyeRadius, this.ballColor, 0.9);
    const eyeR = this.add.circle(mx + eyeOfsX, my - eyeOfsY, eyeRadius, this.ballColor, 0.9);

    // Initial random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = effectiveBaseSpeed * (0.8 + Math.random() * 0.4);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const monster = {
      circle,
      eyeL,
      eyeR,
      radius,
      vx,
      vy,
      sinePhase: Math.random() * Math.PI * 2,
      sineAmp: 20 + Math.random() * 30,
      sineFreq: 0.8 + Math.random() * 1.2,
      baseVx: vx,
      baseVy: vy,
      dirChangeTimer: this.getNextDirChange(),
    };

    this.monsters.push(monster);
    this.totalMonsters++;
  }

  getNextDirChange() {
    return DIRECTION_CHANGE_MIN_MS + Math.random() * (DIRECTION_CHANGE_MAX_MS - DIRECTION_CHANGE_MIN_MS);
  }

  moveCrosshair(px, py) {
    this.crosshair.h.x = px;
    this.crosshair.h.y = py;
    this.crosshair.v.x = px;
    this.crosshair.v.y = py;
    this.crosshair.ring.x = px;
    this.crosshair.ring.y = py;
  }

  tryClick(px, py) {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const dx = px - m.circle.x;
      const dy = py - m.circle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= m.radius + 8) {
        this.catchMonster(i);
        return;
      }
    }
    // Missed click — no monster caught
    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, false);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);
  }

  catchMonster(index) {
    const m = this.monsters[index];
    const { x, y } = m.circle;
    const { radius } = m;
    const isSmall = radius < 20;

    // Points: small = +2, large = +1
    const points = isSmall ? 2 : 1;
    this.monstersCaught += points;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.monstersCaught}/${WIN_CATCHES}`);

    SynthSounds.hit();
    GameVFX.particleBurst(this, x, y, this.ballColor, 8);
    GameVFX.scorePopup(this, x, y - 20, `+${points}`);

    this.contrastState = recordTrial(this.contrastState, this.contrastConfig, true);
    this.updateFellowEyeAlpha(this.contrastState.fellowEyeContrast / 100);

    // Remove monster graphics
    m.circle.destroy();
    m.eyeL.destroy();
    m.eyeR.destroy();
    this.monsters.splice(index, 1);

    // Check difficulty tier progression: every CATCHES_PER_TIER catches, bump speed
    const newTier = Math.floor(this.monstersCaught / CATCHES_PER_TIER);
    if (newTier > this.speedTier) {
      this.speedTier = newTier;
      // Update existing monsters' base speed
      const tierMultiplier = 1 + this.speedTier * SPEED_BOOST_PER_TIER;
      for (const mon of this.monsters) {
        const angle = Math.atan2(mon.baseVy, mon.baseVx);
        const currentMagnitude = Math.hypot(mon.baseVx, mon.baseVy);
        // Scale up proportionally
        const newSpeed = currentMagnitude * (1 + SPEED_BOOST_PER_TIER);
        mon.baseVx = Math.cos(angle) * newSpeed;
        mon.baseVy = Math.sin(angle) * newSpeed;
      }
    }

    if (this.monstersCaught >= WIN_CATCHES) {
      this.nextLevel();
      return;
    }

    // Spawn replacement
    this.time.delayedCall(500, () => {
      if (!this.isPaused && this.monsters.length < this.activeMonsterCount) {
        this.spawnMonster();
      }
    });
  }

  shutdown() {
    EventBus.removeListener('start-catchmonsters-game', this.startGameHandler);
    EventBus.removeListener('safety-finish', this.safetyFinishHandler);
    EventBus.removeListener('safety-extend', this.safetyExtendHandler);
    if (this.safetyTimer) this.safetyTimer.stop();
    if (this.blurHandler) this.game.events.off('blur', this.blurHandler);
    this.input.setDefaultCursor('default');
  }

  update(time, delta) {
    if (this.isPaused || !this.monsters) return;
    // ESC to toggle pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
      return;
    }

    const dt = delta / 1000;
    const { x: fx, y: fy, w: fw, h: fh } = this.field;

    for (const m of this.monsters) {
      // Direction change countdown
      m.dirChangeTimer -= delta;
      if (m.dirChangeTimer <= 0) {
        const tierMultiplier = 1 + this.speedTier * SPEED_BOOST_PER_TIER;
        const effectiveBaseSpeed = this.baseSpeed * tierMultiplier;
        const angle = Math.random() * Math.PI * 2;
        const speed = effectiveBaseSpeed * (0.8 + Math.random() * 0.4);
        m.baseVx = Math.cos(angle) * speed;
        m.baseVy = Math.sin(angle) * speed;
        m.dirChangeTimer = this.getNextDirChange();
      }

      // Sine-wave drift perpendicular to main direction
      m.sinePhase += m.sineFreq * dt;
      const perpX = -m.baseVy / (this.baseSpeed || 1);
      const perpY = m.baseVx / (this.baseSpeed || 1);
      const sineOffset = Math.sin(m.sinePhase) * m.sineAmp * dt;

      m.circle.x += m.baseVx * dt + perpX * sineOffset;
      m.circle.y += m.baseVy * dt + perpY * sineOffset;

      // Wrap around field edges
      if (m.circle.x < fx - m.radius) m.circle.x = fx + fw + m.radius;
      else if (m.circle.x > fx + fw + m.radius) m.circle.x = fx - m.radius;
      if (m.circle.y < fy - m.radius) m.circle.y = fy + fh + m.radius;
      else if (m.circle.y > fy + fh + m.radius) m.circle.y = fy - m.radius;

      // Sync eye positions
      const eyeOfsX = m.radius * 0.3;
      const eyeOfsY = m.radius * 0.2;
      m.eyeL.x = m.circle.x - eyeOfsX;
      m.eyeL.y = m.circle.y - eyeOfsY;
      m.eyeR.x = m.circle.x + eyeOfsX;
      m.eyeR.y = m.circle.y - eyeOfsY;
    }

    // Fix: trail counter moved OUTSIDE the monsters loop
    this.trailCounter++;
    if (this.trailCounter % 4 === 0) {
      for (const m of this.monsters) {
        GameVFX.addTrailDot(this, m.circle.x, m.circle.y, this.ballColor, 2);
      }
    }

    // HUD update
    if (this.safetyTimer && this.hud) {
      GameVisuals.updateHUD(this.hud, this.level, this.safetyTimer.getElapsedMs(), `★ ${this.monstersCaught}/${WIN_CATCHES}`);
    }
  }

  updateFellowEyeAlpha(alpha) {
    this.platformAlpha = alpha;
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
        this.resetForNextLevel();
      },
    });
  }

  resetForNextLevel() {
    this.monstersCaught = 0;
    this.speedTier = 0;
    if (this.hud) this.hud.scoreText.setText(`★ ${this.monstersCaught}/${WIN_CATCHES}`);
    this.baseSpeed *= 1.15;
    // Update all existing monsters' speed
    for (const m of this.monsters) {
      const angle = Math.atan2(m.baseVy, m.baseVx);
      const currentMagnitude = Math.hypot(m.baseVx, m.baseVy);
      const newSpeed = currentMagnitude * 1.15;
      m.baseVx = Math.cos(angle) * newSpeed;
      m.baseVy = Math.sin(angle) * newSpeed;
    }
  }

  endGame(won) {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.safetyTimer.stop();

    const result = {
      game: 'catchmonsters',
      timestamp: new Date().toISOString(),
      duration_s: Math.round(this.safetyTimer.getElapsedMs() / 1000),
      caught: this.monstersCaught,
      total_spawned: this.totalMonsters,
      hit_rate: this.totalMonsters > 0
        ? Math.round((this.monstersCaught / this.totalMonsters) * 100) / 100
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
