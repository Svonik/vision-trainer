import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SelectionOption<T extends string> {
    id: T;
    label: string;
    children?: ReactNode;
}

interface SelectionCardGroupProps<T extends string> {
    options: SelectionOption<T>[];
    selected: T | null;
    onSelect: (id: T) => void;
    columns?: 1 | 2;
    className?: string;
}

export function SelectionCardGroup<T extends string>({
    options,
    selected,
    onSelect,
    columns = 2,
    className = '',
}: SelectionCardGroupProps<T>) {
    const gridClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-1';

    return (
        <div className={`grid ${gridClass} gap-4 ${className}`}>
            {options.map((option) => {
                const isSelected = selected === option.id;
                return (
                    <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => onSelect(option.id)}
                        whileTap={{ scale: 0.97 }}
                        className={`
                            relative rounded-3xl p-5 text-left
                            transition-[border-color,box-shadow] duration-200
                            bg-[var(--surface)] border-2
                            ${isSelected
                                ? 'border-[var(--cta)] shadow-[0_0_20px_rgba(255,159,67,0.2)]'
                                : 'border-[var(--border)]/50 hover:border-[var(--border)]'
                            }
                        `}
                        aria-pressed={isSelected}
                    >
                        {option.children && (
                            <div className="mb-3 flex justify-center">
                                {option.children}
                            </div>
                        )}
                        <p className={`text-center font-semibold text-base ${
                            isSelected ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'
                        }`}>
                            {option.label}
                        </p>
                        {isSelected && (
                            <motion.div
                                layoutId="selection-indicator"
                                className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[var(--cta)]"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
