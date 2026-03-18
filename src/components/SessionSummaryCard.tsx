import { useState } from 'react';
import { t } from '@/modules/i18n';
import type { SessionSummary } from '@/modules/sessionSummary';

interface SessionSummaryCardProps {
    readonly summary: SessionSummary;
    readonly onContinue: () => void;
    readonly onWellnessPost?: (eyeStrain: boolean, headache: boolean) => void;
}

export function SessionSummaryCard({ summary, onContinue, onWellnessPost }: SessionSummaryCardProps) {
    const [eyeStrain, setEyeStrain] = useState(false);
    const [headache, setHeadache] = useState(false);

    const message = summary.stars === 3
        ? t('summary.excellent')
        : summary.stars === 2
            ? t('summary.good')
            : t('summary.try_again');

    const handleContinue = () => {
        onWellnessPost?.(eyeStrain, headache);
        onContinue();
    };

    return (
        <div className="flex flex-col items-center gap-4 p-8 bg-[var(--surface)] rounded-2xl shadow-lg max-w-sm mx-auto">
            <div className="text-4xl">
                {'★'.repeat(summary.stars)}{'☆'.repeat(3 - summary.stars)}
            </div>

            <h2 className="text-2xl font-bold text-[var(--text)]">{message}</h2>

            {summary.isNewRecord && (
                <div className="text-[var(--warning)] font-bold">{t('summary.new_record')}</div>
            )}

            <div className="w-full space-y-2 text-sm text-[var(--text)]">
                <div className="flex justify-between">
                    <span>{t('summary.streak')}</span>
                    <span className="font-bold">{summary.streakDays}</span>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>{t('summary.contrast_progress')}</span>
                        <span className="font-bold">{Math.round(summary.contrastProgress)}%</span>
                    </div>
                    <div className="w-full bg-[var(--border)] rounded-full h-2">
                        <div
                            className="bg-[var(--accent)] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, summary.contrastProgress)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Post-session wellness questions */}
            <div className="w-full space-y-3 pt-2 border-t border-[var(--border)]">
                <WellnessToggle
                    label={t('wellness.post_eye_strain')}
                    value={eyeStrain}
                    onChange={setEyeStrain}
                />
                <WellnessToggle
                    label={t('wellness.post_headache')}
                    value={headache}
                    onChange={setHeadache}
                />
            </div>

            <button
                onClick={handleContinue}
                className="mt-4 px-8 py-3 bg-[var(--cta)] text-[var(--cta-text)] rounded-full text-lg font-bold btn-press transition-colors"
            >
                {t('summary.continue')}
            </button>
        </div>
    );
}

interface WellnessToggleProps {
    readonly label: string;
    readonly value: boolean;
    readonly onChange: (v: boolean) => void;
}

function WellnessToggle({ label, value, onChange }: WellnessToggleProps) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">{label}</span>
            <div className="flex gap-2">
                <button
                    onClick={() => onChange(false)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold btn-press transition-all ${
                        !value
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]'
                            : 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                >
                    {t('wellness.good').charAt(0).toUpperCase() === 'Х' ? 'Нет' : 'Нет'}
                </button>
                <button
                    onClick={() => onChange(true)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold btn-press transition-all ${
                        value
                            ? 'bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]'
                            : 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                >
                    Да
                </button>
            </div>
        </div>
    );
}
