import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { t } from '../modules/i18n';

export function PhaserLoadingScreen() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
            >
                <Gamepad2 size={48} className="text-[var(--accent)]" />
            </motion.div>
            <p className="text-[var(--text-secondary)]">{t('game.loading')}</p>
        </motion.div>
    );
}
