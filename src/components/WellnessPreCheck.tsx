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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-6">
          <h2 className="text-xl font-bold">{t('wellness.warn_bad')}</h2>
          <div className="flex gap-4">
            <button onClick={onSkipSession} className="px-6 py-3 bg-gray-200 rounded-xl">
              {t('wellness.okay')}
            </button>
            <button onClick={() => onSelect('bad')} className="px-6 py-3 bg-blue-500 text-white rounded-xl">
              {t('summary.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-6">
        <h2 className="text-xl font-bold">{t('wellness.pre_title')}</h2>
        <div className="flex gap-4">
          <button onClick={() => handleSelect('good')} className="text-4xl p-4 hover:scale-110 transition-transform">&#x1F60A;</button>
          <button onClick={() => handleSelect('okay')} className="text-4xl p-4 hover:scale-110 transition-transform">&#x1F610;</button>
          <button onClick={() => handleSelect('bad')} className="text-4xl p-4 hover:scale-110 transition-transform">&#x1F61F;</button>
        </div>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{t('wellness.good')}</span>
          <span>{t('wellness.okay')}</span>
          <span>{t('wellness.bad')}</span>
        </div>
      </div>
    </div>
  );
}
