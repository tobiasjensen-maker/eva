import { useState, useEffect, useRef, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, EmojiTile, Orb, MicIcon, COLORS } from '../ui';
import { AGREEMENTS } from '../data';

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
        desc: 'Flagged a supplier charge of 14.900 DKK — 3× the monthly average', confidence: 'low', status: 'needs-review',
        reasoning: ['Charge is 3.1× the 6-month average for this supplier.', 'No matching purchase order or approval was found.', 'Low confidence — held for human review before booking.'],
        source: 'Bill from Office Supplies Co · 26 Jan',
        doc: { kind: 'Invoice', ref: '#OS-2291', detail: 'Office Supplies Co · 14.900 DKK · no matching purchase order' },
        suggestions: ['Approve & book', 'Ask client to confirm'] },
    { id: 'a5', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '11:40', skill: 'documents', client: 'tech',
        desc: 'Requested 5 missing receipts from the client', confidence: 'medium', status: 'completed',
        reasoning: ['5 booked entries had no attached documentation.', 'Grouped them into a single request to avoid spamming the client.', 'Set a 3-day follow-up reminder.'],
        source: 'Entries #8801–#8805',
        doc: { kind: 'Entry', ref: '#8801–#8805', detail: '5 entries awaiting documentation' } },
    { id: 'a6', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '12:15', skill: 'monitor', client: 'portfolio',
        desc: 'Detected operating cash flow down 12% vs Q3 across 3 clients', confidence: 'medium', status: 'needs-review',
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
        desc: 'Flagged a possible duplicate bill #TE-189', confidence: 'medium', status: 'needs-review',
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
        desc: 'Noted revenue concentration risk — one client = 41% of revenue', confidence: 'medium', status: 'needs-review',
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
        desc: 'Flagged cash runway under 2 months', confidence: 'low', status: 'needs-review',
        reasoning: ['Projected runway fell below the 2-month threshold.', 'Driven by slower weekday footfall and a card-fee increase.', 'Held for advisory review.'],
        source: 'Cash-flow model · runway 1.4 mo',
        suggestions: ['Draft a check-in for the client', 'Acknowledge'] },
];

const BUCKET_LABEL: Record<Bucket, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Earlier this week',
    older: 'Older',
};
const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'week', 'older'];

const CONF_STYLE: Record<Confidence, { bg: string; fg: string; label: string }> = {
    high: { bg: '#e9f7ef', fg: '#15803d', label: 'High' },
    medium: { bg: '#fbf3e0', fg: '#92710f', label: 'Medium' },
    low: { bg: '#fdecec', fg: '#dc2626', label: 'Low' },
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

export default function ActivityView({
    entries, setEntries, status, onStatusChange, scope = 'portfolio',
}: {
    entries: LogEntry[];
    setEntries: Dispatch<SetStateAction<LogEntry[]>>;
    status: StatusFilter;
    onStatusChange: (s: StatusFilter) => void;
    scope?: string;
}) {
    const [range, setRange] = useState('30');
    const [skill, setSkill] = useState('all');
    const [client, setClient] = useState(scope === 'portfolio' ? 'all' : scope);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [acting, setActing] = useState<string | null>(null);
    const [doc, setDoc] = useState<{ entry: LogEntry; doc: SourceDoc } | null>(null);

    // ---- Eva review-assistant side panel ----
    const [chatMsgs, setChatMsgs] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
        { role: 'assistant', text: "I'm Eva. Ask me about anything in your review queue — or hit “Ask Eva” on a flagged item and I'll explain my thinking." },
    ]);
    const [chatInput, setChatInput] = useState('');

    function reviewAnswer(q: string): string {
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
    function chatSend(text: string) {
        const t = text.trim();
        if (!t) return;
        setChatMsgs((m) => [...m, { role: 'user', text: t }, { role: 'assistant', text: reviewAnswer(t) }]);
        setChatInput('');
    }
    function askAbout(e: LogEntry) {
        const userText = `Why did you flag “${e.desc}”?`;
        const answer = `I flagged this for ${clientName(e.client)} because: ${e.reasoning.join(' ')} My confidence is ${e.confidence}.${e.source ? ` Source: ${e.source}.` : ''}${e.suggestions?.length ? ` My suggested next step is “${e.suggestions[0]}” — want me to go ahead?` : ''}`;
        setChatMsgs((m) => [...m, { role: 'user', text: userText }, { role: 'assistant', text: answer }]);
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
    const periodSet = entries.filter((e) => inRange(e) && (skill === 'all' || e.skill === skill) && (client === 'all' || e.client === client));
    const filtered = periodSet.filter((e) => status === 'all' || e.status === status);

    function resolve(id: string, action: string) {
        setActing(id);
        setTimeout(() => {
            setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'completed', confidence: 'high', resolution: action } : e)));
            setActing(null);
        }, 900);
    }

    const completed = periodSet.filter((e) => e.status === 'completed');
    const autoResolved = completed.filter((e) => !e.resolution).length;
    const stats: { key: StatusFilter; label: string; value: number; sub?: string; color: string; icon: string }[] = [
        { key: 'needs-review', label: 'Flagged for review', value: periodSet.filter((e) => e.status === 'needs-review').length, color: '#b9842b', icon: 'circle-warning' },
        { key: 'completed', label: 'Resolved', value: completed.length, sub: `${autoResolved} auto-resolved`, color: '#16a34a', icon: 'circle-tick' },
        { key: 'all', label: 'Actions taken', value: periodSet.length, color: '#6366f1', icon: 'workflow' },
    ];

    const skillOptions = [{ value: 'all', label: 'All skills' }, ...Object.keys(SKILL_INFO).map((id) => ({ value: id, label: SKILL_INFO[id].label }))];
    const clientOptions = [{ value: 'all', label: 'All clients' }, ...AGREEMENTS.map((a) => ({ value: a.id, label: a.name }))];

    const groups = BUCKET_ORDER.map((b) => ({ bucket: b, items: filtered.filter((e) => e.bucket === b) })).filter((g) => g.items.length > 0);

    return (
        <div className="flex h-full">
            <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-8 py-7 mx-auto" style={{ maxWidth: 880 }}>
                {/* header */}
                <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                        <h1 className="text-2xl font-semibold" style={{ color: COLORS.text }}>Review</h1>
                        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>Everything Eva has done autonomously — filter to just what needs your review.</p>
                    </div>
                    <Select value={range} onChange={setRange} options={DATE_RANGES} align="right" />
                </div>

                {range === 'custom' && (
                    <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: COLORS.textMuted }}>
                        <input type="date" className="rounded-lg px-2.5 py-1.5" style={{ border: `1px solid ${COLORS.cardBorder}` }} />
                        <span>to</span>
                        <input type="date" className="rounded-lg px-2.5 py-1.5" style={{ border: `1px solid ${COLORS.cardBorder}` }} />
                    </div>
                )}

                {/* filters */}
                <div className="flex items-center gap-2 mt-4">
                    <Select value={skill} onChange={setSkill} options={skillOptions} leadingLabel="Skill" />
                    <Select value={client} onChange={setClient} options={clientOptions} leadingLabel="Client" />
                </div>

                {/* stats — double as status filters (flagged first) */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                    {stats.map((s) => {
                        const active = status === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => onStatusChange(s.key)}
                                className="rounded-xl p-4 flex items-center gap-3 text-left"
                                style={{
                                    background: '#fff',
                                    border: `1px solid ${active ? s.color : COLORS.cardBorder}`,
                                    boxShadow: active ? `0 0 0 1px ${s.color}` : 'none',
                                    transition: 'border-color .15s, box-shadow .15s',
                                }}
                            >
                                <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 38, height: 38, background: `${s.color}1a`, color: s.color }}>
                                    <Icon name={s.icon as never} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-semibold leading-none" style={{ color: COLORS.text }}>{s.value}</p>
                                    <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{s.label}</p>
                                    {s.sub && <p className="text-xs" style={{ color: '#a8a8b0' }}>{s.sub}</p>}
                                </div>
                                {active && <Icon name="tick" style={{ color: s.color }} />}
                            </button>
                        );
                    })}
                </div>

                {status !== 'all' && (
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs" style={{ color: COLORS.textMuted }}>
                            Showing {status === 'needs-review' ? 'items that need your review' : 'resolved actions'}
                        </span>
                        <button onClick={() => onStatusChange('all')} className="text-xs font-medium" style={{ color: '#4c6ef5' }}>Clear filter</button>
                    </div>
                )}

                {/* log */}
                <div className="mt-5 pb-10">
                    {groups.length === 0 && (
                        <Card className="p-10 text-center">
                            <p className="text-sm" style={{ color: COLORS.textMuted }}>
                                {status === 'needs-review' ? 'Nothing needs your review here — Eva is all caught up. 🎉' : 'No activity matches these filters.'}
                            </p>
                        </Card>
                    )}
                    {groups.map((g) => (
                        <div key={g.bucket}>
                            <div className="sticky text-xs font-semibold uppercase tracking-wide py-2" style={{ top: 0, zIndex: 5, color: COLORS.textMuted, background: '#fff' }}>
                                {BUCKET_LABEL[g.bucket]} · {g.items.length}
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
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            </div>

            <ReviewChat msgs={chatMsgs} input={chatInput} setInput={setChatInput} onSend={chatSend} />

            {doc && <DocModal entry={doc.entry} doc={doc.doc} onClose={() => setDoc(null)} />}
        </div>
    );
}

function LogRow({ entry, open, acting, onToggle, onResolve, onOpenDoc, onAsk }: { entry: LogEntry; open: boolean; acting: boolean; onToggle: () => void; onResolve: (action: string) => void; onOpenDoc: () => void; onAsk: () => void }) {
    const sk = SKILL_INFO[entry.skill];
    const conf = CONF_STYLE[entry.confidence];
    const st = STATUS_STYLE[entry.status];
    const needsReview = entry.status === 'needs-review';
    return (
        <Card className="overflow-hidden" style={needsReview ? { border: '1px solid #f0e4c4' } : undefined}>
            <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left" style={{ background: open ? '#fafafa' : '#fff' }}>
                <EmojiTile emoji={sk.emoji} size={36} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{entry.desc}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>
                        {sk.label} · {clientName(entry.client)} · {entry.dateLabel} · {entry.time}
                    </p>
                </div>
                {entry.doc && (
                    <span
                        role="button"
                        tabIndex={0}
                        title={`View source ${entry.doc.kind.toLowerCase()} ${entry.doc.ref}`}
                        onClick={(ev) => { ev.stopPropagation(); onOpenDoc(); }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs shrink-0"
                        style={{ background: '#eef2ff', color: '#4456c7', cursor: 'pointer' }}
                    >
                        <Icon name={DOC_ICON[entry.doc.kind] as never} /> {entry.doc.ref}
                    </span>
                )}
                {needsReview && (
                    <span
                        role="button"
                        tabIndex={0}
                        title="Ask Eva about this"
                        onClick={(ev) => { ev.stopPropagation(); onAsk(); }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shrink-0"
                        style={{ background: '#f3f0fb', color: '#7c3aed', cursor: 'pointer' }}
                    >
                        <Icon name="ai-stars" /> Ask Eva
                    </span>
                )}
                <span className="rounded-md px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: conf.bg, color: conf.fg }}>{conf.label}</span>
                <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: st.bg, color: st.fg }}>
                    <Icon name={st.icon as never} /> {st.label}
                </span>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8' }} />
            </button>

            {open && (
                <div className="px-4 pb-4 anim-in" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                        <Icon name="ai-stars" /> Why did Eva do this?
                    </p>
                    <ol className="flex flex-col gap-2">
                        {entry.reasoning.map((r, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: COLORS.text }}>
                                <span className="flex items-center justify-center shrink-0 rounded-full text-xs font-medium" style={{ width: 20, height: 20, background: '#f1f1f3', color: COLORS.textMuted }}>{i + 1}</span>
                                <span className="leading-relaxed">{r}</span>
                            </li>
                        ))}
                    </ol>

                    {entry.source && (
                        <button
                            onClick={entry.doc ? onOpenDoc : undefined}
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 mt-3 text-sm w-full text-left"
                            style={{ background: '#f7f7f8', color: COLORS.text, cursor: entry.doc ? 'pointer' : 'default' }}
                        >
                            <Icon name="document" style={{ color: COLORS.textMuted }} />
                            <span className="flex-1">Source: {entry.source}</span>
                            {entry.doc && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#4456c7' }}>View {entry.doc.kind.toLowerCase()} <Icon name="chevron-right" /></span>}
                        </button>
                    )}

                    {/* action area */}
                    {entry.resolution ? (
                        <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: '#ecfdf5' }}>
                            <p className="text-sm flex items-start gap-2" style={{ color: '#065f46' }}>
                                <Icon name="circle-tick" /> <span>Resolved by you — “{entry.resolution}”. The change has been posted in e-conomic.</span>
                            </p>
                            <a href="#" onClick={(ev) => ev.preventDefault()} className="inline-flex items-center gap-1.5 text-sm font-medium mt-2" style={{ color: '#047857' }}>
                                <Icon name="link-external" /> View the change in e-conomic
                            </a>
                        </div>
                    ) : acting ? (
                        <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: COLORS.textMuted }}>
                            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            Carrying out your choice…
                        </div>
                    ) : needsReview && entry.suggestions ? (
                        <div className="mt-3">
                            <p className="text-xs flex items-center gap-1.5 mb-2" style={{ color: COLORS.textMuted }}>
                                <Icon name="ai-stars" /> Suggested next step{entry.suggestions.length > 1 ? 's' : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {entry.suggestions.map((s, i) => (
                                    <Button key={s} appearance={i === 0 ? 'primary' : 'default'} onClick={() => onResolve(s)}>{s}</Button>
                                ))}
                                <button onClick={() => onResolve('Dismissed')} className="ml-auto text-sm" style={{ color: COLORS.textMuted }}>Dismiss</button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3">
                            <a
                                href="#"
                                onClick={(ev) => ev.preventDefault()}
                                className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5"
                                style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}
                            >
                                <Icon name="link-external" /> View in e-conomic
                            </a>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

// Source-of-truth document viewer.
function DocModal({ entry, doc, onClose }: { entry: LogEntry; doc: SourceDoc; onClose: () => void }) {
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
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{clientName(entry.client)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>
                <div className="px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>Source of truth</p>
                    <div className="rounded-lg p-4 text-sm" style={{ background: '#fafafa', border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                        <p className="font-medium">{doc.kind} {doc.ref}</p>
                        <p className="mt-1" style={{ color: COLORS.textMuted }}>{doc.detail}</p>
                    </div>
                    <p className="text-xs mt-3" style={{ color: COLORS.textMuted }}>This is the record Eva acted on. Open it in e-conomic to see the full document and audit history.</p>
                </div>
                <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={onClose}>Close</Button>
                    <a
                        href="#"
                        onClick={(ev) => { ev.preventDefault(); }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
                        style={{ background: '#4c6ef5', color: '#fff' }}
                    >
                        <Icon name="link-external" /> Open in e-conomic
                    </a>
                </div>
            </div>
        </div>
    );
}

// Eva review-assistant side panel (same pattern as Insights / Spaces).
function ReviewChat({ msgs, input, setInput, onSend }: { msgs: { role: 'user' | 'assistant'; text: string }[]; input: string; setInput: (v: string) => void; onSend: (t: string) => void }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [msgs]);
    const chips = ['What needs my attention most?', 'Summarize today’s actions', 'Anything risky?'];
    const canSend = input.trim().length > 0;
    return (
        <aside className="shrink-0 bg-white flex flex-col h-full" style={{ width: 360, borderLeft: `1px solid ${COLORS.cardBorder}` }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <Orb size={20} />
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Eva</span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>· review assistant</span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {msgs.map((m, i) =>
                    m.role === 'user' ? (
                        <div key={i} className="flex justify-end">
                            <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: '#f1f1f3', color: COLORS.text, maxWidth: '88%' }}>{m.text}</div>
                        </div>
                    ) : (
                        <div key={i} className="flex gap-2">
                            <div className="shrink-0 mt-0.5"><Orb size={20} /></div>
                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{m.text}</p>
                        </div>
                    )
                )}
            </div>

            <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {chips.map((c) => (
                        <button key={c} onClick={() => onSend(c)} className="rounded-full px-2.5 py-1 text-xs" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, background: '#fff' }}>
                            {c}
                        </button>
                    ))}
                </div>
                <div className="relative rounded-xl" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSend(input); } }}
                        placeholder="Ask Eva about your review queue"
                        className="w-full bg-transparent text-sm outline-none"
                        style={{ color: COLORS.text, padding: '10px 76px 10px 12px' }}
                    />
                    <div className="absolute flex items-center gap-2" style={{ right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                        <button style={{ color: COLORS.textMuted }} title="Voice input"><MicIcon /></button>
                        <button
                            onClick={() => onSend(input)}
                            disabled={!canSend}
                            className="flex items-center justify-center rounded-lg"
                            style={{ width: 28, height: 28, background: canSend ? '#4c6ef5' : '#e4e4e7', color: canSend ? '#fff' : '#b0b0b8', cursor: canSend ? 'pointer' : 'not-allowed' }}
                        >
                            <Icon name="arrow-up" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}

// Lightweight dropdown used for the date range and the Skill / Client filters.
function Select({
    value, onChange, options, leadingLabel, align = 'left',
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    leadingLabel?: string;
    align?: 'left' | 'right';
}) {
    const [open, setOpen] = useState(false);
    const current = options.find((o) => o.value === value)?.label ?? '';
    const menuStyle: CSSProperties = {
        top: 'calc(100% + 6px)',
        minWidth: 200,
        maxHeight: 280,
        overflowY: 'auto',
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
        ...(align === 'right' ? { right: 0 } : { left: 0 }),
    };
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, background: '#fff' }}
            >
                {leadingLabel && <span style={{ color: COLORS.textMuted }}>{leadingLabel}:</span>}
                <span className="font-medium">{current}</span>
                <Icon name="chevron-down" style={{ color: COLORS.textMuted }} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute z-40 rounded-xl bg-white overflow-hidden anim-in" style={menuStyle}>
                        {options.map((o) => (
                            <button
                                key={o.value}
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm"
                                style={{ color: COLORS.text, background: o.value === value ? '#f4f4f5' : '#fff' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = o.value === value ? '#f4f4f5' : '#fff')}
                            >
                                <span className="flex-1">{o.label}</span>
                                {o.value === value && <Icon name="tick" style={{ color: '#16a34a' }} />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
