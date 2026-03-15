// @ts-nocheck
import { useRef, useEffect } from 'react';
import { createSafetyTimer } from '../modules/safetyTimer';

export function useSafetyTimer({ onWarning, onBreak }) {
    const timerRef = useRef(null);

    if (!timerRef.current) {
        timerRef.current = createSafetyTimer({ onWarning, onBreak });
    }

    useEffect(() => {
        return () => { timerRef.current?.stop(); };
    }, []);

    return timerRef.current;
}
