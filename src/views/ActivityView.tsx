import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { AGREEMENTS } from '../data';
import { useLang } from '../i18n';

type Confidence = 'high' | 'medium' | 'low';
export type ActivityStatus = 'completed' | 'needs-review' | 'failed';
type Bucket = 'today' | 'yesterday' | 'week' | 'older';

interface SourceDoc {
    kind: 'Invoice' | 'Transaction' | 'Entry';
    ref: string;
    detail: string;
}

export interface LogEntry {
    id: string;
    daysAgo: number;
    bucket: Bucket;
    dateLabel: string;
    time: string;
    skill: string;
    client: string; // agreement id or 'portfolio'
    desc: string;
    confidence: Confidence;
    status: ActivityStatus;
    reasoning: string[];
    source?: string;
    doc?: SourceDoc; // source-of-truth record this action touched
    suggestions?: string[]; // AI-suggested next steps for needs-review items (first = recommended)
    resolution?: string; // set once the user resolves it
}

const SKILL_INFO: Record<string, { emoji: string; label: string }> = {
    reconciliation: { emoji: '🏦', label: 'Bank reconciliation' },
    reminders: { emoji: '🔔', label: 'Payment reminders' },
    documents: { emoji: '📎', label: 'Document collection' },
    monitor: { emoji: '🔎', label: 'Client monitoring' },
    anomalies: { emoji: '🔬', label: 'Anomaly detection' },
    'close-books': { emoji: '📚', label: 'Period close' },
};

const DOC_ICON: Record<SourceDoc['kind'], string> = {
    Invoice: 'document',
    Transaction: 'transfer',
    Entry: 'plus-minus',
};

export const ACTIVITY_ENTRIES: LogEntry[] = [
    // ---- Today ----
    { id: 'a1', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '09:12', skill: 'reconciliation', client: 'nordic',
        desc: 'Booked transaction #4521 to Account 2100 — Creditors', confidence: 'high', status: 'completed',
        reasoning: ['Bank import line matched a single open supplier bill by amount and reference.', 'Amount 34.200 DKK matched exactly with no rounding difference.', 'Posting rule for Account 2100 applied automatically.'],
        source: 'Matched against invoice #NB-228 for 34.200 DKK',
        doc: { kind: 'Transaction', ref: '#4521', detail: 'Bank payment · 34.200 DKK · booked to Account 2100 — Creditors' } },
    { id: 'a2', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '09:48', skill: 'reminders', client: 'dmp',
        desc: 'Sent payment reminder for invoice #DMK-014 (12.500 DKK, 42 days overdue)', confidence: 'high', status: 'completed',
        reasoning: ['Invoice passed the 30-day overdue threshold for first reminders.', 'No payment or dispute note found on the invoice.', 'Used the client’s preferred reminder template and language (Danish).'],
        source: 'Invoice #DMK-014 · due 28 Apr',
        doc: { kind: 'Invoice', ref: '#DMK-014', detail: 'Digital Marketing Pro · 12.500 DKK · due 28 Apr · 42 days overdue' } },
    { id: 'a3', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '10:21', skill: 'reconciliation', client: 'cafe',
        desc: 'Matched a MobilePay batch (42 transactions) to open invoices', confidence: 'high', status: 'completed',
        reasoning: ['Batch total reconciled to the sum of 42 open invoices.', 'Each line matched a unique invoice by reference.', 'No leftover or unmatched amounts.'],
        source: 'MobilePay settlement · 18.430 DKK',
        doc: { kind: 'Transaction', ref: 'MobilePay batch', detail: '42 transactions · 18.430 DKK · fully reconciled' } },
    { id: 'a4', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '11:05', skill: 'anomalies', client: 'office',
        desc: 'Check a 14.900 DKK supplier charge — 3× the monthly average', confidence: 'low', status: 'needs-review',
        reasoning: ['Charge is 3.1× the 6-month average for this supplier.', 'No matching purchase order or approval was found.', 'Low confidence — I’m not sure enough to book it, so it’s for you to check first.'],
        source: 'Bill from Office Supplies Co · 26 Jan',
        doc: { kind: 'Invoice', ref: '#OS-2291', detail: 'Office Supplies Co · 14.900 DKK · no matching purchase order' },
        suggestions: ['Confirm it’s legitimate', 'Ask the client to confirm'] },
    { id: 'a5', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '11:40', skill: 'documents', client: 'tech',
        desc: 'Requested 5 missing receipts from the client', confidence: 'medium', status: 'completed',
        reasoning: ['5 booked entries had no attached documentation.', 'Grouped them into a single request to avoid spamming the client.', 'Set a 3-day follow-up reminder.'],
        source: 'Entries #8801–#8805',
        doc: { kind: 'Entry', ref: '#8801–#8805', detail: '5 entries awaiting documentation' } },
    { id: 'a6', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '12:15', skill: 'monitor', client: 'portfolio',
        desc: 'Draft a reminder cadence for 3 clients — cash flow down 12% vs Q3', confidence: 'medium', status: 'needs-review',
        reasoning: ['Aggregate operating cash flow fell 12% quarter-over-quarter.', 'Decline concentrated in 3 clients with slower receivable collection.', 'Surfaced for advisory follow-up rather than auto-action.'],
        source: 'Portfolio cash-flow model',
        suggestions: ['Draft a reminder cadence', 'Open detailed breakdown'] },

    // ---- Yesterday ----
    { id: 'a7', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '16:30', skill: 'reconciliation', client: 'bryg',
        desc: 'Booked transaction #4498 to Account 1000 — Sales', confidence: 'high', status: 'completed',
        reasoning: ['Inbound payment matched an open sales invoice.', 'Reference and amount matched exactly.'],
        source: 'Bank import · 12.400 DKK',
        doc: { kind: 'Transaction', ref: '#4498', detail: 'Inbound payment · 12.400 DKK · booked to Account 1000 — Sales' } },
    { id: 'a8', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '15:02', skill: 'reminders', client: 'nordic',
        desc: 'Sent payment reminder for invoice #NB-228 (34.200 DKK)', confidence: 'high', status: 'completed',
        reasoning: ['Invoice 38 days overdue with no payment recorded.', 'First reminder template applied.'],
        source: 'Invoice #NB-228',
        doc: { kind: 'Invoice', ref: '#NB-228', detail: 'Nordic Build ApS · 34.200 DKK · 38 days overdue' } },
    { id: 'a9', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '14:18', skill: 'anomalies', client: 'tech',
        desc: 'Void a possible duplicate bill #TE-189', confidence: 'medium', status: 'needs-review',
        reasoning: ['Bill #TE-189 shares amount, date and supplier with #TE-188.', 'Could be a legitimate split delivery — needs a human check.'],
        source: 'Bills #TE-188 and #TE-189 · 22.650 DKK',
        doc: { kind: 'Invoice', ref: '#TE-189', detail: 'Tech Equipment AS · 22.650 DKK · suspected duplicate of #TE-188' },
        suggestions: ['Mark as duplicate & void', 'Keep both — not a duplicate'] },
    { id: 'a10', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '11:23', skill: 'documents', client: 'cafe',
        desc: 'Collected a receipt for entry #8821 and attached it', confidence: 'high', status: 'completed',
        reasoning: ['Client uploaded the missing receipt via the request link.', 'OCR matched the receipt total to the booked amount.'],
        source: 'Entry #8821 · 1.299 DKK',
        doc: { kind: 'Entry', ref: '#8821', detail: 'Receipt attached · 1.299 DKK · OCR-matched' } },
    { id: 'a11', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '09:50', skill: 'reconciliation', client: 'cloud',
        desc: 'Booked 6 subscription payments to Account 1000 — Sales', confidence: 'high', status: 'completed',
        reasoning: ['6 recurring card payments matched active subscriptions.', 'All amounts matched the expected MRR.'],
        source: 'Stripe payout · 38.400 DKK',
        doc: { kind: 'Transaction', ref: 'Stripe payout', detail: '6 subscription payments · 38.400 DKK' } },
    { id: 'a12', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '08:30', skill: 'reconciliation', client: 'lys',
        desc: 'Could not book transaction #4502 — no matching invoice found', confidence: 'low', status: 'failed',
        reasoning: ['Inbound payment had no reference and no amount match.', 'Searched open invoices ±5% — no candidate found.', 'Left unbooked and flagged for manual matching.'],
        source: 'Unmatched payment · 9.800 DKK',
        doc: { kind: 'Transaction', ref: '#4502', detail: 'Unmatched payment · 9.800 DKK · no reference' },
        suggestions: ['Match to an invoice manually', 'Book to a suspense account'] },

    // ---- Earlier this week ----
    { id: 'a13', daysAgo: 3, bucket: 'week', dateLabel: 'Mon', time: '14:40', skill: 'reminders', client: 'office',
        desc: 'Sent a 2nd reminder for invoice #OS-077 (24.900 DKK)', confidence: 'medium', status: 'completed',
        reasoning: ['First reminder sent 14 days ago with no response.', 'Escalated to the firmer second-reminder template.'],
        source: 'Invoice #OS-077',
        doc: { kind: 'Invoice', ref: '#OS-077', detail: 'Office Supplies Co · 24.900 DKK · 2nd reminder' } },
    { id: 'a14', daysAgo: 3, bucket: 'week', dateLabel: 'Mon', time: '10:15', skill: 'monitor', client: 'dmp',
        desc: 'Add revenue concentration risk to the advisory report — one client = 41%', confidence: 'medium', status: 'needs-review',
        reasoning: ['A single customer accounts for 41% of trailing revenue.', 'Above the 30% advisory threshold.', 'Raised as an advisory insight.'],
        source: 'Revenue breakdown · last 12 months',
        suggestions: ['Add to advisory report', 'Acknowledge'] },
    { id: 'a15', daysAgo: 4, bucket: 'week', dateLabel: 'Tue', time: '13:05', skill: 'close-books', client: 'nordic',
        desc: 'Prepared the month-end close checklist (18 items)', confidence: 'high', status: 'completed',
        reasoning: ['Generated the standard close checklist for the period.', 'Pre-ticked 11 items already satisfied by the books.'],
        source: 'Period: May 2026' },
    { id: 'a16', daysAgo: 5, bucket: 'week', dateLabel: 'Wed', time: '09:22', skill: 'documents', client: 'bryg',
        desc: 'Requested VAT documentation for the Q4 settlement', confidence: 'medium', status: 'completed',
        reasoning: ['Q4 VAT settlement needs supporting documents before filing.', 'Requested the 4 outstanding items from the client.'],
        source: 'Q4 2025 VAT' },

    // ---- Older ----
    { id: 'a17', daysAgo: 12, bucket: 'older', dateLabel: '28 May', time: '16:00', skill: 'reconciliation', client: 'tech',
        desc: 'Booked 12 transactions in bulk to Account 5000 — Cost of goods', confidence: 'high', status: 'completed',
        reasoning: ['12 supplier payments matched open bills with high confidence.', 'All posted under the supplier-payment rule.'],
        source: 'Bank import · 142.600 DKK',
        doc: { kind: 'Transaction', ref: 'Bank import', detail: '12 transactions · 142.600 DKK · booked to Account 5000' } },
    { id: 'a18', daysAgo: 14, bucket: 'older', dateLabel: '26 May', time: '11:11', skill: 'anomalies', client: 'cafe',
        desc: 'Review Café Solsikke’s cash runway — under 2 months', confidence: 'low', status: 'needs-review',
        reasoning: ['Projected runway fell below the 2-month threshold.', 'Driven by slower weekday footfall and a card-fee increase.', 'Low confidence — worth your judgement before raising it with the client.'],
        source: 'Cash-flow model · runway 1.4 mo',
        suggestions: ['Flag it with the client', 'Note it for the next review'] },
];

const BUCKET_LABEL: Record<Bucket, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Earlier this week',
    older: 'Older',
};
const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'week', 'older'];

const CONF_STYLE: Record<Confidence, { bg: string; fg: string; label: string; explain: string }> = {
    high: { bg: '#e9f7ef', fg: '#15803d', label: 'High', explain: 'High confidence — Eva matched this cleanly and could complete it automatically.' },
    medium: { bg: '#fbf3e0', fg: '#92710f', label: 'Medium', explain: 'Medium confidence — mostly clear, but worth a quick check.' },
    low: { bg: '#fdecec', fg: '#dc2626', label: 'Low', explain: 'Low confidence — Eva wasn’t sure, so it held this for your review.' },
};
// Illustrative metrics shown in the "Why did Eva do this?" panel.
const CONF_PCT: Record<Confidence, string> = { high: '99%', medium: '86%', low: '62%' };
const SKILL_TIME: Record<string, string> = {
    reconciliation: '~1 min', reminders: '~2 min', documents: '~3 min', monitor: '~10 min', anomalies: '~5 min', 'close-books': '~30 min',
};
const STATUS_STYLE: Record<ActivityStatus, { bg: string; fg: string; label: string; icon: string }> = {
    completed: { bg: '#e9f7ef', fg: '#15803d', label: 'Completed', icon: 'circle-tick' },
    'needs-review': { bg: '#fbf3e0', fg: '#92710f', label: 'Needs review', icon: 'circle-warning' },
    failed: { bg: '#fdecec', fg: '#dc2626', label: 'Failed', icon: 'error' },
};

const DATE_RANGES = [
    { value: 'today', label: 'Today' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom' },
];

type StatusFilter = 'all' | 'completed' | 'needs-review';

const clientName = (id: string) => (id === 'portfolio' ? 'Portfolio-wide' : AGREEMENTS.find((a) => a.id === id)?.name ?? id);

// Answers for the shell chat panel's typed questions / chips on the Review screen.
export function reviewAnswer(entries: LogEntry[], q: string): string {
    const t = q.toLowerCase();
    const flagged = entries.filter((e) => e.status === 'needs-review');
    if (/attention|most|priorit|urgent|first|start/.test(t)) {
        if (!flagged.length) return 'Nothing is flagged right now — you’re all caught up. 🎉';
        const top = flagged.find((e) => e.confidence === 'low') ?? flagged[0];
        return `You have ${flagged.length} item${flagged.length > 1 ? 's' : ''} flagged. I'd start with “${top.desc}” for ${clientName(top.client)} — it's ${top.confidence} confidence, so it most needs a human eye.`;
    }
    if (/summar|today|recap|do/.test(t)) {
        const today = entries.filter((e) => e.daysAgo === 0);
        return `Today I took ${today.length} actions: ${today.filter((e) => e.status === 'completed').length} auto-resolved and ${today.filter((e) => e.status === 'needs-review').length} flagged for your review.`;
    }
    if (/risk|wrong|fail|confiden/.test(t)) {
        const low = flagged.filter((e) => e.confidence === 'low');
        return low.length ? `The riskiest items are the low-confidence ones: ${low.map((e) => `“${e.desc}”`).join(', ')}. I held these rather than acting automatically.` : 'No low-confidence actions outstanding — nothing risky in the queue.';
    }
    return 'I can explain any flagged item, recap what I did, or take the next step for you. Try “What needs my attention most?”, or click “Ask Eva” on an item.';
}

export default function ActivityView({
    entries, setEntries, status, onStatusChange, scope = 'portfolio', onAskEva,
}: {
    entries: LogEntry[];
    setEntries: Dispatch<SetStateAction<LogEntry[]>>;
    status: StatusFilter;
    onStatusChange: (s: StatusFilter) => void;
    scope?: string;
    onAskEva: (user: string, answer: string) => void;
}) {
    const { t } = useLang();
    const [range, setRange] = useState('30');
    const [client, setClient] = useState(scope === 'portfolio' ? 'all' : scope);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [acting, setActing] = useState<string | null>(null);
    const [doc, setDoc] = useState<{ entry: LogEntry; doc: SourceDoc } | null>(null);

    // "Ask Eva" on a flagged item — hand the question + explanation to the shell chat panel.
    function askAbout(e: LogEntry) {
        const needsReview = e.status === 'needs-review';
        const consider = needsReview && e.confidence === 'low';
        const userText = consider
            ? `What should I check on for ${clientName(e.client)}?`
            : needsReview
                ? `Why are you suggesting this for ${clientName(e.client)}?`
                : `Why did you do this for ${clientName(e.client)}?`;
        const lead = consider
            ? 'I flagged this for you to review because:'
            : needsReview
                ? "I'm suggesting this because:"
                : 'I did this because:';
        const tail = consider
            ? ' I’m not confident enough to act on this myself, so it’s worth your check before you sign off.'
            : needsReview && e.suggestions?.length
                ? ` I'd recommend “${e.suggestions[0]}” — want me to go ahead?`
                : '';
        const answer = `${lead} ${e.reasoning.join(' ')} My confidence is ${e.confidence}.${e.source ? ` Source: ${e.source}.` : ''}${tail}`;
        onAskEva(userText, answer);
    }

    // Reflect the agreement chosen in the sidebar into the Client filter.
    useEffect(() => {
        setClient(scope === 'portfolio' ? 'all' : scope);
    }, [scope]);

    const inRange = (e: LogEntry) => {
        if (range === 'today') return e.daysAgo === 0;
        if (range === '7') return e.daysAgo <= 7;
        if (range === '30') return e.daysAgo <= 30;
        return true; // custom → all (stub)
    };
    // Period set (date + skill + client) drives the stat counts; status is an additional filter on top.
    const periodSet = entries.filter((e) => inRange(e) && (client === 'all' || e.client === client));
    const filtered = periodSet.filter((e) => status === 'all' || e.status === status);

    function resolve(id: string, action: string) {
        setActing(id);
        setTimeout(() => {
            setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'completed', confidence: 'high', resolution: action } : e)));
            setActing(null);
        }, 900);
    }
    // Reverse a resolved action — re-open it as a pending suggestion.
    function reverse(id: string) {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'needs-review', resolution: undefined } : e)));
    }

    const completed = periodSet.filter((e) => e.status === 'completed');
    const autoResolved = completed.filter((e) => !e.resolution).length;
    const stats: { key: StatusFilter; label: string; value: number; sub?: string; color: string; icon: string }[] = [
        { key: 'needs-review', label: 'Flagged for review', value: periodSet.filter((e) => e.status === 'needs-review').length, color: '#b9842b', icon: 'circle-warning' },
        { key: 'completed', label: 'Resolved', value: completed.length, sub: `${autoResolved} ${t('auto-resolved')}`, color: '#16a34a', icon: 'circle-tick' },
        { key: 'all', label: 'Actions taken', value: periodSet.length, color: '#6366f1', icon: 'workflow' },
    ];

    const groups = BUCKET_ORDER.map((b) => ({ bucket: b, items: filtered.filter((e) => e.bucket === b) })).filter((g) => g.items.length > 0);

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Review')} right={<SegmentedTabs value={range} onChange={setRange} options={DATE_RANGES.map((r) => ({ ...r, label: t(r.label) }))} />} />
            <div className="px-8 pt-5 pb-7 mx-auto" style={{ maxWidth: 1040 }}>
                {range === 'custom' && (
                    <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.textMuted }}>
                        <input type="date" className="rounded-lg px-2.5 py-1.5" style={{ border: `1px solid ${COLORS.cardBorder}` }} />
                        <span>{t('to')}</span>
                        <input type="date" className="rounded-lg px-2.5 py-1.5" style={{ border: `1px solid ${COLORS.cardBorder}` }} />
                    </div>
                )}

                {/* stats — double as status filters (flagged first) */}
                <div className="grid grid-cols-3 gap-3">
                    {stats.map((s) => {
                        const active = status === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => onStatusChange(s.key)}
                                className="relative rounded-xl p-4 flex items-center gap-3 text-left overflow-hidden"
                                style={{
                                    background: active ? `${s.color}12` : '#fff',
                                    border: `1.5px solid ${active ? s.color : COLORS.cardBorder}`,
                                    transition: 'border-color .15s, background .15s',
                                }}
                            >
                                {/* active marker: a colored bar down the left edge */}
                                {active && <span className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: s.color }} />}
                                <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 38, height: 38, background: `${s.color}1a`, color: s.color }}>
                                    <Icon name={s.icon as never} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-semibold leading-none" style={{ color: COLORS.text }}>{s.value}</p>
                                    <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{t(s.label)}</p>
                                    {s.sub && <p className="text-xs" style={{ color: '#a8a8b0' }}>{s.sub}</p>}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* log */}
                <div className="mt-5 pb-10">
                    {groups.length === 0 && (
                        <Card className="p-10 text-center">
                            <p className="text-sm" style={{ color: COLORS.textMuted }}>
                                {status === 'needs-review' ? t('Nothing needs your review here — Eva is all caught up. 🎉') : t('No activity matches these filters.')}
                            </p>
                        </Card>
                    )}
                    {groups.map((g) => (
                        <div key={g.bucket}>
                            <div className="sticky text-xs font-semibold uppercase tracking-wide py-2" style={{ top: 0, zIndex: 5, color: COLORS.textMuted, background: '#fff' }}>
                                {t(BUCKET_LABEL[g.bucket])} · {g.items.length}
                            </div>
                            <div className="flex flex-col gap-2">
                                {g.items.map((e) => (
                                    <LogRow
                                        key={e.id}
                                        entry={e}
                                        open={expanded === e.id}
                                        acting={acting === e.id}
                                        onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                                        onResolve={(action) => resolve(e.id, action)}
                                        onOpenDoc={() => e.doc && setDoc({ entry: e, doc: e.doc })}
                                        onAsk={() => askAbout(e)}
                                        onReverse={() => reverse(e.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {doc && <DocModal entry={doc.entry} doc={doc.doc} onClose={() => setDoc(null)} />}
        </div>
    );
}

function LogRow({ entry, open, acting, onToggle, onResolve, onOpenDoc, onAsk, onReverse }: { entry: LogEntry; open: boolean; acting: boolean; onToggle: () => void; onResolve: (action: string) => void; onOpenDoc: () => void; onAsk: () => void; onReverse: () => void }) {
    const { t, lang } = useLang();
    const sk = SKILL_INFO[entry.skill];
    const conf = CONF_STYLE[entry.confidence];
    const st = STATUS_STYLE[entry.status];
    const needsReview = entry.status === 'needs-review';
    // Low-confidence flags are things Eva can't act on alone — the AO considers them and checks them off.
    // Higher-confidence flags are actions Eva can carry out once accepted.
    const consider = needsReview && entry.confidence === 'low';
    return (
        <Card className="overflow-hidden" style={needsReview ? { border: '1px solid #f0e4c4' } : undefined}>
            <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left" style={{ background: open ? '#fafafa' : '#fff' }}>
                <span
                    title={t(st.label)}
                    className="flex items-center justify-center shrink-0 rounded-lg"
                    style={{ width: 36, height: 36, background: `${st.fg}1a`, color: st.fg }}
                >
                    <Icon name={st.icon as never} />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                        {t(entry.desc)}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>
                        {t(sk.label)} · {t(clientName(entry.client))} · {t(entry.dateLabel)} · {entry.time}
                    </p>
                </div>
                <span
                    title={t(conf.explain)}
                    className="rounded-md px-2 py-0.5 text-xs font-medium shrink-0"
                    style={{ background: conf.bg, color: conf.fg, cursor: 'help' }}
                >
                    {t(conf.label)} {t('confidence')}
                </span>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8' }} />
            </button>

            {open && (
                <div className="px-4 pb-4 anim-in">
                    <div className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fcfcfd' }}>
                        <div className="flex items-center gap-2">
                            <Orb size={18} />
                            <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{consider ? t('What Eva wants you to check') : needsReview ? t('Why Eva suggests this') : t('Why did Eva do this?')}</span>
                        </div>

                        <p className="text-sm leading-relaxed mt-2" style={{ color: COLORS.text }}>{entry.reasoning.map((r) => t(r)).join(' ')}</p>

                        {/* metrics: confidence · time saved · source */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm" style={{ color: COLORS.textMuted }}>
                            <span className="flex items-center gap-1.5" title={t(conf.explain)}>
                                <Icon name="circle-tick" /> {CONF_PCT[entry.confidence]} {t('confidence')}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Icon name="time" /> {SKILL_TIME[entry.skill] ?? '~2 min'} {t('saved')}
                            </span>
                            {entry.doc && (
                                <button onClick={onOpenDoc} className="flex items-center gap-1.5 font-medium" style={{ color: '#4456c7' }}>
                                    <Icon name={DOC_ICON[entry.doc.kind] as never} /> {t(`View ${entry.doc.kind.toLowerCase()}`)} {entry.doc.ref}
                                </button>
                            )}
                        </div>

                        <div style={{ borderTop: `1px solid ${COLORS.cardBorder}`, margin: '14px -16px 0' }} />

                        {/* footer: every item is a suggestion — accept, dismiss, or ask Eva to do something else */}
                        <div className="flex items-center justify-between pt-3 gap-3">
                            <button
                                onClick={onAsk}
                                title="Ask Eva to do something else"
                                className="flex items-center gap-1.5 rounded-full font-semibold shrink-0"
                                style={{ padding: '5px 12px 5px 8px', fontSize: 13, background: '#fff7ed', color: COLORS.text, border: '1px solid #efddc0', cursor: 'pointer' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fdeed8')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff7ed')}
                            >
                                <Orb size={16} /> {t('Ask Eva')}
                            </button>
                            {acting ? (
                                <span className="flex items-center gap-2 text-sm" style={{ color: COLORS.textMuted }}>
                                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    {t('Working…')}
                                </span>
                            ) : entry.status === 'completed' ? (
                                // Resolved action — no longer a suggestion; reversible instead.
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5 text-sm" style={{ color: entry.resolution === 'Dismissed' ? COLORS.textMuted : '#15803d' }}>
                                        <Icon name={entry.resolution === 'Dismissed' ? 'circle-warning' : 'circle-tick'} />
                                        {!entry.resolution ? t('Done automatically') : entry.resolution === 'Dismissed' ? t('Dismissed') : entry.resolution === 'Reviewed' ? t('Reviewed') : entry.resolution === 'Confirmed' ? t('Accepted') : `${t('Accepted')} — “${lang === 'da' ? t(entry.resolution) : entry.resolution}”`}
                                    </span>
                                    <Button onClick={onReverse}><Icon name="arrow-left" /> {t('Undo')}</Button>
                                </div>
                            ) : consider ? (
                                // AO-judgement item — Eva can't action it; the accountant checks it off.
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => onResolve('Dismissed')}>{t('Not relevant')}</Button>
                                    <Button appearance="primary" onClick={() => onResolve('Reviewed')}><Icon name="circle-tick" /> {t('Mark as reviewed')}</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => onResolve('Dismissed')}>{t('Dismiss')}</Button>
                                    <Button appearance="primary" onClick={() => onResolve(entry.suggestions?.[0] ?? 'Confirmed')}>{t('Accept')}</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

// Source-of-truth document viewer.
function DocModal({ entry, doc, onClose }: { entry: LogEntry; doc: SourceDoc; onClose: () => void }) {
    const { t } = useLang();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in" style={{ maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center rounded-lg" style={{ width: 34, height: 34, background: '#eef2ff', color: '#4456c7' }}>
                            <Icon name={DOC_ICON[doc.kind] as never} />
                        </span>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{doc.kind} {doc.ref}</p>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(clientName(entry.client))}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>
                <div className="px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('Source of truth')}</p>
                    <div className="rounded-lg p-4 text-sm" style={{ background: '#fafafa', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                        <p className="font-medium">{doc.kind} {doc.ref}</p>
                        <p className="mt-1" style={{ color: COLORS.textMuted }}>{doc.detail}</p>
                    </div>
                    <p className="text-xs mt-3" style={{ color: COLORS.textMuted }}>{t('This is the record Eva acted on. Open it in e-conomic to see the full document and audit history.')}</p>
                </div>
                <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={onClose}>{t('Close')}</Button>
                    <a
                        href="#"
                        onClick={(ev) => { ev.preventDefault(); }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
                        style={{ background: '#4c6ef5', color: '#fff' }}
                    >
                        <Icon name="link-external" /> {t('Open in e-conomic')}
                    </a>
                </div>
            </div>
        </div>
    );
}
