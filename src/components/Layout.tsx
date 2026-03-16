import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useGameTimer } from './GameTimerContext';
import { t } from '../modules/i18n';
import { getCalibration, isDisclaimerAccepted } from '../modules/storage';
import { FloatingParticles } from './FloatingParticles';
import { getGameById } from '../config/games';

const STEPS = [
    { path: '/disclaimer', label: 'Дисклеймер' },
    { path: '/calibration', label: 'Калибровка' },
    { path: '/games', label: 'Игры' },
];

function formatTime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { elapsedMs } = useGameTimer();
    const isGamePlay = location.pathname.includes('/play');
    const calibration = getCalibration();
    const showRecalibrate = calibration.suppression_passed;

    // Extract gameId from paths like /games/:gameId/play or /games/:gameId/stats
    const gameIdMatch = location.pathname.match(/\/games\/([^/]+)\//);
    const routeGameId = gameIdMatch?.[1];
    const currentGame = routeGameId ? getGameById(routeGameId) : undefined;

    const handleLogoClick = () => {
        if (isDisclaimerAccepted()) {
            navigate('/games');
        } else {
            navigate('/disclaimer');
        }
    };

    const getStepStatus = (stepPath: string) => {
        const currentIndex = STEPS.findIndex(s => location.pathname.startsWith(s.path));
        const stepIndex = STEPS.findIndex(s => s.path === stepPath);
        if (location.pathname.startsWith(stepPath)) return 'active';
        if (stepIndex < currentIndex) return 'completed';
        return 'future';
    };

    if (isGamePlay) {
        return (
            <div className="min-h-screen bg-[var(--bg)]" style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}>
                <FloatingParticles />
                <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-[var(--bg)]/80 backdrop-blur">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-sm"
                    >
                        ← {t('nav.back')}
                    </Button>
                    <div className="flex items-center gap-3">
                        {currentGame && (
                            <span className="text-[var(--text-secondary)] text-xs truncate max-w-32">
                                {t(currentGame.titleKey)}
                            </span>
                        )}
                        {elapsedMs !== null && (
                            <span className="text-[var(--text-secondary)] text-sm font-mono" style={{ fontFamily: 'var(--font-display)' }}>
                                {formatTime(elapsedMs)}
                            </span>
                        )}
                    </div>
                </header>
                <div className="pt-10 relative z-10">{children}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)]" style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}>
            <FloatingParticles />
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]/30">
                <button
                    onClick={handleLogoClick}
                    className="text-[var(--accent)] font-semibold text-sm hover:opacity-80 transition-opacity"
                >
                    Vision Trainer
                </button>
                <nav className="flex gap-1">
                    {STEPS.map((step) => {
                        const status = getStepStatus(step.path);
                        if (status === 'completed') {
                            return (
                                <button
                                    key={step.path}
                                    onClick={() => navigate(step.path)}
                                    className="text-xs px-2 py-1 rounded text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                                >
                                    {step.label}
                                </button>
                            );
                        }
                        return (
                            <span
                                key={step.path}
                                className={`text-xs px-2 py-1 rounded ${
                                    status === 'active' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' :
                                    'text-[var(--border)]'
                                }`}
                            >
                                {step.label}
                            </span>
                        );
                    })}
                </nav>
                <div className="flex gap-2 items-center">
                    {showRecalibrate && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/calibration')}
                            className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-xs h-7 px-2"
                        >
                            {t('layout.recalibrate')}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-xs h-7 px-2"
                    >
                        ← {t('nav.back')}
                    </Button>
                </div>
            </header>
            <div className="pt-12 relative z-10">{children}</div>
        </div>
    );
}
