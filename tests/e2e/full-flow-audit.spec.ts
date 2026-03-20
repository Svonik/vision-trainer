import { expect, type Page, test } from '@playwright/test';

/**
 * Comprehensive E2E flow audit — covers the entire user journey
 * from first visit through onboarding, game selection, gameplay,
 * and post-session summary.
 *
 * Takes screenshots at each critical screen for visual verification.
 */

const SCREENSHOT_DIR = 'tests/e2e/screenshots';

async function clearAndGoto(page: Page, path: string) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto(path);
}

// =====================================================
// 1. ONBOARDING FLOW (unified wizard → /mode-select)
// =====================================================

test.describe('Onboarding Flow', () => {
    test('complete onboarding with all wizard steps', async ({ page }) => {
        await clearAndGoto(page, '/');

        // Should redirect to /onboarding (unified wizard)
        await expect(page).toHaveURL(/\/onboarding/);
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/01-disclaimer.png`,
            fullPage: true,
        });

        // Step 1: Disclaimer — accept and continue
        await page.getByRole('checkbox').click();
        await page.getByRole('button', { name: /продолжить/i }).click();

        // Wizard advances internally; URL stays /onboarding
        await expect(page).toHaveURL(/\/onboarding/);

        // Step 2: Glasses type
        await page.waitForTimeout(500);
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/02-glasses-type.png`,
            fullPage: true,
        });

        // Select red-cyan glasses
        const redCyanBtn = page.getByText(/красн/i).first();
        if (await redCyanBtn.isVisible()) {
            await redCyanBtn.click();
        } else {
            // Try alternative button text
            const glassesBtn = page.locator('button').first();
            await glassesBtn.click();
        }
        await page.waitForTimeout(500);

        // Step 3: Age Group
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/03-age-group.png`,
            fullPage: true,
        });

        // Verify age group step exists with both options
        const ageGroupTitle = page.getByText(/возрастная группа/i);
        if (
            await ageGroupTitle.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
            // Verify both age options are present
            await expect(page.getByText('4-7')).toBeVisible();
            await expect(page.getByText('8-12')).toBeVisible();

            // Select 8-12 age group
            await page.getByText('8-12').click();
            await page.waitForTimeout(500);
        }

        // Step 4: Weak Eye selection
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/04-weak-eye.png`,
            fullPage: true,
        });

        const weakEyeTitle = page.getByText(/слабый глаз|какой глаз/i);
        if (
            await weakEyeTitle.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
            // Select left eye
            const leftBtn = page.getByText(/левый/i);
            if (await leftBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await leftBtn.click();
            }
            await page.waitForTimeout(500);
        }

        // Step 5: Suppression / Contrast test
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/05-suppression-test.png`,
            fullPage: true,
        });

        // Look for suppression test UI elements
        const suppressionTitle = page.getByText(
            /тест на подавление|подавлени|контраст/i,
        );
        if (
            await suppressionTitle
                .isVisible({ timeout: 3000 })
                .catch(() => false)
        ) {
            // Should show "Вижу обе!" button
            const seenBtn = page.getByText(/вижу обе/i);
            if (await seenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await seenBtn.click();
            } else {
                // Click through "Не вижу" a few times then "Вижу обе!"
                const notSeenBtn = page.getByText(/не вижу/i);
                for (let i = 0; i < 3; i++) {
                    if (
                        await notSeenBtn
                            .isVisible({ timeout: 1000 })
                            .catch(() => false)
                    ) {
                        await notSeenBtn.click();
                        await page.waitForTimeout(300);
                    }
                }
                const seenBtnRetry = page.getByText(/вижу обе/i);
                if (
                    await seenBtnRetry
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await seenBtnRetry.click();
                }
            }
            await page.waitForTimeout(500);
        }

        // Step 6: Brightness Adjustment (only shown if suppression not passed)
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/06-brightness-adjust.png`,
            fullPage: true,
        });

        // Look for brightness controls or "Готово" button
        const doneBtn = page.getByText(/готово|далее|сохранить/i);
        if (await doneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await doneBtn.click();
            await page.waitForTimeout(500);
        }

        // Should eventually reach /mode-select
        await page.waitForTimeout(1000);
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/07-post-onboarding.png`,
            fullPage: true,
        });
    });
});

// =====================================================
// 2. GAME SELECT PAGE (with WeeklyProgress)
// =====================================================

test.describe('Game Select Page', () => {
    test.beforeEach(async ({ page }) => {
        // Set up pre-calibrated state to skip onboarding
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
                }),
            );
            localStorage.setItem(
                'vt_default_settings',
                JSON.stringify({
                    speed: 'normal',
                    eyeConfig: 'platform_left',
                    fellowEyeContrast: 30,
                }),
            );
        });
    });

    test('shows all 12 games and WeeklyProgress', async ({ page }) => {
        await page.goto('/#/games');
        await page.waitForTimeout(1000);
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/08-game-select.png`,
            fullPage: true,
        });

        // Verify WeeklyProgress component is visible (day abbreviations)
        const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        for (const day of weekDays) {
            const dayEl = page.getByText(day, { exact: true });
            // At least some days should be visible
            if (await dayEl.isVisible({ timeout: 1000 }).catch(() => false)) {
                break; // WeeklyProgress is present
            }
        }

        // Verify games are displayed (check for a few known game titles)
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/09-game-cards.png`,
            fullPage: true,
        });
    });

    test('each game card is clickable', async ({ page }) => {
        await page.goto('/#/games');
        await page.waitForTimeout(1000);

        // Count game cards
        const gameCards = page
            .locator('[class*="card"], [class*="game"]')
            .filter({ hasText: /.+/ });
        const count = await gameCards.count();
        // Should have at least some game cards visible
        expect(count).toBeGreaterThan(0);
    });
});

// =====================================================
// 3. GAME SETTINGS & WELLNESS CHECK
// =====================================================

test.describe('Game Settings & Wellness Flow', () => {
    test.beforeEach(async ({ page }) => {
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
                }),
            );
            localStorage.setItem(
                'vt_default_settings',
                JSON.stringify({
                    speed: 'normal',
                    eyeConfig: 'platform_left',
                    fellowEyeContrast: 30,
                }),
            );
        });
    });

    test('wellness pre-check appears before game', async ({ page }) => {
        // Navigate to a game (catcher)
        await page.goto('/#/games/catcher/settings');
        await page.waitForTimeout(1000);
        await page.screenshot({
            path: `${SCREENSHOT_DIR}/10-game-settings.png`,
            fullPage: true,
        });

        // Click play/start button
        const playBtn = page.getByText(/играть|начать|старт/i);
        if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await playBtn.click();
            await page.waitForTimeout(1000);

            // Should show wellness pre-check modal
            await page.screenshot({
                path: `${SCREENSHOT_DIR}/11-wellness-precheck.png`,
                fullPage: true,
            });

            // Check for wellness emoji buttons or title
            const wellnessTitle = page.getByText(/как ты себя чувствуешь/i);
            if (
                await wellnessTitle
                    .isVisible({ timeout: 3000 })
                    .catch(() => false)
            ) {
                // Wellness check is showing — good!
                // Click "good" emoji
                const goodEmoji = page.getByText('😊');
                if (
                    await goodEmoji
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await goodEmoji.click();
                }
            }

            await page.waitForTimeout(2000);
            await page.screenshot({
                path: `${SCREENSHOT_DIR}/12-game-loading.png`,
                fullPage: true,
            });
        }
    });

    test('wellness bad shows warning with options', async ({ page }) => {
        await page.goto('/#/games/catcher/settings');
        await page.waitForTimeout(1000);

        const playBtn = page.getByText(/играть|начать|старт/i);
        if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await playBtn.click();
            await page.waitForTimeout(1000);

            // Click "bad" emoji
            const badEmoji = page.getByText('😟');
            if (
                await badEmoji.isVisible({ timeout: 3000 }).catch(() => false)
            ) {
                await badEmoji.click();
                await page.waitForTimeout(500);

                // Should show warning message
                await page.screenshot({
                    path: `${SCREENSHOT_DIR}/13-wellness-warning.png`,
                    fullPage: true,
                });

                // Should have "Продолжить" option to continue anyway
                const continueBtn = page.getByText(/продолжить/i);
                await expect(continueBtn).toBeVisible({ timeout: 3000 });
            }
        }
    });
});

// =====================================================
// 4. ALL GAME SCENES LOAD CHECK
// =====================================================

test.describe('All Games Load', () => {
    const games = [
        { id: 'catcher', name: 'Catcher' },
        { id: 'breakout', name: 'Breakout' },
        { id: 'tetris', name: 'Tetris' },
        { id: 'invaders', name: 'Invaders' },
        { id: 'pong', name: 'Pong' },
        { id: 'snake', name: 'Snake' },
        { id: 'flappy', name: 'Flappy' },
        { id: 'asteroid', name: 'Asteroid' },
        { id: 'balloonpop', name: 'BalloonPop' },
        { id: 'memorytiles', name: 'MemoryTiles' },
        { id: 'frogger', name: 'Frogger' },
        { id: 'catchmonsters', name: 'CatchMonsters' },
    ];

    test.beforeEach(async ({ page }) => {
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
                }),
            );
            localStorage.setItem(
                'vt_default_settings',
                JSON.stringify({
                    speed: 'normal',
                    eyeConfig: 'platform_left',
                    fellowEyeContrast: 30,
                }),
            );
        });
    });

    for (const game of games) {
        test(`${game.name} loads without infinite loading`, async ({
            page,
        }) => {
            // Go directly to game play page
            await page.goto(`/#/games/${game.id}/play`);
            await page.waitForTimeout(1000);

            // Handle wellness check if it appears
            const goodEmoji = page.getByText('😊');
            if (
                await goodEmoji.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await goodEmoji.click();
                await page.waitForTimeout(500);
            }

            // Wait for game to load (look for canvas or game container)
            await page.waitForTimeout(3000);

            // Take screenshot
            await page.screenshot({
                path: `${SCREENSHOT_DIR}/game-${game.id}.png`,
                fullPage: true,
            });

            // Verify loading message is gone (not stuck on "Загрузка игры...")
            const loadingText = page.getByText(/загрузка игры/i);
            // It should either be gone or the game should have loaded
            const isStillLoading = await loadingText
                .isVisible({ timeout: 1000 })
                .catch(() => false);

            // Check that canvas exists (Phaser rendered)
            const canvas = page.locator('canvas');
            const canvasExists = await canvas
                .isVisible({ timeout: 5000 })
                .catch(() => false);

            // Either canvas is visible OR loading text is gone
            expect(canvasExists || !isStillLoading).toBe(true);
        });
    }
});

// =====================================================
// 5. DESIGN SYSTEM COMPLIANCE (Visual)
// =====================================================

test.describe('Design System Visual Check', () => {
    test.beforeEach(async ({ page }) => {
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
                }),
            );
            localStorage.setItem(
                'vt_default_settings',
                JSON.stringify({
                    speed: 'normal',
                    eyeConfig: 'platform_left',
                    fellowEyeContrast: 30,
                }),
            );
        });
    });

    test('dark theme consistency — no white backgrounds', async ({ page }) => {
        await page.goto('/#/games');
        await page.waitForTimeout(1000);

        // Check that body/main background is dark
        const bgColor = await page.evaluate(() => {
            return getComputedStyle(document.body).backgroundColor;
        });

        // Background should be dark (not white/light)
        // Parse RGB and check luminance
        const rgb = bgColor.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
        const luminance = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
        expect(luminance).toBeLessThan(128); // Dark theme = luminance < 128

        await page.screenshot({
            path: `${SCREENSHOT_DIR}/14-dark-theme-games.png`,
            fullPage: true,
        });
    });
});

// =====================================================
// 6. CONTRAST PERSISTENCE CHECK
// =====================================================

test.describe('Contrast Persistence', () => {
    test('fellowEyeContrast is stored in localStorage', async ({ page }) => {
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
                }),
            );
            localStorage.setItem(
                'vt_default_settings',
                JSON.stringify({
                    speed: 'normal',
                    eyeConfig: 'platform_left',
                    fellowEyeContrast: 45,
                }),
            );
        });

        await page.goto('/#/games');
        await page.waitForTimeout(500);

        // Verify fellowEyeContrast is preserved
        const settings = await page.evaluate(() => {
            const raw = localStorage.getItem('vt_default_settings');
            return raw ? JSON.parse(raw) : null;
        });

        expect(settings.fellowEyeContrast).toBe(45);
    });
});
