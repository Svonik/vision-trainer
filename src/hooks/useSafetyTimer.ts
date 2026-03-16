// @ts-nocheck
import { useRef, useEffect } from 'react';
import { createSafetyTimer } from '../modules/safetyTimer';

export function useSafetyTimer({ onWarning, onBreak }) {
    const onWarningRef = useRef(onWarning);
    const onBreakRef = useRef(onBreak);
    onWarningRef.current = onWarning;
    onBreakRef.current = onBreak;

    const timerRef = useRef(null);

    if (!timerRef.current) {
        timerRef.current = createSafetyTimer({
            onWarning: () => onWarningRef.current(),
            onBreak: () => onBreakRef.current(),
        });
    }

    useEffect(() => {
        return () => { timerRef.current?.stop(); };
    }, []);

    return timerRef.current;
}
