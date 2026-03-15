import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { PhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/EventBus';
import { addSession } from '../modules/storage';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';

export function GamePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();
    const settings = location.state?.settings;
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(null);

    useEffect(() => {
        const handleComplete = ({ result, settings: s }: any) => {
            addSession(result);
            navigate(`/games/${gameId}/stats`, { state: { result, settings: s } });
        };
        const handleExit = () => { navigate('/games'); };
        const handleWarning = (data: any) => { setSafetyWarning(data); };
        const handleReady = () => { EventBus.emit('start-game', settings); };

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
            <PhaserGame />
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
