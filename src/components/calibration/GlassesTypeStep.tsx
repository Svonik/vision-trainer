import { t } from '../../modules/i18n';

interface Props {
    glassesType: string;
    onSelect: (type: 'red-cyan' | 'cyan-red') => void;
}

function GlassesIllustration({ leftColor, rightColor }: { leftColor: string; rightColor: string }) {
    return (
        <svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[210px] mx-auto" aria-hidden="true">
            <defs>
                <linearGradient id={`frame-${leftColor}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d1d5db"/>
                    <stop offset="100%" stopColor="#9ca3af"/>
                </linearGradient>
            </defs>
            {/* Temples */}
            <path d="M8 52 L38 56" stroke={`url(#frame-${leftColor})`} strokeWidth="5" strokeLinecap="round"/>
            <path d="M292 52 L262 56" stroke={`url(#frame-${leftColor})`} strokeWidth="5" strokeLinecap="round"/>
            {/* Frame */}
            <rect x="35" y="30" width="98" height="80" rx="18" fill="none" stroke={`url(#frame-${leftColor})`} strokeWidth="5"/>
            <rect x="167" y="30" width="98" height="80" rx="18" fill="none" stroke={`url(#frame-${leftColor})`} strokeWidth="5"/>
            {/* Bridge */}
            <path d="M133 58 C140 48, 160 48, 167 58" stroke={`url(#frame-${leftColor})`} strokeWidth="5" fill="none"/>
            {/* Left lens */}
            <rect x="39" y="34" width="90" height="72" rx="15" fill={leftColor}/>
            {/* Right lens */}
            <rect x="171" y="34" width="90" height="72" rx="15" fill={rightColor}/>
            {/* Glare */}
            <ellipse cx="62" cy="50" rx="18" ry="7" fill="rgba(255,255,255,0.15)" transform="rotate(-18,62,50)"/>
            <ellipse cx="194" cy="50" rx="18" ry="7" fill="rgba(255,255,255,0.15)" transform="rotate(-18,194,50)"/>
            {/* Labels */}
            <text x="84" y="78" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="22" fontWeight="600" fontFamily="Fredoka,sans-serif">L</text>
            <text x="216" y="78" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="22" fontWeight="600" fontFamily="Fredoka,sans-serif">R</text>
        </svg>
    );
}

export function GlassesTypeStep({ glassesType, onSelect }: Props) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-center">
                {t('calibration.glassesTitle')}
            </h2>
            <p className="text-[var(--text-secondary)] text-base">
                {t('calibration.redLensQuestion')}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                {/* Red Left */}
                <button
                    onClick={() => onSelect('red-cyan')}
                    className={`rounded-3xl border-2 p-4 btn-press transition-all ${
                        glassesType === 'red-cyan'
                            ? 'border-[var(--cta)] shadow-[0_0_25px_rgba(255,159,67,0.3)] bg-[var(--surface)]'
                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                    }`}
                >
                    <p className="font-[var(--font-display)] text-base font-semibold text-[var(--text)] mb-1">{t('calibration.redLeft')}</p>
                    <p className="text-[var(--text-secondary)] text-sm mb-3">{t('calibration.cyanRight')}</p>
                    <GlassesIllustration
                        leftColor="rgba(220, 40, 40, 0.5)"
                        rightColor="rgba(6, 195, 220, 0.5)"
                    />
                </button>

                {/* Red Right */}
                <button
                    onClick={() => onSelect('cyan-red')}
                    className={`rounded-3xl border-2 p-4 btn-press transition-all ${
                        glassesType === 'cyan-red'
                            ? 'border-[var(--cta)] shadow-[0_0_25px_rgba(255,159,67,0.3)] bg-[var(--surface)]'
                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                    }`}
                >
                    <p className="font-[var(--font-display)] text-base font-semibold text-[var(--text)] mb-1">{t('calibration.redRight')}</p>
                    <p className="text-[var(--text-secondary)] text-sm mb-3">{t('calibration.cyanLeft')}</p>
                    <GlassesIllustration
                        leftColor="rgba(6, 195, 220, 0.5)"
                        rightColor="rgba(220, 40, 40, 0.5)"
                    />
                </button>
            </div>
        </div>
    );
}
