import { useState, useCallback, useRef } from 'react';
import { getCalibration, saveCalibration, CalibrationData } from '../modules/storage';

interface CalibrationOverrides {
    red_brightness?: number;
    cyan_brightness?: number;
    suppression_passed?: boolean;
    glasses_type?: string;
}

export function useCalibration() {
    const [stored] = useState(() => getCalibration());
    const [redBrightness, setRedBrightness] = useState(stored.red_brightness);
    const [cyanBrightness, setCyanBrightness] = useState(stored.cyan_brightness);
    const [attempts, setAttempts] = useState(0);
    const [passed, setPassed] = useState(stored.suppression_passed);
    const [glassesType, setGlassesType] = useState(stored.glasses_type || 'red-cyan');

    // Use refs to avoid stale closure in save()
    const redRef = useRef(redBrightness);
    redRef.current = redBrightness;
    const cyanRef = useRef(cyanBrightness);
    cyanRef.current = cyanBrightness;
    const passedRef = useRef(passed);
    passedRef.current = passed;
    const glassesRef = useRef(glassesType);
    glassesRef.current = glassesType;

    const addAttempt = useCallback(() => {
        setAttempts(prev => prev + 1);
    }, []);

    const pass = useCallback(() => {
        setPassed(true);
    }, []);

    const save = useCallback((overrides: CalibrationOverrides = {}) => {
        const current = getCalibration();
        const data: CalibrationData = {
            ...current,
            red_brightness: redRef.current,
            cyan_brightness: cyanRef.current,
            suppression_passed: passedRef.current,
            last_calibrated: new Date().toISOString(),
            glasses_type: glassesRef.current,
            ...overrides,
        };
        saveCalibration(data);
    }, []);

    return {
        redBrightness, setRedBrightness,
        cyanBrightness, setCyanBrightness,
        attempts, addAttempt,
        passed, pass,
        glassesType, setGlassesType,
        save,
    };
}
