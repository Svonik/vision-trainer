import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { SelectionCardGroup } from '@/components/SelectionCardGroup';
import { t } from '../../modules/i18n';
import type { AgeGroup } from '../../modules/therapyProtocol';

interface Props {
    onSelect: (ageGroup: AgeGroup) => void;
}

function YoungChildIllustration() {
    return (
        <svg
            viewBox="0 0 120 100"
            className="w-24 h-20 mx-auto"
            aria-hidden="true"
        >
            {/* Simple star + circle — playful, young */}
            <circle cx="60" cy="55" r="25" fill="var(--warning)" opacity="0.3" />
            <circle cx="60" cy="55" r="15" fill="var(--warning)" opacity="0.5" />
            {/* Star */}
            <polygon
                points="60,15 65,35 85,35 69,47 75,67 60,54 45,67 51,47 35,35 55,35"
                fill="var(--warning)"
                opacity="0.7"
            />
            {/* Small circles — bubbles */}
            <circle cx="25" cy="30" r="5" fill="var(--accent)" opacity="0.4" />
            <circle cx="95" cy="25" r="7" fill="var(--cyan-soft)" opacity="0.4" />
            <circle cx="90" cy="75" r="4" fill="var(--red-soft)" opacity="0.3" />
        </svg>
    );
}

function OlderChildIllustration() {
    return (
        <svg
            viewBox="0 0 120 100"
            className="w-24 h-20 mx-auto"
            aria-hidden="true"
        >
            {/* Geometric shapes — more complex, older */}
            <rect
                x="35"
                y="20"
                width="50"
                height="50"
                rx="8"
                fill="var(--accent)"
                opacity="0.3"
                transform="rotate(15,60,45)"
            />
            <rect
                x="40"
                y="25"
                width="40"
                height="40"
                rx="6"
                fill="var(--accent)"
                opacity="0.5"
                transform="rotate(15,60,45)"
            />
            {/* Diamond */}
            <rect
                x="48"
                y="33"
                width="24"
                height="24"
                rx="3"
                fill="var(--cyan-soft)"
                opacity="0.7"
                transform="rotate(45,60,45)"
            />
            {/* Decorative elements */}
            <circle cx="20" cy="70" r="6" fill="var(--accent)" opacity="0.4" />
            <circle cx="100" cy="30" r="5" fill="var(--warning)" opacity="0.4" />
            <rect
                x="88"
                y="65"
                width="12"
                height="12"
                rx="3"
                fill="var(--red-soft)"
                opacity="0.3"
                transform="rotate(20,94,71)"
            />
        </svg>
    );
}

export function AgeGroupStep({ onSelect }: Props) {
    const [selected, setSelected] = useState<AgeGroup | null>(null);

    const options = [
        {
            id: '4-7' as AgeGroup,
            label: t('age_group.4_7'),
            children: <YoungChildIllustration />,
        },
        {
            id: '8-12' as AgeGroup,
            label: t('age_group.8_12'),
            children: <OlderChildIllustration />,
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
                    {t('age_group.title')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base">
                    {t('age_group.subtitle')}
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
