import { motion } from 'framer-motion';

export function SuspenseFallback() {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
            >
                <span className="text-xl font-display text-[var(--accent)]">
                    Vision Trainer
                </span>
            </motion.div>
        </div>
    );
}
