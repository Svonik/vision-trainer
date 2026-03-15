import { test, expect } from '@playwright/test';

test('first visit redirects to disclaimer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await expect(page).toHaveURL(/\/disclaimer/);
});

test('disclaimer flow: check → continue → calibration', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/disclaimer');

    // Check the checkbox
    await page.getByRole('checkbox').click();

    // Click continue
    await page.getByRole('button', { name: /продолжить/i }).click();

    // Should navigate to calibration
    await expect(page).toHaveURL(/\/calibration/);
});
