import { useEffect, useRef } from 'react';
import { createSafetyTimer, type SafetyTimer } from '../modules/safetyTimer';

interface SafetyTimerCallbacks {
    onWarning: () => void;
    onBreak: () => void;
}

export function useSafetyTimer({
    onWarning,
    onBreak,
}: SafetyTimerCallbacks): SafetyTimer {
    const onWarningRef = useRef(onWarning);
    const onBreakRef = useRef(onBreak);
    onWarningRef.current = onWarning;
    onBreakRef.current = onBreak;

    const timerRef = useRef<SafetyTimer | null>(null);

    if (!timerRef.current) {
        timerRef.current = createSafetyTimer({
            onWarning: () => onWarningRef.current(),
            onBreak: () => onBreakRef.current(),
        });
    }

    useEffect(() => {
        return () => {
            timerRef.current?.stop();
        };
    }, []);

    return timerRef.current;
}
