// @ts-nocheck
export const COLORS = {
  RED: 0xFF0000,
  CYAN: 0x00FFFF,
  BLACK: 0x000000,
  GRAY: 0x808080,
  WHITE: 0xFFFFFF,
  RED_HEX: '#FF0000',
  CYAN_HEX: '#00FFFF',
  GRAY_HEX: '#808080',
  WHITE_HEX: '#FFFFFF',
};

export const GAME = {
  WIDTH: 800,
  HEIGHT: 600,
  FIELD_WIDTH_RATIO: 0.8,
  FIELD_HEIGHT_RATIO: 0.9,
  PLATFORM_WIDTH_RATIO: 0.15,
  PLATFORM_HEIGHT_RATIO: 0.03,
  OBJECT_DIAMETER_RATIO: 0.05,
  FIXATION_CROSS_RATIO: 0.02,
  FIXATION_CROSS_MIN_PX: 20,
  TARGET_CATCHES: 20,
  MAX_OBJECTS: 3,
  MIN_OBJECT_SPACING_RATIO: 0.15,
  SPAWN_X_MIN_RATIO: 0.10,
  SPAWN_X_MAX_RATIO: 0.90,
};

export const SPEEDS = {
  slow: { fallSpeed: 120, spawnInterval: 3000, label: 'Медленно' },
  normal: { fallSpeed: 240, spawnInterval: 2000, label: 'Нормально' },
  fast: { fallSpeed: 360, spawnInterval: 1500, label: 'Быстро' },
  pro: { fallSpeed: 480, spawnInterval: 1000, label: 'Профи' },
};

export const PLATFORM_KEYBOARD_SPEED = 400;

export const CONTRAST = {
  MIN: 0,
  MAX: 100,
  STEP: 5,
  DEFAULT: 100,
  DYNAMIC_STEP: 5,
  DYNAMIC_FLOOR: 50,
  DYNAMIC_TRIGGER_UP: 5,
  DYNAMIC_TRIGGER_DOWN: 3,
};

export const CALIBRATION = {
  SLIDER_MIN: 0,
  SLIDER_MAX: 100,
  SLIDER_STEP: 1,
  SLIDER_DEFAULT: 100,
  MAX_ATTEMPTS: 3,
};

export const SAFETY = {
  BREAK_TIME_MS: 15 * 60 * 1000,
  WARNING_BEFORE_MS: 1 * 60 * 1000,
  EXTENSION_MS: 5 * 60 * 1000,
  MAX_EXTENSIONS: 1,
};

export const STORAGE_KEYS = {
  VERSION: 'vt_version',
  DISCLAIMER: 'vt_disclaimer_accepted',
  CALIBRATION: 'vt_calibration',
  SESSIONS: 'vt_sessions',
  DEFAULT_SETTINGS: 'vt_default_settings',
};

export const CURRENT_VERSION = '1.0';
