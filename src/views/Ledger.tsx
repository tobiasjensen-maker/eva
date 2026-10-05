import { useMemo, useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { ClientAvatar, Orb, SegmentedTabs, COLORS, useIsMobile } from '../ui';
import { useLang } from '../i18n';
import { CLIENTS, ME, MY_PORTFOLIO, OWNER, type Thread } from '../practice';
import type { DecisionItem, ResolveInfo } from '../day';
import { DecisionReview } from './Decisions';
import { downloadCsv } from '../exportCsv';

// ---- The books: a client's general ledger --------------------------------------------------
// Chart of accounts with period balances, and every posting underneath an account. It reads
// the same shared state as the rest of EVA: a correction you apply shows up corrected here, a
// flag still open is highlighted with a Review, and a receipt waiting on the client sits in
// suspense until they answer.

type Group = 'Income' | 'Expenses' | 'Assets & liabilities';
type Account = { no: string; name: string; group: Group };
type Line = { id: string; date: string; voucher: string; text: string; account: string; amount: number; vat?: string; source: 'EVA' | 'Bank import' | 'You'; by: string; flag?: string; waiting?: string }; // by: 'EVA' or a person's name

const ACCOUNTS: Account[] = [
    { no: '1010', name: 'Sales, domestic', group: 'Income' },
    { no: '1020', name: 'Sales, EU', group: 'Income' },
    { no: '3010', name: 'Salaries', group: 'Expenses' },
    { no: '4310', name: 'Rent', group: 'Expenses' },
    { no: '4510', name: 'Software & subscriptions', group: 'Expenses' },
    { no: '4710', name: 'Business entertainment', group: 'Expenses' },
    { no: '5510', name: 'Purchases, domestic', group: 'Expenses' },
    { no: '5520', name: 'Purchases, EU goods', group: 'Expenses' },
    { no: '6810', name: 'Bank — Danske Bank', group: 'Assets & liabilities' },
    { no: '6910', name: 'Debtors', group: 'Assets & liabilities' },
    { no: '7010', name: 'Creditors', group: 'Assets & liabilities' },
    { no: '7310', name: 'Input VAT', group: 'Assets & liabilities' },
    { no: '7320', name: 'Output VAT', group: 'Assets & liabilities' },
    { no: '7330', name: 'EU acquisition VAT', group: 'Assets & liabilities' },
    { no: '9990', name: 'Suspense — awaiting info', group: 'Assets & liabilities' },
];
const GROUPS: Group[] = ['Income', 'Expenses', 'Assets & liabilities'];

// deterministic pseudo-random per client
const rng = (seed: string) => { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
const d2 = (n: number) => String(n).padStart(2, '0');
const r100 = (n: number) => Math.round(n / 100) * 100;

const CUSTOMERS = ['Holm & Co', 'Nørgaard A/S', 'Vesterbro Tømrer', 'Lund Gruppen', 'Fenger ApS', 'Bakke Handel'];
const SUPPLIERS = ['Dansk Engros', 'Nordic Supply', 'Jysk Grossist', 'Kontorland', 'Brdr. Hansen'];

function linesFor(company: string, decisions: DecisionItem[], threads: Thread[]): Line[] {
    const rand = rng(company);
    const fee = CLIENTS.find((c) => c.name === company)?.fee ?? MY_PORTFOLIO.find((c) => c.name === company)?.fee ?? 6000;
    const monthly = fee * 26; // revenue per month, roughly
    const out: Line[] = [];
    let v = 1001 + Math.floor(rand() * 400);
    const add = (date: string, text: string, legs: [string, number, string?][], source: Line['source'] = 'EVA', extra: Partial<Line> = {}) => {
        const voucher = `#${v++}`;
        legs.forEach(([account, amount, vat], i) => out.push({ id: `${voucher}-${i}`, date, voucher, text, account, amount, vat, source, by: 'EVA', ...extra }));
    };
    out.push({ id: 'ob', date: '2026-01-01', voucher: 'Opening', text: 'Opening balance', account: '6810', amount: r100(fee * 22), source: 'You', by: ME });
    const owner = OWNER[company] ?? 'The client'; // the client's own person
    const noVatRent = company === 'Tech Equipment AS';
    for (let m = 1; m <= 9; m++) {
        const mm = d2(m);
        // rent on the 1st
        const rent = noVatRent ? 18000 : r100(fee * 1.9); // Tech's lease: 18.000 kr, no VAT (see the August flag)
        if (!(noVatRent && m === 8)) add(`2026-${mm}-01`, 'Rent', noVatRent ? [['4310', rent], ['6810', -rent]] : [['4310', rent, 'I25'], ['7310', rent * 0.25], ['6810', -rent * 1.25]], 'Bank import');
        // sales invoices
        for (let k = 0; k < 4; k++) {
            const net = r100((monthly / 4) * (0.7 + rand() * 0.6));
            const day = d2(3 + k * 6 + Math.floor(rand() * 3));
            const cust = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];
            add(`2026-${mm}-${day}`, `Invoice — ${cust}`, [['6910', net * 1.25], ['1010', -net, 'U25'], ['7320', -net * 0.25]], 'EVA', { by: owner }); // the client invoices in e-conomic themselves
            if (m < 9 || k < 2) add(`2026-${mm}-${d2(Math.min(28, Number(day) + 12))}`, `Payment — ${cust}`, [['6810', net * 1.25], ['6910', -net * 1.25]], 'Bank import');
        }
        // purchases
        for (let k = 0; k < 3; k++) {
            const net = r100(monthly * 0.11 * (0.6 + rand() * 0.8));
            const sup = SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)];
            const day = d2(5 + k * 8);
            add(`2026-${mm}-${day}`, `Bill — ${sup}`, [['5510', net, 'I25'], ['7310', net * 0.25], ['7010', -net * 1.25]]);
            add(`2026-${mm}-${d2(Math.min(28, Number(day) + 10))}`, `Payment — ${sup}`, [['7010', net * 1.25], ['6810', -net * 1.25]], 'Bank import');
        }
        // software, salaries
        const sw = r100(fee * 0.12 + 300);
        add(`2026-${mm}-15`, 'Software subscriptions', [['4510', sw, 'I25'], ['7310', sw * 0.25], ['6810', -sw * 1.25]], 'Bank import');
        const sal = r100(fee * 7.5);
        // payroll is run by EVA's payroll routine, then booked from the run
        add(`2026-${mm}-${m === 2 ? '27' : '28'}`, `Payroll — ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'][m - 1]} (EVA payroll run)`, [['3010', sal], ['6810', -sal]]);
    }

    // ---- the postings EVA has had something to say about ----
    if (company === 'Nordic Build ApS') {
        const d = decisions.find((x) => x.id === 'd-vat');
        const fixed = d?.done && d.taken === 'confirm';
        add('2026-02-14', 'Holz Handel GmbH (Germany)', fixed
            ? [['5520', 48200, 'EUK'], ['7310', 12050], ['7330', -12050], ['7010', -48200]]
            : [['5510', 48200, 'I25'], ['7310', 12050], ['7010', -60250]], 'EVA', fixed ? { text: 'Holz Handel GmbH (Germany) · corrected', by: ME } : d && !d.done ? { flag: d.id } : {});
    }
    if (company === 'Tech Equipment AS') {
        const d = decisions.find((x) => x.id === 'd-ctrl');
        const fixed = d?.done && d.taken === 'confirm';
        add('2026-08-01', 'Rent — Ejendomsselskabet Industrivej', fixed
            ? [['4310', 18000, 'None'], ['6810', -18000]]
            : [['4310', 18000, 'I25'], ['7310', 4500], ['6810', -22500]], 'Bank import', fixed ? { text: 'Rent — Ejendomsselskabet Industrivej · corrected', by: ME } : d && !d.done ? { flag: d.id } : {});
    }
    if (company === 'Bryg & Co ApS') {
        const answered = threads.find((x) => x.id === 't1')?.status !== 'needs';
        add('2026-09-11', 'Restaurant Kødbyen', answered
            ? [['4710', 2860, 'I25 · 25% deductible'], ['6810', -2860]]
            : [['9990', 2860], ['6810', -2860]], 'Bank import', answered ? { text: 'Restaurant Kødbyen · business entertainment (Mads confirmed)' } : { waiting: 'Waiting on Mads — what was the dinner for?' });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.voucher.localeCompare(b.voucher));
}

// Who booked a posting: EVA (its mark) or a person (initial + name; you are "You").
function BookedBy({ by }: { by: string }) {
    const { t } = useLang();
    if (by === 'EVA') return <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: '#6d28d9' }}><Orb size={12} /> EVA</span>;
    const you = by === ME;
    const name = you ? t('You') : by;
    return (
        <span className="inline-flex items-center gap-1.5" style={{ color: COLORS.text }} title={by}>
            <span className="inline-flex items-center justify-center rounded-full text-[9px] font-semibold" style={{ width: 16, height: 16, background: you ? '#1c1b3a' : '#e4e4e7', color: you ? '#fff' : '#52525b' }}>{by.charAt(0)}</span>
            {name}
        </span>
    );
}

type Period = 'sep' | 'q3' | 'ytd';
const PERIOD: Record<Period, { label: string; from: string; to: string }> = {
    sep: { label: 'September 2026', from: '2026-09-01', to: '2026-09-30' },
    q3: { label: 'Q3 2026', from: '2026-07-01', to: '2026-09-30' },
    ytd: { label: 'Year to date', from: '2026-01-01', to: '2026-09-30' },
};
const kr = (n: number) => (n === 0 ? '—' : `${n < 0 ? '−' : ''}${Math.round(Math.abs(n)).toLocaleString('da-DK')}`);
const fmtDate = (s: string) => { const [, m, d] = s.split('-'); return `${Number(d)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]}`; };

export function LedgerModal({ company, decisions, threads, onResolveDecision, onClose, onOpenInsights }: {
    company: string;
    decisions: DecisionItem[];
    threads: Thread[];
    onResolveDecision?: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void;
    onClose: () => void;
    onOpenInsights?: () => void;
}) {
    const { t } = useLang();
    const mobile = useIsMobile();
    const lines = useMemo(() => linesFor(company, decisions, threads), [company, decisions, threads]);
    // open on the narrowest period that shows what EVA wants you to see
    const [period, setPeriod] = useState<Period>(() => {
        const f = lines.find((l) => l.flag || l.waiting);
        return !f ? 'sep' : (['sep', 'q3', 'ytd'] as Period[]).find((k) => f.date >= PERIOD[k].from) ?? 'ytd';
    });
    const [q, setQ] = useState('');
    const [review, setReview] = useState<DecisionItem | null>(null);
    const p = PERIOD[period];
    const inPeriod = (l: Line) => l.date >= p.from && l.date <= p.to;

    // balances: P&L accounts show the period's movement; balance-sheet accounts the closing balance
    const bal = (no: string) => {
        const acc = ACCOUNTS.find((a) => a.no === no)!;
        return lines.filter((l) => l.account === no && (acc.group === 'Assets & liabilities' ? l.date <= p.to : inPeriod(l))).reduce((s, l) => s + l.amount, 0);
    };
    const flagsIn = (no: string | null) => lines.filter((l) => (l.flag || l.waiting) && (no === null || l.account === no) && inPeriod(l));
    const allFlags = lines.filter((l) => (l.flag || l.waiting));
    const firstFlagAcc = allFlags.find((l) => l.account !== '6810' && l.account !== '7010' && l.account !== '7310')?.account;
    const [sel, setSel] = useState<string | null>(firstFlagAcc ?? '6810');
    const visibleAccounts = ACCOUNTS.filter((a) => lines.some((l) => l.account === a.no));

    const ql = q.trim().toLowerCase();
    const selAcc = sel ? ACCOUNTS.find((a) => a.no === sel)! : null;
    // running balance from the start of the year (or the period, for P&L accounts)
    const rows = useMemo(() => {
        const base = lines.filter((l) => (sel ? l.account === sel : true));
        const opening = sel && selAcc?.group === 'Assets & liabilities' ? base.filter((l) => l.date < p.from).reduce((s, l) => s + l.amount, 0) : 0;
        let run = opening;
        const list = base.filter(inPeriod).map((l) => { run += l.amount; return { ...l, run }; });
        return { opening, list: list.filter((l) => !ql || l.text.toLowerCase().includes(ql) || l.voucher.toLowerCase().includes(ql) || l.account.includes(ql)) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lines, sel, period, ql]);
    const debit = rows.list.reduce((s, l) => s + Math.max(0, l.amount), 0), credit = rows.list.reduce((s, l) => s + Math.max(0, -l.amount), 0);
    const accName = (no: string) => { const a = ACCOUNTS.find((x) => x.no === no); return a ? `${a.no} · ${t(a.name)}` : no; };
    const exportIt = () => downloadCsv(`${company} — ${sel ? accName(sel) : t('All postings')} — ${p.label}.csv`, [
        [t('Date'), t('Voucher'), t('Text'), t('Booked by'), t('Account'), t('VAT'), t('Debit'), t('Credit'), ...(sel ? [t('Balance')] : [])],
        ...rows.list.map((l) => [l.date, l.voucher, l.text, l.by, accName(l.account), l.vat ?? '', Math.max(0, l.amount), Math.max(0, -l.amount), ...(sel ? [l.run] : [])]),
    ]);
    const openFlag = (l: Line) => { const d = decisions.find((x) => x.id === l.flag); if (d) setReview(d); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 1180, height: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                {/* header */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Books')} · {company}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('General ledger')} · {t(p.label)} · {t('read from e-conomic')}</p>
                    </div>
                    <SegmentedTabs value={period} onChange={(v) => setPeriod(v as Period)} options={(Object.keys(PERIOD) as Period[]).map((k) => ({ value: k, label: t(PERIOD[k].label) }))} />
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                {allFlags.length > 0 && (
                    <div className="mx-5 mt-3 rounded-lg px-3 py-2 flex items-center gap-2.5 shrink-0" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                        <Orb size={16} />
                        <p className="text-sm flex-1" style={{ color: COLORS.text }}>
                            <span className="font-semibold" style={{ color: '#6d28d9' }}>{t('EVA')}</span> · {allFlags.filter((l) => l.flag).length > 0 ? t('{n} posting(s) need your review in these books.').replace('{n}', String(new Set(allFlags.filter((l) => l.flag).map((l) => l.voucher)).size)) : ''} {allFlags.some((l) => l.waiting) ? t('One posting is in suspense, waiting on the client.') : ''}
                        </p>
                        <button onClick={() => { const f = allFlags[0]; setSel(f.account); const per = (['sep', 'q3', 'ytd'] as Period[]).find((k) => f.date >= PERIOD[k].from); if (per) setPeriod(per); }} className="text-xs font-medium shrink-0" style={{ color: '#4456c7' }}>{t('Show me')} →</button>
                    </div>
                )}

                <div className="flex-1 min-h-0 flex mt-3">
                    {/* chart of accounts */}
                    <div className="shrink-0 overflow-y-auto overscroll-contain pb-4 m-hide" style={{ width: 300, borderRight: `1px solid ${COLORS.cardBorder}` }}>
                        <button onClick={() => setSel(null)} className="w-full flex items-center gap-2 px-5 py-2 text-left text-sm" style={{ background: sel === null ? '#f3f0fb' : 'transparent', color: sel === null ? '#6d28d9' : COLORS.text, fontWeight: sel === null ? 600 : 400 }}>
                            <Icon name="list" /> <span className="flex-1">{t('All postings')}</span>
                        </button>
                        {GROUPS.map((g) => (
                            <div key={g} className="mt-2">
                                <p className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t(g)}</p>
                                {visibleAccounts.filter((a) => a.group === g).map((a) => {
                                    const on = sel === a.no; const b = bal(a.no); const fl = flagsIn(a.no).length > 0;
                                    return (
                                        <button key={a.no} onClick={() => setSel(a.no)} className="w-full flex items-center gap-2 px-5 py-1.5 text-left text-sm" style={{ background: on ? '#f3f0fb' : 'transparent' }}
                                            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#fafafa'; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                                            <span className="text-xs tabular-nums shrink-0" style={{ color: COLORS.textMuted, width: 34 }}>{a.no}</span>
                                            <span className="flex-1 min-w-0 truncate" style={{ color: on ? '#6d28d9' : COLORS.text, fontWeight: on ? 600 : 400 }}>{t(a.name)}</span>
                                            {fl && <span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: '#7c3aed' }} title={t('EVA has something to show you here')} />}
                                            <span className="text-xs tabular-nums shrink-0" style={{ color: COLORS.textMuted }}>{kr(b)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* postings */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        {/* phones: pick the account here instead of the sidebar */}
                        {mobile && (
                            <div className="px-5 pb-2 shrink-0">
                                <select value={sel ?? ''} onChange={(e) => setSel(e.target.value || null)} className="w-full rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                                    <option value="">{t('All postings')}</option>
                                    {GROUPS.map((g) => <optgroup key={g} label={t(g)}>{visibleAccounts.filter((a) => a.group === g).map((a) => <option key={a.no} value={a.no}>{a.no} · {t(a.name)} — {kr(bal(a.no))}</option>)}</optgroup>)}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 px-5 pb-3 shrink-0">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{sel ? accName(sel) : t('All postings')}</p>
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>
                                    {rows.list.length} {t('postings')} · {t('Debit')} {kr(debit)} · {t('Credit')} {kr(credit)}{sel ? <> · {t(selAcc?.group === 'Assets & liabilities' ? 'Closing balance' : 'Period total')} <b style={{ color: COLORS.text }}>{kr(bal(sel))} kr</b></> : null}
                                </p>
                            </div>
                            <div className="relative" style={{ width: 220 }}>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search text or voucher…')} className="w-full rounded-lg pl-9 pr-3 py-1.5 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                            </div>
                            <Button onClick={exportIt}><Icon name="download" /> {t('Excel')}</Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-5 pb-4">
                            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr className="text-xs" style={{ color: COLORS.textMuted }}>
                                        {['Date', 'Voucher', 'Text', 'Booked by', ...(sel ? [] : ['Account']), 'VAT', 'Debit', 'Credit', ...(sel ? ['Balance'] : [])].map((h, i, arr) => (
                                            <th key={h} className={`font-medium py-2 px-2 sticky top-0 bg-white whitespace-nowrap ${['Debit', 'Credit', 'Balance'].includes(h) ? 'text-right' : 'text-left'}`} style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, paddingLeft: i === 0 ? 0 : undefined, paddingRight: i === arr.length - 1 ? 0 : undefined }}>{t(h)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sel && selAcc?.group === 'Assets & liabilities' && (
                                        <tr><td colSpan={8} className="py-2 text-xs" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{t('Opening balance')} {fmtDate(p.from)}: <b style={{ color: COLORS.text }}>{kr(rows.opening)} kr</b></td></tr>
                                    )}
                                    {rows.list.map((l) => {
                                        const hl = l.flag ? '#f7f4fd' : l.waiting ? '#fdf8ee' : undefined;
                                        return (
                                            <tr key={l.id} style={{ background: hl }}>
                                                <td className="py-2 pr-2 whitespace-nowrap tabular-nums" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{fmtDate(l.date)}</td>
                                                <td className="py-2 px-2 whitespace-nowrap tabular-nums" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{l.voucher}</td>
                                                <td className="py-2 px-2" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                                    <span className="flex items-center gap-2 flex-wrap">
                                                        {t(l.text)}
                                                        {l.flag && (
                                                            // EVA's mark, like everywhere else: orange dots on the subtle purple
                                                            <button onClick={() => openFlag(l)} className="text-[11px] font-medium rounded-full pl-1.5 pr-2 py-0.5 inline-flex items-center gap-1.5"
                                                                style={{ background: '#f3f0fb', color: '#6d28d9', border: '1px solid #7c3aed40' }}
                                                                onMouseEnter={(e) => (e.currentTarget.style.background = '#ebe5fa')} onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f0fb')}>
                                                                <Orb size={12} /> {t('EVA flag')} · <span className="underline underline-offset-2">{t('Review')}</span>
                                                            </button>
                                                        )}
                                                        {l.waiting && <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: '#fbf3e0', color: '#92710f' }}>{t(l.waiting)}</span>}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 whitespace-nowrap text-xs" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}><BookedBy by={l.by} /></td>
                                                {!sel && <td className="py-2 px-2 whitespace-nowrap text-xs" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{accName(l.account)}</td>}
                                                <td className="py-2 px-2 whitespace-nowrap text-xs" style={{ color: l.flag ? '#c0392b' : COLORS.textMuted, fontWeight: l.flag ? 600 : 400, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{l.vat ?? ''}</td>
                                                <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{l.amount > 0 ? kr(l.amount) : ''}</td>
                                                <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.cardBorder}`, paddingRight: sel ? undefined : 0 }}>{l.amount < 0 ? kr(-l.amount) : ''}</td>
                                                {sel && <td className="py-2 pl-2 text-right tabular-nums whitespace-nowrap font-medium" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{kr(l.run)}</td>}
                                            </tr>
                                        );
                                    })}
                                    {rows.list.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-sm" style={{ color: COLORS.textMuted }}>{t('No postings in this period.')}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-3 shrink-0" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('Read-only. Changes go through a review, so EVA can log them.')}</span>
                    <div className="flex gap-2">
                        {onOpenInsights && <Button onClick={onOpenInsights}><Icon name="chart-line" /> {t('Insights for {client}').replace('{client}', company)}</Button>}
                        <Button appearance="primary" onClick={onClose}>{t('Done')}</Button>
                    </div>
                </div>
            </div>
            {review && <div onClick={(e) => e.stopPropagation()}><DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken, info) => { onResolveDecision?.(review.id, taken, info); setReview(null); }} /></div>}
        </div>
    );
}
