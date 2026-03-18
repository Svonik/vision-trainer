import { AlertTriangle, Eye, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AppButton } from '@/components/AppButton';
import { CheckboxField } from '@/components/CheckboxField';
import { IconBadge } from '@/components/IconBadge';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { t } from '@/modules/i18n';
import { acceptDisclaimer } from '@/modules/storage';

interface DisclaimerPageProps {
    onComplete?: () => void;
}

export function DisclaimerPage({ onComplete }: DisclaimerPageProps = {}) {
    const [accepted, setAccepted] = useState(false);
    const navigate = useNavigate();

    const handleContinue = () => {
        acceptDisclaimer();
        if (onComplete) {
            onComplete();
        } else {
            navigate('/onboarding');
        }
    };

    const points = [
        {
            icon: Stethoscope,
            color: 'accent' as const,
            textKey: 'disclaimer.point1',
        },
        { icon: Eye, color: 'accent' as const, textKey: 'disclaimer.point2' },
        {
            icon: AlertTriangle,
            color: 'warning' as const,
            textKey: 'disclaimer.point3',
        },
    ];

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <div className="w-full max-w-lg">
                <Card className="w-full bg-[var(--surface)] border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 spring-enter">
                    <CardHeader>
                        <h1 className="text-xl font-bold text-[var(--text)] text-balance font-[var(--font-display)]">
                            {t('disclaimer.parentGate')}
                        </h1>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <ul className="space-y-4">
                            {points.map((point) => (
                                <li
                                    key={point.textKey}
                                    className="flex gap-3 items-start"
                                >
                                    <IconBadge
                                        icon={point.icon}
                                        color={point.color}
                                        size="md"
                                        className="mt-0.5"
                                    />
                                    <span className="text-base text-[var(--text)] leading-relaxed">
                                        {t(point.textKey)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <CheckboxField
                            checked={accepted}
                            onChange={setAccepted}
                            label={t('disclaimer.accept')}
                        />
                    </CardContent>
                    <CardFooter>
                        <AppButton
                            variant="cta"
                            size="lg"
                            onClick={handleContinue}
                            disabled={!accepted}
                            className="w-full"
                        >
                            {t('disclaimer.continue')}
                        </AppButton>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
