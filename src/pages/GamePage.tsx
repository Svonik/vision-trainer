import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { PhaserGame, IRefPhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/EventBus';
import { addSession } from '../modules/storage';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';
import { getGameById } from '../config/games';
import { t } from '../modules/i18n';

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

function formatTime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

export function GamePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();
    const settings = location.state?.settings;
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(null);
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);
    const phaserRef = useRef<IRefPhaserGame>(null);

    const currentGame = gameId ? getGameById(gameId) : undefined;

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
            if (scene.scene.key !== targetScene) {
                scene.scene.start(targetScene);
                return;
            }
            EventBus.emit(startEvent, settings);
        };
        const handleTick = (ms: number) => { setElapsedMs(ms); };

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
            setElapsedMs(null);
        };
    }, [settings, navigate, gameId]);

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg)]" style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}>
            {/* Minimal game overlay header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-[var(--bg)]/80 backdrop-blur">
                <button
                    onClick={() => navigate(-1)}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-sm transition-colors"
                >
                    ← {t('nav.back')}
                </button>
                <div className="flex items-center gap-3">
                    {currentGame && (
                        <span className="text-[var(--text-secondary)] text-xs truncate max-w-32">
                            {t(currentGame.titleKey)}
                        </span>
                    )}
                    {elapsedMs !== null && (
                        <span
                            className="text-[var(--text-secondary)] text-sm font-mono"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {formatTime(elapsedMs)}
                        </span>
                    )}
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center pt-10 relative z-10">
                <PhaserGame ref={phaserRef} />
            </div>

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
