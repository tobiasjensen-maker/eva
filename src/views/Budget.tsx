import { useMemo, useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { ClientAvatar, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { CLIENTS } from '../practice';
import { downloadCsv } from '../exportCsv';

// ---- Budget 2027 ---------------------------------------------------------------------------
// Built from the ledger (2025 actuals, 2026 so far + forecast), the owner's goals and the
// accountant's assumptions — and shareable as a read-only plan the client can follow.

const kr = (n: number) => `${n < 0 ? '−' : ''}${Math.round(Math.abs(n) / 1000).toLocaleString('da-DK')}`; // table: in 1.000 kr
// plain amounts for the client's view
const big = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n) >= 1e6 ? `${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} mio.` : `${Math.round(Math.abs(n) / 1000).toLocaleString('da-DK')}.000`} kr`;
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : 0);

type Year = { revenue: number; cogs: number; salaries: number; other: number };
type Base = { y2025: Year; y2026: Year; season: number[]; goals: string[]; growth: number; secondSite: boolean };

function baseFor(company: string): Base {
    if (company === 'Café Solsikke') return {
        y2025: { revenue: 4100000, cogs: 1520000, salaries: 1400000, other: 820000 },
        y2026: { revenue: 3780000, cogs: 1440000, salaries: 1420000, other: 860000 },
        season: [0.2, 0.28, 0.32, 0.2], growth: 6, secondSite: true,
        goals: ['Open a second location in 2027', 'Keep two months of costs in the bank', 'Pay myself 45.000 kr a month'],
    };
    const c = CLIENTS.find((x) => x.name === company);
    const r25 = (c?.fee ?? 6000) * 300;
    const r26 = r25 * (1 + (c?.trend ?? 3) / 100);
    const cogs = c?.industry === 'Agency' || c?.industry === 'Tech & SaaS' ? 0.18 : c?.industry === 'Construction' ? 0.52 : 0.45;
    return {
        y2025: { revenue: r25, cogs: r25 * cogs, salaries: r25 * 0.28, other: r25 * 0.12 },
        y2026: { revenue: r26, cogs: r26 * cogs, salaries: r25 * 0.29, other: r25 * 0.125 },
        season: [0.24, 0.25, 0.23, 0.28], growth: Math.max(2, Math.round((c?.trend ?? 4) / 2)), secondSite: false,
        goals: ['Grow steadily without adding fixed costs', 'Keep the business debt-free'],
    };
}

export function BudgetModal({ company, owner, onClose, onMessage }: { company: string; owner?: string; onClose: () => void; onMessage?: () => void }) {
    const { t } = useLang();
    const b = useMemo(() => baseFor(company), [company]);
    const margin26 = Math.round((1 - b.y2026.cogs / b.y2026.revenue) * 100);
    const [view, setView] = useState<'ao' | 'client'>('ao');
    const [growth, setGrowth] = useState(b.growth);
    const [margin, setMargin] = useState(margin26 + (company === 'Café Solsikke' ? 2 : 0));
    const [hires, setHires] = useState(0);
    const [otherChg, setOtherChg] = useState(3);
    const [site, setSite] = useState(false);
    const [shared, setShared] = useState(false);
    const name = owner ?? t('the client');

    // 2027 by quarter
    const q = useMemo(() => b.season.map((w, i) => {
        const siteOn = site && i >= 2; // second location opens in Q3
        const revenue = b.y2026.revenue * (1 + growth / 100) * w + (siteOn ? 550000 : 0);
        const cogs = revenue * (1 - margin / 100);
        const salaries = b.y2026.salaries * 1.03 / 4 + hires * 34000 * 3 + (siteOn ? 225000 : 0);
        const other = b.y2026.other * (1 + otherChg / 100) / 4 + (siteOn ? 150000 : 0);
        return { revenue, cogs, salaries, other };
    }), [b, growth, margin, hires, otherChg, site]);
    const y27: Year = q.reduce((a, x) => ({ revenue: a.revenue + x.revenue, cogs: a.cogs + x.cogs, salaries: a.salaries + x.salaries, other: a.other + x.other }), { revenue: 0, cogs: 0, salaries: 0, other: 0 });
    const res = (y: Year) => y.revenue - y.cogs - y.salaries - y.other;
    const rows: { label: string; get: (y: Year) => number; strong?: boolean }[] = [
        { label: 'Revenue', get: (y) => y.revenue, strong: true },
        { label: 'Cost of goods', get: (y) => -y.cogs },
        { label: 'Gross profit', get: (y) => y.revenue - y.cogs, strong: true },
        { label: 'Salaries', get: (y) => -y.salaries },
        { label: 'Rent & other costs', get: (y) => -y.other },
        { label: 'Result', get: res, strong: true },
    ];
    const exportIt = () => downloadCsv(`${company} — budget 2027.csv`, [
        [t('Line'), '2025 ' + t('actual'), '2026 ' + t('expected'), 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027', '2027 ' + t('budget')],
        ...rows.map((r) => [t(r.label), r.get(b.y2025), r.get(b.y2026), ...q.map(r.get), r.get(y27)]),
    ]);

    const assumptions = [
        { label: 'Revenue growth', value: growth, set: setGrowth, unit: '%', min: -20, max: 40, signed: true },
        { label: 'Gross margin', value: margin, set: setMargin, unit: '%', min: 10, max: 90, signed: false },
        { label: 'New hires', value: hires, set: setHires, unit: '', min: 0, max: 5, signed: false },
        { label: 'Other costs', value: otherChg, set: setOtherChg, unit: '%', min: -20, max: 30, signed: true },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 920, maxHeight: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Budget 2027')}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{company} · {t('from 2025 actuals, 2026 so far and {name}’s goals').replace('{name}', name)}</p>
                    </div>
                    <SegmentedTabs value={view} onChange={(v) => setView(v as 'ao' | 'client')} options={[{ value: 'ao', label: t('Your view') }, { value: 'client', label: t('{name}’s view').replace('{name}', name) }]} />
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
                    {view === 'ao' ? (<>
                        {/* the owner's goals — asked for directly, not guessed */}
                        <div className="rounded-xl p-3.5" style={{ background: '#fff7ed', border: '1px solid #efddc0' }}>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t('What {name} wants from 2027').replace('{name}', name)}</p>
                                {onMessage && <button onClick={onMessage} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t('Ask {name} to confirm →').replace('{name}', name)}</button>}
                            </div>
                            <ul className="mt-1.5 flex flex-col gap-0.5">{b.goals.map((g) => <li key={g} className="text-sm" style={{ color: COLORS.text }}>• {t(g)}</li>)}</ul>
                        </div>

                        <div className="grid gap-4" style={{ gridTemplateColumns: '240px 1fr' }}>
                            {/* assumptions */}
                            <div className="flex flex-col gap-2.5">
                                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Assumptions')}</p>
                                {assumptions.map((a) => (
                                    <div key={a.label} className="rounded-lg px-3 py-2" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                        <div className="flex items-center justify-between text-sm"><span style={{ color: COLORS.text }}>{t(a.label)}</span><span className="font-semibold" style={{ color: COLORS.text }}>{a.value > 0 && a.signed ? '+' : ''}{a.value}{a.unit}</span></div>
                                        <input type="range" min={a.min} max={a.max} value={a.value} onChange={(e) => a.set(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: '#7c3aed' }} />
                                    </div>
                                ))}
                                {b.secondSite && (
                                    <label className="flex items-start gap-2 rounded-lg px-3 py-2 cursor-pointer" style={{ border: `1px solid ${site ? '#7c3aed66' : COLORS.cardBorder}`, background: site ? '#f7f4fd' : '#fff' }}>
                                        <input type="checkbox" className="mt-1" checked={site} onChange={(e) => setSite(e.target.checked)} />
                                        <span className="text-sm" style={{ color: COLORS.text }}>{t('Second location from July')}<span className="block text-xs" style={{ color: COLORS.textMuted }}>{t('+1.1m revenue, 3 staff, rent — from {name}’s goals').replace('{name}', name)}</span></span>
                                    </label>
                                )}
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('Salaries include a 3% raise. New hires at 34.000 kr/month each, incl. pension.')}</p>
                            </div>

                            {/* the budget */}
                            <div className="rounded-lg overflow-x-auto" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ background: '#fafafa', color: COLORS.textMuted }}>
                                            <th className="text-left font-medium px-3 py-2">{t('1.000 kr')}</th>
                                            <th className="text-right font-medium px-2 py-2">2025<span className="block text-[10px] font-normal">{t('actual')}</span></th>
                                            <th className="text-right font-medium px-2 py-2">2026<span className="block text-[10px] font-normal">{t('expected')}</span></th>
                                            {['Q1', 'Q2', 'Q3', 'Q4'].map((x) => <th key={x} className="text-right font-medium px-2 py-2" style={{ color: '#6d28d9' }}>{x}<span className="block text-[10px] font-normal">2027</span></th>)}
                                            <th className="text-right font-semibold px-3 py-2" style={{ color: '#6d28d9', background: '#f7f4fd' }}>2027<span className="block text-[10px] font-normal">{t('budget')}</span></th>
                                            <th className="text-right font-medium px-3 py-2">{t('vs 2026')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r) => {
                                            const v27 = r.get(y27), v26 = r.get(b.y2026);
                                            // costs are negative: compare sizes, and a rise in cost is the amber direction
                                            const cost = v26 < 0 && r.label !== 'Result';
                                            const chg = cost ? pct(Math.abs(v27), Math.abs(v26)) : pct(v27, v26);
                                            const good = cost ? chg <= 0 : chg >= 0;
                                            return (
                                                <tr key={r.label} style={{ borderTop: `1px solid ${COLORS.cardBorder}`, fontWeight: r.strong ? 600 : 400, color: COLORS.text }}>
                                                    <td className="px-3 py-2">{t(r.label)}</td>
                                                    <td className="text-right px-2 py-2" style={{ color: COLORS.textMuted }}>{kr(r.get(b.y2025))}</td>
                                                    <td className="text-right px-2 py-2" style={{ color: COLORS.textMuted }}>{kr(v26)}</td>
                                                    {q.map((x, i) => <td key={i} className="text-right px-2 py-2">{kr(r.get(x))}</td>)}
                                                    <td className="text-right px-3 py-2" style={{ background: '#f7f4fd', color: r.label === 'Result' && v27 < 0 ? '#c0392b' : COLORS.text }}>{kr(v27)}</td>
                                                    <td className="text-right px-3 py-2 text-xs" style={{ color: good ? '#15803d' : '#b9842b' }}>{chg > 0 ? '+' : ''}{chg}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <p className="text-xs px-3 py-2" style={{ color: COLORS.textMuted, borderTop: `1px solid ${COLORS.cardBorder}` }}>{t('2026 expected = January–August booked + September–December forecast. Quarters follow last year’s seasonality.')}</p>
                            </div>
                        </div>
                    </>) : (
                        // What the client sees — plain language, read-only.
                        <div className="flex flex-col gap-4">
                            <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2" style={{ background: '#f1f1f3', color: '#52525b' }}><Icon name="document-preview" /> {t('Read-only preview — this is what {name} sees when you share it.').replace('{name}', name)}</div>
                            <p className="text-xl font-semibold" style={{ color: COLORS.text }}>{t('Your plan for 2027')}</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { l: 'Sales', v: big(y27.revenue), s: `${pct(y27.revenue, b.y2026.revenue) >= 0 ? '+' : ''}${pct(y27.revenue, b.y2026.revenue)}% ${t('vs this year')}` },
                                    { l: 'Costs', v: big(y27.cogs + y27.salaries + y27.other), s: `${t('of which salaries')} ${big(y27.salaries)}` },
                                    { l: 'Profit', v: big(res(y27)), s: res(y27) >= res(b.y2026) ? t('better than this year') : t('lower than this year') },
                                ].map((k) => (
                                    <div key={k.l} className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                        <p className="text-sm" style={{ color: COLORS.textMuted }}>{t(k.l)}</p>
                                        <p className="text-2xl font-semibold mt-1" style={{ color: COLORS.text }}>{k.v}</p>
                                        <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{k.s}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <p className="text-sm font-semibold mb-3" style={{ color: COLORS.text }}>{t('Sales and profit by quarter')}</p>
                                <div className="flex items-end gap-6" style={{ height: 140 }}>
                                    {q.map((x, i) => {
                                        const maxR = Math.max(...q.map((z) => z.revenue));
                                        const p = res(x);
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                                <div className="w-full flex items-end gap-1 justify-center" style={{ height: 110 }}>
                                                    <div className="rounded-t" style={{ width: 28, height: `${(x.revenue / maxR) * 100}%`, background: '#4c6ef5' }} title={`${t('Sales')} ${big(x.revenue)}`} />
                                                    <div className="rounded-t" style={{ width: 28, height: `${Math.max(2, (Math.abs(p) / maxR) * 100)}%`, background: p < 0 ? '#dc2626' : '#16a34a' }} title={`${t('Profit')} ${big(p)}`} />
                                                </div>
                                                <span className="text-xs" style={{ color: COLORS.textMuted }}>Q{i + 1}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold mb-1.5" style={{ color: COLORS.text }}>{t('What the plan is built on')}</p>
                                <ul className="flex flex-col gap-1 text-sm" style={{ color: COLORS.text }}>
                                    <li>• {t('Sales grow {g}% on this year').replace('{g}', String(growth))}{site ? `, ${t('plus the second location from July')}` : ''}.</li>
                                    <li>• {t('You keep {m} kr of every 100 kr in sales after the cost of goods.').replace('{m}', String(margin))}</li>
                                    <li>• {hires ? t('{n} new hire(s) during the year.').replace('{n}', String(hires)) : t('No new hires planned.')}</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: shared ? '#15803d' : COLORS.textMuted }}>{shared ? `✓ ${t('Shared with {name} — read-only. You’ll see when they’ve opened it.').replace('{name}', name)}` : t('Nothing is shared until you choose to.')}</span>
                    <div className="flex gap-2">
                        <Button onClick={exportIt}><Icon name="download" /> {t('Export to Excel')}</Button>
                        <Button appearance="primary" onClick={() => setShared(true)} disabled={shared}><Icon name="envelope" /> {t(shared ? 'Shared' : 'Share with {name}').replace('{name}', name)}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
