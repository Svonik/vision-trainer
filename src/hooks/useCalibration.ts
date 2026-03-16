// @ts-nocheck
import { useState, useCallback } from 'react';
import { getCalibration, saveCalibration } from '../modules/storage';

export function useCalibration() {
    const stored = getCalibration();
    const [redBrightness, setRedBrightness] = useState(stored.red_brightness);
    const [cyanBrightness, setCyanBrightness] = useState(stored.cyan_brightness);
    const [attempts, setAttempts] = useState(0);
    const [passed, setPassed] = useState(stored.suppression_passed);
    const [glassesType, setGlassesType] = useState(stored.glasses_type || 'red-cyan');

    const addAttempt = useCallback(() => {
        setAttempts(prev => prev + 1);
    }, []);

    const pass = useCallback(() => {
        setPassed(true);
    }, []);

    const save = useCallback((overrides = {}) => {
        saveCalibration({
            red_brightness: redBrightness,
            cyan_brightness: cyanBrightness,
            suppression_passed: passed,
            last_calibrated: new Date().toISOString(),
            glasses_type: glassesType,
            ...overrides,
        });
    }, [redBrightness, cyanBrightness, passed, glassesType]);

    return {
        redBrightness, setRedBrightness,
        cyanBrightness, setCyanBrightness,
        attempts, addAttempt,
        passed, pass,
        glassesType, setGlassesType,
        save,
    };
}
