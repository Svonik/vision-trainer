import { useState, useCallback } from 'react';

export function useStorage<T>(key: string): [T | null, (value: T) => void] {
    const [stored, setStored] = useState<T | null>(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const setValue = useCallback((value: T) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            setStored(value);
        } catch {
            console.warn(`Failed to write to localStorage key: ${key}`);
        }
    }, [key]);

    return [stored, setValue];
}
