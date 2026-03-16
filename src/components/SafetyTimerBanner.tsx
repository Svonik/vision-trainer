import { t } from '../modules/i18n';

interface SafetyTimerBannerProps {
    type: string;
    onExtend: () => void;
    onFinish: () => void;
}

export function SafetyTimerBanner({ type, onExtend, onFinish }: SafetyTimerBannerProps) {
    if (type === 'warning') {
        return (
            <div
                aria-live="assertive"
                role="alert"
                className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur text-[var(--cta-text)] text-center py-3 px-4 font-semibold z-10 rounded-b-2xl"
                style={{ animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                {t('safety.breakWarningChild')}
            </div>
        );
    }

    if (type === 'break') {
        return (
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Перерыв"
                className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-md flex items-center justify-center z-20"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
            >
                <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
                    <h2 className="font-[var(--font-display)] text-2xl text-[var(--warning)]">
                        {t('safety.breakTimeChild')}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-base">
                        {t('safety.breakMessageChild')}
                    </p>
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            autoFocus
                            onClick={onExtend}
                            onKeyDown={e => e.key === 'Escape' && onFinish()}
                            className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 font-semibold btn-press"
                        >
                            {t('safety.extend')}
                        </button>
                        <button
                            onClick={onFinish}
                            className="w-full border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-3 font-semibold btn-press hover:bg-[var(--surface)]"
                        >
                            {t('safety.finish')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
