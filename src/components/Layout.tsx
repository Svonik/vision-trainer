import { useLocation } from 'react-router';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';
import { FloatingParticles } from './FloatingParticles';

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const isGamePlay = location.pathname.includes('/play');
    const isOnboarding = location.pathname === '/onboarding';
    const isPushPage = /\/games\/[^/]+\/(settings|stats)/.test(location.pathname);

    // Fullscreen pages — no layout
    if (isOnboarding || isGamePlay) return <>{children}</>;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}>
            <FloatingParticles />
            <TopBar variant={isPushPage ? 'push' : 'tab'} />
            <main className="flex-1 relative z-10 pb-20 pt-12">{children}</main>
            <TabBar />
        </div>
    );
}
