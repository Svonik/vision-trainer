import { describe, expect, it } from 'vitest';
import {
    clampFellowEyeContrast,
    CLINICAL_CONTRAST,
} from '@/modules/constants';

describe('clampFellowEyeContrast', () => {
    it('clamps to floor and ceiling', () => {
        expect(clampFellowEyeContrast(5)).toBe(CLINICAL_CONTRAST.FELLOW_FLOOR);
        expect(clampFellowEyeContrast(100)).toBe(
            CLINICAL_CONTRAST.FELLOW_CEILING,
        );
        expect(clampFellowEyeContrast(30)).toBe(30);
    });

    it('falls back to FELLOW_INITIAL for non-finite values', () => {
        expect(clampFellowEyeContrast(Number.NaN)).toBe(
            CLINICAL_CONTRAST.FELLOW_INITIAL,
        );
        expect(clampFellowEyeContrast(Number.POSITIVE_INFINITY)).toBe(
            CLINICAL_CONTRAST.FELLOW_INITIAL,
        );
        expect(clampFellowEyeContrast('oops')).toBe(
            CLINICAL_CONTRAST.FELLOW_INITIAL,
        );
        expect(clampFellowEyeContrast(null)).toBe(
            CLINICAL_CONTRAST.FELLOW_INITIAL,
        );
        expect(clampFellowEyeContrast(undefined)).toBe(
            CLINICAL_CONTRAST.FELLOW_INITIAL,
        );
    });

    it('coerces numeric strings', () => {
        expect(clampFellowEyeContrast('40')).toBe(40);
        expect(clampFellowEyeContrast('12')).toBe(
            CLINICAL_CONTRAST.FELLOW_FLOOR,
        );
    });
});
