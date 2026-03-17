export function FloatingParticles() {
    const particles = [
        { size: 3, left: '15%', duration: '12s', delay: '0s' },
        { size: 2, left: '35%', duration: '15s', delay: '2s' },
        { size: 4, left: '55%', duration: '10s', delay: '4s' },
        { size: 2, left: '75%', duration: '14s', delay: '1s' },
        { size: 3, left: '90%', duration: '11s', delay: '3s' },
        { size: 2, left: '5%', duration: '13s', delay: '5s' },
    ];

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {particles.map((p, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-[var(--accent)]"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: p.left,
                        top: `${20 + i * 12}%`,
                        animation: `floatUp ${p.duration} ease-in-out infinite`,
                        animationDelay: p.delay,
                    }}
                />
            ))}
        </div>
    );
}
