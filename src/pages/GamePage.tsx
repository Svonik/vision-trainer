import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PhaserGame, IRefPhaserGame } from '../game/PhaserGame';
import { typedEventBus } from '../game/TypedEventBus';
import { addCachedSession } from '../modules/sessionCache';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';
import { PhaserErrorBoundary } from '../components/PhaserErrorBoundary';
import { LandscapePrompt } from '../components/LandscapePrompt';
import { getGameById } from '../config/games';
import { t } from '../modules/i18n';
import { formatTime } from '@/lib/formatTime';
import { GAME_SCENE_MAP, START_EVENT_MAP } from '@/config/gameScenes';
import { Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhaserLoadingScreen } from '../components/PhaserLoadingScreen';

export function GamePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { gameId } = useParams();
    const settings = location.state?.settings;
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(null);
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);
    const phaserRef = useRef<IRefPhaserGame>(null);

    const [instanceKey, setInstanceKey] = useState(() => Date.now());
    const [isPaused, setIsPaused] = useState(false);
    const [loading, setLoading] = useState(true);

    const currentGame = gameId ? getGameById(gameId) : undefined;
    const targetScene = GAME_SCENE_MAP[gameId ?? 'catcher'] ?? 'GameScene';
    const startEvent = START_EVENT_MAP[gameId ?? 'catcher'] ?? 'start-game';

    useEffect(() => {
        const handleComplete = ({ result, settings: s }: any) => {
            addCachedSession(result);
            navigate(`/games/${gameId}/stats`, { state: { result, settings: s } });
        };
        const handleExit = () => {
            navigate('/games');
        };
        const handleWarning = (data: any) => {
            setSafetyWarning(data);
        };
        const handleReady = (scene: Phaser.Scene) => {
            if (scene.scene.key !== targetScene) {
                scene.scene.start(targetScene);
                return;
            }
            setLoading(false);
            typedEventBus.emit(startEvent, settings);
        };
        const handleTick = (ms: number) => { setElapsedMs(ms); };

        typedEventBus.on('game-complete', handleComplete);
        typedEventBus.on('game-exit', handleExit);
        typedEventBus.on('safety-timer-warning', handleWarning);
        typedEventBus.on('current-scene-ready', handleReady);
        typedEventBus.on('timer-tick', handleTick);

        return () => {
            typedEventBus.removeListener('game-complete', handleComplete);
            typedEventBus.removeListener('game-exit', handleExit);
            typedEventBus.removeListener('safety-timer-warning', handleWarning);
            typedEventBus.removeListener('current-scene-ready', handleReady);
            typedEventBus.removeListener('timer-tick', handleTick);
            setElapsedMs(null);
        };
    }, [settings, navigate, gameId, targetScene, startEvent]);

    const handlePause = () => {
        setIsPaused(true);
        typedEventBus.emit('toggle-pause', { source: 'react' });
    };

    const handleResume = () => {
        setIsPaused(false);
        typedEventBus.emit('toggle-pause', { source: 'react' });
    };

    const handleFinish = () => {
        setIsPaused(false);
        typedEventBus.emit('game-exit');
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg)]" style={{ background: 'var(--bg-gradient)' }}>
            <header className="flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-4 py-2 bg-[var(--bg)]/80 backdrop-blur">
                <button
                    onClick={() => navigate(-1)}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-base transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 inline" /> {t('nav.back')}
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePause}
                        aria-label={t('game.pause')}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-1"
                    >
                        <Pause size={20} />
                    </button>
                    {currentGame && (
                        <span className="text-[var(--text-secondary)] text-sm truncate max-w-32">
                            {t(currentGame.titleKey)}
                        </span>
                    )}
                    {elapsedMs !== null && (
                        <span
                            className="text-[var(--text-secondary)] text-base font-mono"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {formatTime(elapsedMs)}
                        </span>
                    )}
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center md:pt-10 relative z-10">
                <PhaserErrorBoundary onReset={() => setInstanceKey(Date.now())}>
                    <PhaserGame key={instanceKey} ref={phaserRef} />
                </PhaserErrorBoundary>
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            key="loading-overlay"
                            className="absolute inset-0 z-20"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <PhaserLoadingScreen />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {safetyWarning && (
                <SafetyTimerBanner
                    type={safetyWarning.type}
                    onExtend={() => { typedEventBus.emit('safety-extend'); setSafetyWarning(null); }}
                    onFinish={() => { typedEventBus.emit('safety-finish'); }}
                />
            )}
            <LandscapePrompt />
            <AnimatePresence>
                {isPaused && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[var(--bg)]/95 backdrop-blur-md z-50 flex items-center justify-center"
                    >
                        <div className="text-center space-y-6">
                            <h2 className="text-2xl font-display text-[var(--text)]">{t('game.paused')}</h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleResume}
                                    className="w-48 bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 font-semibold btn-press"
                                >
                                    {t('game.resume')}
                                </button>
                                <button
                                    onClick={handleFinish}
                                    className="w-48 border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 font-semibold btn-press hover:bg-[var(--surface)]"
                                >
                                    {t('game.quit')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
