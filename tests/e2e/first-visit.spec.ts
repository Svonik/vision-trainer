import { test, expect } from '@playwright/test';

test('first visit redirects to onboarding', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding/);
});

test('onboarding flow: accept disclaimer → proceed within wizard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/#/onboarding');

    // Check the checkbox
    await page.getByRole('checkbox').click();

    // Click continue
    await page.getByRole('button', { name: /продолжить/i }).click();

    // Should stay on /onboarding (wizard advances internally, not via route)
    await expect(page).toHaveURL(/\/onboarding/);
});
