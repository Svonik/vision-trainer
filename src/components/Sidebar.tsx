import { useLocation, useNavigate } from 'react-router';
import { t } from '../modules/i18n';
import { isRouteActive, NAV_ITEMS } from './navConfig';

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <aside
            className="hidden md:flex flex-col w-56 flex-shrink-0"
            aria-label="Desktop navigation"
        >
            {/* Logo */}
            <div className="p-6 pb-8">
                <span className="font-[var(--font-display)] text-lg font-bold text-[var(--accent)]">
                    Vision Trainer
                </span>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-1 px-3 flex-1">
                {NAV_ITEMS.map(({ route, labelKey, icon: Icon }) => {
                    const active = isRouteActive(route, location.pathname);

                    return (
                        <button
                            type="button"
                            key={route}
                            onClick={() => navigate(route)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors duration-200 ${
                                active
                                    ? 'text-[var(--cta)] font-semibold'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                            }`}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon size={20} />
                            <span className="text-sm font-medium">
                                {t(labelKey)}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
