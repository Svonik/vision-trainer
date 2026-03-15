import { GAME } from './src/config/constants.js';
import BootScene from './src/scenes/BootScene.js';
import DisclaimerScene from './src/scenes/DisclaimerScene.js';
import CalibrationScene from './src/scenes/CalibrationScene.js';
import GameSelectScene from './src/scenes/GameSelectScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 768, height: 576 },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, DisclaimerScene, CalibrationScene, GameSelectScene],
};

const game = new Phaser.Game(config);
