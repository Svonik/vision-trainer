import { Gamepad2, Settings, Target, TrendingUp } from 'lucide-react';
import type React from 'react';

export interface NavItem {
    route: string;
    labelKey: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
    { route: '/mode-select', labelKey: 'tabs.training', icon: Target },
    { route: '/games', labelKey: 'tabs.games', icon: Gamepad2 },
    { route: '/progress', labelKey: 'tabs.progress', icon: TrendingUp },
    { route: '/settings', labelKey: 'tabs.settings', icon: Settings },
];

export function isRouteActive(
    route: string,
    currentPath: string,
): boolean {
    if (route === '/mode-select') {
        return (
            currentPath === '/mode-select' ||
            currentPath.startsWith('/training')
        );
    }
    if (route === '/games') {
        return currentPath.startsWith('/games');
    }
    return currentPath.startsWith(route);
}
