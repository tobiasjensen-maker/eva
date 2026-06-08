import { Icon } from '@economic/taco';
import { COLORS } from './ui';

export interface ReviewCardData {
    confidence: 'high' | 'medium' | 'low';
    tag: string;
    icon: string;
    title: string;
    sub: string;
    amount?: string;
    amountNegative?: boolean;
    date: string;
    matched?: { label: string; sub: string; amount: string; tag?: string }[];
    body?: string;
    callout?: string;
}

const confColors: Record<string, { bg: string; fg: string }> = {
    high: { bg: '#e9f7ef', fg: '#15803d' },
    medium: { bg: '#fbf3e0', fg: '#92710f' },
    low: { bg: '#f3f0fb', fg: '#6d4ec9' },
};

// Presentational review card — the same visual used in the Review feed / Chat, without interactive actions.
export function ReviewItemCard({ item }: { item: ReviewCardData }) {
    const conf = confColors[item.confidence];
    return (
        <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-3">
                <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: conf.bg, color: conf.fg }}>{item.confidence} confidence</span>
                <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: '#f3f0fb', color: '#6d4ec9' }}>{item.tag}</span>
            </div>

            <div className="flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: '#f7f7f8' }}>
                <div className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 30, height: 30, background: '#e7e7ea', color: '#52525b' }}>
                    <Icon name={item.icon as never} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{item.title}</p>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{item.sub}</p>
                </div>
                {item.amount && (
                    <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: item.amountNegative ? '#dc2626' : COLORS.text }}>{item.amount}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{item.date}</p>
                    </div>
                )}
            </div>

            {item.matched?.map((m, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5" style={{ marginTop: 2 }}>
                    <Icon name="document" className="shrink-0" style={{ color: '#9b9ba4' }} />
                    <span className="text-sm" style={{ color: COLORS.text }}><b className="font-medium">{m.label}</b> {m.sub}</span>
                    {m.tag && <span className="rounded px-1.5 py-0.5 text-xs" style={{ background: '#fef3cd', color: '#92710f' }}>{m.tag}</span>}
                    <span className="ml-auto text-sm" style={{ color: COLORS.text }}>{m.amount}</span>
                </div>
            ))}

            {item.body && <p className="text-sm mt-3 px-1" style={{ color: COLORS.textMuted }}>{item.body}</p>}

            {item.callout && (
                <div className="rounded-lg p-3 mt-3" style={{ background: '#fdf8ec', border: '1px solid #f3e6c0' }}>
                    <p className="text-sm" style={{ color: '#7a5b13' }}>{item.callout}</p>
                </div>
            )}
        </div>
    );
}
