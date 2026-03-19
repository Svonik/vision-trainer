import { useLocation } from 'react-router';
import { FloatingParticles } from './FloatingParticles';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const isGamePlay = location.pathname.includes('/play');
    const isOnboarding = location.pathname === '/onboarding';
    const isPushPage = /\/games\/[^/]+\/(settings|stats)/.test(
        location.pathname,
    );

    // Fullscreen pages — no layout
    if (isOnboarding || isGamePlay) return <>{children}</>;

    return (
        <div
            className="h-screen flex flex-col md:flex-row overflow-hidden"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <FloatingParticles />
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0">
                <TopBar variant={isPushPage ? 'push' : 'tab'} />
                <main className="flex-1 overflow-y-auto relative z-10 pb-20 md:pb-4 pt-12 md:pt-4">
                    {children}
                </main>
            </div>
            <TabBar />
        </div>
    );
}
