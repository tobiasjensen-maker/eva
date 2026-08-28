import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { AGREEMENTS } from '../data';
import { useLang, translate } from '../i18n';

type Confidence = 'high' | 'medium' | 'low';
export type ActivityStatus = 'completed' | 'needs-review' | 'failed' | 'waiting';
type Bucket = 'today' | 'yesterday' | 'week' | 'older';

// Provenance — glanceable on every item: an agent did it, AI drafted it, or
// e-conomic itself is flagging it. (The vision: "provenance always, trace on demand".)
type Provenance = 'agent' | 'ai-draft' | 'system';
function provenanceOf(e: { skill: string; status: ActivityStatus }): Provenance {
    if (e.status === 'waiting') return 'agent'; // the agent did the outreach; now it waits
    if (e.skill === 'anomalies' || e.skill === 'monitor') return 'system';
    if (e.status === 'needs-review') return 'ai-draft';
    return 'agent';
}
const PROV_STYLE: Record<Provenance, { label: string; icon: string; bg: string; fg: string }> = {
    agent: { label: 'Agent', icon: 'connection-enable', bg: '#eef2ff', fg: '#4456c7' },
    'ai-draft': { label: 'AI draft', icon: 'ai-stars', bg: '#f3f0fb', fg: '#7c3aed' },
    system: { label: 'e-conomic', icon: 'circle-warning', bg: '#fff7ed', fg: '#b9842b' },
};

function ProvenanceTag({ prov }: { prov: Provenance }) {
    const { t } = useLang();
    const s = PROV_STYLE[prov];
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium shrink-0" style={{ background: s.bg, color: s.fg }} title={t('Provenance')}>
            <Icon name={s.icon as never} /> {t(s.label)}
        </span>
    );
}

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
    waitingOn?: string; // for 'waiting' items — who it's waiting on
    trace?: TraceInfo; // the deep "what did you do and why" audit trail (opened on demand)
    proactive?: boolean; // Eva surfaced this before being asked (the vision's 11:00 hour)
}

// The trace pulled on demand (Mette's 14:20 moment): routine → version → action →
// data read → conclusion → approval → authority. The load-bearing trust artefact.
export interface TraceInfo {
    routine: string;
    version: string;
    action: string;
    dataRead: string;
    concluded: string;
    approvedBy: string;
    authority: string;
}

const SKILL_INFO: Record<string, { emoji: string; label: string }> = {
    reconciliation: { emoji: '🏦', label: 'Bank reconciliation' },
    reminders: { emoji: '🔔', label: 'Payment reminders' },
    documents: { emoji: '📎', label: 'Document collection' },
    monitor: { emoji: '🔎', label: 'Client monitoring' },
    anomalies: { emoji: '🔬', label: 'Anomaly detection' },
    'close-books': { emoji: '📚', label: 'Period close' },
    advisory: { emoji: '💡', label: 'Advisory' },
    regulations: { emoji: '⚖️', label: 'Regulation watch' },
};

const DOC_ICON: Record<SourceDoc['kind'], string> = {
    Invoice: 'document',
    Transaction: 'transfer',
    Entry: 'plus-minus',
};

export const ACTIVITY_ENTRIES: LogEntry[] = [
    // ---- Proactive · Eva acted before being asked (the 11:00 hour) ----
    { id: 'p1', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '06:20', skill: 'regulations', client: 'portfolio',
        desc: 'A reporting-rule change affects 6 of your 40 clients', confidence: 'high', status: 'needs-review', proactive: true,
        reasoning: ['A change to reporting rules landed overnight.', 'I worked out which 6 of your 40 clients it touches, and why.', 'A tailored note is drafted for each — “does this apply to me, and what do I do”.'],
        source: 'SKAT guidance · effective 1 Apr',
        suggestions: ['Review the 6 clients', 'Send the drafted updates'],
        trace: { routine: 'Regulation watch', version: 'v5', action: 'Resolve a rule change per client', dataRead: 'The new SKAT guidance; each client’s profile, sector and filings', concluded: '6 of 40 clients are affected; drafts prepared for each', approvedBy: 'Pending your approval', authority: 'Mette Sørensen · client manager' } },
    { id: 'p2', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '06:35', skill: 'advisory', client: 'portfolio',
        desc: '4 clients will drop below 60 days of cash runway in Q2', confidence: 'medium', status: 'needs-review', proactive: true,
        reasoning: ['I watched all 40 ledgers together, not one at a time.', 'On the current trend, 4 clients fall under 60 days of runway in Q2.', 'Each has a one-page conversation starter ready for you.'],
        source: 'Portfolio liquidity model',
        suggestions: ['Open conversation starters', 'Book the 4 calls'],
        trace: { routine: 'Portfolio liquidity watch', version: 'v3', action: 'Detect runway risk across the book', dataRead: 'Trailing cash flow and commitments for all 40 clients', concluded: '4 clients projected below 60 days runway in Q2', approvedBy: 'Pending your approval', authority: 'Mette Sørensen · client manager' } },

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

    // ---- Waiting on someone else ----
    { id: 'w1', daysAgo: 0, bucket: 'today', dateLabel: 'Today', time: '09:55', skill: 'monitor', client: 'nordic',
        desc: 'Asked Jonas which project the 8.400 DKK cost belongs to', confidence: 'medium', status: 'waiting', waitingOn: 'Jonas · client',
        reasoning: ['The cost could sit on either of two active projects.', 'Sent Jonas a one-line question in the firm’s tone.', 'A reminder is set for Thursday if he hasn’t replied.'],
        source: 'Entry #8840 · 8.400 DKK',
        trace: { routine: 'Month-end close', version: 'v4', action: 'Ask the client to clarify a cost allocation', dataRead: 'Entry #8840, the two open projects for Nordic Build ApS', concluded: 'Ambiguous project allocation — needs the client to decide', approvedBy: 'Auto (within autonomy cap)', authority: 'Mette Sørensen · client manager' } },
    { id: 'w2', daysAgo: 1, bucket: 'yesterday', dateLabel: 'Yesterday', time: '13:20', skill: 'documents', client: 'cafe',
        desc: 'Requested the missing receipt for entry #8830 from the client', confidence: 'high', status: 'waiting', waitingOn: 'Café Solsikke',
        reasoning: ['Entry was booked without supporting documentation.', 'Client notified via the request link.', 'Follow-up scheduled in 3 days.'],
        source: 'Entry #8830 · 2.150 DKK',
        trace: { routine: 'Missing receipt chaser', version: 'v2', action: 'Request a document from the client', dataRead: 'Entry #8830, its missing-attachment flag', concluded: 'No receipt on file — request it before period close', approvedBy: 'Auto (read-only outreach)', authority: 'Mette Sørensen · client manager' } },

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
    waiting: { bg: '#eef2ff', fg: '#4456c7', label: 'Waiting', icon: 'time' },
};

const DATE_RANGES = [
    { value: 'today', label: 'Today' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom' },
];

type StatusFilter = 'all' | 'completed' | 'needs-review' | 'waiting';

// The control centre's three lanes — the surface answers three questions at a glance:
// what needs me, what's waiting on someone else, what happened while I was away.
const LANES: { key: string; label: string; match: (e: LogEntry) => boolean; proactive?: boolean }[] = [
    // Proactive advisory — Eva acted before being asked (the 11:00 hour). Sits on top.
    { key: 'proactive', label: 'Eva spotted this — before you asked', match: (e) => !!e.proactive, proactive: true },
    { key: 'needs-review', label: 'Needs you', match: (e) => (e.status === 'needs-review' || e.status === 'failed') && !e.proactive },
    { key: 'waiting', label: 'Waiting on someone else', match: (e) => e.status === 'waiting' },
    { key: 'completed', label: 'What happened', match: (e) => e.status === 'completed' },
];

const clientName = (id: string) => (id === 'portfolio' ? 'Portfolio-wide' : AGREEMENTS.find((a) => a.id === id)?.name ?? id);

// Answers for the shell chat panel's typed questions / chips on the Review screen.
export function reviewAnswer(entries: LogEntry[], q: string, lang: 'en' | 'da' = 'en'): string {
    const t = q.toLowerCase();
    const da = lang === 'da';
    const flagged = entries.filter((e) => e.status === 'needs-review');
    if (/attention|most|priorit|urgent|first|start|opmærksomhed|vigtig/.test(t)) {
        if (!flagged.length)
            return da ? 'Intet er markeret lige nu — du er helt ajour. 🎉' : 'Nothing is flagged right now — you’re all caught up. 🎉';
        const top = flagged.find((e) => e.confidence === 'low') ?? flagged[0];
        const confDa = top.confidence === 'low' ? 'lav' : top.confidence === 'medium' ? 'middel' : 'høj';
        return da
            ? `Du har ${flagged.length} markered${flagged.length > 1 ? 'e punkter' : 'et punkt'}. Jeg ville starte med “${translate('da', top.desc)}” for ${translate('da', clientName(top.client))} — sikkerheden er ${confDa}, så det har mest brug for et menneskeligt blik.`
            : `You have ${flagged.length} item${flagged.length > 1 ? 's' : ''} flagged. I'd start with “${top.desc}” for ${clientName(top.client)} — it's ${top.confidence} confidence, so it most needs a human eye.`;
    }
    if (/summar|today|recap|do|opsummer|dagens/.test(t)) {
        const today = entries.filter((e) => e.daysAgo === 0);
        const done = today.filter((e) => e.status === 'completed').length;
        const flaggedToday = today.filter((e) => e.status === 'needs-review').length;
        return da
            ? `I dag udførte jeg ${today.length} handlinger: ${done} auto-løst og ${flaggedToday} markeret til din gennemgang.`
            : `Today I took ${today.length} actions: ${done} auto-resolved and ${flaggedToday} flagged for your review.`;
    }
    if (/risk|wrong|fail|confiden|risikab/.test(t)) {
        const low = flagged.filter((e) => e.confidence === 'low');
        if (!low.length)
            return da ? 'Ingen udestående handlinger med lav sikkerhed — intet risikabelt i køen.' : 'No low-confidence actions outstanding — nothing risky in the queue.';
        return da
            ? `De mest risikable punkter er dem med lav sikkerhed: ${low.map((e) => `“${translate('da', e.desc)}”`).join(', ')}. Dem holdt jeg tilbage frem for at handle automatisk.`
            : `The riskiest items are the low-confidence ones: ${low.map((e) => `“${e.desc}”`).join(', ')}. I held these rather than acting automatically.`;
    }
    return da
        ? 'Jeg kan forklare ethvert markeret punkt, opsummere hvad jeg har gjort, eller tage næste skridt for dig. Prøv “Hvad kræver mest min opmærksomhed?”, eller klik “Spørg Eva” på et punkt.'
        : 'I can explain any flagged item, recap what I did, or take the next step for you. Try “What needs my attention most?”, or click “Ask Eva” on an item.';
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
    const { t, lang } = useLang();
    const [range, setRange] = useState('30');
    const [client, setClient] = useState(scope === 'portfolio' ? 'all' : scope);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [acting, setActing] = useState<string | null>(null);
    const [doc, setDoc] = useState<{ entry: LogEntry; doc: SourceDoc } | null>(null);
    const [trace, setTrace] = useState<LogEntry | null>(null);

    // "Ask Eva" on a flagged item — hand the question + explanation to the shell chat panel.
    function askAbout(e: LogEntry) {
        const needsReview = e.status === 'needs-review';
        const consider = needsReview && e.confidence === 'low';
        const da = lang === 'da';
        const client = t(clientName(e.client));
        const userText = consider
            ? (da ? `Hvad skal jeg tjekke for ${client}?` : `What should I check on for ${clientName(e.client)}?`)
            : needsReview
                ? (da ? `Hvorfor foreslår du dette for ${client}?` : `Why are you suggesting this for ${clientName(e.client)}?`)
                : (da ? `Hvorfor gjorde du dette for ${client}?` : `Why did you do this for ${clientName(e.client)}?`);
        const lead = consider
            ? (da ? 'Jeg markerede dette til din gennemgang, fordi:' : 'I flagged this for you to review because:')
            : needsReview
                ? (da ? 'Jeg foreslår dette, fordi:' : "I'm suggesting this because:")
                : (da ? 'Jeg gjorde dette, fordi:' : 'I did this because:');
        const confLabel = da ? (e.confidence === 'low' ? 'lav' : e.confidence === 'medium' ? 'middel' : 'høj') : e.confidence;
        const tail = consider
            ? (da ? ' Jeg er ikke sikker nok til selv at handle på det, så det er værd at tjekke, før du godkender.' : ' I’m not confident enough to act on this myself, so it’s worth your check before you sign off.')
            : needsReview && e.suggestions?.length
                ? (da ? ` Jeg vil anbefale “${e.suggestions[0]}” — skal jeg gå i gang?` : ` I'd recommend “${e.suggestions[0]}” — want me to go ahead?`)
                : '';
        const reasoning = da ? e.reasoning.map((r) => t(r)).join(' ') : e.reasoning.join(' ');
        const answer = da
            ? `${lead} ${reasoning} Min sikkerhed er ${confLabel}.${e.source ? ` Kilde: ${e.source}.` : ''}${tail}`
            : `${lead} ${reasoning} My confidence is ${e.confidence}.${e.source ? ` Source: ${e.source}.` : ''}${tail}`;
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
    const needsCount = periodSet.filter((e) => e.status === 'needs-review' || e.status === 'failed').length;
    const waitingCount = periodSet.filter((e) => e.status === 'waiting').length;
    const stats: { key: StatusFilter; label: string; value: number; sub?: string; color: string; icon: string }[] = [
        { key: 'needs-review', label: 'Needs you', value: needsCount, color: '#b9842b', icon: 'circle-warning' },
        { key: 'waiting', label: 'Waiting on someone else', value: waitingCount, color: '#4456c7', icon: 'time' },
        { key: 'completed', label: 'What happened', value: completed.length, sub: `${autoResolved} ${t('auto-resolved')}`, color: '#16a34a', icon: 'circle-tick' },
    ];

    // Group by lane (the three questions); a specific filter narrows to one lane.
    const shownLanes = status === 'all' ? LANES : LANES.filter((l) => l.key === status);
    const groups = shownLanes
        .map((l) => ({ lane: l, items: periodSet.filter(l.match).sort((a, b) => a.daysAgo - b.daysAgo || b.time.localeCompare(a.time)) }))
        .filter((g) => g.items.length > 0);

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Control centre')} right={<SegmentedTabs value={range} onChange={setRange} options={DATE_RANGES.map((r) => ({ ...r, label: t(r.label) }))} />} />
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
                                onClick={() => onStatusChange(active ? 'all' : s.key)}
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
                                {status === 'needs-review' ? t('Nothing needs you right now — Eva is all caught up. 🎉') : t('No activity matches these filters.')}
                            </p>
                        </Card>
                    )}
                    {groups.map((g) => (
                        <div key={g.lane.key} className="mb-5">
                            {g.lane.proactive ? (
                                <div className="flex items-center gap-1.5 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#7c3aed' }}>
                                    <Orb size={15} /> {t(g.lane.label)} · {g.items.length}
                                </div>
                            ) : (
                                <div className="sticky text-xs font-semibold uppercase tracking-wide py-2" style={{ top: 0, zIndex: 5, color: COLORS.textMuted, background: '#fff' }}>
                                    {t(g.lane.label)} · {g.items.length}
                                </div>
                            )}
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
                                        onTrace={() => setTrace(e)}
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
            {trace && <TraceModal entry={trace} onClose={() => setTrace(null)} />}
        </div>
    );
}

// Derive a full trace for any item (the vision's 14:20 "what did you do and why").
function traceOf(e: LogEntry): TraceInfo {
    if (e.trace) return e.trace;
    const sk = SKILL_INFO[e.skill];
    return {
        routine: sk?.label ?? 'Routine',
        version: 'v3',
        action: e.desc,
        dataRead: e.source ?? (e.doc ? `${e.doc.kind} ${e.doc.ref} — ${e.doc.detail}` : 'Ledger data for this agreement'),
        concluded: e.reasoning[e.reasoning.length - 1] ?? e.desc,
        approvedBy: e.status === 'completed' ? (e.resolution ? 'Mette Sørensen · client manager' : 'Auto — within the routine’s autonomy cap') : e.status === 'waiting' ? 'Auto — read-only outreach' : 'Pending your approval',
        authority: 'Mette Sørensen · client manager',
    };
}

function LogRow({ entry, open, acting, onToggle, onResolve, onOpenDoc, onTrace, onAsk, onReverse }: { entry: LogEntry; open: boolean; acting: boolean; onToggle: () => void; onResolve: (action: string) => void; onOpenDoc: () => void; onTrace: () => void; onAsk: () => void; onReverse: () => void }) {
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
                        {entry.status === 'waiting' && entry.waitingOn ? ` · ${t('waiting on')} ${entry.waitingOn}` : ''}
                    </p>
                </div>
                <ProvenanceTag prov={provenanceOf(entry)} />
                {entry.status !== 'waiting' && (
                    <span
                        title={t(conf.explain)}
                        className="rounded-md px-2 py-0.5 text-xs font-medium shrink-0"
                        style={{ background: conf.bg, color: conf.fg, cursor: 'help' }}
                    >
                        {t(conf.label)} {t('confidence')}
                    </span>
                )}
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
                            <button onClick={onTrace} className="flex items-center gap-1.5 font-medium" style={{ color: '#4456c7' }}>
                                <Icon name="search" /> {t('Trace')}
                            </button>
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

// The trace — "what did you do and why", answerable in two clicks. The vision's
// load-bearing trust artefact: routine → version → action → data → conclusion →
// approval → authority.
function TraceModal({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
    const { t } = useLang();
    const tr = traceOf(entry);
    const rows: { label: string; value: string; icon: string }[] = [
        { label: 'Routine', value: `${t(tr.routine)} · ${tr.version}`, icon: 'workflow' },
        { label: 'Action', value: t(tr.action), icon: 'connection-enable' },
        { label: 'Data it read', value: tr.dataRead, icon: 'document' },
        { label: 'What it concluded', value: t(tr.concluded), icon: 'ai-stars' },
        { label: 'Approved by', value: t(tr.approvedBy), icon: 'document-approve' },
        { label: 'Under whose authority', value: tr.authority, icon: 'person' },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in" style={{ maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center rounded-lg" style={{ width: 34, height: 34, background: '#eef2ff', color: '#4456c7' }}>
                            <Icon name="search" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Trace')}</p>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('What Eva did and why')} · {t(clientName(entry.client))}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>
                <div className="px-5 py-4 flex flex-col gap-0">
                    {rows.map((r, i) => (
                        <div key={r.label} className="flex items-start gap-3 py-2.5" style={i > 0 ? { borderTop: `1px solid ${COLORS.cardBorder}` } : undefined}>
                            <span className="flex items-center justify-center shrink-0 rounded-lg mt-0.5" style={{ width: 28, height: 28, background: '#f1f1f3', color: '#52525b' }}>
                                <Icon name={r.icon as never} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t(r.label)}</p>
                                <p className="text-sm" style={{ color: COLORS.text }}>{r.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-5 py-4 flex justify-between items-center" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('Full audit trail · no ticket, no support call')}</span>
                    <Button onClick={onClose}>{t('Close')}</Button>
                </div>
            </div>
        </div>
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
