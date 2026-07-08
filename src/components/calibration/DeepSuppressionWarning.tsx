import { AppButton } from '@/components/AppButton';
import { t } from '../../modules/i18n';

interface Props {
    onContinue: () => void;
}

/**
 * Shown when the suppression test detects deep suppression
 * (balancePoint > 80). Recommends consulting an ophthalmologist.
 * Does NOT block access to therapy — the user can always continue.
 */
export function DeepSuppressionWarning({ onContinue }: Props) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <p
                role="alert"
                className="text-[var(--warning)] text-lg font-semibold text-center max-w-sm"
            >
                {t('calibration.doctorWarning')}
            </p>
            <div className="w-full max-w-sm">
                <AppButton
                    variant="cta"
                    size="md"
                    onClick={onContinue}
                    className="w-full"
                >
                    {t('calibration.continueAnyway')}
                </AppButton>
            </div>
        </div>
    );
}
