import { expect, test } from '@playwright/test';

test('StatsPage shows current suppression depth after calibration', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('vt_disclaimer_accepted', 'true');
        localStorage.setItem(
            'vt_calibration',
            JSON.stringify({
                suppression_passed: true,
                deep_suppression: false,
                last_calibrated: new Date().toISOString(),
                glasses_type: 'red-cyan',
                age_group: '8-12',
                weak_eye: 'left',
                suppression_result: {
                    suppressionDepth: 35,
                    balancePoint: 65,
                    timestamp: new Date().toISOString(),
                },
            }),
        );
    });

    await page.goto('/#/games/catcher/stats');

    // Current suppression depth block: a numeric percentage value, labeled.
    await expect(page.getByText('Глубина подавления')).toBeVisible();
    await expect(page.getByText('35%')).toBeVisible();
});

test('StatsPage shows было → стало dynamics on the second calibration', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('vt_disclaimer_accepted', 'true');
        localStorage.setItem(
            'vt_calibration',
            JSON.stringify({
                suppression_passed: true,
                deep_suppression: false,
                last_calibrated: new Date().toISOString(),
                glasses_type: 'red-cyan',
                age_group: '8-12',
                weak_eye: 'left',
                suppression_result: {
                    suppressionDepth: 20,
                    balancePoint: 80,
                    timestamp: new Date().toISOString(),
                },
            }),
        );
        localStorage.setItem(
            'vt_suppression_history',
            JSON.stringify([
                {
                    suppressionDepth: 35,
                    balancePoint: 65,
                    timestamp: '2026-01-01T00:00:00.000Z',
                },
                {
                    suppressionDepth: 20,
                    balancePoint: 80,
                    timestamp: '2026-02-01T00:00:00.000Z',
                },
            ]),
        );
    });

    await page.goto('/#/games/catcher/stats');

    await expect(page.getByText(/Было → стало/)).toBeVisible();
    await expect(page.getByText(/35%.*→.*20%/)).toBeVisible();
});
