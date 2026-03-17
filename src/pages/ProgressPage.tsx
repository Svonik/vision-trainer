import React from 'react';
import { useNavigate } from 'react-router';
import { Star, TrendingUp, Clock, Gamepad2 } from 'lucide-react';
import { getSessions } from '../modules/storage';
import { SPEEDS } from '../modules/constants';
import { getGameById } from '../config/games';
import { t } from '../modules/i18n';
import { formatDuration, formatTotalTime } from '@/lib/formatTime';

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
        return iso;
    }
}

const SessionRow = React.memo(function SessionRow({ session }: { session: any }) {
    const game = session.game ? getGameById(session.game) : undefined;
    const gameName = game ? t(game.titleKey) : (session.game ?? t('progress.unknownGame'));
    const hitPct = session.hit_rate != null ? Math.round(session.hit_rate * 100) : 0;
    const speedLabel = session.speed && SPEEDS[session.speed as keyof typeof SPEEDS]
        ? SPEEDS[session.speed as keyof typeof SPEEDS].label
        : session.speed ?? '—';

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[var(--text)] text-base font-medium truncate max-w-[180px]">
                    {gameName}
                </p>
                <p className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
                    {session.timestamp ? formatDate(session.timestamp) : '—'}
                    <span>·</span>
                    {speedLabel}
                </p>
            </div>
            <div className="text-right space-y-1">
                <p className="font-[var(--font-display)] text-lg text-[var(--text)]">
                    {hitPct}%
                </p>
                <p className="text-[var(--text-secondary)] text-sm flex items-center gap-1 justify-end">
                    <Star className="w-3 h-3 text-[var(--warning)]" />
                    {session.caught ?? 0}
                    <Clock className="w-3 h-3 ml-1" />
                    {session.duration_s != null ? formatDuration(session.duration_s) : '—'}
                </p>
            </div>
        </div>
    );
});

export function ProgressPage() {
    const navigate = useNavigate();
    const sessions = getSessions();
    const sorted = [...sessions].reverse();

    if (sorted.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-6">
                <Star className="w-16 h-16 text-[var(--warning)]" />
                <h2 className="font-[var(--font-display)] text-2xl text-[var(--text)]">
                    {t('progress.playFirst')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base max-w-xs">
                    {t('progress.historyHint')}
                </p>
                <button
                    onClick={() => navigate('/games')}
                    className="bg-[var(--cta)] text-[var(--cta-text)] rounded-full py-3 px-8 font-semibold btn-press font-[var(--font-display)]"
                >
                    <Gamepad2 className="inline w-5 h-5 mr-2" />
                    {t('progress.chooseGame')}
                </button>
            </div>
        );
    }

    const totalSessions = sessions.length;
    const avgHitRate = sessions.length > 0
        ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.hit_rate ?? 0), 0) / sessions.length * 100)
        : 0;
    const totalTime = sessions.reduce((sum: number, s: any) => sum + (s.duration_s ?? 0), 0);

    return (
        <div className="p-4 space-y-4 max-w-lg mx-auto">
            <h1 className="font-[var(--font-display)] text-2xl text-[var(--text)] pt-2">
                {t('progress.title')}
            </h1>

            {/* Summary card */}
            <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-5 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="font-[var(--font-display)] text-3xl text-[var(--text)]">{totalSessions}</p>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">{t('progress.totalSessions')}</p>
                </div>
                <div className="text-center">
                    <p className="font-[var(--font-display)] text-3xl text-[var(--text)]">{avgHitRate}%</p>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">{t('progress.avgHitRate')}</p>
                </div>
                <div className="text-center">
                    <p className="font-[var(--font-display)] text-3xl text-[var(--text)]">{formatTotalTime(totalTime)}</p>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">{t('progress.totalTime')}</p>
                </div>
            </div>

            {/* Session list */}
            <div className="space-y-3">
                {sorted.map((session, idx) => (
                    <SessionRow key={session.timestamp ?? idx} session={session} />
                ))}
            </div>

            <div className="flex items-center justify-center gap-1 pt-2 pb-4">
                <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                <p className="text-[var(--text-secondary)] text-sm">
                    {totalSessions} {totalSessions === 1 ? t('progress.sessionsOne') : totalSessions < 5 ? t('progress.sessionsFew') : t('progress.sessionsMany')}
                </p>
            </div>
        </div>
    );
}
