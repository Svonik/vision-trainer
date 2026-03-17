import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Info, BookOpen, Eye, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppButton } from '@/components/AppButton';
import { acceptDisclaimer } from '@/modules/storage';
import { t } from '@/modules/i18n';

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

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--bg-gradient)' }}
        >
            <div className="w-full max-w-lg">
                <p className="text-base text-[var(--text-secondary)] mb-2 text-center">
                    {t('disclaimer.parentGate')}
                </p>
                <Card
                    className="w-full bg-[var(--surface)] border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 spring-enter"
                >
                    <CardHeader>
                        <div className="flex justify-center mb-2">
                            <Info className="w-12 h-12 text-[var(--warning)]" />
                        </div>
                        <CardTitle className="text-xl text-[var(--text)]">
                            {t('app.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-3 text-base text-[var(--text)]">
                            <li className="flex gap-3 items-start">
                                <BookOpen className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                <span>{t('disclaimer.point1')}</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <Eye className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                <span>{t('disclaimer.point2')}</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <Heart className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                <span>{t('disclaimer.point3')}</span>
                            </li>
                        </ul>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                role="checkbox"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="mt-1 w-5 h-5 accent-[#c9a0dc] flex-shrink-0"
                            />
                            <span className="text-[var(--text)] text-base">
                                {t('disclaimer.accept')}
                            </span>
                        </label>
                    </CardContent>
                    <CardFooter>
                        <AppButton
                            variant="cta"
                            size="md"
                            onClick={handleContinue}
                            disabled={!accepted}
                            title={!accepted ? 'Отметьте согласие чтобы продолжить' : undefined}
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
