import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Info, BookOpen, Eye, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { acceptDisclaimer } from '@/modules/storage';
import { t } from '@/modules/i18n';

export function DisclaimerPage() {
    const [accepted, setAccepted] = useState(false);
    const navigate = useNavigate();

    const handleContinue = () => {
        acceptDisclaimer();
        navigate('/calibration');
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <div className="w-full max-w-lg">
                <p className="text-sm text-[var(--text-secondary)] mb-2 text-center">
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
                                <span>Данное приложение не является заменой очной консультации врача.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <Eye className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                <span>Рекомендуется использовать под наблюдением офтальмолога.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <Heart className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                <span>При возникновении двоения, головной боли или дискомфорта — прекратите использование.</span>
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
                            <span className="text-[var(--text)] text-sm">
                                {t('disclaimer.accept')}
                            </span>
                        </label>
                    </CardContent>
                    <CardFooter>
                        <button
                            onClick={handleContinue}
                            disabled={!accepted}
                            className="w-full bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-2.5 font-semibold btn-press disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('disclaimer.continue')}
                        </button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
