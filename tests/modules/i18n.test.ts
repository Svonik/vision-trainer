import { describe, it, expect } from 'vitest';
import { t } from '../../src/modules/i18n';

describe('i18n Module', () => {
    it('returns known string', () => {
        expect(t('app.title')).toBe('Vision Trainer');
    });

    it('returns fallback for unknown key', () => {
        expect(t('unknown.key')).toBe('[unknown.key]');
    });

    it('returns disclaimer text', () => {
        expect(t('disclaimer.accept')).toBe('Я понимаю и принимаю');
    });
});
