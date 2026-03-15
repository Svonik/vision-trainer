import { AUTO, Game } from 'phaser';
import GameScene from './scenes/GameScene';
import BreakoutGameScene from './scenes/BreakoutGameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 } }
    },
    scene: [GameScene, BreakoutGameScene]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
