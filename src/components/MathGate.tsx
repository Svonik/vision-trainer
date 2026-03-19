import { useState, useMemo } from 'react';
import { t } from '@/modules/i18n';

interface MathGateProps {
  onPass: () => void;
  onCancel: () => void;
}

export function MathGate({ onPass, onCancel }: MathGateProps) {
  const { a, b, answer } = useMemo(() => {
    const a = Math.floor(Math.random() * 4) + 6; // 6-9
    const b = Math.floor(Math.random() * 4) + 6; // 6-9
    return { a, b, answer: a * b };
  }, []);

  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (parseInt(input, 10) === answer) {
      onPass();
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--surface)] rounded-2xl p-8 max-w-sm mx-4 flex flex-col items-center gap-4">
        <h2 className="text-lg font-bold text-[var(--text)]">{t('gate.title')}</h2>
        <p className="text-3xl font-bold text-[var(--accent)]">{a} × {b} = ?</p>
        <input
          type="number"
          inputMode="numeric"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-24 text-center text-2xl p-2 rounded-xl bg-[var(--bg)] border-2 border-[var(--border)] text-[var(--text)]"
          autoFocus
        />
        {error && <p className="text-sm text-[var(--warning)]">{t('gate.wrong')}</p>}
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-3 rounded-full bg-[var(--border)] text-[var(--text)] btn-press">
            {t('gate.cancel')}
          </button>
          <button onClick={handleSubmit} className="flex-1 py-3 rounded-full bg-[var(--cta)] text-[var(--cta-text)] btn-press">
            {t('gate.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
