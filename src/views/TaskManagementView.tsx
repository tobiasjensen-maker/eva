import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';

// ---- Praksis / AO-house task management ------------------------------------
// The firm's overview across every client company: what needs doing, when, and
// by whom. Overview-first — actions (reassign, change status) are a second layer.

type TStatus = 'todo' | 'in-progress' | 'waiting' | 'review' | 'done';
type TPriority = 'high' | 'medium' | 'low';
type Bucket = 'overdue' | 'today' | 'week' | 'later';

interface Task {
    id: string;
    title: string;      // task type
    company: string;    // client
    accountant: string; // responsible
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
};
const STATUS_ORDER: TStatus[] = ['todo', 'in-progress', 'waiting', 'review', 'done'];
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
    T('VAT return — Q1', 'Nordic Build ApS', 'Mette Sørensen', 'Overdue 2 days', 'overdue', 'in-progress', 'high'),
    T('Month-end close', 'Café Solsikke', 'Sofie Lund', 'Overdue 1 day', 'overdue', 'waiting', 'high'),
    T('Missing receipts (5)', 'Tech Equipment AS', 'Jonas Vestergaard', 'Overdue 3 days', 'overdue', 'waiting', 'medium'),
    T('Payroll run — June', 'Office Supplies Co', 'Camilla Berg', 'Today', 'today', 'todo', 'high'),
    T('Bank reconciliation', 'Cloud Hosting Ltd', 'Anders Holm', 'Today', 'today', 'in-progress', 'medium'),
    T('Supplier invoice approval', 'Digital Marketing Pro', 'Mette Sørensen', 'Today', 'today', 'review', 'medium'),
    T('Debtor follow-up', 'Bryg & Co ApS', 'Jonas Vestergaard', 'In 2 days', 'week', 'todo', 'low'),
    T('Quarterly report', 'Lys Design', 'Sofie Lund', 'In 3 days', 'week', 'in-progress', 'medium'),
    T('VAT return — Q1', 'Fjord Fitness', 'Anders Holm', 'In 3 days', 'week', 'todo', 'high'),
    T('Month-end close', 'Aarhus Tandklinik', 'Camilla Berg', 'In 4 days', 'week', 'todo', 'medium'),
    T('Bank reconciliation', 'Nordic Build ApS', 'Mette Sørensen', 'In 4 days', 'week', 'todo', 'low'),
    T('Payroll run — June', 'Café Solsikke', 'Sofie Lund', 'In 5 days', 'week', 'todo', 'medium'),
    T('Annual report draft', 'Tech Equipment AS', 'Jonas Vestergaard', 'In 9 days', 'later', 'todo', 'high'),
    T('Year-end close', 'Office Supplies Co', 'Camilla Berg', 'In 12 days', 'later', 'todo', 'medium'),
    T('Supplier invoice approval', 'Cloud Hosting Ltd', 'Anders Holm', 'In 8 days', 'later', 'todo', 'low'),
    T('VAT reconciliation', 'Digital Marketing Pro', 'Mette Sørensen', 'In 10 days', 'later', 'todo', 'low'),
    T('Debtor follow-up', 'Bryg & Co ApS', 'Jonas Vestergaard', 'Done today', 'today', 'done', 'low'),
    T('Missing receipts (3)', 'Lys Design', 'Sofie Lund', 'Done yesterday', 'today', 'done', 'medium'),
    T('Month-end close', 'Fjord Fitness', 'Anders Holm', 'In 6 days', 'week', 'in-progress', 'medium'),
    T('Payroll run — June', 'Aarhus Tandklinik', 'Camilla Berg', 'In 7 days', 'week', 'todo', 'high'),
];

type GroupBy = 'accountant' | 'company' | 'deadline' | 'status';

// A titled container with stacked rows — matches the Cockpit's tables.
function SectionCard({ title, count, right, children }: { title: ReactNode; count?: number; right?: ReactNode; children: ReactNode }) {
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">{title}{count !== undefined && <span className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>· {count}</span>}</div>
                {right}
            </div>
            {children}
        </Card>
    );
}

// Small popover menu (change status / reassign).
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

export default function TaskManagementView() {
    const { t } = useLang();
    const [tasks, setTasks] = useState<Task[]>(TASKS);
    const [groupBy, setGroupBy] = useState<GroupBy>('accountant');
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState<Set<TStatus>>(new Set());

    const setStatus = (id: string, s: TStatus) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: s } : x)));
    const reassign = (id: string, a: string) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, accountant: a } : x)));
    const toggleStatusF = (s: TStatus) => setStatusF((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

    // --- KPIs (overview first) ---
    const open = tasks.filter((x) => x.status !== 'done');
    const overdue = open.filter((x) => x.bucket === 'overdue');
    const dueWeek = open.filter((x) => x.bucket === 'today' || x.bucket === 'week');
    const waiting = tasks.filter((x) => x.status === 'waiting');
    const kpis = [
        { label: t('Open tasks'), value: String(open.length), sub: t('across {n} companies').replace('{n}', String(COMPANIES.length)), color: COLORS.text },
        { label: t('Overdue'), value: String(overdue.length), sub: t('need attention'), color: '#dc2626', accent: true },
        { label: t('Due this week'), value: String(dueWeek.length), sub: t('{n} accountants').replace('{n}', String(ACCOUNTANTS.length)), color: '#6366f1' },
        { label: t('Waiting on client'), value: String(waiting.length), sub: t('blocked externally'), color: '#b9842b' },
    ];

    // --- filter + group ---
    const ql = q.trim().toLowerCase();
    const filtered = tasks.filter((x) =>
        (statusF.size === 0 || statusF.has(x.status))
        && (!ql || t(x.title).toLowerCase().includes(ql) || x.company.toLowerCase().includes(ql) || x.accountant.toLowerCase().includes(ql)),
    );
    const order = groupBy === 'accountant' ? ACCOUNTANTS : groupBy === 'company' ? COMPANIES : groupBy === 'status' ? STATUS_ORDER : BUCKETS.map((b) => b.key);
    const keyOf = (x: Task) => (groupBy === 'accountant' ? x.accountant : groupBy === 'company' ? x.company : groupBy === 'status' ? x.status : x.bucket);
    const groups = (order as string[])
        .map((k) => ({ key: k, items: filtered.filter((x) => keyOf(x) === k) }))
        .filter((g) => g.items.length > 0);

    const groupTitle = (k: string): ReactNode => {
        if (groupBy === 'accountant') return <><ClientAvatar name={k} size={22} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{k}</span></>;
        if (groupBy === 'company') return <><ClientAvatar name={k} size={22} /><span className="text-sm font-semibold" style={{ color: COLORS.text }}>{k}</span></>;
        if (groupBy === 'status') return <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.text }}><span className="rounded-full" style={{ width: 8, height: 8, background: TSTATUS[k as TStatus].dot }} />{t(TSTATUS[k as TStatus].label)}</span>;
        return <span className="text-sm font-semibold" style={{ color: k === 'overdue' ? '#dc2626' : COLORS.text }}>{t(BUCKETS.find((b) => b.key === k)!.label)}</span>;
    };

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader
                title={t('Task Management')}
                showScope={false}
                right={<Button appearance="primary"><Icon name="circle-plus" /> {t('New task')}</Button>}
            />
            <div className="mx-auto px-8 pt-5 pb-10" style={{ maxWidth: 1040 }}>
                <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
                    {t('Your whole practice at a glance — every client task, who owns it, and when it’s due.')}
                </p>

                {/* overview KPIs */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {kpis.map((k) => (
                        <div key={k.label} className="rounded-xl p-4" style={{ background: (k as { accent?: boolean }).accent && Number(k.value) > 0 ? '#fdecec' : '#fff', border: `1px solid ${(k as { accent?: boolean }).accent && Number(k.value) > 0 ? '#f3c9c9' : COLORS.cardBorder}` }}>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{k.label}</p>
                            <p className="text-2xl font-semibold leading-tight mt-1" style={{ color: k.color }}>{k.value}</p>
                            <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{k.sub}</p>
                        </div>
                    ))}
                </div>

                {/* controls: group-by + search + status filter */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <SegmentedTabs
                        value={groupBy}
                        onChange={(v) => setGroupBy(v as GroupBy)}
                        options={[
                            { value: 'accountant', label: t('By accountant') },
                            { value: 'company', label: t('By company') },
                            { value: 'deadline', label: t('By deadline') },
                            { value: 'status', label: t('By status') },
                        ]}
                    />
                    <div className="relative flex-1" style={{ minWidth: 200 }}>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search tasks…')} className="w-full rounded-lg pl-9 pr-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-5">
                    {STATUS_ORDER.map((s) => {
                        const on = statusF.has(s);
                        const st = TSTATUS[s];
                        return (
                            <button key={s} onClick={() => toggleStatusF(s)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                                style={{ border: `1px solid ${on ? st.fg : COLORS.cardBorder}`, background: on ? st.bg : '#fff', color: on ? st.fg : COLORS.textMuted }}>
                                <span className="rounded-full" style={{ width: 6, height: 6, background: st.dot }} /> {t(st.label)}
                            </button>
                        );
                    })}
                    {(statusF.size > 0 || q) && <button onClick={() => { setStatusF(new Set()); setQ(''); }} className="text-xs font-medium ml-1" style={{ color: '#4456c7' }}>{t('Clear filters')}</button>}
                    <span className="ml-auto text-xs" style={{ color: COLORS.textMuted }}>{filtered.length} {t('of')} {tasks.length}</span>
                </div>

                {/* grouped task tables */}
                {groups.length === 0 ? (
                    <Card className="p-10 text-center"><p className="text-sm" style={{ color: COLORS.textMuted }}>{t('No tasks match these filters.')}</p></Card>
                ) : (
                    <div className="flex flex-col gap-4">
                        {groups.map((g) => {
                            const od = g.items.filter((x) => x.bucket === 'overdue' && x.status !== 'done').length;
                            return (
                                <SectionCard
                                    key={g.key}
                                    title={<span className="flex items-center gap-2 min-w-0">{groupTitle(g.key)}</span>}
                                    count={g.items.length}
                                    right={od > 0 ? <span className="text-xs font-medium shrink-0" style={{ color: '#dc2626' }}>{od} {t('overdue')}</span> : undefined}
                                >
                                    {g.items.map((x, i) => (
                                        <TaskRow
                                            key={x.id}
                                            task={x}
                                            groupBy={groupBy}
                                            last={i === g.items.length - 1}
                                            onStatus={(s) => setStatus(x.id, s)}
                                            onReassign={(a) => reassign(x.id, a)}
                                        />
                                    ))}
                                </SectionCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function TaskRow({ task, groupBy, last, onStatus, onReassign }: { task: Task; groupBy: GroupBy; last: boolean; onStatus: (s: TStatus) => void; onReassign: (a: string) => void }) {
    const { t } = useLang();
    const st = TSTATUS[task.status];
    const prio = TPRIO[task.priority];
    // Secondary line: company (unless grouped by it) · due.
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

            {/* responsible accountant — click to reassign (hidden when grouped by accountant) */}
            {groupBy !== 'accountant' && (
                <PopMenu
                    trigger={
                        <span className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5" style={{ border: `1px solid ${COLORS.cardBorder}` }} title={t('Responsible: {name}').replace('{name}', task.accountant)}>
                            <ClientAvatar name={task.accountant} size={18} />
                            <span className="text-xs hidden lg:inline" style={{ color: COLORS.text }}>{task.accountant.split(' ')[0]}</span>
                        </span>
                    }
                    items={ACCOUNTANTS.map((a) => ({ label: a, active: a === task.accountant, mark: <ClientAvatar name={a} size={16} />, onClick: () => onReassign(a) }))}
                />
            )}

            {/* priority */}
            <span title={`${t('Priority')}: ${t(prio.label)}`} className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: prio.color }} />

            {/* status — click to change */}
            <PopMenu
                trigger={
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.fg }}>
                        <span className="rounded-full" style={{ width: 6, height: 6, background: st.dot }} /> {t(st.label)}
                        <Icon name="chevron-down" />
                    </span>
                }
                items={STATUS_ORDER.map((s) => ({ label: t(TSTATUS[s].label), active: s === task.status, onClick: () => onStatus(s) }))}
            />
        </div>
    );
}

// EVA "practice assistant" answers for the shell chat panel on the Task Management page.
export function tasksAnswer(q: string, lang: 'en' | 'da' = 'en'): string {
    const s = q.toLowerCase();
    const da = lang === 'da';
    const open = TASKS.filter((x) => x.status !== 'done');
    const overdue = open.filter((x) => x.bucket === 'overdue');
    const dueWeek = open.filter((x) => x.bucket === 'today' || x.bucket === 'week');
    if (/overdue|forsink|forfald/.test(s)) {
        const names = overdue.map((x) => `${x.title} (${x.company}, ${x.accountant.split(' ')[0]})`).join('; ');
        return da
            ? `${overdue.length} opgaver er forsinkede: ${names}. Et par af dem venter på klienten.`
            : `${overdue.length} tasks are overdue: ${names}. A couple are blocked waiting on the client.`;
    }
    if (/overload|plate|most|busy|mest|belast|hvem|who/.test(s)) {
        const counts: Record<string, number> = {};
        open.forEach((x) => { counts[x.accountant] = (counts[x.accountant] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return da
            ? `${top[0]} har flest åbne opgaver lige nu (${top[1]}). Overvej at flytte et par høj-prioritets-opgaver.`
            : `${top[0]} has the most open tasks right now (${top[1]}). Worth rebalancing a couple of the high-priority items.`;
    }
    if (/week|due|uge/.test(s)) {
        return da
            ? `${dueWeek.length} opgaver forfalder i denne uge på tværs af kontoret — mest moms, løn og månedsafslutning.`
            : `${dueWeek.length} tasks are due this week across the office — mostly VAT, payroll and month-end close.`;
    }
    return da
        ? 'Jeg kan give overblik over opgaver på tværs af kontoret — hvem ejer hvad, hvad er forsinket, og hvad forfalder i denne uge. Prøv “Hvad er forsinket på tværs af kontoret?”'
        : 'I can give you an overview of tasks across the office — who owns what, what’s overdue, and what’s due this week. Try “What’s overdue across the office?”';
}
