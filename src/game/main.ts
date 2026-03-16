import { AUTO, Game } from 'phaser';
import GameScene from './scenes/GameScene';
import BreakoutGameScene from './scenes/BreakoutGameScene';
import TetrisGameScene from './scenes/TetrisGameScene';
import InvadersGameScene from './scenes/InvadersGameScene';
import PongGameScene from './scenes/PongGameScene';
import SnakeGameScene from './scenes/SnakeGameScene';
import FlappyGameScene from './scenes/FlappyGameScene';
import AsteroidGameScene from './scenes/AsteroidGameScene';
import BalloonPopGameScene from './scenes/BalloonPopGameScene';
import MemoryTilesGameScene from './scenes/MemoryTilesGameScene';

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
    scene: [GameScene, BreakoutGameScene, TetrisGameScene, InvadersGameScene, PongGameScene, SnakeGameScene, FlappyGameScene, AsteroidGameScene, BalloonPopGameScene, MemoryTilesGameScene]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
