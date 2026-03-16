import { useLocation, useNavigate } from 'react-router';
import { Target, Gamepad2, TrendingUp, Settings } from 'lucide-react';
import { t } from '../modules/i18n';

interface Tab {
    route: string;
    labelKey: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: Tab[] = [
    { route: '/mode-select', labelKey: 'tabs.training', icon: Target },
    { route: '/games', labelKey: 'tabs.games', icon: Gamepad2 },
    { route: '/progress', labelKey: 'tabs.progress', icon: TrendingUp },
    { route: '/settings', labelKey: 'tabs.settings', icon: Settings },
];

export function TabBar() {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (route: string): boolean => {
        if (route === '/mode-select') {
            return location.pathname === '/mode-select' || location.pathname.startsWith('/training');
        }
        if (route === '/games') {
            return location.pathname.startsWith('/games');
        }
        return location.pathname.startsWith(route);
    };

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 h-[60px] bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)]/30 flex"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Main navigation"
        >
            {TABS.map(({ route, labelKey, icon: Icon }) => {
                const active = isActive(route);
                const colorClass = active
                    ? 'text-[var(--cta)]'
                    : 'text-[var(--text-secondary)]';

                return (
                    <button
                        key={route}
                        onClick={() => navigate(route)}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 btn-press ${colorClass}`}
                        aria-current={active ? 'page' : undefined}
                    >
                        <Icon size={22} />
                        <span className="text-xs leading-none" style={{ display: 'var(--tab-label-display, inline)' }}>{t(labelKey)}</span>
                    </button>
                );
            })}
        </nav>
    );
}
