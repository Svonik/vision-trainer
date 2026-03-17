import { useNavigate, useParams } from 'react-router';
import { getGameById } from '../config/games';
import { t } from '../modules/i18n';

interface TopBarProps {
    variant: 'tab' | 'push';
}

export function TopBar({ variant }: TopBarProps) {
    const navigate = useNavigate();
    const { gameId } = useParams<{ gameId: string }>();
    const currentGame = gameId ? getGameById(gameId) : undefined;

    return (
        <header
            className="top-bar fixed top-0 left-0 right-0 z-50 flex items-center px-4 py-3 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)]/30"
            style={{ minHeight: '48px' }}
        >
            {variant === 'tab' ? (
                <button
                    onClick={() => navigate('/mode-select')}
                    className="text-[var(--accent)] font-semibold text-sm hover:opacity-80 transition-opacity"
                >
                    Vision Trainer
                </button>
            ) : (
                <>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent)] text-sm transition-colors"
                    >
                        ← {t('nav.back')}
                    </button>
                    {currentGame && (
                        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-[var(--text)] truncate max-w-[60%]">
                            {t(currentGame.titleKey)}
                        </span>
                    )}
                </>
            )}
        </header>
    );
}
