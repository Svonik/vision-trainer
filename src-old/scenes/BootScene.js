import { initStorage, isStorageAvailable, isDisclaimerAccepted } from '../modules/storage.js';
import { t } from '../modules/i18n.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Audio loaded conditionally — files may not exist yet
    this.load.on('loaderror', (file) => {
      console.warn(`Failed to load: ${file.key}`);
    });
    this.load.audio('catch', ['assets/audio/catch.mp3', 'assets/audio/catch.ogg']);
    this.load.audio('miss', ['assets/audio/miss.mp3', 'assets/audio/miss.ogg']);
    this.load.audio('complete', ['assets/audio/complete.mp3', 'assets/audio/complete.ogg']);

    const loadingText = this.add.text(400, 300, 'Загрузка...', {
      fontSize: '24px', color: '#808080', fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
    this.load.on('complete', () => loadingText.destroy());
  }

  create() {
    if (!isStorageAvailable()) {
      console.warn(t('storage.unavailable'));
    }
    initStorage();

    if (isDisclaimerAccepted()) {
      this.scene.start('GameSelectScene');
    } else {
      this.scene.start('DisclaimerScene');
    }
  }
}
