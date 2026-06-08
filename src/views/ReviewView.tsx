import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Button, Icon, useToast } from '@economic/taco';
import { Card, COLORS } from '../ui';
import { AGREEMENTS } from '../data';

const AGREEMENT_NAME: Record<string, string> = Object.fromEntries(AGREEMENTS.map((a) => [a.id, a.name]));
function agreementLabel(id: string): string {
    return id === 'portfolio' ? 'All clients' : AGREEMENT_NAME[id] ?? id;
}

// A clear chip identifying which client agreement a review item belongs to.
function AgreementChip({ id, className = '' }: { id: string; className?: string }) {
    const portfolio = id === 'portfolio';
    return (
        <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-md text-xs font-medium ${className}`}
            style={{ padding: '1px 6px', background: portfolio ? '#eef2ff' : '#eef6f1', color: portfolio ? '#4456c7' : '#2f7d54' }}
        >
            <Icon name={portfolio ? 'contacts' : 'building'} /> {agreementLabel(id)}
        </span>
    );
}

type Status = 'unresolved' | 'pending' | 'resolved';
type GroupKey = 'payments' | 'receipts' | 'insights' | 'invoicing';

interface MatchedLine {
    label: string;
    sub: string;
    amount: string;
    tag?: string;
}

interface ReviewItem {
    id: string;
    status: Status;
    group: GroupKey;
    agreement: string;
    confidence: 'high' | 'medium' | 'low';
    tag: string;
    icon: string;
    title: string;
    sub: string;
    amount: string;
    amountNegative?: boolean;
    date: string;
    matched?: MatchedLine[];
    totalLine?: string;
    callout?: { text: string; actions: string[] };
    receiptActions?: boolean;
    body?: string;
}

const GROUP_META: Record<GroupKey, { title: string; sub: string; icon: string; color: string }> = {
    payments: { title: 'Payment matches to confirm', sub: 'Bank payments the agent matched to invoices', icon: 'match-entries', color: '#6366f1' },
    receipts: { title: 'Missing receipts', sub: 'Entries that still need documentation', icon: 'attach', color: '#f97316' },
    insights: { title: 'Insights to act on', sub: 'Things the agent thinks are worth a look', icon: 'lightbulb', color: '#14b8a6' },
    invoicing: { title: 'Invoicing', sub: 'Reminders and invoices ready to go out', icon: 'envelope', color: '#f43f5e' },
};

const GROUP_ORDER: GroupKey[] = ['payments', 'receipts', 'insights', 'invoicing'];

// AI-suggested next steps for an item (the recommendation is first)
function suggestionsFor(item: ReviewItem): string[] {
    if (item.callout && item.callout.actions.length) return item.callout.actions;
    if (item.receiptActions) return ['Search the inbox for a receipt', 'Request it from the client', 'Book without a receipt'];
    if (item.group === 'payments') return ['Confirm the match & book it', 'Split into separate entries'];
    if (item.group === 'insights') return ['Flag for review', 'Mark as expected'];
    if (item.group === 'invoicing') return ['Send it now', 'Edit before sending'];
    return ['Take action'];
}

export const REVIEW_ITEMS: ReviewItem[] = [
    {
        id: 'r1', agreement: 'dmp', status: 'unresolved', group: 'payments', confidence: 'medium', tag: '1 invoice', icon: 'transfer',
        title: 'Overførsel', sub: 'Customer: Digital Marketing Pro', amount: '6.750,00 DKK', date: '19. jan. 2025',
        matched: [{ label: 'Digital Marketing Pro', sub: 'Invoice #DMK-001 · 15. jan. 2025', amount: '6.570,00 DKK' }],
        callout: { text: 'The invoice and payment match, but it seems like the customer paid 180 DKK too much. How would you like me to handle the difference?', actions: ['Register the difference as income', 'Refund the difference to the customer'] },
    },
    {
        id: 'r2', agreement: 'tech', status: 'unresolved', group: 'payments', confidence: 'medium', tag: '2 invoices', icon: 'entry-type-supplier-payment',
        title: 'Payment of 2 bills', sub: 'Supplier: Tech Equipment AS', amount: '25.600,00 DKK', date: '22. jan. 2025',
        matched: [
            { label: 'Tech Equipment AS', sub: 'Bill #TE-2025-089 · 18. jan. 2025', amount: '18.200,00 DKK', tag: 'partial' },
            { label: 'Tech Equipment AS', sub: 'Bill #TE-2025-090 · 19. jan. 2025', amount: '7.400,00 DKK' },
        ],
        totalLine: 'Total: 25.600,00 DKK',
    },
    {
        id: 'r3', agreement: 'cafe', status: 'unresolved', group: 'receipts', confidence: 'medium', tag: 'No receipts', icon: 'plus-minus',
        title: 'Currency Exchange Adjustment', sub: 'Account 8050 - Financial Income', amount: '-850,00 DKK', amountNegative: true, date: '28. jan. 2025',
        body: 'I created a suggested journal entry. Upload a receipt, let AI search for receipts, or edit this suggestion to link receipts.',
        receiptActions: true,
    },
    {
        id: 'r4', agreement: 'portfolio', status: 'unresolved', group: 'insights', confidence: 'high', tag: 'Cash flow', icon: 'chart-line',
        title: 'Operating cash flow down 12% vs Q3', sub: 'Across your 14 active clients', amount: '−312.000 DKK', amountNegative: true, date: '31. jan. 2025',
        body: 'The dip is concentrated in 3 clients with slower receivable collection. I can draft a tailored reminder cadence for each.',
        callout: { text: 'Want me to act on this?', actions: ['Draft reminder cadence', 'Open detailed breakdown'] },
    },
    {
        id: 'r5', agreement: 'nordic', status: 'unresolved', group: 'insights', confidence: 'medium', tag: 'VAT', icon: 'circle-warning',
        title: 'VAT deadline in 6 days', sub: 'Q4 2024 settlement · SKAT', amount: '128.400 DKK', date: '01. feb. 2025',
        body: 'Estimated VAT payable for the period. The books look ready to file — I can prepare the settlement for your review.',
        callout: { text: '', actions: ['Prepare VAT settlement'] },
    },
    {
        id: 'r6', agreement: 'office', status: 'pending', group: 'insights', confidence: 'low', tag: 'Anomaly', icon: 'experiment',
        title: 'Unusual supplier charge detected', sub: 'Office Supplies Co · 3× the monthly average', amount: '14.900 DKK', date: '26. jan. 2025',
        body: 'I asked the client to confirm whether this charge is expected. Waiting for their reply before booking.',
    },
    {
        id: 'r7', agreement: 'portfolio', status: 'resolved', group: 'invoicing', confidence: 'high', tag: '3 invoices', icon: 'envelope',
        title: '3 payment reminders sent', sub: 'Overdue 30+ days · 74.200 DKK total', amount: '74.200 DKK', date: '30. jan. 2025',
        body: 'Reminders were sent to Digital Marketing Pro, Nordic Build ApS and Café Solsikke.',
    },
    {
        id: 'r8', agreement: 'cafe', status: 'resolved', group: 'payments', confidence: 'high', tag: 'Reconciled', icon: 'reconciled',
        title: 'MobilePay batch reconciled', sub: '42 transactions · automatically booked', amount: '18.430,00 DKK', date: '29. jan. 2025',
        body: 'All 42 MobilePay transactions were matched to open invoices and booked.',
    },
    {
        id: 'r9', agreement: 'nordic', status: 'resolved', group: 'invoicing', confidence: 'high', tag: 'Invoice', icon: 'document-signed',
        title: 'Recurring invoice sent', sub: 'Nordic Build ApS · monthly retainer', amount: '18.000 DKK', date: '01. feb. 2025',
        body: 'The February retainer invoice was approved and sent.',
    },
];

const confColors: Record<string, { bg: string; fg: string }> = {
    high: { bg: '#e9f7ef', fg: '#15803d' },
    medium: { bg: '#fbf3e0', fg: '#92710f' },
    low: { bg: '#f3f0fb', fg: '#6d4ec9' },
};

const STATUS_META: { key: Status; label: string; sub: string; color: string; icon: string }[] = [
    { key: 'unresolved', label: 'Needs review', sub: 'These need your attention', color: '#f97316', icon: 'circle-warning' },
    { key: 'pending', label: 'Pending', sub: 'Waiting for more info', color: '#6b7280', icon: 'time' },
    { key: 'resolved', label: 'Resolved', sub: '57% agent-automated', color: '#16a34a', icon: 'circle-tick' },
];

interface ModalState {
    group: GroupKey;
    ids: string[];
    index: number;
}

export default function ReviewView({
    scope = 'portfolio',
    scopeName = 'All agreements',
    items,
    setItems,
}: {
    scope?: string;
    scopeName?: string;
    items: ReviewItem[];
    setItems: Dispatch<SetStateAction<ReviewItem[]>>;
}) {
    const toast = useToast();
    const [status, setStatus] = useState<Status>('unresolved');
    const [modal, setModal] = useState<ModalState | null>(null);

    const scoped = scope === 'portfolio' ? items : items.filter((i) => i.agreement === scope);

    const statusCounts: Record<Status, number> = { unresolved: 0, pending: 0, resolved: 0 };
    for (const i of scoped) statusCounts[i.status]++;

    const inStatus = scoped.filter((i) => i.status === status);
    const groups = GROUP_ORDER.map((key) => ({ key, items: inStatus.filter((i) => i.group === key) })).filter((g) => g.items.length > 0);

    function setItemStatus(id: string, next: Status) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: next } : i)));
    }
    function removeItem(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }

    const modalItems = modal ? (modal.ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as ReviewItem[]) : [];
    const current = modal && modalItems[modal.index] ? modalItems[modal.index] : modal ? modalItems[modalItems.length - 1] : null;

    function advanceOnly() {
        if (!modal) return;
        if (modal.index + 1 >= modal.ids.length) {
            setModal(null);
            toast.success('Group reviewed — nice work!');
        } else {
            setModal({ ...modal, index: modal.index + 1 });
        }
    }

    return (
        <div className="h-full overflow-y-auto px-8 py-7">
            <div className="mx-auto" style={{ maxWidth: 1040 }}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-semibold" style={{ color: COLORS.text }}>Review</h1>
                        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>
                            <Icon name={scope === 'portfolio' ? 'contacts' : 'person'} /> {scope === 'portfolio' ? `Portfolio · ${scopeName === 'All agreements' ? 'all agreements' : scopeName}` : scopeName}
                        </span>
                    </div>
                    <span className="text-sm" style={{ color: COLORS.textMuted }}>Last updated: 2 min ago</span>
                </div>

                {/* Status nav cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {STATUS_META.map((s) => {
                        const active = status === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setStatus(s.key)}
                                className="rounded-xl text-left flex items-center gap-3"
                                style={{
                                    padding: '14px 16px',
                                    border: `1px solid ${active ? '#d4d4d8' : COLORS.cardBorder}`,
                                    background: active ? '#f4f4f5' : '#fff',
                                    transition: 'border-color .15s, background .15s',
                                }}
                            >
                                <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 40, height: 40, background: `${s.color}14`, color: s.color }}>
                                    <Icon name={s.icon as never} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold leading-tight" style={{ color: COLORS.text }}>{s.label}</p>
                                    <p className="text-xs leading-tight truncate" style={{ color: COLORS.textMuted, marginTop: 3 }}>{s.sub}</p>
                                </div>
                                <span className="font-semibold shrink-0" style={{ color: COLORS.text, fontSize: 26, lineHeight: 1 }}>{statusCounts[s.key]}</span>
                                <Icon name="chevron-right" className="shrink-0" style={{ color: '#c4c4cc' }} />
                            </button>
                        );
                    })}
                </div>

                {/* Grouped action cards */}
                <div className="flex flex-col gap-4 pb-10">
                    {groups.length === 0 && (
                        <Card className="p-10 text-center">
                            <p className="text-sm" style={{ color: COLORS.textMuted }}>
                                {status === 'unresolved'
                                    ? 'Nothing needs your attention here. The agents are all caught up. 🎉'
                                    : status === 'pending'
                                    ? 'Nothing is waiting on more info right now.'
                                    : 'No resolved items in this view yet.'}
                            </p>
                        </Card>
                    )}
                    {groups.map((g) => (
                        <GroupCard
                            key={g.key}
                            meta={GROUP_META[g.key]}
                            items={g.items}
                            status={status}
                            onReview={() => setModal({ group: g.key, ids: g.items.map((i) => i.id), index: 0 })}
                            onReviewLine={(idx) => setModal({ group: g.key, ids: g.items.map((i) => i.id), index: idx })}
                        />
                    ))}
                </div>
            </div>

            {modal && current && (
                <ReviewModal
                    title={GROUP_META[modal.group].title}
                    color={GROUP_META[modal.group].color}
                    index={modal.index}
                    total={modal.ids.length}
                    item={current}
                    onClose={() => setModal(null)}
                    onResolve={(label) => { setItemStatus(current.id, 'resolved'); toast.success(label); }}
                    onDismiss={() => { removeItem(current.id); toast.success(`Dismissed: ${current.title}`); advanceOnly(); }}
                    onReopen={() => { setItemStatus(current.id, 'unresolved'); toast.success(`Reopened: ${current.title}`); advanceOnly(); }}
                    onNext={advanceOnly}
                />
            )}
        </div>
    );
}

function GroupCard({
    meta, items, status, onReview, onReviewLine,
}: {
    meta: { title: string; sub: string; icon: string; color: string };
    items: ReviewItem[];
    status: Status;
    onReview: () => void;
    onReviewLine: (index: number) => void;
}) {
    const count = items.length;
    const cta = status === 'resolved' ? (count > 1 ? 'View all' : 'View') : count > 1 ? 'Review all' : 'Review';
    const lineCta = status === 'resolved' ? 'View' : 'Review';
    return (
        <Card className="p-5">
            <div className="flex items-center gap-3">
                <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 38, height: 38, background: `${meta.color}1a`, color: meta.color }}>
                    <Icon name={meta.icon as never} />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{meta.title}</p>
                        <span className="rounded-full px-2 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>{count}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{meta.sub}</p>
                </div>
                <Button appearance="primary" onClick={onReview}>{cta}</Button>
            </div>

            {/* preview list */}
            <div className="flex flex-col mt-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                {items.map((it, idx) => (
                    <div key={it.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                        <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 26, height: 26, background: '#f1f1f3', color: '#52525b' }}>
                            <Icon name={it.icon as never} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <AgreementChip id={it.agreement} />
                                <p className="text-sm truncate" style={{ color: COLORS.text }}>{it.title}</p>
                            </div>
                            <p className="text-xs truncate" style={{ color: COLORS.textMuted, marginTop: 2 }}>{it.sub}</p>
                        </div>
                        {it.amount && (
                            <span className="text-sm shrink-0" style={{ color: it.amountNegative ? '#dc2626' : COLORS.text }}>{it.amount}</span>
                        )}
                        <button
                            onClick={() => onReviewLine(idx)}
                            className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                            style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, background: '#fff' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                        >
                            {lineCta} <Icon name="chevron-right" />
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
}

type ExecStep = { label: string; status: 'todo' | 'running' | 'done' };
interface ExecState {
    action: string;
    steps: ExecStep[];
    phase: 'running' | 'done';
    result: string;
}

function ReviewModal({
    title, color, index, total, item, onClose, onResolve, onDismiss, onReopen, onNext,
}: {
    title: string;
    color: string;
    index: number;
    total: number;
    item: ReviewItem;
    onClose: () => void;
    onResolve: (label: string) => void;
    onDismiss: () => void;
    onReopen: () => void;
    onNext: () => void;
}) {
    const conf = confColors[item.confidence];
    const isLast = index + 1 >= total;
    const suggestions = suggestionsFor(item);
    const [exec, setExec] = useState<ExecState | null>(null);

    // reset the execution state when moving to a different item
    useEffect(() => {
        setExec(null);
    }, [item.id]);

    function runAction(action: string) {
        const steps: ExecStep[] = [
            { label: 'Reviewing the details', status: 'todo' },
            { label: action, status: 'todo' },
            { label: 'Posting and logging the result', status: 'todo' },
        ];
        setExec({ action, steps, phase: 'running', result: `“${action}” — completed and logged to the audit trail.` });
        let i = 0;
        const tick = () => {
            setExec((prev) => {
                if (!prev) return prev;
                const next = prev.steps.map((s, idx): ExecStep => (idx < i ? { ...s, status: 'done' } : idx === i ? { ...s, status: 'running' } : s));
                return { ...prev, steps: next };
            });
            i++;
            if (i <= steps.length) {
                setTimeout(tick, 650);
            } else {
                setExec((prev) => (prev ? { ...prev, phase: 'done', steps: prev.steps.map((s) => ({ ...s, status: 'done' as const })) } : prev));
                onResolve(action);
            }
        };
        setTimeout(tick, 300);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full flex flex-col anim-in"
                style={{ maxWidth: 600, maxHeight: '86vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base font-semibold truncate" style={{ color: COLORS.text }}>{title}</span>
                        {total > 1 && (
                            <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>{index + 1} of {total}</span>
                        )}
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>

                {/* progress dots */}
                {total > 1 && (
                    <div className="flex items-center gap-1.5 px-5 pt-3">
                        {Array.from({ length: total }).map((_, i) => (
                            <span key={i} className="rounded-full" style={{ height: 4, flex: 1, background: i <= index ? color : '#ececed' }} />
                        ))}
                    </div>
                )}

                {/* body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <AgreementChip id={item.agreement} className="!text-xs" />
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

                    {item.totalLine && (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mt-1" style={{ background: '#fafafa' }}>
                            <span className="text-sm flex items-center gap-2" style={{ color: COLORS.textMuted }}><Icon name="document" /> Multiple invoice match</span>
                            <span className="text-sm font-medium" style={{ color: COLORS.text }}>{item.totalLine}</span>
                        </div>
                    )}

                    {item.body && <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>{item.body}</p>}

                    {!exec && item.status === 'unresolved' && item.callout && item.callout.text && (
                        <div className="rounded-lg p-3 mt-3" style={{ background: '#fdf8ec', border: '1px solid #f3e6c0' }}>
                            <p className="text-sm" style={{ color: '#7a5b13' }}>{item.callout.text}</p>
                        </div>
                    )}

                    {/* execution: plan → doing → done */}
                    {exec && (
                        <div className="rounded-xl p-4 mt-3" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fcfcfd' }}>
                            <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                <Icon name="ai-stars" /> {exec.phase === 'done' ? 'Here’s what I did' : 'Working on it'}
                            </p>
                            <div className="flex flex-col gap-2.5">
                                {exec.steps.map((s, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <ExecMarker status={s.status} index={i + 1} />
                                        <span className="text-sm" style={{ color: s.status === 'todo' ? COLORS.textMuted : COLORS.text }}>{s.label}</span>
                                    </div>
                                ))}
                            </div>
                            {exec.phase === 'done' && (
                                <div className="mt-4 rounded-lg px-3 py-2.5 text-sm flex items-start gap-2" style={{ background: '#ecfdf5', color: '#065f46' }}>
                                    <Icon name="circle-tick" /> <span>{exec.result}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* footer */}
                <div className="px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    {exec ? (
                        <div className="flex items-center justify-between">
                            {exec.phase === 'running' ? (
                                <span className="text-sm flex items-center gap-2" style={{ color: COLORS.textMuted }}>
                                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    Carrying out your choice…
                                </span>
                            ) : (
                                <>
                                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{isLast ? 'Last item in this group' : `${total - index - 1} more after this`}</span>
                                    <Button appearance="primary" onClick={onNext}>{isLast ? 'Finish & close' : 'Continue'}</Button>
                                </>
                            )}
                        </div>
                    ) : item.status === 'resolved' ? (
                        <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: COLORS.textMuted }}>Already resolved</span>
                            <div className="flex gap-2">
                                <Button onClick={onReopen}>Reopen</Button>
                                <Button appearance="primary" onClick={onNext}>{isLast ? 'Done' : 'Next'}</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                    <Icon name="ai-stars" /> Suggested next step{suggestions.length > 1 ? 's' : ''}
                                </p>
                                <span className="text-xs" style={{ color: COLORS.textMuted }}>
                                    {isLast ? 'Last item in this group' : `${total - index - 1} more after this`}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {suggestions.map((s, i) => (
                                    <Button key={s} appearance={i === 0 ? 'primary' : 'default'} onClick={() => runAction(s)}>{s}</Button>
                                ))}
                                <button onClick={onDismiss} className="ml-auto text-sm" style={{ color: COLORS.textMuted }}>Dismiss</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ExecMarker({ status, index }: { status: ExecStep['status']; index: number }) {
    if (status === 'done')
        return (
            <span className="flex items-center justify-center shrink-0 rounded-full text-white" style={{ width: 20, height: 20, background: '#16a34a', fontSize: 12 }}>
                <Icon name="tick" />
            </span>
        );
    if (status === 'running')
        return <span className="shrink-0 rounded-full border-2 animate-spin" style={{ width: 20, height: 20, borderColor: '#ff7a2f', borderTopColor: 'transparent' }} />;
    return (
        <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 20, height: 20, border: '1.5px solid #cfcfd6', color: '#9b9ba4', fontSize: 11 }}>
            {index}
        </span>
    );
}
