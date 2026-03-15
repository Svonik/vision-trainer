import { Button } from '@/components/ui/button';
import { t } from '../modules/i18n';

interface SafetyTimerBannerProps {
    type: string;
    onExtend: () => void;
    onFinish: () => void;
}

export function SafetyTimerBanner({ type, onExtend, onFinish }: SafetyTimerBannerProps) {
    if (type === 'warning') {
        return (
            <div className="absolute top-0 left-0 right-0 bg-amber-500 text-black text-center py-3 px-4 font-semibold z-10 animate-pulse"
                 style={{ animation: 'slideDown 0.3s ease-out' }}>
                {t('safety.breakWarning')}
            </div>
        );
    }

    if (type === 'break') {
        return (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-20"
                 style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="bg-gray-900 border border-gray-600 rounded-lg p-8 max-w-sm w-full text-center space-y-4">
                    <h2 className="text-2xl font-bold text-amber-400">
                        {t('safety.breakTime')}
                    </h2>
                    <p className="text-gray-300 text-sm">
                        {t('safety.breakMessage')}
                    </p>
                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={onExtend}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                        >
                            {t('safety.extend')}
                        </Button>
                        <Button
                            onClick={onFinish}
                            variant="outline"
                            className="w-full border-gray-500 text-gray-300 hover:bg-gray-800"
                        >
                            {t('safety.finish')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
