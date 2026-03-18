import { Eye } from 'lucide-react';
import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { SelectionCardGroup } from '@/components/SelectionCardGroup';
import { t } from '../../modules/i18n';

interface Props {
    onSelect: (weakEye: 'left' | 'right') => void;
}

function EyeIllustration({ side }: { side: 'left' | 'right' }) {
    return (
        <svg
            viewBox="0 0 120 80"
            className="w-20 h-14 mx-auto"
            aria-hidden="true"
        >
            {/* Soft glow behind the highlighted eye */}
            <circle
                cx={side === 'left' ? 35 : 85}
                cy="40"
                r="28"
                fill="var(--accent)"
                opacity="0.15"
            />
            {/* Left eye */}
            <ellipse
                cx="35"
                cy="40"
                rx="22"
                ry="16"
                fill="none"
                stroke={side === 'left' ? 'var(--accent)' : 'var(--border)'}
                strokeWidth="2.5"
            />
            <circle
                cx="35"
                cy="40"
                r="8"
                fill={side === 'left' ? 'var(--accent)' : 'var(--text-secondary)'}
                opacity={side === 'left' ? 0.7 : 0.3}
            />
            {/* Right eye */}
            <ellipse
                cx="85"
                cy="40"
                rx="22"
                ry="16"
                fill="none"
                stroke={side === 'right' ? 'var(--accent)' : 'var(--border)'}
                strokeWidth="2.5"
            />
            <circle
                cx="85"
                cy="40"
                r="8"
                fill={side === 'right' ? 'var(--accent)' : 'var(--text-secondary)'}
                opacity={side === 'right' ? 0.7 : 0.3}
            />
        </svg>
    );
}

export function WeakEyeStep({ onSelect }: Props) {
    const [selected, setSelected] = useState<'left' | 'right' | null>(null);

    const options = [
        {
            id: 'left' as const,
            label: t('weak_eye.left'),
            children: <EyeIllustration side="left" />,
        },
        {
            id: 'right' as const,
            label: t('weak_eye.right'),
            children: <EyeIllustration side="right" />,
        },
    ];

    const handleConfirm = () => {
        if (selected) {
            onSelect(selected);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-balance">
                    {t('weak_eye.title')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base">
                    {t('weak_eye.subtitle')}
                </p>
            </div>

            <SelectionCardGroup
                options={options}
                selected={selected}
                onSelect={setSelected}
                columns={2}
                className="w-full max-w-md"
            />

            <AppButton
                variant="cta"
                size="lg"
                disabled={!selected}
                onClick={handleConfirm}
                className="w-full max-w-md"
            >
                {t('disclaimer.continue')}
            </AppButton>
        </div>
    );
}
