import { t } from '@/modules/i18n';
import { GAME_TITLE_KEYS } from '@/modules/sessionEngine';

interface SessionStepperProps {
    gameIds: string[];
    currentIndex?: number;
    className?: string;
}

/** Vertical timeline stepper — colored dots, connecting line, game names */
export function SessionStepper({
    gameIds,
    currentIndex = -1,
    className = '',
}: SessionStepperProps) {
    if (gameIds.length === 0) return null;

    return (
        <div className={`flex flex-col ${className}`}>
            {gameIds.map((gameId, i) => {
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                const isLast = i === gameIds.length - 1;

                const dotColor = isCurrent
                    ? 'bg-[var(--cta)] shadow-[0_0_8px_var(--cta)]'
                    : isCompleted
                      ? 'bg-[var(--success)]'
                      : 'bg-[var(--accent)]/60';

                const textColor = isCurrent
                    ? 'text-[var(--cta)]'
                    : isCompleted
                      ? 'text-[var(--success)]'
                      : 'text-[var(--text)]';

                return (
                    <div
                        key={`${gameId}-${i}`}
                        className="flex items-start gap-3"
                    >
                        {/* Dot + vertical line column */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${dotColor}`}
                            />
                            {!isLast && (
                                <div className="w-px h-5 bg-[var(--border)]/60" />
                            )}
                        </div>
                        {/* Game name */}
                        <span
                            className={`text-base font-medium leading-tight ${textColor}`}
                        >
                            {t(GAME_TITLE_KEYS[gameId] ?? 'app.title')}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
