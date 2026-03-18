import { useState } from 'react';
import { t } from '@/modules/i18n';
import {
  createSuppressionTest,
  advanceContrast,
  recordResponse,
  computeResult,
  type SuppressionTestState,
  type SuppressionResult,
} from '@/modules/suppressionTest';

interface QuantitativeSuppressionStepProps {
  glassesType: string;
  onComplete: (result: SuppressionResult) => void;
}

export function QuantitativeSuppressionStep({ glassesType, onComplete }: QuantitativeSuppressionStepProps) {
  const [state, setState] = useState<SuppressionTestState>(() => advanceContrast(createSuppressionTest()));

  const handleNotSeen = () => {
    let next = recordResponse(state, false);
    if (next.currentContrast >= 100) {
      onComplete(computeResult(next));
      return;
    }
    next = advanceContrast(next);
    setState(next);
  };

  const handleSeen = () => {
    const next = recordResponse(state, true);
    onComplete(computeResult(next));
  };

  const isRedLeft = glassesType === 'red-cyan';
  const amblyopicColor = isRedLeft ? '#FF0000' : '#00FFFF';
  const fellowColor = isRedLeft ? '#00FFFF' : '#FF0000';
  const fellowAlpha = state.currentContrast / 100;

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h2 className="text-xl font-bold">{t('suppression.title')}</h2>
      <p className="text-center text-gray-600">{t('suppression.instruction')}</p>
      <div className="flex gap-8 items-center justify-center my-4">
        <div
          className="w-24 h-24 rounded-lg"
          style={{ backgroundColor: amblyopicColor }}
        />
        <div
          className="w-24 h-24 rounded-lg"
          style={{ backgroundColor: fellowColor, opacity: fellowAlpha }}
        />
      </div>
      <p className="text-sm text-gray-500">
        {t('suppression.result')}: {state.currentContrast}%
      </p>
      <div className="flex gap-4">
        <button
          onClick={handleNotSeen}
          className="px-6 py-3 bg-gray-200 rounded-xl text-lg hover:bg-gray-300 transition-colors"
        >
          {t('suppression.next')}
        </button>
        <button
          onClick={handleSeen}
          className="px-6 py-3 bg-green-500 text-white rounded-xl text-lg font-bold hover:bg-green-600 transition-colors"
        >
          {t('suppression.seen')}
        </button>
      </div>
    </div>
  );
}
