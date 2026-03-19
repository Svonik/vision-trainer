import { COLORS } from './constants';

export type GlassesType = 'red-cyan' | 'cyan-red';

/**
 * Derive eyeConfig from glasses_type + weak_eye.
 * The platform is visible to the FELLOW (strong) eye — clinical protocol.
 * The weak (amblyopic) eye sees the targets it must track.
 */
export function deriveEyeConfig(
    glassesType: GlassesType,
    weakEye: 'left' | 'right',
): 'platform_left' | 'platform_right' {
    // Platform is visible to the FELLOW (strong) eye, not the weak eye
    // If weak eye is left, strong eye is right → platform_right
    return weakEye === 'left' ? 'platform_right' : 'platform_left';
}

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
