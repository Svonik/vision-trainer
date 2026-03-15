import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Radix UI components (Slider, etc.)
if (typeof ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
