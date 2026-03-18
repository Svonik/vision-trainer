import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'tests/**/*.{test,spec}.{ts,tsx}',
        ],
        exclude: ['tests/*.test.js', 'tests/e2e/**'],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary'],
            thresholds: {
                statements: 80,
                branches: 70,
                functions: 75,
                lines: 80,
            },
            include: ['src/modules/**', 'src/hooks/**', 'src/config/**'],
            exclude: ['src/**/*.d.ts', 'src/game/**'],
        },
    },
});
