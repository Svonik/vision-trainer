import { getSessions } from './storage';

export interface SessionResult {
    game: string;
    timestamp: string;
    duration_s: number;
    caught: number;
    total_spawned: number;
    hit_rate: number;
    contrast_left: number;
    contrast_right: number;
    speed: string;
    eye_config: string;
    level?: number;
    [key: string]: unknown;
}

const MAX_CACHED_SESSIONS = 500;

let cache: SessionResult[] | null = null;

export function getCachedSessions(): SessionResult[] {
    if (!cache) {
        cache = getSessions();
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

export function invalidateSessionCache(): void {
    cache = null;
}
