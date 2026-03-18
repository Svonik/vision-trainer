import { t } from '../../modules/i18n';
import type { AgeGroup } from '../../modules/therapyProtocol';

interface Props {
    onSelect: (ageGroup: AgeGroup) => void;
}

export function AgeGroupStep({ onSelect }: Props) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-center">
                {t('age_group.title')}
            </h2>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <button
                    onClick={() => onSelect('4-7')}
                    className="rounded-3xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] p-6 btn-press transition-all"
                >
                    <p className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)]">
                        {t('age_group.4_7')}
                    </p>
                </button>
                <button
                    onClick={() => onSelect('8-12')}
                    className="rounded-3xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] p-6 btn-press transition-all"
                >
                    <p className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)]">
                        {t('age_group.8_12')}
                    </p>
                </button>
            </div>
        </div>
    );
}
