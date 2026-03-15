import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card
                className="max-w-lg w-full bg-gray-900 border-gray-700 text-white"
                style={{ animation: 'fadeIn 0.5s ease-out' }}
            >
                <CardHeader>
                    <div className="flex justify-center mb-2">
                        <ShieldAlert className="w-10 h-10 text-amber-400" />
                    </div>
                    <CardTitle className="text-xl text-white">
                        {t('app.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="space-y-3 text-base text-gray-300">
                        <li className="flex gap-3 items-start">
                            <span className="text-amber-400 mt-0.5">⚠</span>
                            <span>Данное приложение не является заменой очной консультации врача.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="text-cyan-400 mt-0.5">👁</span>
                            <span>Рекомендуется использовать под наблюдением офтальмолога.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="text-red-400 mt-0.5">✋</span>
                            <span>При возникновении двоения, головной боли или дискомфорта — прекратите использование.</span>
                        </li>
                    </ul>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            role="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 w-5 h-5 accent-cyan-400 flex-shrink-0"
                        />
                        <span className="text-gray-200 text-sm">
                            {t('disclaimer.accept')}
                        </span>
                    </label>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleContinue}
                        disabled={!accepted}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
                    >
                        {t('disclaimer.continue')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
