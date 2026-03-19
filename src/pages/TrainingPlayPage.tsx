import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Pause } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { MathGate } from '@/components/MathGate';
import { GAME_SCENE_MAP, START_EVENT_MAP } from '@/config/gameScenes';
import { formatTime } from '@/lib/formatTime';
import type { WellnessLevel } from '@/modules/wellnessCheck';
import { shouldAlertDoctor } from '@/modules/wellnessCheck';
import { PhaserErrorBoundary } from '../components/PhaserErrorBoundary';
import { PhaserLoadingScreen } from '../components/PhaserLoadingScreen';
import { SafetyTimerBanner } from '../components/SafetyTimerBanner';
import { SessionSummaryCard } from '../components/SessionSummaryCard';
import { WellnessPreCheck } from '../components/WellnessPreCheck';
import { type IRefPhaserGame, PhaserGame } from '../game/PhaserGame';
import { typedEventBus } from '../game/TypedEventBus';
import { t } from '../modules/i18n';
import {
    addCachedSession,
    getCachedSessions,
    updateLastSessionWellness,
} from '../modules/sessionCache';
import { GAME_TITLE_KEYS } from '../modules/sessionEngine';
import {
    computeSessionSummary,
    type SessionSummary,
} from '../modules/sessionSummary';
import { getDefaultSettings, saveDefaultSettings } from '../modules/storage';

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

function TransitionScreen({
    completedIndex,
    nextGameId,
    onContinue,
    countdown,
}: TransitionScreenProps) {
    const total = 3;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 relative z-20"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-8 space-y-6 text-center"
            >
                {/* Completed badge */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                >
                    <CheckCircle
                        size={48}
                        className="mx-auto text-[var(--success)]"
                    />
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
                            initial={
                                i === completedIndex ? { scale: 0.5 } : false
                            }
                            animate={
                                i === completedIndex ? { scale: 1 } : undefined
                            }
                            className={`rounded-full transition-colors duration-300 ${
                                i <= completedIndex
                                    ? 'w-4 h-3 bg-[var(--cta)]'
                                    : 'w-3 h-3 bg-[var(--border)]'
                            }`}
                        />
                    ))}
                </div>

                {/* Next game info */}
                <div className="rounded-3xl bg-[var(--bg)]/50 border border-[var(--border)]/40 p-3 space-y-1">
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

                <AppButton
                    variant="cta"
                    size="md"
                    onClick={onContinue}
                    className="w-full"
                >
                    {t('training.continue')} ({countdown}s)
                </AppButton>
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
    const [safetyWarning, setSafetyWarning] = useState<{ type: string } | null>(
        null,
    );
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);
    const [instanceKey, setInstanceKey] = useState(() => Date.now());
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(
        null,
    );

    const phaserRef = useRef<IRefPhaserGame>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [wellnessLevel, setWellnessLevel] = useState<WellnessLevel | null>(
        null,
    );
    const needsGate = shouldAlertDoctor(getCachedSessions());
    const [gatePassed, setGatePassed] = useState(!needsGate);

    // Ref tracks wellness level for use inside effect closures without
    // adding it to the dependency array (avoids listener teardown/re-add
    // that can race with Phaser scene-ready events).
    const wellnessRef = useRef<WellnessLevel | null>(null);
    // When the scene is ready but wellness hasn't been selected yet,
    // we store a callback to emit the start event later.
    const pendingStartRef = useRef<(() => void) | null>(null);

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

    const handleAdvance = useCallback(() => {
        if (countdownRef.current !== null) {
            clearInterval(countdownRef.current);
        }
        setShowTransition(false);
        setLoading(true);
        setCurrentGameIndex((prev) => prev + 1);
    }, []);

    // Start countdown timer when transition screen shows
    useEffect(() => {
        if (!showTransition) {
            setTransitionCountdown(5);
            return;
        }

        countdownRef.current = setInterval(() => {
            setTransitionCountdown((prev) => {
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
    }, [showTransition, handleAdvance]);

    // Register game event listeners for the current game
    useEffect(() => {
        if (!currentGameId || showTransition) return;

        const targetScene = GAME_SCENE_MAP[currentGameId] ?? 'GameScene';
        const startEvent = START_EVENT_MAP[currentGameId] ?? 'start-game';

        const handleComplete = ({ result }: { result: GameResult }) => {
            const level = wellnessRef.current;
            const resultWithWellness = level
                ? {
                      ...result,
                      wellness: {
                          preSession: level,
                          postEyeStrain: false,
                          postHeadache: false,
                          timestamp: new Date().toISOString(),
                      },
                  }
                : result;
            if (result.fellow_contrast_end !== undefined) {
                const currentSettings = getDefaultSettings();
                saveDefaultSettings({
                    ...currentSettings,
                    fellowEyeContrast: result.fellow_contrast_end,
                });
            }
            const resultWithMode = {
                ...resultWithWellness,
                mode: 'training' as const,
            };
            const updatedResults = [...completedResults, resultWithMode];
            setCompletedResults(updatedResults);
            setElapsedMs(null);

            const sessions = getCachedSessions();
            const summaryData = computeSessionSummary(resultWithMode, sessions);
            addCachedSession(resultWithMode);
            setSummary(summaryData);
            setShowSummary(true);

            if (currentGameIndex < 2) {
                setPendingAction(() => () => setShowTransition(true));
            } else {
                setPendingAction(() => () => {
                    navigate('/training/summary', {
                        state: { results: updatedResults, settings },
                    });
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
            setLoading(false);
            // If wellness check already completed, start immediately.
            // Otherwise queue the start for when wellness is selected.
            if (wellnessRef.current !== null) {
                typedEventBus.emit(startEvent, settings);
            } else {
                pendingStartRef.current = () =>
                    typedEventBus.emit(startEvent, settings);
            }
        };

        const handleTick = (ms: number) => {
            setElapsedMs(ms);
        };

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        currentGameId,
        currentGameIndex,
        showTransition,
        completedResults,
        navigate,
        settings,
    ]);

    // handleAdvance is now defined via useCallback above the useEffect that depends on it

    const handleWellnessSelect = (level: WellnessLevel) => {
        wellnessRef.current = level;
        setWellnessLevel(level);
        // If the scene was already ready before wellness was selected,
        // fire the queued start event now.
        if (pendingStartRef.current) {
            pendingStartRef.current();
            pendingStartRef.current = null;
        }
    };

    const handlePause = () => {
        setIsPaused(true);
        typedEventBus.emit('toggle-pause', { source: 'react' });
    };

    const handleResume = () => {
        setIsPaused(false);
        typedEventBus.emit('toggle-pause', { source: 'react' });
    };

    const handleFinishPause = () => {
        setIsPaused(false);
        typedEventBus.emit('game-exit');
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
            className="h-screen flex flex-col bg-[var(--bg)]"
            style={{ background: 'var(--bg-gradient)' }}
        >
            {/* Minimal overlay header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-[var(--bg)]/80 backdrop-blur">
                <button
                    type="button"
                    onClick={() => navigate('/mode-select')}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-sm transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 inline" /> {t('nav.back')}
                </button>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handlePause}
                        aria-label={t('game.pause')}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-1"
                    >
                        <Pause size={18} />
                    </button>
                    <span className="text-[var(--text-secondary)] text-sm">
                        {t('training.gameOf').replace(
                            '{n}',
                            String(currentGameIndex + 1),
                        )}
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm truncate max-w-28">
                        {t(GAME_TITLE_KEYS[currentGameId] ?? 'app.title')}
                    </span>
                    {elapsedMs !== null && (
                        <span
                            className="text-[var(--text-secondary)] text-sm font-mono tabular-nums"
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
                            className={`rounded-full transition-colors duration-300 ${
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

            <div className="flex-1 flex items-center justify-center pt-11 relative z-10 overflow-hidden">
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
                    onExtend={() => {
                        typedEventBus.emit('safety-extend');
                        setSafetyWarning(null);
                    }}
                    onFinish={() => {
                        typedEventBus.emit('safety-finish');
                    }}
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
                            <h2 className="text-2xl font-display text-[var(--text)]">
                                {t('game.paused')}
                            </h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={handleResume}
                                    className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 font-semibold btn-press"
                                >
                                    {t('game.resume')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFinishPause}
                                    className="w-full border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 font-semibold btn-press hover:bg-[var(--surface)]"
                                >
                                    {t('game.quit')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showSummary && summary && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[var(--bg)]/95 backdrop-blur-md z-50 flex items-center justify-center"
                    >
                        <SessionSummaryCard
                            summary={summary}
                            onWellnessPost={updateLastSessionWellness}
                            onContinue={() => {
                                setShowSummary(false);
                                if (pendingAction) {
                                    pendingAction();
                                    setPendingAction(null);
                                }
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            {!gatePassed && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)]/95 backdrop-blur-md">
                    <p className="text-sm font-bold text-[var(--warning)] mb-4">
                        {t('gate.required_adverse')}
                    </p>
                    <MathGate
                        onPass={() => setGatePassed(true)}
                        onCancel={() => navigate('/mode-select')}
                    />
                </div>
            )}
            {gatePassed && wellnessLevel === null && (
                <WellnessPreCheck
                    onSelect={handleWellnessSelect}
                    onSkipSession={() => navigate('/mode-select')}
                />
            )}
        </div>
    );
}
