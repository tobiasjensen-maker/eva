import { useMemo, useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { ClientAvatar, COLORS } from '../ui';
import { useLang } from '../i18n';
import { CLIENTS } from '../practice';

// ---- 13-week cash forecast ------------------------------------------------------------------
// The numbers come from rules over the ledger — booked transactions, unpaid invoices, payment
// history, payroll, previous VAT returns and seasonality. EVA explains them; it doesn't guess
// them. Budget figures only count as cash once they're invoiced.

const WEEKS = 13;
const START = new Date(2026, 8, 28); // Monday, week 40
const weekNo = (i: number) => 40 + i;
const weekDate = (i: number) => { const d = new Date(START); d.setDate(d.getDate() + i * 7); return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}`; };
const kr = (n: number) => `${n < 0 ? '−' : ''}${Math.round(Math.abs(n)).toLocaleString('da-DK')} kr`;

type Flow = { id: string; label: string; week: number; amount: number; group: 'Salaries' | 'VAT' | 'Supplier bills' | 'Customer invoices' | 'Rent'; source: string };
type Model = { start: number; inBase: number[]; outBase: number[]; flows: Flow[]; scenarios: Scenario[] };
type Scenario = { id: string; label: string; detail: string; apply: (m: Model) => Model };

const moveFlow = (m: Model, id: string, week: number): Model => ({ ...m, flows: m.flows.map((f) => (f.id === id ? { ...f, week } : f)) });

function modelFor(company: string): Model {
    if (company === 'Café Solsikke') {
        const m: Model = {
            start: 130000,
            inBase: [34, 33, 32, 31, 30, 29, 28, 27, 27, 26, 26, 34, 30].map((x) => x * 1000),
            outBase: Array(WEEKS).fill(21000),
            flows: [
                { id: 'sal0', label: 'Salaries — September', week: 0, amount: -58000, group: 'Salaries', source: 'From payroll · last banking day' },
                { id: 'rent', label: 'Rent — Q4', week: 0, amount: -36000, group: 'Rent', source: 'Lease · paid quarterly in advance' },
                { id: 'hamburg', label: 'Hamburg distributor', week: 3, amount: -42000, group: 'Supplier bills', source: 'Bill #HD-3321 · due 20 Oct' },
                { id: 'sal1', label: 'Salaries — October', week: 4, amount: -58000, group: 'Salaries', source: 'From payroll · last banking day' },
                { id: 'catering', label: '2 overdue catering invoices', week: 8, amount: 24500, group: 'Customer invoices', source: 'Expected week 48 — these customers pay ~45 days late' },
                { id: 'sal2', label: 'Salaries — November', week: 9, amount: -58000, group: 'Salaries', source: 'From payroll · last banking day' },
                { id: 'vat', label: 'VAT — Q3', week: 9, amount: -41000, group: 'VAT', source: 'Estimated from Q3 sales and the last 4 returns · due 1 Dec' },
            ],
            scenarios: [],
        };
        m.scenarios = [
            { id: 'collect', label: 'Collect the two overdue catering invoices now', detail: '+24.500 kr in week 41 instead of week 48', apply: (x) => moveFlow(x, 'catering', 1) },
            { id: 'split', label: 'Pay the Hamburg bill in 3 monthly instalments', detail: '14.000 kr in weeks 43, 47 and 51', apply: (x) => ({ ...x, flows: [...x.flows.filter((f) => f.id !== 'hamburg'), ...[3, 7, 11].map((w, i) => ({ id: `hamburg${i}`, label: `Hamburg distributor · ${i + 1}/3`, week: w, amount: -14000, group: 'Supplier bills' as const, source: 'Instalment plan (scenario)' }))] }) },
            { id: 'spend', label: 'Cut weekly supplier spend by 10%', detail: '−2.100 kr a week in purchases', apply: (x) => ({ ...x, outBase: x.outBase.map((v) => v * 0.9) }) },
            { id: 'credit', label: 'Draw 60.000 kr on the credit line in week 44', detail: 'Bridges the dip; repay from summer sales', apply: (x) => ({ ...x, flows: [...x.flows, { id: 'credit', label: 'Credit line draw', week: 4, amount: 60000, group: 'Customer invoices', source: 'Scenario' }] }) },
        ];
        return m;
    }
    const c = CLIENTS.find((x) => x.name === company);
    const f = c?.fee ?? 6000;
    const m: Model = {
        start: f * 40,
        inBase: Array.from({ length: WEEKS }, (_, i) => f * (9 + ((i * 7) % 3) - 1)),
        outBase: Array(WEEKS).fill(f * 6),
        flows: [
            { id: 'sal0', label: 'Salaries — September', week: 0, amount: -f * 8, group: 'Salaries', source: 'From payroll · last banking day' },
            { id: 'inv', label: 'Overdue customer invoices', week: 6, amount: f * 2, group: 'Customer invoices', source: 'Expected from each customer’s payment history' },
            { id: 'sal1', label: 'Salaries — October', week: 4, amount: -f * 8, group: 'Salaries', source: 'From payroll · last banking day' },
            { id: 'sal2', label: 'Salaries — November', week: 9, amount: -f * 8, group: 'Salaries', source: 'From payroll · last banking day' },
            { id: 'vat', label: 'VAT — Q3', week: 9, amount: -(f * 5 + (company === 'Tech Equipment AS' ? 4500 : 0)), group: 'VAT', source: company === 'Tech Equipment AS' ? 'Estimated from Q3 sales · includes 4.500 kr from the August rent correction' : 'Estimated from Q3 sales and the last 4 returns · due 1 Dec' },
        ],
        scenarios: [],
    };
    m.scenarios = [
        { id: 'collect', label: 'Collect overdue invoices now', detail: `${kr(f * 2)} in week 41 instead of week 46`, apply: (x) => moveFlow(x, 'inv', 1) },
        { id: 'spend', label: 'Cut weekly supplier spend by 10%', detail: `−${kr(f * 0.6)} a week in purchases`, apply: (x) => ({ ...x, outBase: x.outBase.map((v) => v * 0.9) }) },
    ];
    return m;
}

function run(m: Model) {
    let bal = m.start;
    return Array.from({ length: WEEKS }, (_, i) => {
        const flows = m.flows.filter((f) => f.week === i).reduce((a, f) => a + f.amount, 0);
        bal += m.inBase[i] - m.outBase[i] + flows;
        return bal;
    });
}

export function LiquidityModal({ company, owner, onClose, onMessage }: { company: string; owner?: string; onClose: () => void; onMessage?: () => void }) {
    const { t } = useLang();
    const base = useMemo(() => modelFor(company), [company]);
    const [on, setOn] = useState<Set<string>>(new Set());
    const [custom, setCustom] = useState<Flow[]>([]);
    const [form, setForm] = useState({ label: '', week: '6', amount: '' });
    const [how, setHow] = useState(false);

    const applied = useMemo(() => {
        let m = base;
        base.scenarios.filter((s) => on.has(s.id)).forEach((s) => { m = s.apply(m); });
        return { ...m, flows: [...m.flows, ...custom] };
    }, [base, on, custom]);
    const scenario = on.size > 0 || custom.length > 0;
    const baseSeries = useMemo(() => run(base), [base]);
    const series = useMemo(() => run(applied), [applied]);

    const low = (s: number[]) => s.reduce((acc, v, i) => (v < acc.v ? { v, i } : acc), { v: Infinity, i: 0 });
    const lo = low(series), baseLo = low(baseSeries);
    const firstNeg = series.findIndex((v) => v < 0);

    // chart geometry
    const W = 760, H = 200, pad = 28;
    const all = [...series, ...baseSeries, 0];
    const max = Math.max(...all), min = Math.min(...all);
    const y = (v: number) => pad + ((max - v) / (max - min || 1)) * (H - pad * 2);
    const bw = (W - 40) / WEEKS;

    const groups = ['Salaries', 'VAT', 'Rent', 'Supplier bills', 'Customer invoices'] as const;
    const addCustom = () => {
        const amt = Number(form.amount.replace(/[^\d-]/g, ''));
        const wk = Math.min(WEEKS - 1, Math.max(0, Number(form.week) - 40 >= 0 ? Number(form.week) - 40 : Number(form.week)));
        if (!form.label.trim() || !amt) return;
        setCustom((c) => [...c, { id: `c${c.length}`, label: form.label.trim(), week: wk, amount: amt, group: amt > 0 ? 'Customer invoices' : 'Supplier bills', source: 'Your scenario' }]);
        setForm({ label: '', week: '46', amount: '' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 880, maxHeight: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Cash forecast · next 13 weeks')}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{company} · {t('Week {a}–{b}').replace('{a}', String(weekNo(0))).replace('{b}', String(weekNo(WEEKS - 1)))} · {t('updated from e-conomic this morning')}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
                    {/* the answer first */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { l: 'Cash today', v: kr(base.start), sub: '', bad: false },
                            { l: 'Lowest point', v: kr(lo.v), sub: `${t('Week')} ${weekNo(lo.i)} · ${weekDate(lo.i)}${scenario ? ` · ${t('was')} ${kr(baseLo.v)}` : ''}`, bad: lo.v < 0 },
                            { l: 'In week 52', v: kr(series[WEEKS - 1]), sub: scenario ? `${t('was')} ${kr(baseSeries[WEEKS - 1])}` : '', bad: series[WEEKS - 1] < 0 },
                        ].map((k) => (
                            <div key={k.l} className="rounded-xl p-3" style={{ border: `1px solid ${k.bad ? '#f5c2c2' : COLORS.cardBorder}`, background: k.bad ? '#fdf6f6' : '#fff' }}>
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(k.l)}</p>
                                <p className="text-xl font-semibold mt-0.5" style={{ color: k.bad ? '#c0392b' : COLORS.text }}>{k.v}</p>
                                {k.sub && <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{k.sub}</p>}
                            </div>
                        ))}
                    </div>
                    <p className="text-sm" style={{ color: COLORS.text }}>
                        {firstNeg >= 0
                            ? t('{client} goes below zero in week {w} ({d}) and bottoms out in week {lw}, when salaries and VAT land together.').replace('{client}', company).replace('{w}', String(weekNo(firstNeg))).replace('{d}', weekDate(firstNeg)).replace('{lw}', String(weekNo(lo.i)))
                            : t('{client} stays above zero for the next 13 weeks. The tightest week is {lw}.').replace('{client}', company).replace('{lw}', String(weekNo(lo.i)))}
                    </p>

                    {/* weekly closing balance */}
                    <div className="rounded-xl p-3" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={t('Weekly closing balance')}>
                            <line x1={30} x2={W} y1={y(0)} y2={y(0)} stroke="#a8a8b0" strokeWidth={1} />
                            <text x={0} y={y(0) + 4} fontSize={10} fill="#8a8a94">0</text>
                            {series.map((v, i) => {
                                const x = 36 + i * bw;
                                const b = baseSeries[i];
                                return (
                                    <g key={i}>
                                        {scenario && <rect x={x + 3} y={Math.min(y(b), y(0))} width={bw - 10} height={Math.abs(y(b) - y(0))} fill="none" stroke="#c4c4cc" strokeDasharray="3 2" rx={3} />}
                                        <rect x={x + 6} y={Math.min(y(v), y(0))} width={bw - 16} height={Math.max(2, Math.abs(y(v) - y(0)))} rx={3} fill={v < 0 ? '#dc2626' : scenario ? '#7c3aed' : '#4c6ef5'} opacity={0.9}>
                                            <title>{`${t('Week')} ${weekNo(i)}: ${kr(v)}`}</title>
                                        </rect>
                                        <text x={x + bw / 2 - 2} y={H + 14} fontSize={10} textAnchor="middle" fill="#8a8a94">{weekNo(i)}</text>
                                    </g>
                                );
                            })}
                        </svg>
                        <div className="flex items-center gap-4 text-xs mt-1" style={{ color: COLORS.textMuted }}>
                            <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 10, height: 10, background: scenario ? '#7c3aed' : '#4c6ef5' }} /> {t(scenario ? 'With your scenarios' : 'Closing balance per week')}</span>
                            {scenario && <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 10, height: 10, border: '1px dashed #a8a8b0' }} /> {t('Without')}</span>}
                            <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 10, height: 10, background: '#dc2626' }} /> {t('Below zero')}</span>
                        </div>
                    </div>

                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        {/* what moves the cash */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('What moves the cash')}</p>
                            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <span className="flex-1" style={{ color: COLORS.text }}>{t('Sales in, running costs out')}<span className="block text-xs" style={{ color: COLORS.textMuted }}>{t('Weekly, from the last 12 months and seasonality')}</span></span>
                                    <span className="font-medium" style={{ color: '#15803d' }}>+{kr(applied.inBase.reduce((a, b) => a + b, 0) - applied.outBase.reduce((a, b) => a + b, 0))}</span>
                                </div>
                                {groups.flatMap((g) => applied.flows.filter((f) => f.group === g)).sort((a, b) => a.week - b.week).map((f) => (
                                    <div key={f.id} className="flex items-center gap-2 px-3 py-2 text-sm" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                        <span className="text-xs shrink-0 font-medium" style={{ color: COLORS.textMuted, width: 44 }}>{t('Wk')} {weekNo(f.week)}</span>
                                        <span className="flex-1 min-w-0" style={{ color: COLORS.text }}>{t(f.label)}<span className="block text-xs truncate" style={{ color: COLORS.textMuted }}>{t(f.source)}</span></span>
                                        <span className="font-medium shrink-0" style={{ color: f.amount < 0 ? COLORS.text : '#15803d' }}>{f.amount > 0 ? '+' : ''}{kr(f.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* scenarios */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('Try a scenario')}</p>
                            <div className="flex flex-col gap-1.5">
                                {base.scenarios.map((s) => {
                                    const active = on.has(s.id);
                                    return (
                                        <label key={s.id} className="flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer" style={{ border: `1px solid ${active ? '#7c3aed66' : COLORS.cardBorder}`, background: active ? '#f7f4fd' : '#fff' }}>
                                            <input type="checkbox" className="mt-1" checked={active} onChange={() => setOn((p) => { const n = new Set(p); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })} />
                                            <span className="text-sm" style={{ color: COLORS.text }}>{t(s.label)}<span className="block text-xs" style={{ color: COLORS.textMuted }}>{t(s.detail)}</span></span>
                                        </label>
                                    );
                                })}
                                {custom.map((c) => (
                                    <div key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid #7c3aed66', background: '#f7f4fd' }}>
                                        <span className="flex-1" style={{ color: COLORS.text }}>{c.label} · {t('Wk')} {weekNo(c.week)}</span>
                                        <span className="font-medium">{c.amount > 0 ? '+' : ''}{kr(c.amount)}</span>
                                        <button onClick={() => setCustom((x) => x.filter((y) => y.id !== c.id))} style={{ color: COLORS.textMuted }}>✕</button>
                                    </div>
                                ))}
                                <form onSubmit={(e) => { e.preventDefault(); addCustom(); }} className="flex items-center gap-1.5 mt-1">
                                    <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t('Add your own — e.g. new oven')} className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-sm" style={{ border: `1px solid ${COLORS.cardBorder}` }} />
                                    <input value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} title={t('Week')} className="rounded-lg px-2 py-1.5 text-sm" style={{ width: 52, border: `1px solid ${COLORS.cardBorder}` }} />
                                    <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="−25000" className="rounded-lg px-2 py-1.5 text-sm" style={{ width: 84, border: `1px solid ${COLORS.cardBorder}` }} />
                                    <Button type="submit">{t('Add')}</Button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                        <button onClick={() => setHow((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left" style={{ color: COLORS.text }}>
                            <Icon name="info" /> <span className="flex-1">{t('How EVA calculated this')}</span> <Icon name={how ? 'chevron-up' : 'chevron-down'} />
                        </button>
                        {how && (
                            <ul className="px-4 pb-3 flex flex-col gap-1 text-sm" style={{ color: COLORS.text }}>
                                {['Calculated by rules from the ledger — EVA explains the numbers, it doesn’t invent them.',
                                    'Sales and running costs: the last 12 months of booked transactions, adjusted for seasonality.',
                                    'Customer invoices: only issued, unpaid invoices — timed by each customer’s payment history.',
                                    'Budget figures don’t count as cash until they’re invoiced.',
                                    'VAT: your VAT period, this quarter’s sales and the last four returns.',
                                    'Salaries: from payroll, paid on the last banking day of the month.'].map((r) => <li key={r}>• {t(r)}</li>)}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('Scenarios are only a what-if — nothing is booked or sent.')}</span>
                    <div className="flex gap-2">
                        <Button onClick={onClose}>{t('Close')}</Button>
                        {onMessage && <Button appearance="primary" onClick={onMessage}><Icon name="chat" /> {t('Discuss with {name}').replace('{name}', owner ?? t('the client'))}</Button>}
                    </div>
                </div>
            </div>
        </div>
    );
}
