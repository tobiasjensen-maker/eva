import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';

// ---- Praksis / AO-house task management ------------------------------------
// The firm's overview across every client company: what needs doing, when, and
// by whom — including EVA, which now takes over a growing share of the work and
// hands finished drafts back for the accountant's sign-off. Overview-first;
// following what EVA did is a first-class part of that overview.

// Human statuses + EVA's own states (running / drafted-for-review / auto-done).
type TStatus = 'todo' | 'in-progress' | 'waiting' | 'review' | 'done' | 'eva-running' | 'eva-review' | 'eva-done';
type TPriority = 'high' | 'medium' | 'low';
type Bucket = 'overdue' | 'today' | 'week' | 'later';
const isEva = (s: TStatus) => s.startsWith('eva-');

interface Task {
    id: string;
    title: string;      // task type
    company: string;    // client
    accountant: string; // responsible / supervising human
    dueLabel: string;
    bucket: Bucket;
    status: TStatus;
    priority: TPriority;
}

const ACCOUNTANTS = ['Mette Sørensen', 'Jonas Vestergaard', 'Sofie Lund', 'Anders Holm', 'Camilla Berg'];
const COMPANIES = ['Nordic Build ApS', 'Café Solsikke', 'Tech Equipment AS', 'Office Supplies Co', 'Digital Marketing Pro', 'Cloud Hosting Ltd', 'Bryg & Co ApS', 'Lys Design', 'Fjord Fitness', 'Aarhus Tandklinik'];

const TSTATUS: Record<TStatus, { label: string; bg: string; fg: string; dot: string }> = {
    'todo': { label: 'Not started', bg: '#f1f1f3', fg: '#52525b', dot: '#a8a8b0' },
    'in-progress': { label: 'In progress', bg: '#eef4fb', fg: '#2f6fb0', dot: '#4c6ef5' },
    'waiting': { label: 'Waiting on client', bg: '#fbf3e0', fg: '#92710f', dot: '#b9842b' },
    'review': { label: 'In review', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'done': { label: 'Done', bg: '#e9f7ef', fg: '#15803d', dot: '#16a34a' },
    'eva-running': { label: 'EVA working', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'eva-review': { label: 'EVA drafted — review', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'eva-done': { label: 'Auto-completed by EVA', bg: '#eef7ef', fg: '#15803d', dot: '#16a34a' },
};
const HUMAN_STATUSES: TStatus[] = ['todo', 'in-progress', 'waiting', 'review', 'done'];
const TPRIO: Record<TPriority, { label: string; color: string }> = {
    high: { label: 'High', color: '#dc2626' },
    medium: { label: 'Medium', color: '#b9842b' },
    low: { label: 'Low', color: '#a8a8b0' },
};
const BUCKETS: { key: Bucket; label: string }[] = [
    { key: 'overdue', label: 'Overdue' },
    { key: 'today', label: 'Due today' },
    { key: 'week', label: 'Due this week' },
    { key: 'later', label: 'Later' },
];
const dueColor = (b: Bucket) => (b === 'overdue' ? '#dc2626' : b === 'today' ? '#b9842b' : COLORS.textMuted);

let seq = 0;
const T = (title: string, company: string, accountant: string, dueLabel: string, bucket: Bucket, status: TStatus, priority: TPriority): Task =>
    ({ id: `t${seq++}`, title, company, accountant, dueLabel, bucket, status, priority });

const TASKS: Task[] = [
    // EVA has drafted these and handed them back for sign-off
    T('VAT return — Q1', 'Nordic Build ApS', 'Mette Sørensen', 'Due today', 'today', 'eva-review', 'high'),
    T('Bank reconciliation', 'Cloud Hosting Ltd', 'Anders Holm', 'Today', 'today', 'eva-review', 'medium'),
    T('Supplier invoice approval', 'Digital Marketing Pro', 'Mette Sørensen', 'Today', 'today', 'eva-review', 'medium'),
    // EVA is working on these right now
    T('Missing receipts (5)', 'Tech Equipment AS', 'Jonas Vestergaard', 'Overdue 3 days', 'overdue', 'eva-running', 'medium'),
    T('Debtor follow-up', 'Bryg & Co ApS', 'Jonas Vestergaard', 'In 2 days', 'week', 'eva-running', 'low'),
    T('Month-end close', 'Fjord Fitness', 'Anders Holm', 'In 6 days', 'week', 'eva-running', 'medium'),
    // EVA already completed these autonomously
    T('Missing receipts (3)', 'Lys Design', 'Sofie Lund', 'Done today', 'today', 'eva-done', 'medium'),
    T('Payroll run — June', 'Café Solsikke', 'Sofie Lund', 'Done today', 'week', 'eva-done', 'medium'),
    T('Bank reconciliation', 'Nordic Build ApS', 'Mette Sørensen', 'Done yesterday', 'week', 'eva-done', 'low'),
    // Still with the team
    T('Month-end close', 'Café Solsikke', 'Sofie Lund', 'Overdue 1 day', 'overdue', 'waiting', 'high'),
    T('Payroll run — June', 'Office Supplies Co', 'Camilla Berg', 'Today', 'today', 'todo', 'high'),
    T('Quarterly report', 'Lys Design', 'Sofie Lund', 'In 3 days', 'week', 'in-progress', 'medium'),
    T('VAT return — Q1', 'Fjord Fitness', 'Anders Holm', 'In 3 days', 'week', 'todo', 'high'),
    T('Month-end close', 'Aarhus Tandklinik', 'Camilla Berg', 'In 4 days', 'week', 'todo', 'medium'),
    T('Annual report draft', 'Tech Equipment AS', 'Jonas Vestergaard', 'In 9 days', 'later', 'todo', 'high'),
    T('Year-end close', 'Office Supplies Co', 'Camilla Berg', 'In 12 days', 'later', 'todo', 'medium'),
    T('Supplier invoice approval', 'Cloud Hosting Ltd', 'Anders Holm', 'In 8 days', 'later', 'todo', 'low'),
    T('VAT reconciliation', 'Digital Marketing Pro', 'Mette Sørensen', 'In 10 days', 'later', 'todo', 'low'),
    T('Debtor follow-up', 'Aarhus Tandklinik', 'Camilla Berg', 'In 5 days', 'week', 'todo', 'low'),
    T('Payroll run — June', 'Bryg & Co ApS', 'Jonas Vestergaard', 'In 7 days', 'week', 'todo', 'high'),
];

// What EVA did on a task — shown in the "See what EVA did" trace.
function evaStepsFor(title: string): string[] {
    const s = title.toLowerCase();
    if (s.includes('vat return')) return ['Pulled the period’s VAT accounts', 'Reconciled against the calculation', 'Drafted the return for SKAT', 'Flagged 1 line for your confirmation'];
    if (s.includes('vat')) return ['Pulled the VAT account balances', 'Compared against the calculation', 'Prepared a discrepancy report'];
    if (s.includes('bank')) return ['Imported the bank statement', 'Matched 142 of 150 lines', 'Booked the matched entries', 'Left 8 ambiguous lines for you'];
    if (s.includes('receipt')) return ['Detected the entries missing a receipt', 'Requested them from the client', 'Set a 3-day follow-up'];
    if (s.includes('debtor') || s.includes('reminder')) return ['Found the overdue invoices', 'Drafted a reminder per customer', 'Queued them, logged a note on each'];
    if (s.includes('supplier') || s.includes('invoice')) return ['Read the supplier invoice', 'Validated the supplier and amounts', 'Checked for duplicates', 'Prepared it for approval'];
    if (s.includes('close')) return ['Ran completeness checks', 'Reconciled the control accounts', 'Generated the close checklist', 'Flagged 2 items for review'];
    if (s.includes('payroll')) return ['Gathered hours and salaries', 'Ran the payroll calculation', 'Prepared the journals', 'Validated — 0 discrepancies'];
    return ['Read the source data', 'Completed the task', 'Prepared it for your review'];
}
function evaDoingFor(title: string): string {
    const s = title.toLowerCase();
    if (s.includes('vat')) return 'preparing the VAT return';
    if (s.includes('bank')) return 'reconciling the bank feed';
    if (s.includes('receipt')) return 'chasing the missing receipts';
    if (s.includes('debtor') || s.includes('reminder')) return 'drafting the reminders';
    if (s.includes('supplier') || s.includes('invoice')) return 'validating the invoice';
    if (s.includes('close')) return 'running the month-end close';
    if (s.includes('payroll')) return 'running payroll';
    return 'working on it';
}

type GroupBy = 'accountant' | 'company' | 'deadline' | 'status';

function SectionCard({ title, count, right, accent, children }: { title: ReactNode; count?: number; right?: ReactNode; accent?: string; children: ReactNode }) {
    return (
        <Card className="overflow-hidden" style={accent ? { borderColor: accent } : undefined}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, background: accent ? `${accent}0d` : undefined }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">{title}{count !== undefined && <span className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>· {count}</span>}</div>
                {right}
            </div>
            {children}
        </Card>
    );
}

function PopMenu({ trigger, items }: { trigger: ReactNode; items: { label: string; onClick: () => void; active?: boolean; mark?: ReactNode }[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>{trigger}</button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1 rounded-xl bg-white py-1" style={{ minWidth: 190, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.16)' }}>
                        {items.map((it) => (
                            <button key={it.label} onClick={() => { setOpen(false); it.onClick(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm"
                                style={{ color: COLORS.text }} onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                {it.mark ?? <span style={{ width: 14 }}>{it.active ? <Icon name="tick" style={{ color: '#16a34a' }} /> : null}</span>}
                                <span className="flex-1">{it.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

const PURPLE = '#7c3aed';

export default function TaskManagementView() {
    const { t } = useLang();
    const [tasks, setTasks] = useState<Task[]>(TASKS);
    const [groupBy, setGroupBy] = useState<GroupBy>('accountant');
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState<Set<TStatus>>(new Set());
    const [trace, setTrace] = useState<Task | null>(null);

    const patch = (id: string, p: Partial<Task>) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const setStatus = (id: string, s: TStatus) => patch(id, { status: s });
    const reassign = (id: string, a: string) => patch(id, { accountant: a });
    const approve = (id: string) => patch(id, { status: 'eva-done' });
    const sendBack = (id: string) => patch(id, { status: 'review' });
    // Hand a human task to EVA: it starts working, then hands a draft back.
    function handToEva(id: string) {
        patch(id, { status: 'eva-running' });
        setTimeout(() => patch(id, { status: 'eva-review' }), 1800);
    }
    const toggleStatusF = (s: TStatus) => setStatusF((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

    const ql = q.trim().toLowerCase();
    const matchQ = (x: Task) => !ql || t(x.title).toLowerCase().includes(ql) || x.company.toLowerCase().includes(ql) || x.accountant.toLowerCase().includes(ql);
    const all = tasks.filter(matchQ);

    const evaReview = all.filter((x) => x.status === 'eva-review');
    const evaRunning = all.filter((x) => x.status === 'eva-running');
    const evaDone = all.filter((x) => x.status === 'eva-done');

    // --- overview KPIs ---
    const activeAll = tasks.filter((x) => x.status !== 'done' && x.status !== 'eva-done');
    const evaAll = tasks.filter((x) => isEva(x.status));
    const automatedPct = tasks.length ? Math.round((evaAll.length / tasks.length) * 100) : 0;
    const overdue = activeAll.filter((x) => x.bucket === 'overdue');
    const kpis = [
        { label: t('Open tasks'), value: String(activeAll.length), sub: t('across {n} companies').replace('{n}', String(COMPANIES.length)), color: COLORS.text, accent: '' },
        { label: t('Handled by EVA'), value: String(evaAll.length), sub: t('{n}% of the workload').replace('{n}', String(automatedPct)), color: '#16a34a', accent: '' },
        { label: t('Ready for your review'), value: String(tasks.filter((x) => x.status === 'eva-review').length), sub: t('EVA drafts to approve'), color: PURPLE, accent: PURPLE },
        { label: t('Overdue'), value: String(overdue.length), sub: t('need attention'), color: '#dc2626', accent: '#dc2626' },
    ];

    // --- human tasks (everything EVA hasn't taken) grouped by the chosen dimension ---
    const human = all.filter((x) => !isEva(x.status) && (statusF.size === 0 || statusF.has(x.status)));
    const order = groupBy === 'accountant' ? ACCOUNTANTS : groupBy === 'company' ? COMPANIES : groupBy === 'status' ? HUMAN_STATUSES : BUCKETS.map((b) => b.key);
    const keyOf = (x: Task) => (groupBy === 'accountant' ? x.accountant : groupBy === 'company' ? x.company : groupBy === 'status' ? x.status : x.bucket);
    const groups = (order as string[]).map((k) => ({ key: k, items: human.filter((x) => keyOf(x) === k) })).filter((g) => g.items.length > 0);

    const groupTitle = (k: string): ReactNode => {
        if (groupBy === 'accountant' || groupBy === 'company') return <><ClientAvatar name={k} size={22} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{k}</span></>;
        if (groupBy === 'status') return <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.text }}><span className="rounded-full" style={{ width: 8, height: 8, background: TSTATUS[k as TStatus].dot }} />{t(TSTATUS[k as TStatus].label)}</span>;
        return <span className="text-sm font-semibold" style={{ color: k === 'overdue' ? '#dc2626' : COLORS.text }}>{t(BUCKETS.find((b) => b.key === k)!.label)}</span>;
    };

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Task Management')} showScope={false} right={<Button appearance="primary"><Icon name="circle-plus" /> {t('New task')}</Button>} />
            <div className="mx-auto px-8 pt-5 pb-10" style={{ maxWidth: 1040 }}>
                {/* overview KPIs */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {kpis.map((k) => {
                        const on = k.accent && Number(k.value) > 0;
                        return (
                            <div key={k.label} className="rounded-xl p-4" style={{ background: on ? `${k.accent}0d` : '#fff', border: `1px solid ${on ? `${k.accent}55` : COLORS.cardBorder}` }}>
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>{k.label}</p>
                                <p className="text-2xl font-semibold leading-tight mt-1" style={{ color: k.color }}>{k.value}</p>
                                <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{k.sub}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-4">
                    {/* Ready for your review — EVA handed these back */}
                    {evaReview.length > 0 && (
                        <SectionCard accent={PURPLE} title={<span className="flex items-center gap-2"><Orb size={18} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Ready for your review')}</span></span>} count={evaReview.length}>
                            {evaReview.map((x, i) => (
                                <div key={x.id} className="flex items-center gap-3 p-4" style={i === evaReview.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <ClientAvatar name={x.company} size={30} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{t(x.title)}</p>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{x.company} · <span style={{ color: PURPLE, fontWeight: 500 }}>{t('EVA drafted this')}</span></p>
                                    </div>
                                    <button onClick={() => setTrace(x)} className="text-xs font-medium shrink-0 flex items-center gap-1" style={{ color: '#4456c7' }}><Icon name="search" /> {t('See what EVA did')}</button>
                                    <Button onClick={() => setStatus(x.id, 'review')}>{t('Take over')}</Button>
                                    <Button appearance="primary" onClick={() => approve(x.id)}><Icon name="circle-tick" /> {t('Approve')}</Button>
                                </div>
                            ))}
                        </SectionCard>
                    )}

                    {/* EVA is working on these now */}
                    {evaRunning.length > 0 && (
                        <SectionCard title={<span className="flex items-center gap-2"><Orb size={18} thinking /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('EVA is handling')}</span></span>} count={evaRunning.length}>
                            {evaRunning.map((x, i) => (
                                <div key={x.id} className="flex items-center gap-3 p-4" style={i === evaRunning.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <ClientAvatar name={x.company} size={30} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{t(x.title)}</p>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{x.company} · {t('EVA is {doing}').replace('{doing}', t(evaDoingFor(x.title)))}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0" style={{ color: PURPLE }}><span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> {t('Working')}</span>
                                    <button onClick={() => setTrace(x)} className="text-xs font-medium shrink-0 flex items-center gap-1" style={{ color: '#4456c7' }}><Icon name="search" /> {t('Follow')}</button>
                                </div>
                            ))}
                        </SectionCard>
                    )}

                    {/* Handled by your team — grouped, with a Hand-to-EVA action */}
                    <div className="pt-2">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <SegmentedTabs value={groupBy} onChange={(v) => setGroupBy(v as GroupBy)} options={[
                                { value: 'accountant', label: t('By accountant') },
                                { value: 'company', label: t('By company') },
                                { value: 'deadline', label: t('By deadline') },
                                { value: 'status', label: t('By status') },
                            ]} />
                            <div className="relative flex-1" style={{ minWidth: 200 }}>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search tasks…')} className="w-full rounded-lg pl-9 pr-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-4">
                            {HUMAN_STATUSES.map((s) => {
                                const on = statusF.has(s); const st = TSTATUS[s];
                                return (
                                    <button key={s} onClick={() => toggleStatusF(s)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ border: `1px solid ${on ? st.fg : COLORS.cardBorder}`, background: on ? st.bg : '#fff', color: on ? st.fg : COLORS.textMuted }}>
                                        <span className="rounded-full" style={{ width: 6, height: 6, background: st.dot }} /> {t(st.label)}
                                    </button>
                                );
                            })}
                            {(statusF.size > 0 || q) && <button onClick={() => { setStatusF(new Set()); setQ(''); }} className="text-xs font-medium ml-1" style={{ color: '#4456c7' }}>{t('Clear filters')}</button>}
                            <span className="ml-auto text-xs" style={{ color: COLORS.textMuted }}>{t('{n} still with the team').replace('{n}', String(human.length))}</span>
                        </div>

                        {groups.length === 0 ? (
                            <Card className="p-10 text-center"><p className="text-sm" style={{ color: COLORS.textMuted }}>{t('EVA has taken everything here — nothing left with the team. 🎉')}</p></Card>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {groups.map((g) => {
                                    const od = g.items.filter((x) => x.bucket === 'overdue').length;
                                    return (
                                        <SectionCard key={g.key} title={<span className="flex items-center gap-2 min-w-0">{groupTitle(g.key)}</span>} count={g.items.length} right={od > 0 ? <span className="text-xs font-medium shrink-0" style={{ color: '#dc2626' }}>{od} {t('overdue')}</span> : undefined}>
                                            {g.items.map((x, i) => (
                                                <TaskRow key={x.id} task={x} groupBy={groupBy} last={i === g.items.length - 1} onStatus={(s) => setStatus(x.id, s)} onReassign={(a) => reassign(x.id, a)} onHandToEva={() => handToEva(x.id)} />
                                            ))}
                                        </SectionCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Completed by EVA — the audit trail of what EVA did */}
                    {evaDone.length > 0 && (
                        <SectionCard title={<span className="flex items-center gap-2"><Icon name="circle-tick" style={{ color: '#16a34a' }} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Completed by EVA')}</span></span>} count={evaDone.length}>
                            {evaDone.map((x, i) => (
                                <div key={x.id} className="flex items-center gap-3 p-4" style={i === evaDone.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <span style={{ opacity: 0.6 }}><ClientAvatar name={x.company} size={30} /></span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{t(x.title)}</p>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{x.company} · {t('Auto-completed by EVA')} · {t(x.dueLabel)}</p>
                                    </div>
                                    <button onClick={() => setTrace(x)} className="text-xs font-medium shrink-0 flex items-center gap-1" style={{ color: '#4456c7' }}><Icon name="search" /> {t('See what EVA did')}</button>
                                </div>
                            ))}
                        </SectionCard>
                    )}
                </div>
            </div>

            {trace && <EvaTraceModal task={trace} onClose={() => setTrace(null)} onApprove={trace.status === 'eva-review' ? () => { approve(trace.id); setTrace(null); } : undefined} onSendBack={trace.status === 'eva-review' ? () => { sendBack(trace.id); setTrace(null); } : undefined} />}
        </div>
    );
}

function TaskRow({ task, groupBy, last, onStatus, onReassign, onHandToEva }: { task: Task; groupBy: GroupBy; last: boolean; onStatus: (s: TStatus) => void; onReassign: (a: string) => void; onHandToEva: () => void }) {
    const { t } = useLang();
    const st = TSTATUS[task.status];
    const prio = TPRIO[task.priority];
    const secondary: ReactNode[] = [];
    if (groupBy !== 'company') secondary.push(<span key="c">{task.company}</span>);
    secondary.push(<span key="d" style={{ color: dueColor(task.bucket), fontWeight: 500 }}>{t(task.dueLabel)}</span>);

    return (
        <div className="flex items-center gap-3 p-4" style={last ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <ClientAvatar name={task.company} size={30} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{t(task.title)}</p>
                <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                    {secondary.map((n, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <span>·</span>}{n}</span>)}
                </p>
            </div>

            {/* hand this task to EVA */}
            <button onClick={onHandToEva} title={t('Hand this task to EVA')} className="inline-flex items-center gap-1.5 rounded-full font-semibold shrink-0" style={{ padding: '4px 10px 4px 6px', fontSize: 12, background: '#f3f0fb', color: '#6d28d9', border: '1px solid #e6dcfb' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ece5fb')} onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f0fb')}>
                <Orb size={14} /> {t('Hand to EVA')}
            </button>

            {groupBy !== 'accountant' && (
                <PopMenu
                    trigger={<span className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5" style={{ border: `1px solid ${COLORS.cardBorder}` }} title={t('Responsible: {name}').replace('{name}', task.accountant)}><ClientAvatar name={task.accountant} size={18} /><span className="text-xs hidden lg:inline" style={{ color: COLORS.text }}>{task.accountant.split(' ')[0]}</span></span>}
                    items={ACCOUNTANTS.map((a) => ({ label: a, active: a === task.accountant, mark: <ClientAvatar name={a} size={16} />, onClick: () => onReassign(a) }))}
                />
            )}
            <span title={`${t('Priority')}: ${t(prio.label)}`} className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: prio.color }} />
            <PopMenu
                trigger={<span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.fg }}><span className="rounded-full" style={{ width: 6, height: 6, background: st.dot }} /> {t(st.label)}<Icon name="chevron-down" /></span>}
                items={HUMAN_STATUSES.map((s) => ({ label: t(TSTATUS[s].label), active: s === task.status, onClick: () => onStatus(s) }))}
            />
        </div>
    );
}

// "What did EVA do" — the trace that keeps EVA's work followable.
function EvaTraceModal({ task, onClose, onApprove, onSendBack }: { task: Task; onClose: () => void; onApprove?: () => void; onSendBack?: () => void }) {
    const { t } = useLang();
    const steps = evaStepsFor(task.title);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in" style={{ maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Orb size={22} />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{t(task.title)}</p>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{task.company} · {t('Supervised by {name}').replace('{name}', task.accountant)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>
                <div className="px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>{t('What EVA did')}</p>
                    <ol className="flex flex-col gap-2">
                        {steps.map((s, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 18, height: 18, background: '#eef7ef', color: '#15803d', fontSize: 11 }}><Icon name="tick" /></span>
                                <span className="text-sm" style={{ color: COLORS.text }}>{t(s)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('Full trace · you can always see what EVA did')}</span>
                    {onApprove ? (
                        <div className="flex gap-2">
                            {onSendBack && <Button onClick={onSendBack}>{t('Take over')}</Button>}
                            <Button appearance="primary" onClick={onApprove}><Icon name="circle-tick" /> {t('Approve')}</Button>
                        </div>
                    ) : (
                        <Button onClick={onClose}>{t('Close')}</Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// EVA "practice assistant" answers for the shell chat panel on the Task Management page.
export function tasksAnswer(q: string, lang: 'en' | 'da' = 'en'): string {
    const s = q.toLowerCase();
    const da = lang === 'da';
    const eva = TASKS.filter((x) => isEva(x.status));
    const review = TASKS.filter((x) => x.status === 'eva-review');
    const running = TASKS.filter((x) => x.status === 'eva-running');
    const open = TASKS.filter((x) => x.status !== 'done' && x.status !== 'eva-done');
    if (/eva|automat|take over|overtag|selv/.test(s)) {
        return da
            ? `EVA håndterer ${eva.length} opgaver lige nu — ${running.length} er i gang, ${review.length} er klar til din godkendelse, og resten er auto-fuldført. Det er ca. ${Math.round((eva.length / TASKS.length) * 100)}% af arbejdet.`
            : `EVA is handling ${eva.length} tasks right now — ${running.length} in progress, ${review.length} waiting on your approval, and the rest auto-completed. That's about ${Math.round((eva.length / TASKS.length) * 100)}% of the workload.`;
    }
    if (/review|approve|godkend|gennemgang/.test(s)) {
        const names = review.map((x) => `${x.title} (${x.company})`).join('; ');
        return da ? `${review.length} EVA-udkast venter på din godkendelse: ${names}.` : `${review.length} EVA drafts are waiting on your approval: ${names}. Open one to see exactly what EVA did.`;
    }
    if (/overdue|forsink|forfald/.test(s)) {
        const od = open.filter((x) => x.bucket === 'overdue');
        return da ? `${od.length} opgaver er forsinkede. EVA er allerede i gang med et par af dem.` : `${od.length} tasks are overdue — EVA has already picked up a couple of them.`;
    }
    if (/overload|plate|most|busy|mest|belast|hvem|who/.test(s)) {
        const counts: Record<string, number> = {};
        open.filter((x) => !isEva(x.status)).forEach((x) => { counts[x.accountant] = (counts[x.accountant] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return da ? `${top[0]} har flest opgaver tilbage (${top[1]}). Skal jeg tage nogen af dem?` : `${top[0]} has the most left on their plate (${top[1]}). Want me to take some of them?`;
    }
    return da
        ? 'Jeg kan give overblik over kontoret — hvad jeg selv håndterer, hvad der venter på din godkendelse, og hvad der stadig ligger hos teamet. Prøv “Hvad har EVA overtaget?”'
        : 'I can give you an overview of the office — what I’m handling, what’s waiting on your approval, and what’s still with the team. Try “What has EVA taken over?”';
}
