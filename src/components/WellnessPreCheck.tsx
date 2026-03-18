import { useState } from 'react';
import { t } from '@/modules/i18n';
import { shouldWarnBeforeSession, type WellnessLevel } from '@/modules/wellnessCheck';

interface WellnessPreCheckProps {
  onSelect: (level: WellnessLevel) => void;
  onSkipSession: () => void;
}

export function WellnessPreCheck({ onSelect, onSkipSession }: WellnessPreCheckProps) {
  const [showWarning, setShowWarning] = useState(false);

  const handleSelect = (level: WellnessLevel) => {
    if (shouldWarnBeforeSession(level)) {
      setShowWarning(true);
    } else {
      onSelect(level);
    }
  };

  if (showWarning) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[var(--surface)] rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-6">
          <h2 className="text-xl font-bold text-[var(--text)]">{t('wellness.warn_bad')}</h2>
          <div className="flex gap-4">
            <button
              onClick={onSkipSession}
              className="px-6 py-3 bg-[var(--border)] rounded-full text-[var(--text)] btn-press transition-colors"
            >
              {t('wellness.okay')}
            </button>
            <button
              onClick={() => onSelect('bad')}
              className="px-6 py-3 bg-[var(--cta)] text-[var(--cta-text)] rounded-full btn-press transition-colors"
            >
              {t('summary.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--surface)] rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-6">
        <h2 className="text-xl font-bold text-[var(--text)]">{t('wellness.pre_title')}</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleSelect('good')}
            className="text-4xl p-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] btn-press transition-all"
          >
            &#x1F60A;
          </button>
          <button
            onClick={() => handleSelect('okay')}
            className="text-4xl p-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] btn-press transition-all"
          >
            &#x1F610;
          </button>
          <button
            onClick={() => handleSelect('bad')}
            className="text-4xl p-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] btn-press transition-all"
          >
            &#x1F61F;
          </button>
        </div>
        <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
          <span>{t('wellness.good')}</span>
          <span>{t('wellness.okay')}</span>
          <span>{t('wellness.bad')}</span>
        </div>
      </div>
    </div>
  );
}
