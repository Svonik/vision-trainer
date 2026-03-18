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
import FroggerGameScene from './scenes/FroggerGameScene';
import CatchMonstersGameScene from './scenes/CatchMonstersGameScene';
import WhackMoleGameScene from './scenes/WhackMoleGameScene';
import Game2048Scene from './scenes/Game2048Scene';
import KnifeHitGameScene from './scenes/KnifeHitGameScene';
import RunnerGameScene from './scenes/RunnerGameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    render: {
        antialias: false,
        pixelArt: false,
        roundPixels: true,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 } }
    },
    scene: [GameScene, BreakoutGameScene, TetrisGameScene, InvadersGameScene, PongGameScene, SnakeGameScene, FlappyGameScene, AsteroidGameScene, BalloonPopGameScene, MemoryTilesGameScene, FroggerGameScene, CatchMonstersGameScene, WhackMoleGameScene, Game2048Scene, KnifeHitGameScene, RunnerGameScene]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
