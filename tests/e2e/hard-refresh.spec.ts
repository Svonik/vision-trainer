import { test, expect } from '@playwright/test';

test('hard refresh on game page redirects to settings', async ({ page }) => {
    // Set up storage so guards pass
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('vt_disclaimer_accepted', 'true');
        localStorage.setItem('vt_calibration', JSON.stringify({
            red_brightness: 100,
            cyan_brightness: 100,
            suppression_passed: true,
            last_calibrated: new Date().toISOString(),
        }));
    });

    // Go directly to game play page (no location.state)
    await page.goto('/games/catcher/play');

    // GameSettingsGuard should redirect to settings
    await expect(page).toHaveURL(/\/games\/catcher\/settings/);
});
