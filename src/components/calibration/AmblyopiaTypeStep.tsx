import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { SelectionCardGroup } from '@/components/SelectionCardGroup';
import { t } from '../../modules/i18n';
import type { AmblyopiaType } from '../../modules/storage';

interface Props {
    amblyopiaType?: AmblyopiaType;
    onSelect: (amblyopiaType: AmblyopiaType) => void;
}

const AMBLYOPIA_TYPE_OPTIONS: { id: AmblyopiaType; labelKey: string }[] = [
    { id: 'unspecified', labelKey: 'amblyopiaType.unspecified' },
    { id: 'strabismus', labelKey: 'amblyopiaType.strabismus' },
    { id: 'anisometropia', labelKey: 'amblyopiaType.anisometropia' },
    { id: 'mixed', labelKey: 'amblyopiaType.mixed' },
];

export function AmblyopiaTypeStep({
    amblyopiaType = 'unspecified',
    onSelect,
}: Props) {
    const [selected, setSelected] = useState<AmblyopiaType>(amblyopiaType);

    const options = AMBLYOPIA_TYPE_OPTIONS.map(({ id, labelKey }) => ({
        id,
        label: t(labelKey),
    }));

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-balance">
                    {t('amblyopiaType.title')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base">
                    {t('amblyopiaType.subtitle')}
                </p>
            </div>

            <SelectionCardGroup
                options={options}
                selected={selected}
                onSelect={setSelected}
                columns={1}
                className="w-full max-w-md"
            />

            <AppButton
                variant="cta"
                size="lg"
                onClick={() => onSelect(selected)}
                className="w-full max-w-md"
            >
                {t('disclaimer.continue')}
            </AppButton>
        </div>
    );
}
