import { expect, test } from '@playwright/test';

test('hard refresh on game page redirects to settings', async ({ page }) => {
    // Set up storage so guards pass
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('vt_disclaimer_accepted', 'true');
        localStorage.setItem(
            'vt_calibration',
            JSON.stringify({
                suppression_passed: true,
                last_calibrated: new Date().toISOString(),
                glasses_type: 'red-cyan',
                age_group: '8-12',
                weak_eye: 'left',
            }),
        );
    });

    // Go directly to game play page (no location.state)
    await page.goto('/games/catcher/play');

    // GameSettingsGuard should redirect to settings
    await expect(page).toHaveURL(/\/games\/catcher\/settings/);
});
