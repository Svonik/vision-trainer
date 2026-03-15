import { useState } from 'react';
import { useNavigate } from 'react-router';
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
            <Card className="max-w-lg w-full bg-gray-900 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-xl text-white">
                        {t('app.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        {t('disclaimer.text')}
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            role="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-cyan-400 flex-shrink-0"
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
