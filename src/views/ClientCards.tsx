import { useState, type ReactNode } from 'react';
import { COLORS, ClientAvatar, CountBadge, SegmentedTabs } from '../ui';
import { useLang } from '../i18n';
import type { DecisionItem } from '../day';
import { MY_PORTFOLIO, TARGET_RATE, rateOf, type Client } from '../practice';
import { ClientList } from './ClientsView';

// ---- Vision: the portfolio as "what needs my attention" ------------------------------------------
// One card per client, ranked by a health score: why it needs you (or that it doesn't), the financial
// picture at a glance, and what EVA's agents are doing for it. The list stays one toggle away.

export type Health = { score: number; level: 'now' | 'watch' | 'ok'; reasons: { tone: 'red' | 'amber' | 'green'; text: string }[] };

// Mock scoring from the fields we have: books, open items, EVA's flags, signals, revenue trend, automation.
export function healthOf(c: Client, flags: number, actions: number, da = false): Health {
    let score = 100;
    const reasons: Health['reasons'] = [];
    const rate = rateOf(c);
    if (c.books === 'blocked') { score -= 30; reasons.push({ tone: 'red', text: 'Books blocked — documents missing for the close' }); }
    if (flags) { score -= 14 * flags; reasons.push({ tone: 'red', text: da ? `${flags} ${flags === 1 ? 'markering' : 'markeringer'} på bogførte posteringer` : `${flags} control ${flags === 1 ? 'flag' : 'flags'} on booked postings` }); }
    if (c.signal) {
        const hit = { 'Cash flow': 22, Risk: 14, Compliance: 12, Growth: 0 }[c.signal.kind];
        score -= hit;
        reasons.push({ tone: c.signal.kind === 'Growth' ? 'green' : hit >= 14 ? 'red' : 'amber', text: c.signal.text });
    }
    if (actions) { score -= 7 * actions; reasons.push({ tone: 'amber', text: da ? `${actions} ${actions === 1 ? 'handling venter' : 'handlinger venter'} på din godkendelse` : `${actions} ${actions === 1 ? 'action waits' : 'actions wait'} for your approval` }); }
    if (c.books === 'todo') { score -= 12; reasons.push({ tone: 'amber', text: 'September not closed yet' }); }
    if (c.trend < 0) { score -= Math.min(15, -3 * c.trend); if (c.trend <= -2) reasons.push({ tone: 'amber', text: da ? `Omsætningen er faldet ${-c.trend}% ift. sidste år` : `Revenue down ${-c.trend}% on last year` }); }
    if (rate < TARGET_RATE) { score -= 10; reasons.push({ tone: 'amber', text: da ? `Under din måltimepris — ${rate.toLocaleString('da-DK')} kr/t` : `Below your target rate — ${rate.toLocaleString('da-DK')} kr/h` }); }
    score -= 4 * c.open;
    if (c.eva < 78) score -= 6;
    score = Math.max(8, Math.min(99, Math.round(score)));
    const level = score < 60 ? 'now' : score < 85 ? 'watch' : 'ok';
    if (c.signal?.kind === 'Growth') reasons.push(reasons.splice(reasons.findIndex((r) => r.tone === 'green'), 1)[0]); // good news last
    if (!reasons.length) reasons.push({ tone: 'green', text: 'All quiet — EVA has it covered' });
    return { score, level, reasons };
}

const LEVEL = {
    now: { label: 'Needs you now', color: '#dc2626', bg: '#fdecec' },
    watch: { label: 'Keep an eye on', color: '#b9842b', bg: '#fdf1dc' },
    ok: { label: 'On track', color: '#16a34a', bg: '#e9f7ef' },
} as const;

function HealthRing({ score, level }: { score: number; level: Health['level'] }) {
    const r = 18, c = 2 * Math.PI * r, color = LEVEL[level].color;
    return (
        <span className="relative shrink-0" style={{ width: 46, height: 46 }} title={`Health ${score}/100`}>
            <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden>
                <circle cx="23" cy="23" r={r} fill="none" stroke="#eeeef1" strokeWidth="5" />
                <circle cx="23" cy="23" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 23 23)" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold" style={{ color: COLORS.text }}>{score}</span>
        </span>
    );
}

// A small revenue line for the last 12 months, shaped by the year-on-year trend (stable per client).
function Sparkline({ c }: { c: Client }) {
    const seed = [...c.name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const pts = Array.from({ length: 12 }, (_, i) => 50 + (c.trend / 100) * 40 * (i / 11) * 2 + Math.sin(seed + i * 1.3) * 6);
    const min = Math.min(...pts), max = Math.max(...pts), span = Math.max(1, max - min);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / 11) * 64},${20 - ((p - min) / span) * 18 + 1}`).join(' ');
    const up = c.trend >= 0;
    // Stretches to the column's width; the stroke keeps its weight however wide it gets.
    return <svg width="100%" height="22" viewBox="0 0 64 22" preserveAspectRatio="none" aria-hidden style={{ display: 'block', overflow: 'visible' }}><path d={d} fill="none" stroke={up ? '#16a34a' : '#dc2626'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}

// Subtle status tags (tint + text), the same family as the Flag/Action and severity pills.
const TAG = { red: ['#fdecec', '#b42318'], amber: ['#fdf1dc', '#92710f'], green: ['#e9f7ef', '#15803d'], blue: ['#eef2ff', '#3341a8'] } as const;

function ClientCard({ c, h, flags, actions, onOpen }: { c: Client; h: Health; flags: number; actions: number; onOpen: () => void }) {
    const { t } = useLang();
    const close = c.books === 'closed' ? { label: 'Closed', tone: 'green' } as const : c.books === 'todo' ? { label: 'In progress', tone: 'blue' } as const : { label: 'Blocked', tone: 'red' } as const;
    const agents: { emoji: string; label: string; state: string; tone: keyof typeof TAG }[] = [
        { emoji: '🗓️', label: 'Bookkeeping', state: c.books === 'blocked' ? t('Waiting on documents') : actions ? `${actions} ${t('to approve')}` : t('Running'), tone: c.books === 'blocked' ? 'red' : actions ? 'amber' : 'green' },
        { emoji: '🔍', label: 'Controlling', state: flags ? `${flags} ${t(flags === 1 ? 'flag' : 'flags')}` : t('All clear'), tone: flags ? 'red' : 'green' },
        { emoji: '✅', label: 'Month-end', state: t(close.label), tone: close.tone },
    ];
    return (
        <div onClick={onOpen} className="rounded-2xl bg-white p-4 flex flex-col gap-3 cursor-pointer transition-shadow"
            style={{ border: `1px solid ${h.level === 'now' ? '#f5c2c2' : COLORS.cardBorder}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.07)')} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)')}>
            {/* who + health */}
            <div className="flex items-center gap-3">
                <ClientAvatar name={c.name} size={34} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{c.name}</p>
                    <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{c.no}</p>
                </div>
                <HealthRing score={h.score} level={h.level} />
            </div>

            {/* financial picture */}
            <div className="grid grid-cols-2 gap-6 rounded-xl p-2.5" style={{ background: '#f7f7f8' }}>
                <div className="min-w-0">
                    <p className="text-[11px]" style={{ color: COLORS.textMuted }}>{t('Revenue')}</p>
                    <p className="text-sm font-semibold" style={{ color: c.trend >= 0 ? '#15803d' : '#dc2626' }}>{c.trend >= 0 ? '↑' : '↓'} {Math.abs(c.trend)}%</p>
                    <Sparkline c={c} />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px]" style={{ color: COLORS.textMuted }}>{t('EVA does')}</p>
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{c.eva}%</p>
                    <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: 5, background: '#e4e4e9' }}><div style={{ width: `${c.eva}%`, height: 5, background: '#7c3aed' }} /></div>
                </div>
            </div>

            {/* agent status */}
            <div className="flex flex-col gap-1.5">
                {agents.map((a) => (
                    <div key={a.label} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-center">{a.emoji}</span>
                        <span className="flex-1" style={{ color: COLORS.textMuted }}>{t(a.label)}</span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: TAG[a.tone][0], color: TAG[a.tone][1] }}>{a.state}</span>
                    </div>
                ))}
            </div>

        </div>
    );
}

export function ClientPortfolio({ decisions, onOpen }: { decisions: DecisionItem[]; onOpen: (c: Client) => void }) {
    const { t, lang } = useLang();
    const [mode, setMode] = useState<'cards' | 'list'>(() => { try { return localStorage.getItem('va-portfolio-tab') === 'cards' ? 'cards' : 'list'; } catch { return 'list'; } });
    const [showOk, setShowOk] = useState(false);
    const setM = (m: 'cards' | 'list') => { setMode(m); try { localStorage.setItem('va-portfolio-tab', m); } catch { /* ignore */ } };
    const toggle = <SegmentedTabs value={mode} onChange={(v) => setM(v as 'cards' | 'list')} options={[{ value: 'list', label: t('List') }, { value: 'cards', label: t('Priority') }]} />;
    if (mode === 'list') return <ClientList onSelect={onOpen} headerExtra={toggle} />;

    const open = decisions.filter((d) => !d.done);
    const rows = MY_PORTFOLIO.map((c) => {
        const mine = open.filter((d) => d.company === c.name);
        const flags = mine.filter((d) => d.correction).length, actions = mine.length - flags;
        return { c, flags, actions, h: healthOf(c, flags, actions, lang === 'da') };
    }).sort((a, b) => a.h.score - b.h.score);
    const groups: { key: Health['level']; items: typeof rows }[] = (['now', 'watch', 'ok'] as const).map((key) => ({ key, items: rows.filter((r) => r.h.level === key) }));

    const section = (key: Health['level'], items: typeof rows, extra?: ReactNode) => (
        <div key={key} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="rounded-full" style={{ width: 8, height: 8, background: LEVEL[key].color }} />
                <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t(LEVEL[key].label)}</p>
                <CountBadge n={items.length} showZero />
                {extra}
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {items.map((r) => <ClientCard key={r.c.id} c={r.c} h={r.h} flags={r.flags} actions={r.actions} onOpen={() => onOpen(r.c)} />)}
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold flex-1" style={{ color: COLORS.text }}>{t('My clients')}</h2>
                {toggle}
            </div>
            <div className="flex flex-col gap-6">
                {groups[0].items.length > 0 && section('now', groups[0].items)}
                {groups[1].items.length > 0 && section('watch', groups[1].items)}
                {section('ok', showOk ? groups[2].items : [], <button onClick={() => setShowOk((v) => !v)} className="ml-1 text-xs font-medium" style={{ color: '#4456c7' }}>{t(showOk ? 'Hide' : 'Show all')}</button>)}
            </div>
        </div>
    );
}
