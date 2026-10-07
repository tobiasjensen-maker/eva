import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, Orb, COLORS } from '../ui';
import { useLang } from '../i18n';
import { MY_PORTFOLIO, OWNER, type Thread } from '../practice';
import { downloadCsv } from '../exportCsv';
import type { DecisionItem, ResolveInfo } from '../day';
import { DecisionReview } from './Decisions';
import { useScopeMode } from '../edition';

// ---- Month-end, as one flow ----------------------------------------------------------------
// Operations first: the bookkeeping EVA runs across your clients every month, end to end —
// bank → documents → missing documents → drafts → controlling → close → report.

// Per-client month-end numbers (deterministic mock, consistent with the Books donut).
const MISSING: Record<string, number> = {};
const SPREAD = [14, 11, 8, 7, 6, 5, 4, 2, 1]; // 58 documents across 9 clients
const MERCHANTS = ['Bauhaus', 'Q8', 'Netto', 'Circle K', 'Elgiganten', 'Jysk', 'IKEA', 'Matas', 'Shell', 'Silvan', 'DSB', 'Føtex'];
MY_PORTFOLIO.filter((c) => c.books !== 'closed').concat(MY_PORTFOLIO.filter((c) => c.books === 'closed').slice(0, 2))
    .forEach((c, i) => { MISSING[c.name] = SPREAD[i] ?? 0; });
const rowsFor = () => MY_PORTFOLIO.map((c, i) => {
    const lines = 18 + ((i * 13) % 40);
    const missing = MISSING[c.name] ?? 0;
    return { c, lines, matched: lines - missing, missing, status: c.books };
});

// `client`: one client's close (Controlling's client selector). `defaultOpen`: start with the steps showing.
export function MonthEndCard({ decisions, onReview, threads, onResolveDecision, onOpenThread, client, defaultOpen = false }: { decisions: DecisionItem[]; onReview: (d: DecisionItem) => void; threads?: Thread[]; onResolveDecision?: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void; onOpenThread?: (th: Thread) => void; client?: string | null; defaultOpen?: boolean }) {
    const { t } = useLang();
    const [open, setOpen] = useState(defaultOpen);
    const [report, setReport] = useState(false);
    const rows = rowsFor().filter((r) => !client || r.c.name === client);
    const one = client ? rows[0] : undefined;
    const total = rows.length, closed = rows.filter((r) => r.status === 'closed').length;
    const lines = rows.reduce((a, r) => a + r.lines, 0), missing = rows.reduce((a, r) => a + r.missing, 0);
    const chasing = rows.filter((r) => r.missing > 0).length;
    const flags = decisions.filter((d) => !d.done && d.correction);
    const steps: { title: string; stat: string; state: 'done' | 'running' | 'you'; action?: { label: string; run: () => void } }[] = [
        { title: 'Bank transactions', stat: `${total}/${total} ${t('clients')} · ${lines.toLocaleString('da-DK')} ${t('lines')}`, state: 'done' },
        { title: 'Matched to documents', stat: `${(lines - missing).toLocaleString('da-DK')} ${t('of')} ${lines.toLocaleString('da-DK')}`, state: 'done' },
        { title: 'Missing documents', stat: `${missing} ${t('requested from')} ${chasing} ${t('clients')} · ${t('EVA chases every 3 days')}`, state: 'running' },
        { title: 'Inbox documents', stat: `212 ${t('read')} · 204 ${t('matched')}`, state: 'done' },
        { title: 'Draft postings', stat: `96 ${t('drafted, ready to post')}`, state: 'running' },
        { title: 'Controlling', stat: flags.length ? `${lines.toLocaleString('da-DK')} ${t('postings checked')} · ${flags.length} ${t(flags.length === 1 ? 'flag for you' : 'flags for you')}` : `${lines.toLocaleString('da-DK')} ${t('postings checked')} · ${t('all clear')}`, state: flags.length ? 'you' : 'done', action: flags.length ? { label: 'Review', run: () => onReview(flags[0]) } : undefined },
        { title: 'Final posting & close', stat: `${closed} ${t('of')} ${total} ${t('clients closed')}`, state: 'running' },
        { title: 'Month-end report', stat: t('Draft ready · final on 1 Oct'), state: 'running', action: { label: 'View', run: () => setReport(true) } },
    ];
    const dot = { done: '#16a34a', running: '#7c3aed', you: '#dc2626' };

    return (
        <Card className="overflow-hidden">
            <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <Orb size={18} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Month-end · September')}{one ? ` · ${one.c.name}` : ''}</p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                        {one ? t(({ closed: 'Closed', todo: 'To do', blocked: 'Blocked' } as const)[one.status]) : <>{closed} {t('of')} {total} {t('clients closed')}</>} · {missing} {t('documents missing')}{flags.length ? <> · <span style={{ color: '#c0392b', fontWeight: 500 }}>{flags.length} {t(flags.length === 1 ? 'controlling flag' : 'controlling flags')}</span></> : null}
                    </p>
                </div>
                <div className="hidden md:block rounded-full overflow-hidden" style={{ width: 180, height: 6, background: '#f1f1f3' }}><div style={{ width: `${(closed / total) * 100}%`, height: 6, background: '#16a34a' }} /></div>
                <span onClick={(e) => { e.stopPropagation(); setReport(true); }} className="text-xs font-medium shrink-0 m-hide" style={{ color: '#4456c7' }}>{t('Month-end report')} →</span>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8' }} />
            </button>
            {open && (
                <div className="grid gap-px anim-in m-grid2" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', background: COLORS.cardBorder, borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    {steps.map((s, i) => (
                        <div key={s.title} className="bg-white p-3 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold" style={{ color: COLORS.textMuted }}>{i + 1}</span>
                                <span className="rounded-full" style={{ width: 7, height: 7, background: dot[s.state] }} />
                                <span className="text-sm font-medium flex-1 truncate" style={{ color: COLORS.text }}>{t(s.title)}</span>
                                {s.action && <button onClick={s.action.run} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t(s.action.label)} →</button>}
                            </div>
                            <p className="text-xs leading-snug" style={{ color: s.state === 'you' ? '#c0392b' : COLORS.textMuted }}>{s.stat}</p>
                        </div>
                    ))}
                </div>
            )}
            {report && <MonthEndReport onClose={() => setReport(false)} flags={flags.length} decisions={decisions} threads={threads} onResolveDecision={onResolveDecision} onOpenThread={onOpenThread} />}
        </Card>
    );
}

type Row = ReturnType<typeof rowsFor>[number];
type Who = 'You' | 'Client' | 'EVA';
const WHO_STYLE: Record<Who, [string, string]> = { You: ['#f3f0fb', '#6d28d9'], Client: ['#fbf3e0', '#92710f'], EVA: ['#eef2ff', '#4456c7'] };

export function MonthEndReport({ onClose, flags, decisions = [], threads = [], onResolveDecision, onOpenThread, initialFilter }: {
    onClose: () => void;
    flags: number;
    // shared state, so a client's "what's left" lists the real flags and replies
    decisions?: DecisionItem[];
    threads?: Thread[];
    onResolveDecision?: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void;
    onOpenThread?: (th: Thread) => void;
    initialFilter?: 'closed' | 'todo' | 'blocked'; // opened from a slice of the Books donut
}) {
    const { t } = useLang();
    const { ax } = useScopeMode();
    const [filter, setFilter] = useState<'all' | 'closed' | 'todo' | 'blocked'>(initialFilter ?? 'all');
    const [sel, setSel] = useState<string | null>(null); // client drilled into
    const [review, setReview] = useState<DecisionItem | null>(null);
    // what you did from here this session
    const [reminded, setReminded] = useState<Set<string>>(new Set());
    const [posted, setPosted] = useState<Set<string>>(new Set());
    const [closedNow, setClosedNow] = useState<Set<string>>(new Set());
    const [received, setReceived] = useState<Set<string>>(new Set()); // demo: the client answers the reminder
    const remind = (name: string) => {
        setReminded((p) => new Set(p).add(name));
        setTimeout(() => setReceived((p) => new Set(p).add(name)), 2500);
    };
    const statusOf = (r: Row) => (closedNow.has(r.c.name) ? 'closed' : r.status);
    const rows = rowsFor().sort((a, b) => (statusOf(a) === statusOf(b) ? b.missing - a.missing : statusOf(a) === 'blocked' ? -1 : statusOf(b) === 'blocked' ? 1 : statusOf(a) === 'todo' ? -1 : 1));
    const label = { closed: 'Closed', todo: 'To do', blocked: 'Blocked' } as const;
    const tone = { closed: ['#e9f7ef', '#15803d'], todo: ['#f1f1f3', '#52525b'], blocked: ['#fdecec', '#c0392b'] } as const;
    const exportIt = () => downloadCsv('Month-end September 2026.csv', [
        [t('Client'), t('Bank lines'), t('Matched'), t('Missing documents'), t('Status')],
        ...rows.map((r) => [r.c.name, r.lines, r.matched, r.missing, t(label[statusOf(r)])]),
    ]);

    // What still stands between a client and a closed month — and whose move it is.
    const leftFor = (r: Row) => {
        const name = r.c.name, owner = OWNER[name] ?? 'the client';
        // `done` = settled from here; `note` = acted on but still outstanding (e.g. a reminder sent)
        const items: { key: string; who: Who; text: string; sub?: string; action?: { label: string; run: () => void }; done?: string; note?: string }[] = [];
        decisions.filter((d) => !d.done && d.company === name).forEach((d) => items.push({ key: d.id, who: 'You', text: t(d.question), sub: `${t(d.label)} · ${t('EVA has a fix ready')}`, action: onResolveDecision ? { label: 'Review', run: () => setReview(d) } : undefined }));
        threads.filter((x) => !ax && x.status === 'needs' && x.client === name).forEach((x) => items.push({ key: x.id, who: 'You', text: `${x.contact} ${t('is waiting for your reply')}`, sub: t(x.subject), action: onOpenThread ? { label: 'Reply', run: () => onOpenThread(x) } : undefined }));
        if (r.missing > 0 && statusOf(r) !== 'closed') items.push({ key: 'docs', who: 'Client', text: t('{n} documents missing').replace('{n}', String(r.missing)), sub: t('Requested from {name} on 24 Sep · EVA chases every 3 days').replace('{name}', owner),
            ...(received.has(name) ? { done: t('Received — EVA matched them') } : reminded.has(name) ? { note: t('Reminder sent') } : { action: { label: 'Remind now', run: () => remind(name) } }) });
        const drafts = statusOf(r) === 'closed' ? 0 : 3 + (r.lines % 9);
        if (drafts && (r.missing < 10 || received.has(name))) items.push({ key: 'drafts', who: 'You', text: t('{n} draft postings ready to post').replace('{n}', String(drafts)), sub: t('EVA matched them — approve to post'),
            ...(posted.has(name) ? { done: t('Posted') } : { action: { label: 'Approve & post', run: () => setPosted((p) => new Set(p).add(name)) } }) });
        if (r.missing >= 10 && statusOf(r) !== 'closed') items.push({ key: 'blocked', who: 'EVA', text: t('Can’t post the card purchases until the receipts arrive'), sub: t('EVA posts them as soon as they come in'), ...(received.has(name) ? { done: t('Posted') } : {}) });
        return items;
    };
    const selRow = sel ? rows.find((r) => r.c.name === sel) : undefined;
    const left = selRow ? leftFor(selRow).filter((i) => !i.done) : [];
    const open = left.filter((i) => i.who === 'You'); // what needs *you*
    const stepsFor = (r: Row) => {
        const st = statusOf(r);
        const flagged = decisions.some((d) => !d.done && d.company === r.c.name && d.correction);
        return [
            { title: 'Bank transactions', state: 'done', note: `${r.lines} ${t('lines')}` },
            { title: 'Matched to documents', state: r.missing ? 'open' : 'done', note: `${r.matched} ${t('of')} ${r.lines}` },
            { title: 'Missing documents', state: st === 'closed' || !r.missing ? 'done' : 'open', note: r.missing ? `${r.missing} ${t('requested')}` : t('none') },
            { title: 'Inbox documents', state: 'done', note: t('all read') },
            { title: 'Draft postings', state: st === 'closed' || posted.has(r.c.name) ? 'done' : 'open', note: st === 'closed' ? t('posted') : posted.has(r.c.name) ? t('posted') : t('ready to post') },
            { title: 'Controlling', state: flagged ? 'you' : 'done', note: flagged ? t('flag for you') : t('all clear') },
            { title: 'Final posting & close', state: st === 'closed' ? 'done' : 'open', note: st === 'closed' ? t('closed') : t('not yet') },
            { title: 'Month-end report', state: st === 'closed' ? 'done' : 'open', note: st === 'closed' ? t('included') : t('after close') },
        ];
    };
    const dot = { done: '#16a34a', open: '#c4c4cc', you: '#dc2626' } as Record<string, string>;
    // What was actually done in each step for a client — the audit trail behind the dots.
    const [openStep, setOpenStep] = useState<number | null>(null);
    const stepLog = (r: Row, i: number): { who: Who | 'Bank'; when: string; summary: string; lines: [string, string, string][] } => {
        const st = statusOf(r), owner = OWNER[r.c.name] ?? t('the client');
        const seed = r.c.name.length + r.lines;
        const pick = <T,>(arr: T[], k: number) => arr[(seed + k * 7) % arr.length];
        const kr = (n: number) => `${n.toLocaleString('da-DK')} kr`;
        const missingItems = Array.from({ length: Math.min(r.missing, 6) }, (_, k): [string, string, string] => [`${pick([3, 5, 8, 11, 14, 17, 19, 22, 24, 26], k)} Sep`, `${t('Card purchase')} — ${pick(MERCHANTS, k)}`, kr(pick([149, 289, 435, 612, 899, 1240, 2190, 3480], k))]);
        const matches: [string, string, string][] = Array.from({ length: 4 }, (_, k) => [`${pick([2, 4, 9, 12, 16, 21, 25, 29], k)} Sep`, `${pick(MERCHANTS, k + 3)} → ${t(k % 3 === 2 ? 'invoice in the Inbox (fuzzy: amount + date)' : 'invoice in the Inbox (exact)')}`, kr(pick([1250, 3480, 8900, 12500, 640, 2290], k))]);
        const byDay = (x: [string, string, string], y: [string, string, string]) => parseInt(x[0]) - parseInt(y[0]);
        missingItems.sort(byDay); matches.sort(byDay);
        const flag = decisions.find((d) => !d.done && d.company === r.c.name && d.correction);
        const drafts = st === 'closed' ? 6 + (r.lines % 7) : 3 + (r.lines % 9);
        switch (i) {
            case 0: return { who: 'EVA', when: '1 Oct · 05:12', summary: t('Imported {n} bank lines for September from Danske Bank · 4471.').replace('{n}', String(r.lines)), lines: [['1–30 Sep', t('Bank statement imported'), `${r.lines} ${t('lines')}`], ['1 Oct', t('Opening and closing balance checked against the bank'), t('matches')]] };
            case 1: return { who: 'EVA', when: '1 Oct · 05:20', summary: t('Matched {m} of {n} lines to documents — {e} exact, {f} on amount and date.').replace('{m}', String(r.matched)).replace('{n}', String(r.lines)).replace('{e}', String(Math.round(r.matched * 0.85))).replace('{f}', String(r.matched - Math.round(r.matched * 0.85))), lines: matches };
            case 2: return r.missing
                ? { who: 'Client', when: reminded.has(r.c.name) ? t('Reminded just now') : '24 Sep · reminded 27 and 30 Sep', summary: received.has(r.c.name) ? t('{name} sent the documents — EVA matched them.').replace('{name}', owner) : t('{n} lines have no document. EVA asked {name} for them on 24 Sep and keeps chasing every 3 days.').replace('{n}', String(r.missing)).replace('{name}', owner), lines: missingItems }
                : { who: 'EVA', when: '1 Oct · 05:20', summary: t('Nothing missing — every bank line has a document.'), lines: [] };
            case 3: return { who: 'EVA', when: '30 Sep · 23:00', summary: t('Read {n} documents from the Inbox — {m} matched, 1 duplicate ignored.').replace('{n}', String(12 + (seed % 9))).replace('{m}', String(11 + (seed % 9))), lines: [['28 Sep', `${t('Invoice')} — ${pick(MERCHANTS, 1)}`, t('booked')], ['29 Sep', `${t('Receipt')} — ${pick(MERCHANTS, 2)}`, t('booked')], ['29 Sep', `${t('Receipt')} — ${pick(MERCHANTS, 2)}`, t('duplicate · ignored')]] };
            case 4: return st === 'closed' || posted.has(r.c.name)
                ? { who: posted.has(r.c.name) ? 'You' : 'EVA', when: posted.has(r.c.name) ? t('Just now') : '30 Sep · 18:05', summary: t('{n} draft postings posted to the ledger.').replace('{n}', String(drafts)), lines: [['Sep', t('Supplier bills'), String(Math.ceil(drafts / 2))], ['Sep', t('Card purchases'), String(Math.floor(drafts / 2))]] }
                : { who: 'You', when: t('Waiting'), summary: t('{n} draft postings are ready — approve them to post.').replace('{n}', String(drafts)), lines: [['Sep', t('Supplier bills'), String(Math.ceil(drafts / 2))], ['Sep', t('Card purchases'), String(Math.floor(drafts / 2))]] };
            case 5: return flag
                ? { who: 'You', when: '1 Oct · 06:00', summary: `${t('Checked {n} postings — 1 needs your review:').replace('{n}', String(r.lines * 3))} ${t(flag.question)}`, lines: [[t('Rule'), t('VAT code vs. account and history'), t('flag')], [t('Rule'), t('Amounts vs. the last 12 months'), t('ok')], [t('Rule'), t('Missing or double postings'), t('ok')]] }
                : { who: 'EVA', when: '1 Oct · 06:00', summary: t('Checked {n} postings against the account plan and the last 12 months — nothing unusual.').replace('{n}', String(r.lines * 3)), lines: [[t('Rule'), t('VAT code vs. account and history'), t('ok')], [t('Rule'), t('Amounts vs. the last 12 months'), t('ok')], [t('Rule'), t('Missing or double postings'), t('ok')]] };
            case 6: return st === 'closed'
                ? { who: 'EVA', when: closedNow.has(r.c.name) ? t('Just now · closed by you') : '30 Sep · 18:40', summary: t('September is locked. Totals reconciled to the bank and the VAT accounts.'), lines: [[t('Bank'), t('Ledger balance vs. bank statement'), t('matches')], [t('VAT'), t('Input and output VAT reconciled'), t('matches')]] }
                : { who: 'You', when: t('Not yet'), summary: t('September closes when everything above is done.'), lines: [] };
            default: return st === 'closed'
                ? { who: 'EVA', when: '1 Oct · 07:00', summary: t('Included in the September month-end report.'), lines: [] }
                : { who: 'EVA', when: t('After close'), summary: t('Added to the report once September is closed.'), lines: [] };
        }
    };

    // Rendered at the top of the page (portal), so it covers everything wherever it's opened from —
    // e.g. inside Work's month-end card, whose load animation would otherwise trap it.
    return createPortal(
        // z-[70]: portaled to <body>, so it must clear the e-conomic overlay (60/61) too
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 760, maxHeight: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    {selRow && <button onClick={() => setSel(null)} className="rounded-md p-1 mt-0.5" style={{ color: COLORS.textMuted }} title={t('All clients')}><Icon name="arrow-left" /></button>}
                    {selRow && <ClientAvatar name={selRow.c.name} size={32} />}
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{selRow ? selRow.c.name : t('Month-end report · September 2026')}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{selRow ? t('September close') : t('Your {n} clients · draft — final on 1 October').replace('{n}', String(rows.length))}</p>
                    </div>
                    {selRow && <span className="rounded-full px-2 py-0.5 text-xs font-medium mt-1" style={{ background: tone[statusOf(selRow)][0], color: tone[statusOf(selRow)][1] }}>{t(label[statusOf(selRow)])}</span>}
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                {selRow ? (
                    // ---- one client: what's left to close, and whose move it is ----
                    <div className="px-5 py-4 overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0 space-y-4">
                        <div className="rounded-lg p-3.5 flex items-start gap-2.5" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                            <span className="shrink-0 mt-0.5"><Orb size={18} /></span>
                            <p className="text-sm" style={{ color: COLORS.text }}>
                                {statusOf(selRow) === 'closed'
                                    ? (open.length ? t('September is closed. {n} thing(s) still need you — EVA books them as an adjustment once they’re done.').replace('{n}', String(open.length)) : t('September is closed — nothing needs you.'))
                                    : open.length ? t('{n} thing(s) need you before September can close.').replace('{n}', String(open.length))
                                    : left.some((i) => i.who === 'Client') ? t('Nothing needs you — September closes once {name} sends the missing documents.').replace('{name}', OWNER[selRow.c.name] ?? t('the client'))
                                    : left.length ? t('Nothing needs you — EVA is finishing the last steps.')
                                    : t('Everything is in place — September is ready to close.')}
                            </p>
                        </div>

                        {leftFor(selRow).length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('What’s left')}</p>
                                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                    {leftFor(selRow).map((it, i) => (
                                        <div key={it.key} className="flex items-center gap-3 px-3 py-2.5" style={i ? { borderTop: `1px solid ${COLORS.cardBorder}` } : undefined}>
                                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-center" style={{ background: WHO_STYLE[it.who][0], color: WHO_STYLE[it.who][1], width: 56 }}>{t(it.who)}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm" style={{ color: COLORS.text, textDecoration: it.done ? 'line-through' : undefined }}>{it.text}</p>
                                                {it.sub && <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{it.sub}</p>}
                                            </div>
                                            {it.done ? <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: '#15803d' }}><Icon name="circle-tick" /> {it.done}</span>
                                                : it.note ? <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: COLORS.textMuted }}><Icon name="time" /> {it.note}</span>
                                                : it.action && <Button onClick={it.action.run}>{t(it.action.label)}</Button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('Month-end steps')}</p>
                            <div className="grid gap-px rounded-lg overflow-hidden m-grid2" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', background: COLORS.cardBorder, border: `1px solid ${COLORS.cardBorder}` }}>
                                {stepsFor(selRow).map((s, i) => {
                                    const on = openStep === i;
                                    return (
                                        <button key={s.title} onClick={() => setOpenStep(on ? null : i)} className="text-left px-2.5 py-2" style={{ background: on ? '#f3f0fb' : '#fff' }}
                                            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#fafafa'; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = '#fff'; }}>
                                            <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: on ? '#6d28d9' : COLORS.text }}><span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: dot[s.state] }} /><span className="truncate flex-1">{i + 1}. {t(s.title)}</span><Icon name={on ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8', fontSize: 12 }} /></p>
                                            <p className="text-[11px] mt-0.5" style={{ color: s.state === 'you' ? '#c0392b' : COLORS.textMuted }}>{s.note}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {openStep !== null && (() => {
                                const lg = stepLog(selRow, openStep);
                                const st = stepsFor(selRow)[openStep];
                                return (
                                    <div className="mt-2 rounded-lg p-3.5 anim-in" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{openStep + 1}. {t(st.title)}</p>
                                            <span className="text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                                {lg.who === 'EVA' ? <><Orb size={12} /> <span style={{ color: '#6d28d9', fontWeight: 500 }}>EVA</span></> : <span className="font-medium" style={{ color: COLORS.text }}>{t(lg.who === 'Client' ? 'Waiting on the client' : 'You')}</span>} · {lg.when}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-1.5" style={{ color: COLORS.text }}>{lg.summary}</p>
                                        {lg.lines.length > 0 && (
                                            <div className="mt-2.5 rounded-md overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                                {lg.lines.map((l, k) => (
                                                    <div key={k} className="grid items-center gap-3 px-3 py-1.5 text-xs" style={{ gridTemplateColumns: '64px minmax(0,1fr) auto', ...(k ? { borderTop: `1px solid ${COLORS.cardBorder}` } : {}) }}>
                                                        <span style={{ color: COLORS.textMuted }}>{l[0]}</span>
                                                        <span className="truncate" style={{ color: COLORS.text }}>{l[1]}</span>
                                                        <span className="tabular-nums" style={{ color: /flag/.test(l[2]) ? '#c0392b' : COLORS.textMuted, fontWeight: /flag/.test(l[2]) ? 600 : 400 }}>{l[2]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                <div className="px-5 py-4 overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0 space-y-3">
                    <div className="rounded-lg p-3 text-sm flex items-start gap-2.5" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26', color: COLORS.text }}>
                        <Orb size={16} />
                        <span>{t('{c} of {n} clients are closed. The rest are waiting on {m} documents from clients — EVA keeps chasing them.').replace('{c}', String(rows.filter((r) => statusOf(r) === 'closed').length)).replace('{n}', String(rows.length)).replace('{m}', String(rows.reduce((a, r) => a + r.missing, 0)))} {flags ? t('{f} controlling flag(s) still need your review.').replace('{f}', String(flags)) : t('Controlling found nothing else.')} {t('Click a client to see what’s left.')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {(['all', 'blocked', 'todo', 'closed'] as const).map((k) => {
                            const on = filter === k;
                            const n = k === 'all' ? rows.length : rows.filter((r) => statusOf(r) === k).length;
                            return (
                                <button key={k} onClick={() => setFilter(k)} className="rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5"
                                    style={{ border: `1px solid ${on ? '#7c3aed' : COLORS.cardBorder}`, background: on ? '#f3f0fb' : '#fff', color: on ? '#6d28d9' : COLORS.textMuted }}>
                                    {k !== 'all' && <span className="rounded-full" style={{ width: 7, height: 7, background: tone[k][1] }} />}
                                    {t(k === 'all' ? 'All' : label[k])} <span className="tabular-nums">{n}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                        <div className="grid px-3 py-2 text-xs font-medium me-grid" style={{ gridTemplateColumns: '1fr 80px 80px 100px 90px 18px', background: '#fafafa', color: COLORS.textMuted }}>
                            <span>{t('Client')}</span><span className="text-right m-hide">{t('Bank lines')}</span><span className="text-right m-hide">{t('Matched')}</span><span className="text-right">{t('Missing docs')}</span><span className="text-right">{t('Status')}</span><span />
                        </div>
                        {rows.filter((r) => filter === 'all' || statusOf(r) === filter).map((r) => {
                            const needsYou = leftFor(r).filter((i) => !i.done && i.who === 'You').length;
                            return (
                                <button key={r.c.id} onClick={() => { setSel(r.c.name); setOpenStep(null); }} className="w-full grid items-center px-3 py-2 text-sm text-left me-grid" style={{ gridTemplateColumns: '1fr 80px 80px 100px 90px 18px', borderTop: `1px solid ${COLORS.cardBorder}` }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                    <span className="flex items-center gap-2 min-w-0">
                                        <ClientAvatar name={r.c.name} size={20} /><span className="truncate" style={{ color: COLORS.text }}>{r.c.name}</span>
                                        {needsYou > 0 && <span className="shrink-0 rounded-full px-1.5 text-[10px] font-semibold" style={{ background: '#f3f0fb', color: '#6d28d9' }}>{needsYou} {t('for you')}</span>}
                                    </span>
                                    <span className="text-right m-hide" style={{ color: COLORS.textMuted }}>{r.lines}</span>
                                    <span className="text-right m-hide" style={{ color: COLORS.textMuted }}>{r.matched}</span>
                                    <span className="text-right" style={{ color: r.missing ? '#b9842b' : COLORS.textMuted, fontWeight: r.missing ? 500 : 400 }}>{r.missing || '—'}</span>
                                    <span className="text-right"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tone[statusOf(r)][0], color: tone[statusOf(r)][1] }}>{t(label[statusOf(r)])}</span></span>
                                    <span className="text-right" style={{ color: '#b0b0b8' }}><Icon name="chevron-right" /></span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                )}

                <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    {selRow ? (<>
                        <Button onClick={() => setSel(null)}>{t('All clients')}</Button>
                        {statusOf(selRow) !== 'closed' && (
                            <Button appearance="primary" disabled={leftFor(selRow).some((i) => !i.done)} onClick={() => setClosedNow((p) => new Set(p).add(selRow.c.name))}>
                                <Icon name="circle-tick" /> {t('Close September')}
                            </Button>
                        )}
                    </>) : (<>
                        <Button onClick={exportIt}><Icon name="download" /> {t('Export to Excel')}</Button>
                        <Button appearance="primary" onClick={onClose}>{t('Done')}</Button>
                    </>)}
                </div>
            </div>
            {review && <div onClick={(e) => e.stopPropagation()}><DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken, info) => { onResolveDecision?.(review.id, taken, info); setReview(null); }} /></div>}
        </div>,
        document.body,
    );
}
