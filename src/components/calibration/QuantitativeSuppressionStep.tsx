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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6 bg-[var(--bg)]">
      <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-center">
        {t('suppression.title')}
      </h2>
      <p className="text-center text-[var(--text-secondary)]">{t('suppression.instruction')}</p>
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
      <p className="text-sm text-[var(--text-secondary)]">
        {t('suppression.result')}: {state.currentContrast}%
      </p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={handleNotSeen}
          className="rounded-3xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] p-4 btn-press transition-all"
        >
          <p className="font-[var(--font-display)] text-lg font-semibold text-[var(--text)]">
            {t('suppression.next')}
          </p>
        </button>
        <button
          onClick={handleSeen}
          className="rounded-3xl border-2 border-[var(--cta)] bg-[var(--surface)] shadow-[0_0_25px_rgba(255,159,67,0.3)] p-4 btn-press transition-all"
        >
          <p className="font-[var(--font-display)] text-lg font-bold text-[var(--cta)]">
            {t('suppression.seen')}
          </p>
        </button>
      </div>
    </div>
  );
}
