import { describe, it, expect } from 'vitest';
import { getEyeColors } from '../../src/modules/glassesColors';

describe('getEyeColors', () => {
    it('returns red-cyan for default', () => {
        const colors = getEyeColors('red-cyan');
        expect(colors.leftColor).toBe(0xFF0000);
        expect(colors.rightColor).toBe(0x00FFFF);
        expect(colors.leftRgbCss).toBe('255, 0, 0');
        expect(colors.rightRgbCss).toBe('0, 255, 255');
    });

    it('returns cyan-red for reversed', () => {
        const colors = getEyeColors('cyan-red');
        expect(colors.leftColor).toBe(0x00FFFF);
        expect(colors.rightColor).toBe(0xFF0000);
        expect(colors.leftRgbCss).toBe('0, 255, 255');
        expect(colors.rightRgbCss).toBe('255, 0, 0');
    });
});
