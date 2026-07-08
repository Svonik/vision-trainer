import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionSummaryCard } from '../../src/components/SessionSummaryCard';
import type { SessionSummary } from '../../src/modules/sessionSummary';

vi.mock('../../src/modules/sessionCache', () => ({
    getCachedSessions: vi.fn(() => []),
}));

vi.mock('../../src/modules/therapyCourse', () => ({
    getActiveCourse: vi.fn(() => null),
    completeCourse: vi.fn(),
    getCourseProgress: vi.fn(() => ({
        completedSessions: 0,
        targetSessions: 0,
    })),
}));

vi.mock('../../src/modules/wellnessCheck', () => ({
    getConsecutiveAdverseCount: vi.fn(() => 0),
    shouldAlertDoctor: vi.fn(() => false),
}));

function makeSummary(contrastProgress: number): SessionSummary {
    return {
        stars: 3,
        streakDays: 1,
        contrastProgress,
        totalTherapyMinutes: 5,
        weeklySessionCount: 1,
        isNewRecord: false,
    };
}

describe('SessionSummaryCard', () => {
    it('clamps contrastProgress text to 100% for legacy sessions above the ceiling', () => {
        // Legacy session recorded with fellow_contrast_end=70 against the old
        // 100 ceiling computes to ((70-15)/35)*100 ≈ 157%, above the current
        // 50 ceiling's valid range.
        const legacyContrastProgress = ((70 - 15) / 35) * 100;
        render(
            <SessionSummaryCard
                summary={makeSummary(legacyContrastProgress)}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.queryByText('157%')).not.toBeInTheDocument();
    });

    it('renders a normal in-range contrastProgress value unchanged', () => {
        render(
            <SessionSummaryCard
                summary={makeSummary(71)}
                onContinue={vi.fn()}
            />,
        );
        expect(screen.getByText('71%')).toBeInTheDocument();
    });
});
