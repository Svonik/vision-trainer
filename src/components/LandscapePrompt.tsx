import { useState, useEffect } from 'react';

export function LandscapePrompt() {
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => {
            const mobile = window.innerWidth < 768;
            const portrait = window.innerHeight > window.innerWidth;
            setIsMobile(mobile);
            setIsPortrait(portrait);
        };
        check();
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', check);
        return () => {
            window.removeEventListener('resize', check);
            window.removeEventListener('orientationchange', check);
        };
    }, []);

    if (!isMobile || !isPortrait) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-6xl animate-pulse">📱↔️</div>
            <p className="text-[var(--text)] text-xl text-center font-semibold">
                Поверните устройство горизонтально
            </p>
            <p className="text-[var(--text-secondary)] text-center text-sm">
                Для комфортной игры нужен горизонтальный экран
            </p>
        </div>
    );
}
