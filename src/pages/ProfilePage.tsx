import { Construction } from 'lucide-react';
import { useNavigate } from 'react-router';
import { t } from '../modules/i18n';

export function ProfilePage() {
    const navigate = useNavigate();

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative z-10"
            style={{ background: 'linear-gradient(160deg, #12101a 0%, #1e1a2e 50%, #1a1225 100%)' }}
        >
            <div className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-lg shadow-purple-900/20 p-8 max-w-md w-full text-center spring-enter space-y-4">
                <Construction className="w-12 h-12 text-[var(--accent)] mx-auto mb-4" />
                <h2 className="font-[var(--font-display)] text-xl text-[var(--text)] mb-2">Профиль пациента</h2>
                <p className="text-[var(--text-secondary)]">В разработке. Здесь будет история сессий и графики прогресса.</p>
                <button
                    onClick={() => navigate('/games')}
                    className="mt-4 border border-[var(--border)] text-[var(--text-secondary)] rounded-full py-2.5 px-6 btn-press hover:bg-[var(--surface)] inline-flex items-center gap-2"
                >
                    ← {t('nav.toGames')}
                </button>
            </div>
        </div>
    );
}
