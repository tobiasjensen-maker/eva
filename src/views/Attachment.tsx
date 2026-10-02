import { Icon } from '@economic/taco';
import { COLORS } from '../ui';
import { useLang } from '../i18n';

// ---- A forecast or budget, attached to a client message ------------------------------------
// "Discuss with Ida" / "Share with Ida" open the Inbox with a drafted message and this small
// preview attached — the same card then sits on the sent message in the conversation.

export type Attachment = {
    kind: 'forecast' | 'budget';
    title: string;
    sub: string;
    stats: { label: string; value: string; bad?: boolean }[];
    series: number[]; // forecast: weekly closing balance · budget: quarterly sales
    series2?: number[]; // budget: quarterly profit
};
// What a share hands to the Inbox.
export type ShareDraft = { client: string; subject: string; text: string; attachment: Attachment };

function Spark({ a }: { a: Attachment }) {
    const W = 220, H = 44;
    const all = [...a.series, ...(a.series2 ?? []), 0];
    const max = Math.max(...all), min = Math.min(...all);
    const y = (v: number) => 2 + ((max - v) / (max - min || 1)) * (H - 4);
    const n = a.series.length;
    if (a.kind === 'forecast') {
        const bw = W / n;
        return (
            <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: H }} aria-hidden>
                <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#c4c4cc" strokeWidth={0.75} />
                {a.series.map((v, i) => <rect key={i} x={i * bw + 1.5} width={bw - 3} y={Math.min(y(v), y(0))} height={Math.max(1.5, Math.abs(y(v) - y(0)))} rx={1.5} fill={v < 0 ? '#dc2626' : '#4c6ef5'} />)}
            </svg>
        );
    }
    const gw = W / n;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: H }} aria-hidden>
            <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#c4c4cc" strokeWidth={0.75} />
            {a.series.map((v, i) => (
                <g key={i}>
                    <rect x={i * gw + gw * 0.18} width={gw * 0.3} y={Math.min(y(v), y(0))} height={Math.abs(y(v) - y(0))} rx={1.5} fill="#4c6ef5" />
                    {a.series2 && <rect x={i * gw + gw * 0.52} width={gw * 0.3} y={Math.min(y(a.series2[i]), y(0))} height={Math.max(1.5, Math.abs(y(a.series2[i]) - y(0)))} rx={1.5} fill={a.series2[i] < 0 ? '#dc2626' : '#16a34a'} />}
                </g>
            ))}
        </svg>
    );
}

export function AttachmentCard({ a, onRemove }: { a: Attachment; onRemove?: () => void }) {
    const { t } = useLang();
    return (
        <div className="rounded-lg bg-white overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}`, width: 300, maxWidth: '100%' }}>
            <div className="flex items-start gap-2 px-3 pt-2.5">
                <span className="shrink-0 flex items-center justify-center rounded-md" style={{ width: 24, height: 24, background: a.kind === 'forecast' ? '#eef2ff' : '#e9f7ef', color: a.kind === 'forecast' ? '#4456c7' : '#15803d' }}>
                    <Icon name={(a.kind === 'forecast' ? 'chart-line' : 'calendar') as never} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: COLORS.text }}>{t(a.title)}</p>
                    <p className="text-[11px] truncate" style={{ color: COLORS.textMuted }}>{t(a.sub)}</p>
                </div>
                {onRemove && <button type="button" onClick={onRemove} title={t('Remove')} className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>✕</button>}
            </div>
            <div className="px-3 pt-2"><Spark a={a} /></div>
            <div className="grid px-3 py-2 gap-2" style={{ gridTemplateColumns: `repeat(${a.stats.length}, minmax(0, 1fr))` }}>
                {a.stats.map((s) => (
                    <div key={s.label} className="min-w-0">
                        <p className="text-[10px] truncate" style={{ color: COLORS.textMuted }}>{t(s.label)}</p>
                        <p className="text-xs font-semibold truncate" style={{ color: s.bad ? '#c0392b' : COLORS.text }}>{s.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
