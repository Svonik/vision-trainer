import { type HTMLMotionProps, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'cta' | 'primary' | 'outline' | 'ghost' | 'toggle';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    variant?: Variant;
    size?: Size;
    selected?: boolean;
    children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
    cta: 'bg-[var(--cta)] text-[var(--cta-text)] font-semibold',
    primary: 'bg-[var(--accent)] text-[var(--bg)] font-semibold',
    outline:
        'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface)]',
    toggle: '', // handled dynamically via `selected`
};

const SIZE_CLASSES: Record<Size, string> = {
    sm: 'py-2 px-3 text-sm min-h-[44px]',
    md: 'py-3 px-4 text-base min-h-[44px]',
    lg: 'py-4 px-6 text-lg min-h-[48px]',
};

export function AppButton({
    variant = 'primary',
    size = 'md',
    selected = false,
    className = '',
    children,
    disabled,
    ...rest
}: AppButtonProps) {
    const toggleClass =
        variant === 'toggle'
            ? selected
                ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]'
                : 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50'
            : VARIANT_CLASSES[variant];

    return (
        <motion.button
            whileTap={disabled ? undefined : { scale: 0.95 }}
            whileHover={disabled ? undefined : { scale: 1.02 }}
            className={`rounded-full transition-colors inline-flex items-center justify-center gap-2 ${SIZE_CLASSES[size]} ${toggleClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-0 ${className}`}
            disabled={disabled}
            {...rest}
        >
            {children}
        </motion.button>
    );
}
