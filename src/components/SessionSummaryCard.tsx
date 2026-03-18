import { t } from '@/modules/i18n';
import type { SessionSummary } from '@/modules/sessionSummary';

interface SessionSummaryCardProps {
    readonly summary: SessionSummary;
    readonly onContinue: () => void;
}

export function SessionSummaryCard({ summary, onContinue }: SessionSummaryCardProps) {
    const message = summary.stars === 3
        ? t('summary.excellent')
        : summary.stars === 2
            ? t('summary.good')
            : t('summary.try_again');

    return (
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg max-w-sm mx-auto">
            <div className="text-4xl">
                {'★'.repeat(summary.stars)}{'☆'.repeat(3 - summary.stars)}
            </div>

            <h2 className="text-2xl font-bold">{message}</h2>

            {summary.isNewRecord && (
                <div className="text-amber-500 font-bold">{t('summary.new_record')}</div>
            )}

            <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>{t('summary.streak')}</span>
                    <span className="font-bold">{summary.streakDays}</span>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>{t('summary.contrast_progress')}</span>
                        <span className="font-bold">{Math.round(summary.contrastProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, summary.contrastProgress)}%` }}
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={onContinue}
                className="mt-4 px-8 py-3 bg-blue-500 text-white rounded-xl text-lg font-bold hover:bg-blue-600 transition-colors"
            >
                {t('summary.continue')}
            </button>
        </div>
    );
}
