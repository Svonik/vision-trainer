import type { LucideIcon } from 'lucide-react';

type IconBadgeSize = 'sm' | 'md' | 'lg';
type IconBadgeColor = 'accent' | 'warning' | 'success' | 'red' | 'cyan';

interface IconBadgeProps {
    icon: LucideIcon;
    size?: IconBadgeSize;
    color?: IconBadgeColor;
    className?: string;
}

const SIZE_MAP: Record<IconBadgeSize, { container: string; icon: string }> = {
    sm: { container: 'p-1.5', icon: 'w-4 h-4' },
    md: { container: 'p-2', icon: 'w-5 h-5' },
    lg: { container: 'p-3', icon: 'w-6 h-6' },
};

const COLOR_MAP: Record<IconBadgeColor, { bg: string; text: string }> = {
    accent: {
        bg: 'bg-[var(--accent)]/15',
        text: 'text-[var(--accent)]',
    },
    warning: {
        bg: 'bg-[var(--warning)]/15',
        text: 'text-[var(--warning)]',
    },
    success: {
        bg: 'bg-[var(--success)]/15',
        text: 'text-[var(--success)]',
    },
    red: {
        bg: 'bg-[var(--red-soft)]/15',
        text: 'text-[var(--red-soft)]',
    },
    cyan: {
        bg: 'bg-[var(--cyan-soft)]/15',
        text: 'text-[var(--cyan-soft)]',
    },
};

export function IconBadge({
    icon: Icon,
    size = 'md',
    color = 'accent',
    className = '',
}: IconBadgeProps) {
    const sizeClasses = SIZE_MAP[size];
    const colorClasses = COLOR_MAP[color];

    return (
        <div
            className={`rounded-full flex-shrink-0 inline-flex items-center justify-center ${sizeClasses.container} ${colorClasses.bg} ${className}`}
        >
            <Icon className={`${sizeClasses.icon} ${colorClasses.text}`} />
        </div>
    );
}
