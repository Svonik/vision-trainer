import { getSessions } from './storage';
import type { SessionResult } from './gameState';

const MAX_CACHED_SESSIONS = 500;

let cache: SessionResult[] | null = null;

export function getCachedSessions(): SessionResult[] {
    if (!cache) {
        cache = getSessions() as SessionResult[];
    }
    return cache;
}

export function addCachedSession(session: SessionResult): void {
    const current = getCachedSessions();
    const updated = [...current, session];
    cache = updated.length > MAX_CACHED_SESSIONS
        ? updated.slice(-MAX_CACHED_SESSIONS)
        : updated;
    // Lazy import to avoid circular dependency
    import('./storage').then(({ writeSessions }) => writeSessions(cache!));
}

export function updateLastSessionWellness(postEyeStrain: boolean, postHeadache: boolean): void {
    const current = getCachedSessions();
    if (current.length === 0) return;
    const last = current[current.length - 1];
    if (!last.wellness) return;
    const updated = [
        ...current.slice(0, -1),
        { ...last, wellness: { ...last.wellness, postEyeStrain, postHeadache } },
    ];
    cache = updated;
    import('./storage').then(({ writeSessions }) => writeSessions(cache!));
}

export function invalidateSessionCache(): void {
    cache = null;
}
