import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface CheckboxFieldProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    className?: string;
}

export function CheckboxField({
    checked,
    onChange,
    label,
    className = '',
}: CheckboxFieldProps) {
    return (
        <label
            className={`flex items-center gap-3 cursor-pointer select-none group ${className}`}
        >
            <div className="relative flex-shrink-0">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                />
                <motion.div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        checked
                            ? 'bg-[var(--accent)] border-[var(--accent)]'
                            : 'border-[var(--text-secondary)] group-hover:border-[var(--accent)]'
                    }`}
                    whileTap={{ scale: 0.9 }}
                >
                    <motion.div
                        initial={false}
                        animate={{
                            scale: checked ? 1 : 0,
                            opacity: checked ? 1 : 0,
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                        }}
                    >
                        <Check className="w-4 h-4 text-[var(--bg)]" strokeWidth={3} />
                    </motion.div>
                </motion.div>
            </div>
            <span className="text-[var(--text)] text-base leading-relaxed">
                {label}
            </span>
        </label>
    );
}
