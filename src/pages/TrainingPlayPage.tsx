import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { PhaserGame, IRefPhaserGame } from '../game/PhaserGame';
import { EventBus } from '../game/EventBus';
import { addSession } from '../modules/storage';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';
import { t } from '../modules/i18n';
import { GAME_TITLE_KEYS } from '../modules/sessionEngine';
import { formatTime } from '@/lib/formatTime';
import { GAME_SCENE_MAP, START_EVENT_MAP } from '@/config/gameScenes';
import { CheckCircle, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameResult {
    game: string;
    hit_rate: number;
    duration_s: number;
    caught?: number;
    total_spawned?: number;
    contrast_left?: number;
    contrast_right?: number;
    speed?: string;
    [key: string]: unknown;
}

interface TransitionScreenProps {
    completedIndex: number;
    nextGameId: string;
    onContinue: () => void;
    countdown: number;
}

function TransitionScreen({ completedIndex, nextGameId, onContinue, countdown }: TransitionScreenProps) {
    const total = 3;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 relative z-20"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-8 space-y-6 text-center"
            >
                {/* Completed badge — CheckCircle */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                >
                    <CheckCircle size={48} className="mx-auto text-[var(--success)]" />
                </motion.div>
                <div>
                    <h2 className="font-[var(--font-display)] text-2xl text-[var(--text)]">
                        {t('training.excellent')}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {completedIndex + 1}/{total}
                    </p>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-3">
                    {Array.from({ length: total }).map((_, i) => (
                        <motion.span
                            key={i}
                            initial={i === completedIndex ? { scale: 0.5 } : false}
                            animate={i === completedIndex ? { scale: 1 } : undefined}
                            className={`rounded-full transition-all duration-300 ${
                                i <= completedIndex
                                    ? 'w-4 h-3 bg-[var(--cta)]'
                                    : 'w-3 h-3 bg-[var(--border)]'
                            }`}
                        />
                    ))}
                </div>

                {/* Next game info */}
                <div className="rounded-xl bg-[var(--bg)]/50 border border-[var(--border)]/40 p-3 space-y-1">
                    <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wide">
                        {t('training.next')}
                    </p>
                    <p className="font-[var(--font-display)] text-lg text-[var(--text)]">
                        {t(GAME_TITLE_KEYS[nextGameId] ?? 'app.title')}
                    </p>
                </div>

                {/* Countdown bar */}
                <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 5, ease: 'linear' }}
                        className="h-full bg-[var(--cta)] rounded-full"
                    />
                </div>

                <button
                    onClick={onContinue}
                    className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 font-semibold btn-press"
                >
                    {t('training.continue')} ({countdown}s)
                </button>
            </motion.div>
        </motion.div>
    );
}

export function TrainingPlayPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const sessionGames: string[] = location.state?.sessionGames ?? [];
    const settings = location.state?.settings;

    const [currentGameIndex, setCurrentGameIndex] = useState(0);
    const [completedResults, setCompletedResults] = useState<GameResult[]>([]);
    const [showTransition, setShowTransition] = useState(false);
    const [transitionCountdown, setTransitionCountdown] = useState(5);
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(null);
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);

    const phaserRef = useRef<IRefPhaserGame>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    const currentGameId = sessionGames[currentGameIndex] ?? '';

    // Clear countdown interval on unmount
    useEffect(() => {
        return () => {
            if (countdownRef.current !== null) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);

    // Redirect to mode select if state is missing
    useEffect(() => {
        if (!sessionGames.length || !settings) {
            navigate('/mode-select', { replace: true });
        }
    }, [sessionGames, settings, navigate]);

    // Start countdown timer when transition screen shows
    useEffect(() => {
        if (!showTransition) {
            setTransitionCountdown(5);
            return;
        }

        countdownRef.current = setInterval(() => {
            setTransitionCountdown(prev => {
                if (prev <= 1) {
                    if (countdownRef.current !== null) {
                        clearInterval(countdownRef.current);
                    }
                    handleAdvance();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownRef.current !== null) {
                clearInterval(countdownRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTransition]);

    // Register game event listeners for the current game
    useEffect(() => {
        if (!currentGameId || showTransition) return;

        const targetScene = GAME_SCENE_MAP[currentGameId] ?? 'GameScene';
        const startEvent = START_EVENT_MAP[currentGameId] ?? 'start-game';

        const handleComplete = ({ result }: { result: GameResult }) => {
            addSession(result);
            const updatedResults = [...completedResults, result];
            setCompletedResults(updatedResults);
            setElapsedMs(null);

            if (currentGameIndex < 2) {
                setShowTransition(true);
            } else {
                navigate('/training/summary', {
                    state: { results: updatedResults, settings },
                });
            }
        };

        const handleExit = () => {
            navigate('/mode-select');
        };

        const handleWarning = (data: { type: string }) => {
            setSafetyWarning(data);
        };

        const handleReady = (scene: Phaser.Scene) => {
            if (scene.scene.key !== targetScene) {
                scene.scene.start(targetScene);
                return;
            }
            EventBus.emit(startEvent, settings);
        };

        const handleTick = (ms: number) => {
            setElapsedMs(ms);
        };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentGameId, currentGameIndex, showTransition]);

    const handleAdvance = () => {
        if (countdownRef.current !== null) {
            clearInterval(countdownRef.current);
        }
        setShowTransition(false);
        setCurrentGameIndex(prev => prev + 1);
    };

    const handlePause = () => {
        setIsPaused(true);
        EventBus.emit('toggle-pause', { source: 'react' });
    };

    const handleResume = () => {
        setIsPaused(false);
        EventBus.emit('toggle-pause', { source: 'react' });
    };

    const handleFinishPause = () => {
        setIsPaused(false);
        EventBus.emit('game-exit');
    };

    const nextGameId = sessionGames[currentGameIndex + 1] ?? '';

    if (showTransition) {
        return (
            <AnimatePresence>
                <TransitionScreen
                    completedIndex={currentGameIndex}
                    nextGameId={nextGameId}
                    onContinue={handleAdvance}
                    countdown={transitionCountdown}
                />
            </AnimatePresence>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col bg-[var(--bg)]"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            {/* Minimal overlay header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-[var(--bg)]/80 backdrop-blur">
                <button
                    onClick={() => navigate('/mode-select')}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-sm transition-colors"
                >
                    ← {t('nav.back')}
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePause}
                        aria-label={t('game.pause')}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-1"
                    >
                        <Pause size={18} />
                    </button>
                    <span className="text-[var(--text-secondary)] text-sm">
                        {t('training.gameOf').replace('{n}', String(currentGameIndex + 1))}
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm truncate max-w-28">
                        {t(GAME_TITLE_KEYS[currentGameId] ?? 'app.title')}
                    </span>
                    {elapsedMs !== null && (
                        <span
                            className="text-[var(--text-secondary)] text-sm font-mono"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {formatTime(elapsedMs)}
                        </span>
                    )}
                </div>

                {/* Progress dots in header */}
                <div className="flex gap-1.5 items-center">
                    {sessionGames.map((_, i) => (
                        <span
                            key={i}
                            className={`rounded-full transition-all duration-300 ${
                                i < currentGameIndex
                                    ? 'w-2.5 h-2 bg-[var(--success)]'
                                    : i === currentGameIndex
                                    ? 'w-4 h-2 bg-[var(--cta)]'
                                    : 'w-2 h-2 bg-[var(--border)]'
                            }`}
                        />
                    ))}
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
                                    onClick={handleFinishPause}
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
