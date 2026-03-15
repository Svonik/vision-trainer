import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { PhaserGame, IRefPhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/EventBus';
import { addSession } from '../modules/storage';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';

const GAME_SCENE_MAP: Record<string, string> = {
    catcher: 'GameScene',
    breakout: 'BreakoutGameScene',
};

export function GamePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();
    const settings = location.state?.settings;
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(null);
    const phaserRef = useRef<IRefPhaserGame>(null);

    useEffect(() => {
        const targetScene = GAME_SCENE_MAP[gameId ?? 'catcher'] ?? 'GameScene';
        const startEvent = gameId === 'breakout' ? 'start-breakout-game' : 'start-game';

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

        EventBus.on('game-complete', handleComplete);
        EventBus.on('game-exit', handleExit);
        EventBus.on('safety-timer-warning', handleWarning);
        EventBus.on('current-scene-ready', handleReady);

        return () => {
            EventBus.removeListener('game-complete', handleComplete);
            EventBus.removeListener('game-exit', handleExit);
            EventBus.removeListener('safety-timer-warning', handleWarning);
            EventBus.removeListener('current-scene-ready', handleReady);
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
