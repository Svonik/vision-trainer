import { Construction } from 'lucide-react';

export function ProfilePage() {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative z-10"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 p-8 max-w-md w-full text-center spring-enter">
                <Construction className="w-12 h-12 text-[var(--accent)] mx-auto mb-4" />
                <h2 className="font-[var(--font-display)] text-xl text-[var(--text)] mb-2">Профиль пациента</h2>
                <p className="text-[var(--text-secondary)]">В разработке. Здесь будет история сессий и графики прогресса.</p>
            </div>
        </div>
    );
}
