import { motion } from 'framer-motion';

interface SegmentOption<T extends string> {
    id: T;
    label: string;
}

interface SegmentedControlProps<T extends string> {
    options: SegmentOption<T>[];
    selected: T;
    onChange: (id: T) => void;
    className?: string;
}

export function SegmentedControl<T extends string>({
    options,
    selected,
    onChange,
    className = '',
}: SegmentedControlProps<T>) {
    return (
        <div
            className={`flex bg-[var(--bg)]/50 p-1 rounded-2xl ring-1 ring-white/[0.05] ${className}`}
        >
            {options.map((option) => {
                const isActive = option.id === selected;
                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onChange(option.id)}
                        className={`flex-1 relative py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                            isActive
                                ? 'text-[var(--text)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                        }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="segment-active"
                                className="absolute inset-0 bg-[var(--surface)] rounded-xl ring-1 ring-white/[0.08] shadow-md"
                                transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 30,
                                }}
                            />
                        )}
                        <span className="relative z-10">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
