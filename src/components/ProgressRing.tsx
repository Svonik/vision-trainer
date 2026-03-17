interface ProgressRingProps { percent: number; size?: number; }

export function ProgressRing({ percent, size = 100 }: ProgressRingProps) {
    const radius = size * 0.4;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    const color = percent > 70
        ? 'var(--success)'
        : percent > 40
            ? 'var(--warning)'
            : 'var(--accent-secondary)';
    return (
        <svg width={size} height={size} className="mx-auto">
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                className="transition-all duration-1000"
            />
            <text x={cx} y={cy} textAnchor="middle" dy="6" fill="var(--text)" fontSize="18" fontWeight="bold">
                {percent}%
            </text>
        </svg>
    );
}
