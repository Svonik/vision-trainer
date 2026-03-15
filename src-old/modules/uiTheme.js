// src/modules/uiTheme.js

export const THEME = {
  bg: 0x0a0e1a,
  surface: 0x141828,
  border: 0x1e2640,
  accent: 0x00DDFF,
  accentRed: 0xFF4466,
  textPrimary: '#E8ECF4',
  textSecondary: '#6B7394',
  success: 0x00CC88,
  warning: 0xFFAA44,
  warningHex: '#FFAA44',
  font: 'Georgia, "Times New Roman", serif',
  fontMono: '"Courier New", monospace',
};

// Draw a rounded rectangle using Graphics
export const drawRoundedRect = (scene, x, y, w, h, radius, fillColor, fillAlpha = 1, strokeColor = null, strokeAlpha = 1) => {
  const g = scene.add.graphics();
  if (fillColor !== null && fillColor !== undefined) {
    g.fillStyle(fillColor, fillAlpha);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  }
  if (strokeColor !== null && strokeColor !== undefined) {
    g.lineStyle(1.5, strokeColor, strokeAlpha);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  }
  return g;
};

// Create a styled button with rounded corners, hover glow, and click animation
export const createStyledButton = (scene, x, y, w, h, label, callback, options = {}) => {
  const {
    fontSize = '16px',
    color = THEME.accent,
    textColor = THEME.textPrimary,
    hoverAlpha = 0.25,
    idleAlpha = 0.08,
    radius = 12,
  } = options;

  const container = scene.add.container(x, y);

  // Background glow (subtle)
  const glow = scene.add.graphics();
  glow.fillStyle(color, 0.03);
  glow.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 4);
  container.add(glow);

  // Main background
  const bg = scene.add.graphics();
  bg.fillStyle(color, idleAlpha);
  bg.lineStyle(1.5, color, 0.4);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  container.add(bg);

  // Label
  const text = scene.add.text(0, 0, label, {
    fontSize,
    color: textColor,
    fontFamily: THEME.font,
  }).setOrigin(0.5);
  container.add(text);

  // Hit area
  const hitArea = scene.add.rectangle(0, 0, w, h, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  container.add(hitArea);

  // Hover effects
  hitArea.on('pointerover', () => {
    bg.clear();
    bg.fillStyle(color, hoverAlpha);
    bg.lineStyle(1.5, color, 0.8);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    scene.tweens.add({ targets: container, scaleX: 1.02, scaleY: 1.02, duration: 100 });
  });

  hitArea.on('pointerout', () => {
    bg.clear();
    bg.fillStyle(color, idleAlpha);
    bg.lineStyle(1.5, color, 0.4);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
  });

  hitArea.on('pointerup', () => {
    scene.tweens.add({
      targets: container, scaleX: 0.96, scaleY: 0.96, duration: 60, yoyo: true,
      onComplete: callback,
    });
  });

  // Fade in
  container.setAlpha(0);
  scene.tweens.add({ targets: container, alpha: 1, duration: 300, delay: options.delay || 0 });

  return container;
};

// Create a styled slider with track, filled portion, and glowing thumb
export const createStyledSlider = (scene, x, y, width, value, step, onChange, options = {}) => {
  const {
    trackColor = THEME.border,
    fillColor = THEME.accent,
    thumbColor = 0xFFFFFF,
    thumbRadius = 11,
  } = options;

  const container = scene.add.container(x, y);
  const left = -width / 2;

  // Track background
  const track = scene.add.graphics();
  track.fillStyle(trackColor, 0.5);
  track.fillRoundedRect(left, -3, width, 6, 3);
  container.add(track);

  // Filled portion
  const fill = scene.add.graphics();
  const drawFill = (val) => {
    fill.clear();
    const fillWidth = (val / 100) * width;
    if (fillWidth > 0) {
      fill.fillStyle(fillColor, 0.6);
      fill.fillRoundedRect(left, -3, fillWidth, 6, 3);
    }
  };
  drawFill(value);
  container.add(fill);

  // Thumb glow
  const thumbGlow = scene.add.circle(left + (value / 100) * width, 0, thumbRadius + 6, fillColor, 0.15);
  container.add(thumbGlow);

  // Thumb
  const thumb = scene.add.circle(left + (value / 100) * width, 0, thumbRadius, thumbColor, 1);
  thumb.setInteractive({ useHandCursor: true, draggable: true });
  container.add(thumb);

  // Inner dot
  const innerDot = scene.add.circle(left + (value / 100) * width, 0, 4, fillColor, 1);
  container.add(innerDot);

  scene.input.setDraggable(thumb);
  thumb.on('drag', (_pointer, dragX) => {
    const localX = dragX - x;
    const clamped = Phaser.Math.Clamp(localX, left, left + width);
    thumb.x = clamped;
    thumbGlow.x = clamped;
    innerDot.x = clamped;
    const raw = ((clamped - left) / width) * 100;
    const snapped = step ? Math.round(raw / step) * step : Math.round(raw);
    const val = Phaser.Math.Clamp(snapped, 0, 100);
    drawFill(val);
    onChange(val);
  });

  return container;
};

// Title with subtle underline accent
export const createTitle = (scene, x, y, text, options = {}) => {
  const { fontSize = '26px', delay = 0 } = options;

  const container = scene.add.container(x, y);

  const title = scene.add.text(0, 0, text, {
    fontSize,
    color: THEME.textPrimary,
    fontFamily: THEME.font,
  }).setOrigin(0.5);
  container.add(title);

  // Accent underline
  const lineWidth = Math.min(title.width * 0.6, 200);
  const line = scene.add.graphics();
  line.fillStyle(THEME.accent, 0.4);
  line.fillRoundedRect(-lineWidth / 2, title.height / 2 + 6, lineWidth, 2, 1);
  container.add(line);

  // Fade in
  container.setAlpha(0);
  scene.tweens.add({ targets: container, alpha: 1, y: y, duration: 400, delay });

  return container;
};

// Card container with rounded border
export const createCard = (scene, x, y, w, h, options = {}) => {
  const { radius = 16, delay = 0 } = options;

  const g = scene.add.graphics();
  g.fillStyle(THEME.surface, 0.6);
  g.lineStyle(1, THEME.border, 0.5);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);

  g.setAlpha(0);
  scene.tweens.add({ targets: g, alpha: 1, duration: 400, delay });

  return g;
};

// Section label (small, muted)
export const createLabel = (scene, x, y, text, options = {}) => {
  const { fontSize = '13px', color = THEME.textSecondary, align = 0.5 } = options;
  return scene.add.text(x, y, text, {
    fontSize,
    color,
    fontFamily: THEME.font,
    ...(options.wordWrap ? { wordWrap: options.wordWrap, align: 'center', lineSpacing: 6 } : {}),
  }).setOrigin(align, 0.5);
};

// Fade in the scene background
export const applySceneBackground = (scene) => {
  scene.cameras.main.setBackgroundColor(THEME.bg);
};
