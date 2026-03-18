import { useEffect, useState } from 'react';
import { t } from '../modules/i18n';

export function LandscapePrompt() {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        const check = () => {
            const show =
                window.innerWidth < 768 &&
                window.innerHeight > window.innerWidth;
            setShouldShow((prev) => (prev === show ? prev : show));
        };
        check();
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', () =>
            requestAnimationFrame(check),
        );
        return () => {
            window.removeEventListener('resize', check);
            window.removeEventListener('orientationchange', check);
        };
    }, []);

    if (!shouldShow) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-6xl animate-pulse">📱↔️</div>
            <p className="text-[var(--text)] text-xl text-center font-semibold">
                {t('landscape.rotate')}
            </p>
            <p className="text-[var(--text-secondary)] text-center text-sm">
                {t('landscape.hint')}
            </p>
        </div>
    );
}
