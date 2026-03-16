import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { PhaserGame, IRefPhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/EventBus';
import { addSession } from '../modules/storage';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';

const GAME_SCENE_MAP: Record<string, string> = {
    catcher: 'GameScene',
    breakout: 'BreakoutGameScene',
    tetris: 'TetrisGameScene',
    invaders: 'InvadersGameScene',
    pong: 'PongGameScene',
    snake: 'SnakeGameScene',
    flappy: 'FlappyGameScene',
    asteroid: 'AsteroidGameScene',
    balloonpop: 'BalloonPopGameScene',
    memorytiles: 'MemoryTilesGameScene',
    frogger: 'FroggerGameScene',
    catchmonsters: 'CatchMonstersGameScene',
};

interface GamePageProps {
    setElapsedMs?: (ms: number | null) => void;
}

export function GamePage({ setElapsedMs }: GamePageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();
    const settings = location.state?.settings;
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(null);
    const phaserRef = useRef<IRefPhaserGame>(null);

    useEffect(() => {
        const targetScene = GAME_SCENE_MAP[gameId ?? 'catcher'] ?? 'GameScene';
        const START_EVENT_MAP: Record<string, string> = {
            catcher: 'start-game',
            breakout: 'start-breakout-game',
            tetris: 'start-tetris-game',
            invaders: 'start-invaders-game',
            pong: 'start-pong-game',
            snake: 'start-snake-game',
            flappy: 'start-flappy-game',
            asteroid: 'start-asteroid-game',
            balloonpop: 'start-balloonpop-game',
            memorytiles: 'start-memorytiles-game',
            frogger: 'start-frogger-game',
            catchmonsters: 'start-catchmonsters-game',
        };
        const startEvent = START_EVENT_MAP[gameId ?? 'catcher'] ?? 'start-game';

        const handleComplete = ({ result, settings: s }: any) => {
            addSession(result);
            navigate(`/games/${gameId}/stats`, { state: { result, settings: s } });
        };
        const handleExit = () => { navigate('/games'); };
        const handleWarning = (data: any) => { setSafetyWarning(data); };
        const handleReady = (scene: Phaser.Scene) => {
            // If the active scene is not the target, switch to it
            if (scene.scene.key !== targetScene) {
                scene.scene.start(targetScene);
                return;
            }
            EventBus.emit(startEvent, settings);
        };

        const handleTick = (ms: number) => { setElapsedMs?.(ms); };

        EventBus.on('game-complete', handleComplete);
        EventBus.on('game-exit', handleExit);
        EventBus.on('safety-timer-warning', handleWarning);
        EventBus.on('current-scene-ready', handleReady);
        EventBus.on('timer-tick', handleTick);

        return () => {
            EventBus.removeListener('game-complete', handleComplete);
            EventBus.removeListener('game-exit', handleExit);
            EventBus.removeListener('safety-timer-warning', handleWarning);
            EventBus.removeListener('current-scene-ready', handleReady);
            EventBus.removeListener('timer-tick', handleTick);
            setElapsedMs?.(null);
        };
    }, [settings, navigate, gameId]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative">
            <PhaserGame ref={phaserRef} />
            {safetyWarning && (
                <SafetyTimerBanner
                    type={safetyWarning.type}
                    onExtend={() => { EventBus.emit('safety-extend'); setSafetyWarning(null); }}
                    onFinish={() => { EventBus.emit('safety-finish'); }}
                />
            )}
        </div>
    );
}
