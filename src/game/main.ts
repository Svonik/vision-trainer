import { AUTO, Game } from 'phaser';
import AsteroidGameScene from './scenes/AsteroidGameScene';
import BalloonPopGameScene from './scenes/BalloonPopGameScene';
import BreakoutGameScene from './scenes/BreakoutGameScene';
import CatchMonstersGameScene from './scenes/CatchMonstersGameScene';
import ColorFloodGameScene from './scenes/ColorFloodGameScene';
import FlappyGameScene from './scenes/FlappyGameScene';
import FroggerGameScene from './scenes/FroggerGameScene';
import Game2048Scene from './scenes/Game2048Scene';
import GameScene from './scenes/GameScene';
import InvadersGameScene from './scenes/InvadersGameScene';
import KnifeHitGameScene from './scenes/KnifeHitGameScene';
import Match3GameScene from './scenes/Match3GameScene';
import MazeRunnerGameScene from './scenes/MazeRunnerGameScene';
import MemoryTilesGameScene from './scenes/MemoryTilesGameScene';
import PacmanGameScene from './scenes/PacmanGameScene';
import PongGameScene from './scenes/PongGameScene';
import RunnerGameScene from './scenes/RunnerGameScene';
import ShootingGalleryGameScene from './scenes/ShootingGalleryGameScene';
import SlidingPuzzleGameScene from './scenes/SlidingPuzzleGameScene';
import SnakeGameScene from './scenes/SnakeGameScene';
import TetrisGameScene from './scenes/TetrisGameScene';
import WhackMoleGameScene from './scenes/WhackMoleGameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
        antialias: false,
        pixelArt: false,
        roundPixels: true,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 } },
    },
    scene: [
        GameScene,
        BreakoutGameScene,
        TetrisGameScene,
        InvadersGameScene,
        PongGameScene,
        SnakeGameScene,
        FlappyGameScene,
        AsteroidGameScene,
        BalloonPopGameScene,
        MemoryTilesGameScene,
        FroggerGameScene,
        CatchMonstersGameScene,
        WhackMoleGameScene,
        Game2048Scene,
        KnifeHitGameScene,
        RunnerGameScene,
        ColorFloodGameScene,
        Match3GameScene,
        SlidingPuzzleGameScene,
        PacmanGameScene,
        ShootingGalleryGameScene,
        MazeRunnerGameScene,
    ],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
