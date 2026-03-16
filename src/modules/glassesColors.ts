import { COLORS } from './constants';

export type GlassesType = 'red-cyan' | 'cyan-red';

export function getEyeColors(glassesType: GlassesType) {
    if (glassesType === 'cyan-red') {
        return {
            leftColor: COLORS.CYAN,
            rightColor: COLORS.RED,
            leftHex: '#00FFFF',
            rightHex: '#FF0000',
            leftRgbCss: '0, 255, 255',
            rightRgbCss: '255, 0, 0',
            leftLabel: 'циановый',
            rightLabel: 'красный',
        };
    }
    return {
        leftColor: COLORS.RED,
        rightColor: COLORS.CYAN,
        leftHex: '#FF0000',
        rightHex: '#00FFFF',
        leftRgbCss: '255, 0, 0',
        rightRgbCss: '0, 255, 255',
        leftLabel: 'красный',
        rightLabel: 'циановый',
    };
}
