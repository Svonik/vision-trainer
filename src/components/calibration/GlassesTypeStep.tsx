import { t } from '../../modules/i18n';

interface Props {
    glassesType: string;
    onSelect: (type: 'red-cyan' | 'cyan-red') => void;
}

export function GlassesTypeStep({ glassesType, onSelect }: Props) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
            <h2 className="text-2xl font-bold text-[var(--text)] text-center">
                {t('calibration.glassesType')}
            </h2>
            <div className="flex flex-col gap-4 w-full max-w-sm">
                <button
                    onClick={() => onSelect('red-cyan')}
                    className={`w-full rounded-2xl border-2 py-6 text-lg font-semibold btn-press transition-colors ${
                        glassesType === 'red-cyan'
                            ? 'bg-[var(--red-soft)]/20 text-[var(--red-soft)] border-[var(--red-soft)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--red-soft)]/50'
                    }`}
                >
                    {t('calibration.glassesRed')}
                </button>
                <button
                    onClick={() => onSelect('cyan-red')}
                    className={`w-full rounded-2xl border-2 py-6 text-lg font-semibold btn-press transition-colors ${
                        glassesType === 'cyan-red'
                            ? 'bg-[var(--cyan-soft)]/20 text-[var(--cyan-soft)] border-[var(--cyan-soft)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--cyan-soft)]/50'
                    }`}
                >
                    {t('calibration.glassesCyan')}
                </button>
            </div>
        </div>
    );
}
