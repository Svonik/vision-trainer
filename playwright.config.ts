import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    webServer: {
        command: 'npx vite --config vite/config.dev.mjs --port 4173',
        port: 4173,
        reuseExistingServer: false,
    },
    use: {
        baseURL: 'http://localhost:4173',
    },
});
