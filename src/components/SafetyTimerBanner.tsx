import { useEffect, useRef } from 'react';
import { AppButton } from '@/components/AppButton';
import { t } from '../modules/i18n';

interface SafetyTimerBannerProps {
    type: string;
    onExtend: () => void;
    onFinish: () => void;
}

export function SafetyTimerBanner({
    type,
    onExtend,
    onFinish,
}: SafetyTimerBannerProps) {
    const prevFocusRef = useRef<Element | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (type === 'break') {
            prevFocusRef.current = document.activeElement;
        }
    }, [type]);

    const handleClose = (action: () => void) => {
        action();
        if (prevFocusRef.current instanceof HTMLElement) {
            prevFocusRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    if (type === 'warning') {
        return (
            <div
                aria-live="assertive"
                role="alert"
                className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur text-[var(--cta-text)] text-center py-3 px-4 font-semibold z-10 rounded-b-2xl animate-slide-down"
            >
                {t('safety.breakWarningChild')}
            </div>
        );
    }

    if (type === 'break') {
        return (
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="break-title"
                className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-md flex items-center justify-center z-20"
                style={{
                    animation: 'fadeIn 0.3s ease-out',
                    overscrollBehavior: 'contain',
                }}
                onKeyDown={handleKeyDown}
            >
                <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
                    <h2
                        id="break-title"
                        className="font-[var(--font-display)] text-2xl text-[var(--warning)]"
                    >
                        {t('safety.breakTimeChild')}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-base">
                        {t('safety.breakMessageChild')}
                    </p>
                    <div className="flex flex-col gap-3 pt-2">
                        <AppButton
                            variant="cta"
                            size="md"
                            className="w-full"
                            autoFocus
                            onClick={() => handleClose(onExtend)}
                            onKeyDown={(e) =>
                                e.key === 'Escape' && handleClose(onFinish)
                            }
                        >
                            {t('safety.extend')}
                        </AppButton>
                        <AppButton
                            variant="outline"
                            size="md"
                            className="w-full"
                            onClick={() => handleClose(onFinish)}
                        >
                            {t('safety.finish')}
                        </AppButton>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
