import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, CountBadge, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { SEED_DECISIONS, type DecisionItem } from '../day';
import { DecisionRow, DecisionReview } from './Decisions';

// ---- Praksis / AO-house task management ------------------------------------
// The firm's overview across every client company: what needs doing, when, and
// by whom — including EVA, which now takes over a growing share of the work and
// hands finished drafts back for the accountant's sign-off. Overview-first;
// following what EVA did is a first-class part of that overview.

// Human statuses + EVA's own states (running / drafted-for-review / auto-done).
export type TStatus = 'todo' | 'in-progress' | 'waiting' | 'review' | 'done' | 'eva-scheduled' | 'eva-running' | 'eva-review' | 'eva-done';
type TPriority = 'high' | 'medium' | 'low';
export type Bucket = 'overdue' | 'today' | 'week' | 'later';
export const isEva = (s: TStatus) => s.startsWith('eva-');

export interface Task {
    id: string;
    title: string;      // task type
    company: string;    // client
    accountant: string; // responsible / supervising human
    dueLabel: string;
    bucket: Bucket;
    status: TStatus;
    priority: TPriority;
    evaWhen?: string;   // when EVA is scheduled to run it (eva-scheduled)
}

const ME = 'Tobias Holm Jensen'; // the logged-in accountant (matches the sidebar profile)
const ACCOUNTANTS = [ME, 'Mette Sørensen', 'Jonas Vestergaard', 'Sofie Lund', 'Anders Holm', 'Camilla Berg'];
const COMPANIES = ['Nordic Build ApS', 'Café Solsikke', 'Tech Equipment AS', 'Office Supplies Co', 'Digital Marketing Pro', 'Cloud Hosting Ltd', 'Bryg & Co ApS', 'Lys Design', 'Fjord Fitness', 'Aarhus Tandklinik'];

export const TSTATUS: Record<TStatus, { label: string; bg: string; fg: string; dot: string }> = {
    'todo': { label: 'Not started', bg: '#f1f1f3', fg: '#52525b', dot: '#a8a8b0' },
    'in-progress': { label: 'In progress', bg: '#eef4fb', fg: '#2f6fb0', dot: '#4c6ef5' },
    'waiting': { label: 'Waiting on client', bg: '#fbf3e0', fg: '#92710f', dot: '#b9842b' },
    'review': { label: 'In review', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'done': { label: 'Done', bg: '#e9f7ef', fg: '#15803d', dot: '#16a34a' },
    'eva-scheduled': { label: 'Scheduled by EVA', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
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
export const dueColor = (b: Bucket) => (b === 'overdue' ? '#dc2626' : b === 'today' ? '#b9842b' : COLORS.textMuted);

let seq = 0;
const T = (title: string, company: string, accountant: string, dueLabel: string, bucket: Bucket, status: TStatus, priority: TPriority, evaWhen?: string): Task =>
    ({ id: `t${seq++}`, title, company, accountant, dueLabel, bucket, status, priority, evaWhen });

export const TASKS: Task[] = [
    // (EVA's drafts awaiting sign-off live in the shared decisions list — src/day.ts.)
    // EVA is working on these right now
    T('Missing receipts (5)', 'Tech Equipment AS', ME, 'Overdue 3 days', 'overdue', 'eva-running', 'medium'),
    T('Debtor follow-up', 'Bryg & Co ApS', 'Jonas Vestergaard', 'In 2 days', 'week', 'eva-running', 'low'),
    T('Month-end close', 'Fjord Fitness', 'Anders Holm', 'In 6 days', 'week', 'eva-running', 'medium'),
    // EVA has these scheduled to run soon
    T('Bank reconciliation', 'Café Solsikke', ME, 'Tonight', 'today', 'eva-scheduled', 'medium', 'Tonight at 22:00'),
    T('VAT return — Q1', 'Cloud Hosting Ltd', ME, 'Tomorrow', 'week', 'eva-scheduled', 'high', 'Tomorrow at 06:00'),
    T('Payroll run — June', 'Aarhus Tandklinik', 'Camilla Berg', 'In 2 days', 'week', 'eva-scheduled', 'medium', 'Fri at 06:00'),
    // EVA already completed these autonomously
    T('Bank reconciliation', 'Nordic Build ApS', ME, 'Done yesterday', 'week', 'eva-done', 'low'),
    T('Missing receipts (3)', 'Lys Design', 'Sofie Lund', 'Done today', 'today', 'eva-done', 'medium'),
    T('Payroll run — June', 'Café Solsikke', 'Sofie Lund', 'Done today', 'week', 'eva-done', 'medium'),
    // Still with the team
    T('Debtor follow-up', 'Café Solsikke', ME, 'Overdue 2 days', 'overdue', 'waiting', 'medium'),
    T('Payroll run — June', 'Office Supplies Co', ME, 'Today', 'today', 'todo', 'high'),
    T('Annual report draft', 'Nordic Build ApS', ME, 'In 3 days', 'week', 'in-progress', 'high'),
    T('VAT reconciliation', 'Digital Marketing Pro', ME, 'In 10 days', 'later', 'todo', 'low'),
    T('Month-end close', 'Café Solsikke', 'Sofie Lund', 'Overdue 1 day', 'overdue', 'waiting', 'high'),
    T('Quarterly report', 'Lys Design', 'Sofie Lund', 'In 3 days', 'week', 'in-progress', 'medium'),
    T('VAT return — Q1', 'Fjord Fitness', 'Anders Holm', 'In 3 days', 'week', 'todo', 'high'),
    T('Month-end close', 'Aarhus Tandklinik', 'Camilla Berg', 'In 4 days', 'week', 'todo', 'medium'),
    T('Annual report draft', 'Tech Equipment AS', 'Jonas Vestergaard', 'In 9 days', 'later', 'todo', 'high'),
    T('Year-end close', 'Office Supplies Co', 'Camilla Berg', 'In 12 days', 'later', 'todo', 'medium'),
    T('Supplier invoice approval', 'Cloud Hosting Ltd', 'Anders Holm', 'In 8 days', 'later', 'todo', 'low'),
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
// What EVA specifically needs the accountant to check on a drafted task.
function evaFlagFor(title: string): string {
    const s = title.toLowerCase();
    if (s.includes('vat return')) return 'One VAT line looks unusual (reverse-charge on an EU purchase) — confirm it before I file to SKAT.';
    if (s.includes('vat')) return 'Two VAT codes don’t reconcile by 340 kr — check before filing.';
    if (s.includes('bank')) return '8 of 150 transactions couldn’t be matched automatically — take a look before I book them.';
    if (s.includes('receipt')) return 'The client still hasn’t sent 2 of the receipts — decide whether to book without them.';
    if (s.includes('debtor') || s.includes('reminder')) return 'One customer is in a payment dispute — confirm before the reminder goes out.';
    if (s.includes('supplier') || s.includes('invoice')) return 'The amount is 12% above the usual for this supplier — confirm it’s correct.';
    if (s.includes('close')) return '2 accruals need your judgement before the period can be locked.';
    if (s.includes('payroll')) return 'One employee’s hours changed vs. last month — confirm before I run it.';
    return 'Review my work and approve, or take it over.';
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
                <div className="flex items-center gap-2 flex-1 min-w-0">{title}{count !== undefined && <CountBadge n={count} showZero />}</div>
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

// Work — the one place for work: what's on your plate and what EVA is handling now
// (Tasks), everything EVA has done (Activity), and what's automated (Routines).
export type WorkTab = 'tasks' | 'activity' | 'routines';

// The active routines' next runs — shown with EVA's scheduled tasks on the Routines tab.
const PLANNED_RUNS: { when: string; title: string; scope: string }[] = [
    { when: 'Tonight at 22:00', title: 'AI bank reconciliation', scope: 'All 40 of your clients' },
    { when: 'Every hour', title: 'Smart voucher creation', scope: 'New receipts and bills as they arrive' },
    { when: 'Tomorrow at 07:00', title: 'Supplier invoice processor', scope: '14 invoices waiting across 6 clients' },
    { when: '10 Oct at 06:00', title: 'VAT return auto-filing', scope: '12 clients due this quarter' },
];
// Order "when" labels in time: continuous first, then tonight, tomorrow, weekdays, dates.
const whenRank = (w: string) => {
    const day = /^Every/.test(w) ? 0 : /^Tonight/.test(w) ? 1 : /^Tomorrow/.test(w) ? 2 : /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(w) ? 3 : 4;
    return day * 10000 + Number((w.match(/(\d{2}):(\d{2})/) ?? ['', '0', '0']).slice(1).join(''));
};

export default function TaskManagementView({ tasks, setTasks, decisions, onResolveDecision, onAddDecision, tab, onTab, activityLog, routines, bare, onNewRoutine }: {
    tab: WorkTab;
    onTab: (t: WorkTab) => void;
    activityLog: ReactNode;   // the Activity tab (the embedded activity log)
    routines: ReactNode;      // the Routines tab (routine configuration)
    bare?: boolean;           // a routine is open — its detail takes the whole page
    onNewRoutine: () => void; // the header's New routine (opens the builder in the Routines tab)
    tasks: Task[];
    setTasks: Dispatch<SetStateAction<Task[]>>;
    decisions: DecisionItem[];
    onResolveDecision: (id: string, taken: 'confirm' | 'alt') => void;
    onAddDecision: (d: DecisionItem) => void;
}) {
    const { t } = useLang();
    const [groupBy, setGroupBy] = useState<GroupBy>('deadline');
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState<Set<TStatus>>(new Set());
    const [trace, setTrace] = useState<Task | null>(null);
    const [review, setReview] = useState<DecisionItem | null>(null);
    // Work is the logged-in accountant's own work (the whole office lives under Practice).
    const mine = true;

    const patch = (id: string, p: Partial<Task>) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const setStatus = (id: string, s: TStatus) => patch(id, { status: s });
    const reassign = (id: string, a: string) => patch(id, { accountant: a });
    function handToEva(id: string) {
        const task = tasks.find((x) => x.id === id);
        if (task) handTaskToEva(task, setTasks, onAddDecision);
    }
    const toggleStatusF = (s: TStatus) => setStatusF((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

    // Perspective — "My work" (the logged-in accountant) vs. the whole practice.
    const scoped = mine ? tasks.filter((x) => x.accountant === ME) : tasks;
    const ql = q.trim().toLowerCase();
    const matchQ = (x: Task) => !ql || t(x.title).toLowerCase().includes(ql) || x.company.toLowerCase().includes(ql) || x.accountant.toLowerCase().includes(ql);
    const all = scoped.filter(matchQ);

    // Ready for your review — the shared decisions, scoped like everything else here.
    const evaReview = decisions.filter((d) => !d.done && (!mine || d.accountant === ME) && (!ql || t(d.label).toLowerCase().includes(ql) || d.company.toLowerCase().includes(ql)));
    const evaRunning = all.filter((x) => x.status === 'eva-running');
    const evaScheduled = all.filter((x) => x.status === 'eva-scheduled');
    const evaDone = all.filter((x) => x.status === 'eva-done');

    // --- overview KPIs (on the perspective's scope) ---
    const activeAll = scoped.filter((x) => x.status !== 'done' && x.status !== 'eva-done');
    const evaAll = scoped.filter((x) => isEva(x.status));
    const automatedPct = scoped.length ? Math.round((evaAll.length / scoped.length) * 100) : 0;
    const overdue = activeAll.filter((x) => x.bucket === 'overdue');
    const companyCount = new Set(scoped.map((x) => x.company)).size;
    const kpis = [
        { label: t('Open tasks'), value: String(activeAll.length), sub: t(mine ? 'across {n} of your clients' : 'across {n} companies').replace('{n}', String(companyCount)), color: COLORS.text, accent: '' },
        { label: t('Handled by EVA'), value: String(evaAll.length), sub: t('{n}% of the workload').replace('{n}', String(automatedPct)), color: '#16a34a', accent: '' },
        { label: t('Ready for your review'), value: String(evaReview.length), sub: t('EVA drafts to approve'), color: PURPLE, accent: PURPLE },
        { label: t('Overdue'), value: String(overdue.length), sub: t('need attention'), color: '#dc2626', accent: '#dc2626' },
    ];

    // --- tasks still with a human, grouped (accountant grouping only in the practice view) ---
    const groupOptions: [GroupBy, string][] = mine
        ? [['deadline', 'By deadline'], ['company', 'By client'], ['status', 'By status']]
        : [['accountant', 'By accountant'], ['company', 'By company'], ['deadline', 'By deadline'], ['status', 'By status']];
    const effGroup: GroupBy = groupOptions.some(([k]) => k === groupBy) ? groupBy : 'deadline';
    const human = all.filter((x) => !isEva(x.status) && (statusF.size === 0 || statusF.has(x.status)));
    const order = effGroup === 'accountant' ? ACCOUNTANTS : effGroup === 'company' ? COMPANIES : effGroup === 'status' ? HUMAN_STATUSES : BUCKETS.map((b) => b.key);
    const keyOf = (x: Task) => (effGroup === 'accountant' ? x.accountant : effGroup === 'company' ? x.company : effGroup === 'status' ? x.status : x.bucket);
    const groups = (order as string[]).map((k) => ({ key: k, items: human.filter((x) => keyOf(x) === k) })).filter((g) => g.items.length > 0);

    const groupTitle = (k: string): ReactNode => {
        if (effGroup === 'accountant' || effGroup === 'company') return <><ClientAvatar name={k} size={22} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{k}</span></>;
        if (effGroup === 'status') return <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.text }}><span className="rounded-full" style={{ width: 8, height: 8, background: TSTATUS[k as TStatus].dot }} />{t(TSTATUS[k as TStatus].label)}</span>;
        return <span className="text-sm font-semibold" style={{ color: k === 'overdue' ? '#dc2626' : COLORS.text }}>{t(BUCKETS.find((b) => b.key === k)!.label)}</span>;
    };

    return (
        <div className={bare ? 'h-full' : 'h-full overflow-y-auto'}>
            {!bare && (
                <PageHeader
                    title={t('Work')}
                    showScope={false}
                    badge={<SegmentedTabs value={tab} onChange={(v) => onTab(v as WorkTab)} options={[{ value: 'tasks', label: t('Tasks') }, { value: 'activity', label: t('Activity') }, { value: 'routines', label: t('Routines') }]} />}
                    right={tab === 'tasks' ? <Button appearance="primary"><Icon name="circle-plus" /> {t('New task')}</Button>
                        : tab === 'routines' ? <Button appearance="primary" onClick={onNewRoutine}><Icon name="circle-plus" /> {t('New routine')}</Button> : undefined}
                />
            )}
            <div className={bare ? 'h-full' : 'mx-auto px-8 pt-5 pb-10'} style={bare ? undefined : { maxWidth: 1240 }}>
                {tab === 'activity' && activityLog}
                {tab === 'routines' && (
                    <div className="flex flex-col gap-6">
                        {/* What's planned and scheduled for EVA — specific tasks and the routines' next runs */}
                        <SectionCard title={<span className="flex items-center gap-2"><Orb size={18} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Scheduled for EVA')}</span></span>} count={evaScheduled.length + PLANNED_RUNS.length}>
                            {[
                                ...evaScheduled.map((x) => ({ key: x.id, when: x.evaWhen ?? '', title: t(x.title), sub: x.company, via: t('Scheduled task'), task: x as Task | undefined })),
                                ...PLANNED_RUNS.map((r) => ({ key: r.title, when: r.when, title: t(r.title), sub: t(r.scope), via: t('Routine'), task: undefined as Task | undefined })),
                            ].sort((a, b) => whenRank(a.when) - whenRank(b.when)).map((r, i, arr) => (
                                <div key={r.key} onClick={r.task ? () => setTrace(r.task!) : undefined} className={`flex items-center gap-3 p-4 ${r.task ? 'cursor-pointer' : ''}`} style={i === arr.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0" style={{ color: PURPLE, width: 150 }}><Icon name="time" /> {t(r.when)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{r.title}</p>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{r.sub}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: r.task ? '#f3f0fb' : '#f1f1f3', color: r.task ? PURPLE : '#52525b' }}>{r.via}</span>
                                    {r.task && <span className="text-xs font-medium shrink-0 flex items-center gap-1" style={{ color: '#4456c7' }}><Icon name="search" /> {t('See plan')}</span>}
                                </div>
                            ))}
                        </SectionCard>
                        {routines}
                    </div>
                )}
                {tab === 'tasks' && (<>

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
                            {evaReview.map((d, i) => <DecisionRow key={d.id} d={d} t={t} showOwner={!mine} last={i === evaReview.length - 1} onReview={() => setReview(d)} />)}
                        </SectionCard>
                    )}

                    {/* EVA is working on these now */}
                    {evaRunning.length > 0 && (
                        <SectionCard title={<span className="flex items-center gap-2"><Orb size={18} thinking /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('EVA is handling')}</span></span>} count={evaRunning.length}>
                            {evaRunning.map((x, i) => (
                                <div key={x.id} onClick={() => setTrace(x)} className="flex items-center gap-3 p-4 cursor-pointer" style={i === evaRunning.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
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

                    {/* the tasks still with a human — grouped, with a Hand-to-EVA action */}
                    <div className="pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>{t(mine ? 'On my plate' : 'Handled by your team')}</p>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <SegmentedTabs value={effGroup} onChange={(v) => setGroupBy(v as GroupBy)} options={groupOptions.map(([value, label]) => ({ value, label: t(label) }))} />
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
                            <span className="ml-auto text-xs" style={{ color: COLORS.textMuted }}>{t(mine ? '{n} on my plate' : '{n} still with the team').replace('{n}', String(human.length))}</span>
                        </div>

                        {groups.length === 0 ? (
                            <Card className="p-10 text-center"><p className="text-sm" style={{ color: COLORS.textMuted }}>{t(mine ? 'EVA has taken everything — nothing left on your plate. 🎉' : 'EVA has taken everything here — nothing left with the team. 🎉')}</p></Card>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {groups.map((g) => {
                                    const od = g.items.filter((x) => x.bucket === 'overdue').length;
                                    return (
                                        <SectionCard key={g.key} title={<span className="flex items-center gap-2 min-w-0">{groupTitle(g.key)}</span>} count={g.items.length} right={od > 0 ? <span className="text-xs font-medium shrink-0" style={{ color: '#dc2626' }}>{od} {t('overdue')}</span> : undefined}>
                                            {g.items.map((x, i) => (
                                                <TaskRow key={x.id} task={x} groupBy={effGroup} showAccountant={!mine && effGroup !== 'accountant'} last={i === g.items.length - 1} onStatus={(s) => setStatus(x.id, s)} onReassign={(a) => reassign(x.id, a)} onHandToEva={() => handToEva(x.id)} onOpen={() => setTrace(x)} />
                                            ))}
                                        </SectionCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* What EVA has already done lives in the Activity tab */}
                    {evaDone.length > 0 && (
                        <button onClick={() => onTab('activity')} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left" style={{ background: '#fff', border: `1px solid ${COLORS.cardBorder}` }}>
                            <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 30, height: 30, background: '#eef7ef', color: '#16a34a' }}><Icon name="circle-tick" /></span>
                            <span className="text-sm flex-1" style={{ color: COLORS.text }}>{t('EVA completed {n} tasks for you recently').replace('{n}', String(evaDone.length))}</span>
                            <span className="text-sm font-medium" style={{ color: '#4456c7' }}>{t('See all activity')} →</span>
                        </button>
                    )}
                </div>
                </>)}
            </div>

            {review && <DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken) => { onResolveDecision(review.id, taken); setReview(null); }} />}
            {trace && <TaskModal task={trace} onClose={() => setTrace(null)} onHandToEva={() => { handToEva(trace.id); setTrace(null); }} onDone={() => { setStatus(trace.id, 'done'); setTrace(null); }} />}
        </div>
    );
}

function TaskRow({ task, groupBy, showAccountant, last, onStatus, onReassign, onHandToEva, onOpen }: { task: Task; groupBy: GroupBy; showAccountant: boolean; last: boolean; onStatus: (s: TStatus) => void; onReassign: (a: string) => void; onHandToEva: () => void; onOpen: () => void }) {
    const { t } = useLang();
    const st = TSTATUS[task.status];
    const prio = TPRIO[task.priority];
    const secondary: ReactNode[] = [];
    if (groupBy !== 'company') secondary.push(<span key="c">{task.company}</span>);
    secondary.push(<span key="d" style={{ color: dueColor(task.bucket), fontWeight: 500 }}>{t(task.dueLabel)}</span>);

    return (
        <div className="flex items-center gap-3 p-4" style={last ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left" title={t('Open task')}>
                <ClientAvatar name={task.company} size={30} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate hover:underline" style={{ color: COLORS.text }}>{t(task.title)}</p>
                    <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                        {secondary.map((n, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <span>·</span>}{n}</span>)}
                    </p>
                </div>
            </button>

            {/* hand this task to EVA */}
            <button onClick={onHandToEva} title={t('Hand this task to EVA')} className="inline-flex items-center gap-1.5 rounded-full font-semibold shrink-0" style={{ padding: '4px 10px 4px 6px', fontSize: 12, background: '#f3f0fb', color: '#6d28d9', border: '1px solid #e6dcfb' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ece5fb')} onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f0fb')}>
                <Orb size={14} /> {t('Hand to EVA')}
            </button>

            {showAccountant && (
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

// What a task is — the description shown when you open it.
export function taskBriefFor(task: Task): string {
    const s = task.title.toLowerCase(), c = task.company;
    if (s.includes('payroll')) return `Run this month’s payroll for ${c}: collect hours and changes, calculate salaries and deductions, and post the salary journals.`;
    if (s.includes('vat return')) return `Prepare and file ${c}’s VAT return: reconcile the VAT accounts, check any unusual lines, and submit it to SKAT before the deadline.`;
    if (s.includes('vat')) return `Reconcile ${c}’s VAT accounts against the calculation and resolve any differences before the return is filed.`;
    if (s.includes('bank')) return `Match ${c}’s bank transactions to invoices and bills, book them, and resolve anything that can’t be matched.`;
    if (s.includes('receipt')) return `Collect the missing receipts from ${c} so every entry has its documentation.`;
    if (s.includes('debtor')) return `Follow up ${c}’s overdue customer invoices — send reminders and agree next steps with the client.`;
    if (s.includes('month-end')) return `Close ${c}’s books for the month: completeness checks, accruals, control-account reconciliations and sign-off.`;
    if (s.includes('year-end')) return `Close ${c}’s financial year: final adjustments, reconciliations and the year-end checklist.`;
    if (s.includes('annual report')) return `Draft ${c}’s annual report in the statutory format, ready for review and approval.`;
    if (s.includes('quarterly')) return `Prepare ${c}’s quarterly report with the key numbers and a short commentary.`;
    if (s.includes('supplier')) return `Validate and approve ${c}’s supplier invoices before they’re booked and paid.`;
    return `Complete this task for ${c}.`;
}

// Hand a task to EVA: it starts working, then returns the draft as a decision in the
// shared list — the same wherever it was handed over (Work or the Portfolio overview).
export function handTaskToEva(task: Task, setTasks: Dispatch<SetStateAction<Task[]>>, onAddDecision: (d: DecisionItem) => void) {
    setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, status: 'eva-running' } : x)));
    setTimeout(() => {
        setTasks((prev) => prev.filter((x) => x.id !== task.id));
        onAddDecision({
            id: `d-${task.id}`, company: task.company, accountant: task.accountant, label: task.title,
            question: evaFlagFor(task.title), recommend: 'Approve EVA’s draft.', confirm: 'Approve', alt: 'Take over',
            ack: 'Approved — done.', ackAlt: 'It’s back with you.', steps: evaStepsFor(task.title),
            evidence: [{ label: 'Task', value: task.title }, { label: 'Client', value: task.company }, { label: 'Due', value: task.dueLabel }],
        });
    }, 1800);
}

// A task, opened — the same modal from Work and from the Portfolio overview.
export function TaskModal({ task, onClose, onHandToEva, onDone }: { task: Task; onClose: () => void; onHandToEva?: () => void; onDone?: () => void }) {
    const { t } = useLang();
    const st = TSTATUS[task.status];
    const prio = TPRIO[task.priority];
    const eva = isEva(task.status);
    const stepsTitle = task.status === 'eva-running' ? 'What EVA is doing' : task.status === 'eva-scheduled' ? 'What EVA will do' : task.status === 'eva-done' ? 'What EVA did' : 'How EVA usually does it';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden" style={{ maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={task.company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t(task.title)}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{task.company} · {t('Responsible: {name}').replace('{name}', task.accountant)}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.fg }}><span className="rounded-full" style={{ width: 6, height: 6, background: st.dot }} />{t(st.label)}</span>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: '#f1f1f3', color: dueColor(task.bucket) }}>{t(task.dueLabel)}{task.evaWhen ? ` · ${task.evaWhen}` : ''}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: '#f1f1f3', color: '#52525b' }}><span className="rounded-full" style={{ width: 6, height: 6, background: prio.color }} />{t('Priority')}: {t(prio.label)}</span>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: COLORS.textMuted }}>{t('Description')}</p>
                        <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{t(taskBriefFor(task))}</p>
                    </div>

                    {task.status === 'waiting' && (
                        <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: '#fbf3e0', border: '1px solid #efdcb0' }}>
                            <span className="shrink-0" style={{ color: '#b9842b' }}><Icon name="time" /></span>
                            <p className="text-sm" style={{ color: COLORS.text }}>{t('Waiting on the client — EVA follows up automatically every 3 days.')}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t(stepsTitle)}</p>
                        <ol className="flex flex-col gap-1.5">
                            {evaStepsFor(task.title).map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}>
                                    {task.status === 'eva-done'
                                        ? <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 16, height: 16, background: '#eef7ef', color: '#15803d', fontSize: 10 }}><Icon name="tick" /></span>
                                        : <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5 text-[10px] font-semibold" style={{ width: 16, height: 16, background: '#f1f1f3', color: '#52525b' }}>{i + 1}</span>}
                                    {t(s)}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{eva ? t('Full trace · you can always see what EVA did') : t('EVA can take this on and hand you a draft to approve.')}</span>
                    <div className="flex gap-2 shrink-0">
                        {!eva && onDone && <Button onClick={onDone}><Icon name="circle-tick" /> {t('Mark done')}</Button>}
                        {!eva && onHandToEva ? <Button appearance="primary" onClick={onHandToEva}>{t('Hand to EVA')}</Button> : <Button onClick={onClose}>{t('Close')}</Button>}
                    </div>
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
    const review = SEED_DECISIONS.map((d) => ({ title: d.label, company: d.company })); // drafts awaiting sign-off
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

