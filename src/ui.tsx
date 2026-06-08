import { useState, useEffect, useId, type CSSProperties, type ReactNode } from 'react';

export const COLORS = {
    nav: '#0c0d13',
    navText: '#b7b9c4',
    railBg: '#ffffff',
    railBorder: '#ececed',
    cardBorder: '#e9e9ec',
    text: '#18181b',
    textMuted: '#6b6b76',
    contentBg: '#ffffff',
};

export function Card({
    children,
    className = '',
    style,
    onClick,
    hover,
}: {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    hover?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            className={`rounded-xl bg-white ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{
                border: `1px solid ${COLORS.cardBorder}`,
                transition: 'box-shadow .15s, border-color .15s, transform .15s',
                ...style,
            }}
            onMouseEnter={
                hover
                    ? (e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                              '0 4px 16px rgba(0,0,0,0.08)';
                          (e.currentTarget as HTMLDivElement).style.borderColor = '#d6d6db';
                      }
                    : undefined
            }
            onMouseLeave={
                hover
                    ? (e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                          (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.cardBorder;
                      }
                    : undefined
            }
        >
            {children}
        </div>
    );
}

// ---- Eva: animated e-conomic mark (five orange circles that merge via a gooey filter) ----
const EVA_ORANGE = '#ed9b2c';
type Constellation = [number, number, number][]; // [cx, cy, r] × 5, in a 100×100 viewBox

// The 13 reference constellations. Index 0 is the resting pentagon; 1–12 are the
// asymmetric shapes Eva steps through while thinking.
const EVA_CONFIGS: Constellation[] = [
    [[50, 14, 11], [84, 39, 11], [71, 79, 11], [29, 79, 11], [16, 39, 11]], // 0 — pentagon (rest)
    [[30, 30, 16], [45, 48, 11], [60, 66, 8], [75, 22, 10], [14, 80, 8]],   // 1
    [[58, 32, 16], [42, 22, 10], [28, 58, 9], [78, 55, 8], [55, 82, 11]],   // 2
    [[35, 22, 16], [55, 28, 11], [52, 68, 9], [18, 55, 8], [80, 75, 11]],   // 3
    [[62, 22, 16], [58, 44, 11], [50, 66, 8], [82, 82, 8], [18, 76, 8]],    // 4
    [[45, 22, 16], [52, 42, 11], [60, 60, 9], [22, 72, 11], [78, 30, 9]],   // 5
    [[65, 22, 16], [50, 36, 10], [40, 54, 8], [50, 72, 6], [80, 80, 6]],    // 6
    [[30, 70, 16], [50, 80, 12], [65, 65, 10], [75, 25, 8], [30, 20, 8]],   // 7
    [[60, 25, 16], [70, 45, 11], [55, 55, 9], [20, 30, 7], [25, 80, 7]],    // 8
    [[35, 25, 16], [55, 22, 10], [45, 42, 8], [75, 65, 11], [22, 75, 8]],   // 9
    [[18, 28, 9], [55, 18, 11], [60, 50, 10], [78, 60, 14], [28, 80, 7]],   // 10
    [[40, 22, 14], [25, 40, 11], [40, 58, 10], [70, 50, 8], [85, 75, 8]],   // 11
    [[22, 18, 10], [78, 22, 17], [63, 81, 14], [41, 47, 11], [14, 65, 8]],  // 12
];
const EVA_PENTAGON = EVA_CONFIGS[0];
// Transient collapse: all five clustered tightly so the gooey filter fuses them into one blob.
const EVA_BLOB: Constellation = [[47, 50, 16], [53, 50, 16], [50, 46, 16], [50, 54, 16], [50, 50, 17]];

// Choreography (ms unless noted) from the reference.
const EVA_TIMING = {
    spinSeconds: 60,        // idle pentagon rotation
    collapse: 1000,         // pentagon → blob
    asymHold: 1200,         // hold an asymmetric shape
    step: 600,              // transition between asymmetric shapes
    resolve: 950,           // morph back to the pentagon
};
// The 7 thinking steps, spread across the set for visual variety.
const EVA_STEP_IDX = [1, 5, 9, 3, 7, 11, 2];

export function Orb({ size = 70, thinking = false }: { size?: number; thinking?: boolean }) {
    const gooId = 'eva-goo-' + useId().replace(/:/g, '');
    const [{ config, trans }, setState] = useState<{ config: Constellation; trans: number }>(
        () => ({ config: EVA_PENTAGON, trans: EVA_TIMING.resolve })
    );

    useEffect(() => {
        if (!thinking) {
            // Resolve back to the resting pentagon.
            setState({ config: EVA_PENTAGON, trans: EVA_TIMING.resolve });
            return;
        }
        let alive = true;
        let timer: ReturnType<typeof setTimeout>;
        // One burst = collapse to a blob, then step through the 7 asymmetric shapes; then loop.
        const seq: { config: Constellation; trans: number; hold: number }[] = [
            { config: EVA_BLOB, trans: EVA_TIMING.collapse, hold: 200 },
            ...EVA_STEP_IDX.map((idx, k) => ({
                config: EVA_CONFIGS[idx],
                trans: EVA_TIMING.step,
                hold: k === EVA_STEP_IDX.length - 1 ? EVA_TIMING.asymHold : 120,
            })),
        ];
        let i = 0;
        const run = () => {
            if (!alive) return;
            const s = seq[i % seq.length];
            setState({ config: s.config, trans: s.trans });
            i++;
            timer = setTimeout(run, s.trans + s.hold);
        };
        run();
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [thinking]);

    const ease = 'cubic-bezier(.4,0,.2,1)';
    const tr = `cx ${trans}ms ${ease}, cy ${trans}ms ${ease}, r ${trans}ms ${ease}`;

    return (
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
                {/* Gooey/metaball merge — blur then threshold the alpha (sharpness 29, bias −11). */}
                <filter id={gooId} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 29 -11" />
                </filter>
            </defs>
            <g
                filter={thinking ? `url(#${gooId})` : undefined}
                style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: thinking ? undefined : `evaSpin ${EVA_TIMING.spinSeconds}s linear infinite`,
                }}
            >
                {config.map((c, idx) => (
                    <circle key={idx} cx={c[0]} cy={c[1]} r={c[2]} fill={EVA_ORANGE} style={{ transition: tr }} />
                ))}
            </g>
        </svg>
    );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
    return (
        <span
            style={{
                display: 'inline-block',
                width: size,
                height: size,
                borderRadius: '50%',
                background: color,
            }}
        />
    );
}

export function SparkleTile({ size = 36 }: { size?: number }) {
    return (
        <div
            className="flex items-center justify-center"
            style={{
                width: size,
                height: size,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            }}
        >
            <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="white">
                <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
                <path d="M18 14l.8 2.6L21.5 17.4 18.8 18.2 18 21l-.8-2.8L14.5 17.4 17.2 16.6 18 14z" />
            </svg>
        </div>
    );
}

export function EmojiTile({ emoji, size = 36 }: { emoji: string; size?: number }) {
    return (
        <div
            className="flex items-center justify-center shrink-0"
            style={{ width: size, height: size, borderRadius: 10, background: '#f1f1f3', fontSize: size * 0.52, lineHeight: 1 }}
        >
            {emoji}
        </div>
    );
}

// ---- Rail icons (inline SVG for exact look) ----
const railIconStyle = (active: boolean): CSSProperties => ({
    color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
});

export function ChatIcon({ active }: { active: boolean }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={railIconStyle(active)}>
            <path
                d="M4 5h16v11H8l-4 3V5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function ReviewIcon({ active }: { active: boolean }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={railIconStyle(active)}>
            <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <path
                d="M8.5 12.5l2.2 2.2 4.8-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function InsightsIcon({ active }: { active: boolean }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={railIconStyle(active)}>
            <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7.5 14.5l3.2-3.6 3 2.4L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="20" cy="7" r="1.6" fill="currentColor" />
        </svg>
    );
}

export function SkillsIcon({ active }: { active: boolean }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={railIconStyle(active)}>
            <path d="M12 2l1.7 5.8L19.5 9.5l-5.8 1.7L12 17l-1.7-5.8L4.5 9.5l5.8-1.7L12 2z" />
            <path d="M18.5 14l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z" />
        </svg>
    );
}

export function SpacesIcon({ active }: { active: boolean }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={railIconStyle(active)}>
            <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
            <rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
            <rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
            <rect x="13" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

// Resolve a file in /public against the app's base path (so it works under /eva/ on GitHub Pages).
const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

// e-conomic orange symbol mark (official asset)
export function NodeMark({ size = 26 }: { size?: number }) {
    return (
        <img
            src={asset('econ-symbol.png')}
            alt=""
            width={size}
            height={size}
            style={{ objectFit: 'contain', display: 'block' }}
        />
    );
}

// Full e-conomic logo: mark + wordmark (official asset). `white` uses the negative logo for dark backgrounds.
export function EconomicLogo({ white }: { white?: boolean }) {
    return <img src={asset(white ? 'econ-logo-white.png' : 'econ-logo.png')} alt="e-conomic" style={{ height: 22, width: 'auto', display: 'block' }} />;
}

// User profile photo with a graceful fallback to the brand mark if the image isn't present.
export function ProfileAvatar({ size = 28 }: { size?: number }) {
    const [ok, setOk] = useState(true);
    if (ok) {
        return (
            <img
                src={asset('profile.png')}
                alt=""
                onError={() => setOk(false)}
                style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', display: 'block' }}
            />
        );
    }
    return (
        <span className="flex items-center justify-center" style={{ width: size, height: size, borderRadius: 8, background: '#fff' }}>
            <NodeMark size={size * 0.62} />
        </span>
    );
}

export function UploadIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
                d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function MicIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
            <path
                d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}
