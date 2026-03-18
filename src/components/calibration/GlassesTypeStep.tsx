import { useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { SelectionCardGroup } from '@/components/SelectionCardGroup';
import { t } from '../../modules/i18n';

interface Props {
    glassesType: string;
    onSelect: (type: 'red-cyan' | 'cyan-red') => void;
}

function GlassesIllustration({
    leftColor,
    rightColor,
}: {
    leftColor: string;
    rightColor: string;
}) {
    return (
        <svg
            viewBox="0 0 300 140"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-w-[210px] mx-auto"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id={`frame-${leftColor}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop offset="0%" stopColor="#d1d5db" />
                    <stop offset="100%" stopColor="#9ca3af" />
                </linearGradient>
                {/* Glassmorphism filter for lenses */}
                <filter id="lens-glow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                </filter>
            </defs>
            {/* Temples */}
            <path
                d="M8 52 L38 56"
                stroke={`url(#frame-${leftColor})`}
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d="M292 52 L262 56"
                stroke={`url(#frame-${leftColor})`}
                strokeWidth="5"
                strokeLinecap="round"
            />
            {/* Frame */}
            <rect
                x="35"
                y="30"
                width="98"
                height="80"
                rx="18"
                fill="none"
                stroke={`url(#frame-${leftColor})`}
                strokeWidth="5"
            />
            <rect
                x="167"
                y="30"
                width="98"
                height="80"
                rx="18"
                fill="none"
                stroke={`url(#frame-${leftColor})`}
                strokeWidth="5"
            />
            {/* Bridge */}
            <path
                d="M133 58 C140 48, 160 48, 167 58"
                stroke={`url(#frame-${leftColor})`}
                strokeWidth="5"
                fill="none"
            />
            {/* Left lens — glass effect with inner shadow */}
            <rect
                x="39"
                y="34"
                width="90"
                height="72"
                rx="15"
                fill={leftColor}
            />
            <rect
                x="39"
                y="34"
                width="90"
                height="72"
                rx="15"
                fill="url(#lens-shine)"
                opacity="0.15"
            />
            {/* Right lens — glass effect */}
            <rect
                x="171"
                y="34"
                width="90"
                height="72"
                rx="15"
                fill={rightColor}
            />
            <rect
                x="171"
                y="34"
                width="90"
                height="72"
                rx="15"
                fill="url(#lens-shine)"
                opacity="0.15"
            />
            {/* Glare highlights — glassmorphism */}
            <ellipse
                cx="62"
                cy="48"
                rx="20"
                ry="8"
                fill="rgba(255,255,255,0.2)"
                transform="rotate(-18,62,48)"
            />
            <ellipse
                cx="194"
                cy="48"
                rx="20"
                ry="8"
                fill="rgba(255,255,255,0.2)"
                transform="rotate(-18,194,48)"
            />
            {/* Inner shadow on lenses */}
            <rect
                x="39"
                y="80"
                width="90"
                height="26"
                rx="15"
                fill="rgba(0,0,0,0.15)"
            />
            <rect
                x="171"
                y="80"
                width="90"
                height="26"
                rx="15"
                fill="rgba(0,0,0,0.15)"
            />
            {/* Labels */}
            <text
                x="84"
                y="76"
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="22"
                fontWeight="600"
                fontFamily="Fredoka,sans-serif"
            >
                L
            </text>
            <text
                x="216"
                y="76"
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="22"
                fontWeight="600"
                fontFamily="Fredoka,sans-serif"
            >
                R
            </text>
        </svg>
    );
}

type GlassesSelection = 'red-cyan' | 'cyan-red';

export function GlassesTypeStep({ glassesType, onSelect }: Props) {
    const [selected, setSelected] = useState<GlassesSelection | null>(
        (glassesType as GlassesSelection) || null,
    );

    const options = [
        {
            id: 'red-cyan' as GlassesSelection,
            label: t('calibration.redLeft'),
            children: (
                <GlassesIllustration
                    leftColor="rgba(220, 40, 40, 0.5)"
                    rightColor="rgba(6, 195, 220, 0.5)"
                />
            ),
        },
        {
            id: 'cyan-red' as GlassesSelection,
            label: t('calibration.redRight'),
            children: (
                <GlassesIllustration
                    leftColor="rgba(6, 195, 220, 0.5)"
                    rightColor="rgba(220, 40, 40, 0.5)"
                />
            ),
        },
    ];

    const handleConfirm = () => {
        if (selected) {
            onSelect(selected);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] text-balance">
                    {t('calibration.glassesTitle')}
                </h2>
                <p className="text-[var(--text-secondary)] text-base">
                    {t('calibration.redLensQuestion')}
                </p>
            </div>

            <SelectionCardGroup
                options={options}
                selected={selected}
                onSelect={setSelected}
                columns={2}
                className="w-full max-w-md"
            />

            <AppButton
                variant="cta"
                size="lg"
                disabled={!selected}
                onClick={handleConfirm}
                className="w-full max-w-md"
            >
                {t('disclaimer.continue')}
            </AppButton>
        </div>
    );
}
