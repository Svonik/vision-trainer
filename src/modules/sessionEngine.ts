import { CONTRAST } from './constants';

// Therapy groups based on clinical research
const THERAPY_GROUPS = {
    warmup: ['balloonpop', 'catchmonsters'],                  // Saccades
    tracking: ['frogger', 'pong'],                            // Smooth pursuit
    fusionSimple: ['catcher', 'flappy'],                      // Basic binocular
    fusionComplex: ['breakout', 'invaders', 'asteroid'],      // Advanced binocular
    cognitive: ['memorytiles', 'snake', 'tetris'],            // Memory + planning
} as const;

type GroupName = keyof typeof THERAPY_GROUPS;

// Slot 3 rotates through these groups in order
const ROTATING_GROUPS: GroupName[] = ['fusionSimple', 'fusionComplex', 'cognitive'];

/**
 * Pick the least-recently-played game from a group, given session history.
 * Returns a game id (the route param form, e.g. 'catcher' not 'binocular-catcher').
 */
function pickLeastRecent(group: readonly string[], sessions: SessionRecord[]): string {
    // Build a map of gameId → last played timestamp (ms)
    const lastPlayed: Record<string, number> = {};
    for (const session of sessions) {
        const gameId = session.game ?? '';
        const ts = session.timestamp ? new Date(session.timestamp).getTime() : 0;
        if (!lastPlayed[gameId] || ts > lastPlayed[gameId]) {
            lastPlayed[gameId] = ts;
        }
    }

    // Sort group members by last-played time ascending (never-played = 0 = first)
    const sorted = [...group].sort((a, b) => {
        const aTime = lastPlayed[a] ?? 0;
        const bTime = lastPlayed[b] ?? 0;
        return aTime - bTime;
    });

    return sorted[0];
}

/**
 * Determine which rotating group to use for slot 3, based on session count.
 * Rotates: fusionSimple → fusionComplex → cognitive → repeat
 */
function getRotatingGroup(sessions: SessionRecord[]): GroupName {
    const idx = sessions.length % ROTATING_GROUPS.length;
    return ROTATING_GROUPS[idx];
}

export interface SessionRecord {
    game?: string;
    timestamp?: string;
    hit_rate?: number;
    contrast_left?: number;
    contrast_right?: number;
    duration_s?: number;
}

/**
 * Generate a 3-game training session: warmup → tracking → main (rotating fusion/cognitive).
 * Returns array of 3 gameIds (route-param form).
 */
export function generateSession(sessionHistory: SessionRecord[]): string[] {
    const warmupGame = pickLeastRecent(THERAPY_GROUPS.warmup, sessionHistory);
    const trackingGame = pickLeastRecent(THERAPY_GROUPS.tracking, sessionHistory);
    const rotatingGroupName = getRotatingGroup(sessionHistory);
    const mainGame = pickLeastRecent(THERAPY_GROUPS[rotatingGroupName], sessionHistory);

    return [warmupGame, trackingGame, mainGame];
}

export interface ContrastRecommendation {
    left: number;
    right: number;
    suggestion: 'decrease' | 'increase' | 'keep';
}

/**
 * Recommend contrast adjustments based on last 3 sessions.
 * - avg hit_rate > 80% → suggest -5% on weak eye (the eye with lower contrast)
 * - avg hit_rate < 50% → suggest +5% on weak eye
 * - else → keep current
 */
export function recommendContrast(sessions: SessionRecord[]): ContrastRecommendation {
    const lastThree = sessions.slice(-3);

    if (lastThree.length === 0) {
        return { left: CONTRAST.DEFAULT, right: CONTRAST.DEFAULT, suggestion: 'keep' };
    }

    const avgHitRate = lastThree.reduce((sum, s) => sum + (s.hit_rate ?? 0), 0) / lastThree.length;

    // Take contrast values from the most recent session as the baseline
    const latest = lastThree[lastThree.length - 1];
    const currentLeft = latest.contrast_left ?? CONTRAST.DEFAULT;
    const currentRight = latest.contrast_right ?? CONTRAST.DEFAULT;

    if (avgHitRate > 0.8) {
        // Patient is doing well — reduce contrast on the weaker (lower contrast) eye to increase challenge
        if (currentLeft <= currentRight) {
            // Left is weak eye — decrease its contrast
            const newLeft = Math.max(CONTRAST.MIN, currentLeft - CONTRAST.DYNAMIC_STEP);
            return { left: newLeft, right: currentRight, suggestion: 'decrease' };
        } else {
            // Right is weak eye
            const newRight = Math.max(CONTRAST.MIN, currentRight - CONTRAST.DYNAMIC_STEP);
            return { left: currentLeft, right: newRight, suggestion: 'decrease' };
        }
    }

    if (avgHitRate < 0.5) {
        // Patient is struggling — increase contrast on weak eye to help
        if (currentLeft <= currentRight) {
            const newLeft = Math.min(CONTRAST.MAX, currentLeft + CONTRAST.DYNAMIC_STEP);
            return { left: newLeft, right: currentRight, suggestion: 'increase' };
        } else {
            const newRight = Math.min(CONTRAST.MAX, currentRight + CONTRAST.DYNAMIC_STEP);
            return { left: currentLeft, right: newRight, suggestion: 'increase' };
        }
    }

    return { left: currentLeft, right: currentRight, suggestion: 'keep' };
}

/** Get the display title key for a game id (route-param form). */
export const GAME_TITLE_KEYS: Record<string, string> = {
    catcher: 'gameSelect.catcher.title',
    breakout: 'gameSelect.breakout.title',
    tetris: 'gameSelect.tetris.title',
    invaders: 'gameSelect.invaders.title',
    pong: 'gameSelect.pong.title',
    snake: 'gameSelect.snake.title',
    flappy: 'gameSelect.flappy.title',
    asteroid: 'gameSelect.asteroid.title',
    balloonpop: 'gameSelect.balloonpop.title',
    memorytiles: 'gameSelect.memorytiles.title',
    frogger: 'gameSelect.frogger.title',
    catchmonsters: 'gameSelect.catchmonsters.title',
};
