import { Fragment, useState, type Dispatch, type DragEvent, type ReactNode, type SetStateAction } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, CountBadge, EvaWindowControls, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { SEED_DECISIONS, type DecisionItem, type ResolveInfo } from '../day';
import { DecisionReview } from './Decisions';
import { MonthEndCard } from './MonthEnd';
import { axHidesTask, useScopeMode } from '../edition';
import { clientName, type LogEntry } from './ActivityView';
import { MY_PORTFOLIO, TEAM, type Thread } from '../practice';
import { PRIO_RANK, PRIO_STYLE, priorityOfDecision, priorityOfThread, type Priority } from '../priority';
import { PrioLine } from './Decisions';

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

export const TSTATUS: Record<TStatus, { label: string; bg: string; fg: string; dot: string }> = {
    'todo': { label: 'Not started', bg: '#f1f1f3', fg: '#52525b', dot: '#a8a8b0' },
    'in-progress': { label: 'In progress', bg: '#eef4fb', fg: '#2f6fb0', dot: '#4c6ef5' },
    'waiting': { label: 'Waiting on client', bg: '#fbf3e0', fg: '#92710f', dot: '#b9842b' },
    'review': { label: 'In review', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'done': { label: 'Done', bg: '#e9f7ef', fg: '#15803d', dot: '#16a34a' },
    'eva-scheduled': { label: 'Scheduled by EVA', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'eva-running': { label: 'EVA working', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'eva-review': { label: 'Ready for review', bg: '#f3f0fb', fg: '#7c3aed', dot: '#7c3aed' },
    'eva-done': { label: 'Auto-completed by EVA', bg: '#eef7ef', fg: '#15803d', dot: '#16a34a' },
};
const TPRIO: Record<TPriority, { label: string; color: string }> = {
    high: { label: 'High', color: '#dc2626' },
    medium: { label: 'Medium', color: '#b9842b' },
    low: { label: 'Low', color: '#a8a8b0' },
};
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
    T('Payroll run — October', 'Aarhus Tandklinik', 'Camilla Berg', '28 Oct', 'later', 'eva-scheduled', 'medium', '28 Oct at 06:00'),
    // EVA already completed these autonomously
    T('Bank reconciliation', 'Nordic Build ApS', ME, 'Done yesterday', 'week', 'eva-done', 'low'),
    T('Missing receipts (3)', 'Lys Design', 'Sofie Lund', 'Done today', 'today', 'eva-done', 'medium'),
    T('Payroll run — September', 'Café Solsikke', 'Sofie Lund', 'Done 30 Sep', 'week', 'eva-done', 'medium'),
    // Bookkeeping is EVA's — the rest of the recurring work
    T('Debtor follow-up', 'Café Solsikke', ME, 'Running', 'today', 'eva-running', 'medium'),
    T('Annual report draft', 'Nordic Build ApS', ME, 'In 3 days', 'week', 'eva-running', 'high'),
    T('VAT reconciliation', 'Digital Marketing Pro', ME, 'Done today', 'today', 'eva-done', 'low'),
    T('Payroll run — October', 'Office Supplies Co', ME, '28 Oct', 'later', 'eva-scheduled', 'high', '28 Oct at 06:00'),
    T('Payroll run — September', 'Nordic Build ApS', ME, 'Done 30 Sep', 'week', 'eva-done', 'medium'),
    T('Month-end close', 'Café Solsikke', 'Sofie Lund', 'Running', 'today', 'eva-running', 'high'),
    T('Quarterly report', 'Lys Design', 'Sofie Lund', 'Done yesterday', 'week', 'eva-done', 'medium'),
    T('VAT return — Q3', 'Fjord Fitness', 'Anders Holm', 'Tomorrow', 'week', 'eva-scheduled', 'high', 'Tomorrow at 06:00'),
    T('Month-end close', 'Aarhus Tandklinik', 'Camilla Berg', 'In 4 days', 'week', 'eva-scheduled', 'medium', 'Fri at 06:00'),
    T('Annual report draft', 'Tech Equipment AS', 'Jonas Vestergaard', 'In 9 days', 'later', 'eva-running', 'high'),
    T('Supplier invoice approval', 'Cloud Hosting Ltd', 'Anders Holm', 'Done today', 'today', 'eva-done', 'low'),
    T('Payroll run — October', 'Bryg & Co ApS', 'Jonas Vestergaard', '28 Oct', 'later', 'eva-scheduled', 'high', '28 Oct at 06:00'),
    // People's work: the client relationship, advice and judgement — EVA prepares, a person does it
    T('Cash-flow call with Ida', 'Café Solsikke', ME, 'Overdue 2 days', 'overdue', 'todo', 'high'),
    T('Quarterly review meeting', 'Nordic Build ApS', ME, 'In 3 days', 'week', 'in-progress', 'high'),
    T('Sign off the annual report', 'Tech Equipment AS', ME, 'In 6 days', 'week', 'todo', 'medium'),
    T('Customer-concentration advice', 'Digital Marketing Pro', ME, 'In 10 days', 'later', 'todo', 'medium'),
    T('Advisory call — slower-paying customers', 'Lys Design', 'Sofie Lund', 'In 2 days', 'week', 'waiting', 'high'),
    T('Budget 2027 workshop', 'Aarhus Tandklinik', 'Camilla Berg', 'In 5 days', 'week', 'todo', 'medium'),
    T('Growth plan meeting', 'Cloud Hosting Ltd', 'Anders Holm', 'In 8 days', 'later', 'todo', 'low'),
    T('Hiring plan and payroll budget', 'Bryg & Co ApS', 'Jonas Vestergaard', 'In 12 days', 'later', 'todo', 'medium'),
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

export { WORK_STATUS, WorkTag, type WorkStatus } from './workStatus';
import { WORK_STATUS, WorkTag, SectionCard, type WorkStatus } from './workStatus';
// A human task's tags: To do (+ Overdue) or Done.
export const workTagsFor = (task: Task): WorkStatus[] => (task.status === 'done' || task.status === 'eva-done' ? ['done'] : task.status === 'in-progress' || task.status === 'eva-running' ? ['inprogress'] : task.bucket === 'overdue' ? ['todo', 'overdue'] : ['todo']);

type Layout = 'board' | 'list';
// One item of work, whatever its source: a task with you, an EVA draft to review, or something done.
type WorkItem =
    | { kind: 'task'; id: string; ws: 'todo' | 'inprogress' | 'review' | 'done'; overdue: boolean; company: string; title: string; task: Task; }
    | { kind: 'review'; id: string; ws: 'review'; overdue: false; company: string; title: string; d: DecisionItem }
    | { kind: 'reply'; id: string; ws: 'review'; overdue: false; company: string; title: string; th: Thread }
    | { kind: 'logged'; id: string; ws: 'done'; overdue: false; company: string; title: string; entry: LogEntry; task?: Task };
const DONE_SHOWN = 5; // Done shows the latest few; the full history is the Activity tab
type Col = 'todo' | 'inprogress' | 'review' | 'done';
// Drag-and-drop wiring shared by board cards and list rows.
type Dnd = {
    dragId: string | null;
    over: { col: Col; beforeId: string | null } | null;
    start: (it: WorkItem) => void;
    end: () => void;
    overItem: (col: Col, it: WorkItem, after: boolean, nextId: string | null) => void;
    overCol: (col: Col) => void;
    drop: (col: Col) => void;
};
const DropLine = () => <div className="rounded-full" style={{ height: 3, background: '#7c3aed', margin: '-1px 2px' }} />;

const PURPLE = '#7c3aed';

// Work — the one place for work: what's on your plate and what EVA is handling now
// (Tasks), everything EVA has done (Activity), and what's automated (Routines).
export type WorkTab = 'tasks' | 'activity' | 'routines';

// The active routines' next runs — shown with EVA's scheduled tasks on the Routines tab.

export default function TaskManagementView({ tasks, setTasks, decisions, onResolveDecision, onAddDecision, activity, onOpenActivity, threads = [], onOpenThread, tab, onTab, activityLog, routines, bare, onNewRoutine, clientFilter = null, onClientChange, evaControls, onAskEva }: {
    tab: WorkTab;
    onTab: (t: WorkTab) => void;
    activityLog: ReactNode;   // the Activity tab (the embedded activity log)
    routines: ReactNode;      // the Routines tab (routine configuration)
    bare?: boolean;           // a routine is open — its detail takes the whole page
    onNewRoutine: () => void; // the header's New routine (opens the builder in the Routines tab)
    clientFilter?: string | null; // show one client's work only (the agreement selector, or a client in the overview)
    onClientChange?: (name: string | null) => void;
    evaControls?: { onMinimise: () => void; onClose: () => void }; // AX full-screen EVA: ⤡ and ✕ at top right
    onAskEva?: (d: DecisionItem) => void; // AX: "Ask EVA" on a flag/action — opens Chat with it explained
    tasks: Task[];
    setTasks: Dispatch<SetStateAction<Task[]>>;
    decisions: DecisionItem[];
    onResolveDecision: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void;
    activity: LogEntry[]; // the activity log — Done is today's completed work from it
    onOpenActivity: (entryId: string) => void;
    threads?: Thread[];               // client conversations — those waiting on you are For review too
    onOpenThread?: (th: Thread) => void;
    onAddDecision: (d: DecisionItem) => void;
}) {
    const { t } = useLang();
    const { ax } = useScopeMode(); // AX: no client replies or advisory tasks
    const [layout, setLayout] = useState<Layout>('board');
    const view: Layout = ax ? 'list' : layout; // AX: the list only
    const [q, setQ] = useState('');
    const [statusF, setStatusF] = useState<Set<WorkStatus>>(new Set());
    // AX filters by kind instead of status: Flags (findings on booked postings) and Actions (to approve)
    const [kindF, setKindF] = useState<Set<ItemKind>>(new Set());
    const [routineF, setRoutineF] = useState<string>('all'); // AX: one routine's items
    const toggleKindF = (k: ItemKind) => setKindF((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
    const [trace, setTrace] = useState<Task | null>(null);
    const [review, setReview] = useState<DecisionItem | null>(null);
    const [creating, setCreating] = useState(false);
    // Board order you set by dragging, per column; and tasks you just dragged to EVA.
    const [order, setOrder] = useState<Partial<Record<Col, string[]>>>({});
    const [handing, setHanding] = useState<Set<string>>(new Set());
    const [dragId, setDragId] = useState<string | null>(null);
    const [over, setOver] = useState<{ col: Col; beforeId: string | null } | null>(null);
    // Work is the logged-in accountant's own work (the whole office lives under Practice).
    const mine = true;

    const patch = (id: string, p: Partial<Task>) => setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const setStatus = (id: string, s: TStatus) => patch(id, { status: s });
    function handToEva(id: string) {
        const task = tasks.find((x) => x.id === id);
        if (task) handTaskToEva(task, setTasks, onAddDecision);
    }
    const toggleStatusF = (s: WorkStatus) => setStatusF((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

    // Perspective — "My work" (the logged-in accountant) vs. the whole practice.
    const forClient = (name: string) => !clientFilter || name === clientFilter;
    const scoped = (mine ? tasks.filter((x) => x.accountant === ME) : tasks).filter((x) => forClient(x.company));
    const ql = q.trim().toLowerCase();
    const matchQ = (x: Task) => !ql || t(x.title).toLowerCase().includes(ql) || x.company.toLowerCase().includes(ql) || x.accountant.toLowerCase().includes(ql);
    const all = scoped.filter(matchQ);

    // Ready for your review — the shared decisions, scoped like everything else here.
    // open items for your review per client — shown in the agreement selector
    const reviewByClient: Record<string, number> = {};
    decisions.forEach((d) => { if (!d.done && d.accountant === ME) reviewByClient[d.company] = (reviewByClient[d.company] ?? 0) + 1; });
    const evaReview = decisions.filter((d) => !d.done && (!mine || d.accountant === ME) && forClient(d.company) && (!ql || t(d.label).toLowerCase().includes(ql) || d.company.toLowerCase().includes(ql)));

    // --- the work, as one set of items: To do · In progress (Vision) · For review · Done ---
    // Done is read from the activity log — the one record of what happened today, by you
    // (on this board) and by EVA. Reopening or handing off isn't "done", so those stay out.
    const doneLog = activity
        .filter((e) => e.status === 'completed' && e.daysAgo === 0 && !['reopened', 'handed', 'taken-back'].includes(e.event ?? ''))
        .filter((e) => !e.taskId || tasks.find((x) => x.id === e.taskId)?.status === 'done')
        .filter((e) => forClient(clientName(e.client)))
        .filter((e) => !ql || t(e.title ?? e.desc).toLowerCase().includes(ql) || t(clientName(e.client)).toLowerCase().includes(ql))
        .sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || b.time.localeCompare(a.time));
    const items: WorkItem[] = [
        // EVA at work: in Vision every running task is In progress; AX has no such column, so a task
        // you just handed over waits in For review until EVA's draft arrives.
        ...all.filter((x) => x.status === 'eva-running' && (!ax || handing.has(x.id))).map((x): WorkItem => ({ kind: 'task', id: x.id, ws: ax ? 'review' : 'inprogress', overdue: false, company: x.company, title: t(x.title), task: x })),
        // your own work: To do, or In progress once you've started it (Vision)
        ...all.filter((x) => !isEva(x.status) && x.status !== 'done' && !(ax && axHidesTask(x.title))).map((x): WorkItem => ({ kind: 'task', id: x.id, ws: !ax && x.status === 'in-progress' ? 'inprogress' : 'todo', overdue: x.bucket === 'overdue' && !(!ax && x.status === 'in-progress'), company: x.company, title: t(x.title), task: x })),
        ...evaReview.map((d): WorkItem => ({ kind: 'review', id: d.id, ws: 'review', overdue: false, company: d.company, title: t(d.label), d })),
        // client replies EVA drafted in the Inbox — the same review queue
        ...threads.filter((x) => !ax && x.status === 'needs' && forClient(x.client) && (!ql || t(x.subject).toLowerCase().includes(ql) || x.client.toLowerCase().includes(ql) || x.contact.toLowerCase().includes(ql)))
            .map((x): WorkItem => ({ kind: 'reply', id: `reply-${x.id}`, ws: 'review', overdue: false, company: x.client, title: `${t('Reply to {name}').replace('{name}', x.contact.split(' ')[0])} — ${t(x.subject)}`, th: x })),
        ...doneLog.map((e): WorkItem => ({ kind: 'logged', id: e.id, ws: 'done', overdue: false, company: clientName(e.client), title: t(e.title ?? e.desc), entry: e, task: e.taskId ? tasks.find((x) => x.id === e.taskId) : undefined })),
    ];
    const passes = (it: WorkItem) => (statusF.size === 0 || statusF.has(it.ws) || (it.overdue && statusF.has('overdue')))
        && (!ax || kindF.size === 0 || (kindOf(it) !== null && kindF.has(kindOf(it)!)))
        && (!ax || routineF === 'all' || (it.kind === 'review' && routineOf(it.d).id === routineF));
    const visible = items.filter(passes);
    // your drag order wins; anything new since (not yet ordered) goes on top
    const ordered = (col: Col, list: WorkItem[]) => {
        const o = order[col]; if (!o) return list;
        const rank = (id: string) => o.indexOf(id);
        return list.map((it, i) => ({ it, i })).sort((a, b) => rank(a.it.id) - rank(b.it.id) || a.i - b.i).map((x) => x.it);
    };
    const todo = ordered('todo', visible.filter((it) => it.ws === 'todo')).sort((a, b) => Number(b.overdue) - Number(a.overdue));
    const inprogress = ordered('inprogress', visible.filter((it) => it.ws === 'inprogress'));
    // For review is EVA's ranked queue (most urgent first) until you reorder it yourself.
    const forReview = ordered('review', visible.filter((it) => it.ws === 'review').sort((a, b) => PRIO_RANK[(prioOf(a) ?? LOWEST).level] - PRIO_RANK[(prioOf(b) ?? LOWEST).level]));
    const doneAll = ordered('done', visible.filter((it) => it.ws === 'done'));
    const colItems: Record<Col, WorkItem[]> = { todo, inprogress, review: forReview, done: doneAll };

    // Moving a card is doing the work: To do ⇄ In progress ⇄ Done marks it; onto For review hands
    // it to EVA to draft; an EVA draft goes to Done only through review, or back to you.
    function move(id: string, to: Col, beforeId: string | null) {
        const it = items.find((x) => x.id === id);
        if (!it || (it.kind === 'logged' && !it.task)) return;
        const ids = colItems[to].map((x) => x.id).filter((x) => x !== id);
        const at = beforeId ? ids.indexOf(beforeId) : -1;
        ids.splice(at < 0 ? ids.length : at, 0, id);
        if (it.kind === 'reply') { if (it.ws === to) setOrder((prev) => ({ ...prev, [to]: ids })); else onOpenThread?.(it.th); return; } // a reply is settled by sending it
        setOrder((prev) => ({ ...prev, [to]: ids }));
        if (it.ws === to) return;
        if (it.kind === 'review') {
            if (to === 'done') setReview(it.d);
            else {
                onResolveDecision(it.d.id, 'alt', { backToYou: true });
                const backId = `back-${it.d.id}`;
                setTasks((prev) => [{ id: backId, title: it.d.label, company: it.d.company, accountant: ME, status: to === 'inprogress' ? 'in-progress' : 'todo', bucket: 'today', dueLabel: 'Today', priority: 'high' }, ...prev]);
                setOrder((prev) => ({ ...prev, [to]: (prev[to] ?? ids).map((x) => (x === id ? backId : x)) }));
            }
            return;
        }
        const task = it.task!;
        const tid = task.id;
        if (to === 'review' && isPeopleWork(task.title)) { setTrace(task); return; } // a person's task: not EVA's to take — open it instead
        if (to === 'done') patch(tid, { status: 'done' });
        else if (to === 'todo' || to === 'inprogress') { patch(tid, { status: to === 'todo' ? 'todo' : 'in-progress' }); setOrder((prev) => ({ ...prev, [to]: (prev[to] ?? ids).map((x) => (x === id ? tid : x)) })); }
        else {
            setHanding((prev) => new Set(prev).add(tid));
            if (id !== tid) setOrder((prev) => ({ ...prev, review: (prev.review ?? ids).map((x) => (x === id ? tid : x)) }));
            handTaskToEva(task, setTasks, (d) => {
                onAddDecision(d);
                setOrder((prev) => ({ ...prev, review: (prev.review ?? []).map((x) => (x === tid ? d.id : x)) }));
            });
        }
    }
    const dnd: Dnd = {
        dragId, over,
        start: (it) => setDragId(it.id),
        end: () => { setDragId(null); setOver(null); },
        overItem: (col, it, after, nextId) => { const beforeId = after ? nextId : it.id; if (over?.col !== col || over.beforeId !== beforeId) setOver({ col, beforeId }); },
        overCol: (col) => { if (!over || over.col !== col) setOver({ col, beforeId: null }); },
        drop: (col) => { if (dragId) move(dragId, col, over?.col === col ? over.beforeId : null); setDragId(null); setOver(null); },
    };
    const done = doneAll.slice(0, DONE_SHOWN);
    const counts = { todo: items.filter((i) => i.ws === 'todo').length, overdue: items.filter((i) => i.overdue).length, inprogress: items.filter((i) => i.ws === 'inprogress').length, review: items.filter((i) => i.ws === 'review').length, done: items.filter((i) => i.ws === 'done').length };

    const openItem = (it: WorkItem) => { if (it.kind === 'task') setTrace(it.task); else if (it.kind === 'review') setReview(it.d); else if (it.kind === 'reply') onOpenThread?.(it.th); else onOpenActivity(it.entry.id); };

    // The list is grouped by status — the board's columns, as sections.
    const listGroups: { key: string; title: ReactNode; items: WorkItem[]; footer?: boolean }[] = [
        ...(ax ? [] : [{ key: 'todo', title: <WorkTag s="todo" />, items: todo }, { key: 'inprogress', title: <WorkTag s="inprogress" />, items: inprogress }]), // AX: no tasks of your own
        // AX: one list, so a plain heading — not a status pill
        { key: 'review', title: ax ? <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Needs your review')}</span> : <WorkTag s="review" />, items: forReview },
        // AX: completed work lives in the Activity tab, not here
        ...(ax ? [] : [{ key: 'done', title: <WorkTag s="done" />, items: done, footer: doneAll.length > 0 }]),
    ];

    return (
        <div className={bare ? 'h-full' : 'h-full overflow-y-auto'}>
            {!bare && (
                <PageHeader
                    // AX: Tasks (tabs: Tasks | Activity) and Routines are separate menu items
                    title={t(ax ? (tab === 'routines' ? 'Routines' : 'Tasks') : 'Work')}
                    showScope={false}
                    badge={ax
                        ? (tab === 'routines' ? undefined : <SegmentedTabs value={tab} onChange={(v) => onTab(v as WorkTab)} options={[{ value: 'tasks', label: t('Tasks') }, { value: 'activity', label: t('Activity') }]} />)
                        : <SegmentedTabs value={tab} onChange={(v) => onTab(v as WorkTab)} options={[{ value: 'tasks', label: t('Tasks') }, { value: 'activity', label: t('Activity') }, { value: 'routines', label: t('Routines') }]} />}
                    right={(() => {
                        const base = ax && tab === 'activity' ? <AgreementSelector value={clientFilter} onChange={(n) => onClientChange?.(n)} counts={reviewByClient} />
                        : tab === 'tasks' ? (ax ? <AgreementSelector value={clientFilter} onChange={(n) => onClientChange?.(n)} counts={reviewByClient} /> : <Button appearance="primary" onClick={() => setCreating(true)}><Icon name="circle-plus" /> {t('New task')}</Button>)
                        : tab === 'routines' && !ax ? <Button appearance="primary" onClick={onNewRoutine}><Icon name="circle-plus" /> {t('New routine')}</Button> : undefined;
                        // AX full-screen EVA: the same ⤡ / ✕ as Chat, on every page
                        return evaControls ? <>{base}<EvaWindowControls onMinimise={evaControls.onMinimise} onClose={evaControls.onClose} /></> : base;
                    })()}
                />
            )}
            <div className={bare ? 'h-full' : 'mx-auto px-8 pt-5 pb-10'} style={bare ? undefined : { maxWidth: 1240 }}>
                {tab === 'activity' && activityLog}
                {tab === 'routines' && (
                    <div className={bare ? 'h-full' : 'flex flex-col gap-6'}>
                        {routines}
                    </div>
                )}
                {tab === 'tasks' && (<>

                {/* operations first: this month's close across your clients, end to end */}
                {/* AX: the month-end close lives in Controlling */}
                {!ax && <div className="mb-4 land" style={{ ['--d' as string]: '260ms' }}><MonthEndCard decisions={decisions.filter((d) => d.accountant === ME)} onReview={setReview} threads={threads} onResolveDecision={onResolveDecision} onOpenThread={onOpenThread} /></div>}

                {/* toolbar — one line: Board / List, grouping (list), status filters, search */}
                <div className="flex flex-wrap items-center gap-2 mb-4 land relative z-20" style={{ ['--d' as string]: '310ms' }}>
                    {!ax && <SegmentedTabs value={layout} onChange={(v) => setLayout(v as Layout)} options={[{ value: 'board', label: t('Board') }, { value: 'list', label: t('List') }]} />}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* AX shows one status (For review) — no status chips needed */}
                        {((ax ? [] : ['todo', 'overdue', 'inprogress', 'review', 'done']) as WorkStatus[]).map((k) => {
                            const on = statusF.has(k); const m = WORK_STATUS[k];
                            return (
                                <button key={k} onClick={() => toggleStatusF(k)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ border: `1px solid ${on ? m.fg : COLORS.cardBorder}`, background: on ? m.bg : '#fff', color: on ? m.fg : COLORS.textMuted }}>
                                    <span className="rounded-full" style={{ width: 6, height: 6, background: m.dot }} /> {t(m.label)} <CountBadge n={counts[k]} showZero />
                                </button>
                            );
                        })}
                        {ax && (['flag', 'action'] as ItemKind[]).map((k) => {
                            const on = kindF.has(k); const m = KIND[k];
                            const n = items.filter((i) => i.ws === 'review' && kindOf(i) === k).length;
                            return (
                                <button key={k} onClick={() => toggleKindF(k)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ border: `1px solid ${on ? m.fg : COLORS.cardBorder}`, background: on ? m.bg : '#fff', color: on ? m.fg : COLORS.textMuted }}>
                                    <span style={{ color: m.fg, display: 'inline-flex' }}>{m.icon}</span> {t(m.plural)}
                                    {/* the counter follows the chip's colour when it's on (no grey on red) */}
                                    <span className="inline-flex items-center justify-center rounded-full text-[11px] font-semibold" style={{ minWidth: 18, height: 18, padding: '0 6px', background: on ? '#fff' : '#ececf0', color: on ? m.fg : '#52525b' }}>{n}</span>
                                </button>
                            );
                        })}
                        {/* AX: filter on the routine that raised it */}
                        {ax && <RoutineFilter value={routineF} onChange={setRoutineF} counts={Object.fromEntries(AX_ROUTINES.map((r) => [r.id, items.filter((i) => i.kind === 'review' && routineOf(i.d).id === r.id).length]))} />}
                        {/* the client is global context (the agreement selector), not one of these filters */}
                        {(statusF.size > 0 || kindF.size > 0 || routineF !== 'all' || q) && <button onClick={() => { setStatusF(new Set()); setKindF(new Set()); setRoutineF('all'); setQ(''); }} className="text-xs font-medium ml-1" style={{ color: '#4456c7' }}>{t('Clear filters')}</button>}
                    </div>
                    <div className="relative ml-auto" style={{ width: 240 }}>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search tasks…')} className="w-full rounded-lg pl-9 pr-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                    </div>
                </div>

                {view === 'board' ? (
                    <div className="grid gap-4 items-start land board-grid" style={{ ['--d' as string]: '360ms', gridTemplateColumns: `repeat(${ax ? 2 : 4}, minmax(0, 1fr))` }}>
                        {!ax && (
                        <BoardColumn s="todo" count={todo.length} dnd={dnd}>
                            {todo.map((it, i) => (
                                <Fragment key={it.id}>
                                    {it.overdue && i === 0 && <p className="text-[11px] font-semibold uppercase tracking-wide px-1" style={{ color: '#c0392b' }}>{t('Overdue')}</p>}
                                    {!it.overdue && (i === 0 ? todo.length > 0 && todo[0].overdue : todo[i - 1].overdue) && <p className="text-[11px] font-semibold uppercase tracking-wide px-1 pt-1" style={{ color: COLORS.textMuted }}>{t('Upcoming')}</p>}
                                    <WorkCard it={it} col="todo" nextId={todo[i + 1]?.id ?? null} dnd={dnd} onOpen={() => openItem(it)} />
                                </Fragment>
                            ))}
                        </BoardColumn>
                        )}
                        {!ax && (
                        <BoardColumn s="inprogress" count={inprogress.length} dnd={dnd}>
                            {inprogress.map((it, i) => <WorkCard key={it.id} it={it} col="inprogress" nextId={inprogress[i + 1]?.id ?? null} dnd={dnd} onOpen={() => openItem(it)} />)}
                        </BoardColumn>
                        )}
                        <BoardColumn s="review" count={forReview.length} dnd={dnd}>
                            {forReview.map((it, i) => <WorkCard key={it.id} it={it} col="review" nextId={forReview[i + 1]?.id ?? null} dnd={dnd} onOpen={() => openItem(it)} />)}
                        </BoardColumn>
                        <BoardColumn s="done" count={doneAll.length} dnd={dnd} footer={<button onClick={() => onTab('activity')} className="text-xs font-medium w-full text-left px-1 pt-1" style={{ color: '#4456c7' }}>{t('See all in the activity log')} →</button>}>
                            {done.map((it, i) => <WorkCard key={it.id} it={it} col="done" nextId={done[i + 1]?.id ?? null} dnd={dnd} onOpen={() => openItem(it)} />)}
                        </BoardColumn>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 land" style={{ ['--d' as string]: '360ms' }}>
                        {listGroups.filter((g) => g.items.length > 0 || g.footer || true).map((g) => {
                            // By status, each group is a column you can drag rows into, like the board.
                            // AX: no dragging — rows are opened and reviewed, not moved between groups
                            const col = ax ? null : (g.key as Col);
                            return (
                            <div key={g.key} onDragOver={col ? (e) => { if (!dragId) return; e.preventDefault(); if (e.target === e.currentTarget) dnd.overCol(col); } : undefined} onDrop={col ? (e) => { e.preventDefault(); dnd.drop(col); } : undefined}>
                            <SectionCard title={<span className="flex items-center gap-2 min-w-0">{g.title}</span>} count={g.items.length}>
                                {ax && g.key === 'review'
                                    ? g.items.length > 0 && <ReviewRows items={g.items} onOpen={openItem} onAccept={(d) => onResolveDecision(d.id, 'confirm')} onAsk={onAskEva} />
                                    : g.items.map((it, i) => <WorkRow key={it.id} it={it} col={col} nextId={g.items[i + 1]?.id ?? null} dnd={dnd} showCompany last={i === g.items.length - 1 && !g.footer} onOpen={() => openItem(it)} />)}
                                {col && dnd.over?.col === col && dnd.over.beforeId === null && dragId && <DropLine />}
                                {g.items.length === 0 && (g.key === 'review' && !dragId ? (
                                    // nothing waiting on you — say so properly
                                    <div className="flex flex-col items-center text-center px-4 py-8 anim-in">
                                        <span className="flex items-center justify-center rounded-full mb-3" style={{ width: 44, height: 44, background: '#e9f7ef', color: '#15803d' }}><Icon name="circle-tick" /></span>
                                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('You’re all caught up')}</p>
                                        <p className="text-xs mt-1" style={{ color: COLORS.textMuted, maxWidth: 340 }}>
                                            {clientFilter ? t('Nothing from {client} needs your review. EVA puts anything new here as it comes in.').replace('{client}', clientFilter) : t('Nothing needs your review right now. EVA puts anything new here as it comes in.')}
                                        </p>
                                    </div>
                                ) : <p className="text-xs px-4 py-4 text-center" style={{ color: COLORS.textMuted }}>{t(dragId ? 'Drop here' : 'Nothing here')}</p>)}
                                {g.footer && <button onClick={() => onTab('activity')} className="w-full text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#4456c7' }}>{t('See all in the activity log')} →</button>}
                            </SectionCard>
                            </div>
                            );
                        })}
                        {listGroups.every((g) => g.items.length === 0) && <Card className="p-10 text-center"><p className="text-sm" style={{ color: COLORS.textMuted }}>{t('Nothing matches — try clearing the filters.')}</p></Card>}
                    </div>
                )}
                </>)}
            </div>

            {creating && <NewTaskModal onClose={() => setCreating(false)} onCreate={(task, eva) => {
                setCreating(false);
                setTasks((prev) => [task, ...prev]);
                // EVA now: it starts drafting straight away and hands it back for your review.
                if (eva === 'now') { setHanding((prev) => new Set(prev).add(task.id)); handTaskToEva(task, setTasks, onAddDecision); }
            }} />}
            {review && <DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken, info) => { onResolveDecision(review.id, taken, info); setReview(null); }} />}
            {trace && <TaskModal task={trace} onClose={() => setTrace(null)} onHandToEva={() => { handToEva(trace.id); setTrace(null); }} onDone={() => { setStatus(trace.id, 'done'); setTrace(null); }} />}
        </div>
    );
}

// ---- Agreement selector (AX, Work's top-right) ----------------------------------------------
// Pick whose work you see — like e-conomic's agreement selector: the client, its number, a searchable list.
export function AgreementSelector({ value, onChange, counts, align = 'right' }: { value: string | null; onChange: (name: string | null) => void; counts: Record<string, number>; align?: 'left' | 'right' }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const cur = value ? MY_PORTFOLIO.find((c) => c.name === value) : undefined;
    const ql = q.trim().toLowerCase();
    const list = MY_PORTFOLIO.filter((c) => !ql || c.name.toLowerCase().includes(ql) || c.no.toLowerCase().includes(ql));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pick = (n: string | null) => { onChange(n); setOpen(false); setQ(''); };
    const row = (key: string, sel: boolean, onClick: () => void, lead: ReactNode, name: string, sub: string, n: number) => (
        <button key={key} onClick={onClick} className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.text, background: sel ? '#f4f5fb' : 'transparent' }}
            onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = '#f7f7f8'; }} onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
            {lead}
            <span className="flex-1 min-w-0"><span className="block truncate font-medium">{name}</span><span className="block text-xs" style={{ color: COLORS.textMuted }}>{sub}</span></span>
            {n > 0 && <CountBadge n={n} />}
            {sel && <Icon name="tick" style={{ color: '#16a34a' }} />}
        </button>
    );
    return (
        <div className="relative">
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg pl-1.5 pr-2 py-1 text-sm bg-white" style={{ border: `1px solid ${open ? '#c9d0f5' : COLORS.cardBorder}`, color: COLORS.text, minWidth: 210 }}>
                {cur ? <ClientAvatar name={cur.name} size={24} /> : <span className="flex items-center justify-center rounded-md" style={{ width: 24, height: 24, background: '#f1f1f3', color: COLORS.textMuted }}><Icon name="contacts" /></span>}
                <span className="flex-1 min-w-0 text-left leading-tight">
                    <span className="block truncate font-medium">{cur ? cur.name : t('All agreements')}</span>
                    <span className="block text-[11px]" style={{ color: COLORS.textMuted }}>{cur ? cur.no : `${MY_PORTFOLIO.length} ${t('in total')}`}</span>
                </span>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} style={{ color: COLORS.textMuted }} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-40 rounded-xl bg-white overflow-hidden anim-in`} style={{ top: 'calc(100% + 6px)', width: 300, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.16)' }}>
                        <div className="p-2" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by name or agreement number…')} className="w-full rounded-lg pl-8 pr-2 py-1.5 text-sm" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                            </div>
                        </div>
                        {!ql && row('all', !value, () => pick(null), <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 24, height: 24, background: '#f1f1f3', color: COLORS.textMuted }}><Icon name="contacts" /></span>, t('All agreements'), `${MY_PORTFOLIO.length} ${t('in total')}`, total)}
                        <div style={{ maxHeight: 300, overflowY: 'auto', borderTop: ql ? undefined : `1px solid ${COLORS.cardBorder}` }}>
                            {list.map((c) => row(c.id, value === c.name, () => pick(c.name), <ClientAvatar name={c.name} size={24} />, c.name, c.no, counts[c.name] ?? 0))}
                            {list.length === 0 && <p className="text-xs px-3 py-4 text-center" style={{ color: COLORS.textMuted }}>{t('No agreements match')}</p>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

type ItemKind = 'flag' | 'action';
// AX: which of the three routines raised a review item — controlling raises the flags; the close raises
// closing items; everything else comes from the weekly bookkeeping.
const AX_ROUTINES = [
    { id: 't-ax-weekly', label: 'Weekly Bookkeeping', emoji: '🗓️' },
    { id: 't-ax-ctrl', label: 'Monthly Controlling', emoji: '🔍' },
    { id: 't-ax-close', label: 'Monthly Close', emoji: '✅' },
] as const;
type AxRoutine = (typeof AX_ROUTINES)[number];
const routineOf = (d: DecisionItem): AxRoutine => (d.correction ? AX_ROUTINES[1] : /close|closing|month-end|period/i.test(d.label) ? AX_ROUTINES[2] : AX_ROUTINES[0]);
const kindOf = (it: WorkItem): ItemKind | null => (it.kind === 'review' ? (it.d.correction ? 'flag' : 'action') : null);
const FLAG_ICON = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 21V4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M5 4h11l-2 4 2 4H5" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
const ACTION_ICON = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const KIND: Record<ItemKind, { label: string; plural: string; bg: string; fg: string; icon: JSX.Element; tip: string }> = {
    flag: { label: 'Flag', plural: 'Flags', bg: '#fdecec', fg: '#b42318', icon: FLAG_ICON, tip: 'A finding on a booked posting — EVA has the correction ready' },
    action: { label: 'Action', plural: 'Actions', bg: '#eef2ff', fg: '#3341a8', icon: ACTION_ICON, tip: 'EVA’s draft, waiting for your approval before it’s booked' },
};

// AX: what kind of review item this is — a Flag (EVA's finding on a booked posting, with a correction
// ready) or an Action (EVA's draft or request waiting for your approval before booking).
function KindTag({ it }: { it: WorkItem }) {
    const { t } = useLang();
    const { ax } = useScopeMode();
    const k = kindOf(it);
    if (!ax || !k) return null;
    const m = KIND[k];
    return (
        <span className="inline-flex items-center gap-1 shrink-0 rounded-md px-1.5 py-px mr-2 text-[11px] font-semibold align-middle" style={{ background: m.bg, color: m.fg }} title={t(m.tip)}>
            {m.icon}{t(m.label)}
        </span>
    );
}

// AX: the routine filter — a small dropdown (button + menu) next to the Flags / Actions chips.
function RoutineFilter({ value, onChange, counts }: { value: string; onChange: (id: string) => void; counts: Record<string, number> }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const cur = AX_ROUTINES.find((r) => r.id === value);
    const on = !!cur;
    const pick = (id: string) => { onChange(id); setOpen(false); };
    const opt = (id: string, label: ReactNode, n: number | null) => (
        <button key={id} onClick={() => pick(id)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.text, background: value === id ? '#f4f5fb' : 'transparent' }}
            onMouseEnter={(e) => { if (value !== id) e.currentTarget.style.background = '#f7f7f8'; }} onMouseLeave={(e) => { if (value !== id) e.currentTarget.style.background = 'transparent'; }}>
            <span className="flex-1 min-w-0 truncate">{label}</span>
            {n !== null && <CountBadge n={n} showZero />}
            <span style={{ width: 16, color: '#16a34a', display: 'inline-flex' }}>{value === id && <Icon name="tick" />}</span>
        </button>
    );
    return (
        <div className="relative">
            <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1 text-xs font-medium"
                style={{ border: `1px solid ${on ? '#7c3aed' : open ? '#c9d0f5' : COLORS.cardBorder}`, background: on ? '#f3f0fb' : '#fff', color: on ? '#6d28d9' : COLORS.textMuted }}>
                {cur ? <>{cur.emoji} {t(cur.label)}</> : <><RoutinesIconSmall /> {t('All routines')}</>}
                <Icon name={open ? 'chevron-up' : 'chevron-down'} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div role="listbox" className="absolute left-0 z-40 mt-1.5 rounded-xl bg-white py-1 anim-in" style={{ minWidth: 240, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.16)' }}>
                        {opt('all', t('All routines'), null)}
                        <div className="my-1" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                        {AX_ROUTINES.map((r) => opt(r.id, <>{r.emoji} {t(r.label)}</>, counts[r.id] ?? 0))}
                    </div>
                </>
            )}
        </div>
    );
}
const RoutinesIconSmall = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 5h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6" cy="5" r="2.1" fill="currentColor" /><circle cx="18" cy="17" r="2.1" fill="currentColor" /></svg>
);

// AX: the review queue in the Activity pattern — a simple row (what, who, how urgent) that opens EVA's
// explanation inline: what it did, the fix it suggests, voucher · routine · Review (the full review modal, like
// Activity's Trace), and the moves — Ask EVA, Accept.
const SEV: Record<string, { bg: string; fg: string }> = { high: { bg: '#fdecec', fg: '#b42318' }, medium: { bg: '#fdf1dc', fg: '#92710f' }, low: { bg: '#f1f1f3', fg: '#52525b' } };
function ReviewRows({ items, onOpen, onAccept, onAsk }: { items: WorkItem[]; onOpen: (it: WorkItem) => void; onAccept: (d: DecisionItem) => void; onAsk?: (d: DecisionItem) => void }) {
    const { t } = useLang();
    const [open, setOpen] = useState<string | null>(null);
    const rows = items.filter((i): i is Extract<WorkItem, { kind: 'review' }> => i.kind === 'review');
    return (
        <>
            {rows.map((it, i) => {
                const d = it.d; const p = priorityOfDecision(d); const r = routineOf(d); const isOpen = open === it.id;
                const voucher = d.correction?.voucher.match(/#(\d+)/)?.[1];
                const flag = !!d.correction;
                return (
                    <div key={it.id} style={i === rows.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                        <button onClick={() => setOpen(isOpen ? null : it.id)} className="w-full flex items-center gap-3 p-4 text-left bg-white">
                            <ClientAvatar name={d.company} size={30} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium flex items-center min-w-0" style={{ color: COLORS.text }}><KindTag it={it} /><span className="truncate">{t(d.question)}</span></p>
                                <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{d.company} · {r.emoji} {t(r.label)} · {t(p.why)}</p>
                            </div>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: SEV[p.level].bg, color: SEV[p.level].fg }}>{t(PRIO_STYLE[p.level].label)}</span>
                            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8' }} />
                        </button>
                        {isOpen && (
                            <div className="px-4 pb-4 anim-in">
                                <div className="rounded-xl p-4" style={{ border: '1px solid #7c3aed26', background: '#7c3aed0a' }}>
                                    <div className="flex items-center gap-2">
                                        <Orb size={18} />
                                        <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t(flag ? 'What EVA found' : 'What EVA prepared')}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed mt-2" style={{ color: COLORS.text }}>{d.steps.map((x) => t(x)).join('. ')}.</p>
                                    <p className="text-sm leading-relaxed mt-2" style={{ color: COLORS.text }}><span className="font-semibold">{t('EVA suggests')}:</span> {t(d.recommend)}</p>
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm" style={{ color: COLORS.textMuted }}>
                                        {voucher && <span className="flex items-center gap-1.5"><Icon name="document" /> {t('Voucher')} #{voucher}</span>}
                                        <span className="flex items-center gap-1.5">{r.emoji} {t(r.label)}</span>
                                        <button onClick={() => onOpen(it)} className="flex items-center gap-1.5 font-medium" style={{ color: '#4456c7' }}><Icon name="search" /> {t('Review')}</button>
                                    </div>
                                    <div style={{ borderTop: '1px solid #7c3aed1f', margin: '14px -16px 0' }} />
                                    <div className="flex items-center justify-between pt-3 gap-3">
                                        {onAsk ? (
                                            <button onClick={() => onAsk(d)} className="flex items-center gap-1.5 rounded-full font-semibold shrink-0" style={{ padding: '5px 12px 5px 8px', fontSize: 13, background: '#fff7ed', color: COLORS.text, border: '1px solid #efddc0' }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fdeed8')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff7ed')}>
                                                <Orb size={16} /> {t('Ask EVA')}
                                            </button>
                                        ) : <span />}
                                        {/* one CTA — EVA's fix is the action; anything else goes through Review or Ask EVA */}
                                        <Button appearance="primary" onClick={() => onAccept(d)} title={t(d.confirm)}>{t('Accept')}</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

// AX: the routine that raised a review item, at the start of its subtitle.
function RoutineTag({ it }: { it: WorkItem }) {
    const { t } = useLang();
    const { ax } = useScopeMode();
    if (!ax || it.kind !== 'review') return null;
    const r = routineOf(it.d);
    return <span className="font-medium" style={{ color: '#52525b' }} title={t('Raised by this routine')}>{r.emoji} {t(r.label)} · </span>;
}

// ---- Board + list pieces --------------------------------------------------------------------
function BoardColumn({ s, count, children, footer, dnd }: { s: Col; count: number; children: ReactNode; footer?: ReactNode; dnd: Dnd }) {
    const { t } = useLang();
    const m = WORK_STATUS[s];
    const target = dnd.over?.col === s;
    return (
        <div className="rounded-xl p-2.5 flex flex-col gap-2 transition-colors" style={{ background: target && dnd.dragId ? '#ecebf3' : '#f4f4f6', minHeight: 120 }}
            onDragOver={(e) => { if (!dnd.dragId) return; e.preventDefault(); if (e.target === e.currentTarget) dnd.overCol(s); }}
            onDrop={(e) => { e.preventDefault(); dnd.drop(s); }}>
            <div className="flex items-center gap-2 px-1.5 pt-0.5 pb-1">
                <span className="rounded-full" style={{ width: 8, height: 8, background: m.dot }} />
                <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t(m.label)}</p>
                <CountBadge n={count} showZero />
            </div>
            {children}
            {target && dnd.dragId && dnd.over?.beforeId === null && <DropLine />}
            {count === 0 && <p className="text-xs px-1.5 py-3 text-center" style={{ color: COLORS.textMuted }}>{t(dnd.dragId ? 'Drop here' : 'Nothing here')}</p>}
            {footer}
        </div>
    );
}

// drag handlers for one card/row: which half you hover decides whether it drops before or after
const dragProps = (it: WorkItem, col: Col | null, nextId: string | null, dnd: Dnd) => {
    if (!col) return {};
    const movable = it.kind !== 'logged' || !!it.task; // EVA's own log entries are history
    return {
        draggable: movable,
        onDragStart: movable ? (e: DragEvent<HTMLElement>) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', it.id); dnd.start(it); } : undefined,
        onDragEnd: () => dnd.end(),
        onDragOver: (e: DragEvent<HTMLElement>) => {
            if (!dnd.dragId) return;
            e.preventDefault(); e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            dnd.overItem(col, it, e.clientY > r.top + r.height / 2, nextId);
        },
        onDrop: (e: DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); dnd.drop(col); },
    };
};

const itemSub = (it: WorkItem, t: (s: string) => string): ReactNode =>
    it.kind === 'review' ? <><span style={{ color: PURPLE, fontWeight: 500 }}>{t('EVA drafted this')}</span> · {t(it.d.question)}</>
    : it.kind === 'reply' ? <><span style={{ color: PURPLE, fontWeight: 500 }}>{t(it.th.suggestion ? 'EVA drafted a reply' : 'Waiting for your reply')}</span>{it.th.suggestion ? <> · {t(it.th.suggestion.action)}</> : null}</>
    : it.kind === 'logged' ? <>{it.entry.origin === 'tasks' && it.entry.resolution ? t(it.entry.resolution) : t(it.entry.actor === 'you' ? 'Done by you' : 'Done by EVA')} · {it.entry.time}</>
    : it.task.status === 'eva-running' ? <><span style={{ color: PURPLE, fontWeight: 500 }}>{t('EVA is drafting this…')}</span></>
    : <><span style={{ color: dueColor(it.task.bucket), fontWeight: 500 }}>{t(it.task.dueLabel)}</span>{it.task.status === 'waiting' ? <> · {t('Waiting on client')}</> : it.ws === 'inprogress' ? <> · {t('You’re working on this')}</> : null}</>;

// EVA's priority for the items waiting on your review.
const LOWEST: Priority = { level: 'low', why: '' };
const prioOf = (it: WorkItem): Priority | undefined => (it.kind === 'review' ? priorityOfDecision(it.d) : it.kind === 'reply' ? priorityOfThread(it.th) : undefined);

const tagsOf = (it: WorkItem): WorkStatus[] => (it.overdue ? ['todo', 'overdue'] : [it.ws]);

function WorkCard({ it, col, nextId, dnd, onOpen }: { it: WorkItem; col: Col; nextId: string | null; dnd: Dnd; onOpen: () => void }) {
    const { t } = useLang();
    const clickable = true;
    const dragging = dnd.dragId === it.id;
    return (
        <>
        {dnd.dragId && dnd.over?.col === col && dnd.over.beforeId === it.id && <DropLine />}
        <div {...dragProps(it, col, nextId, dnd)} onClick={clickable ? onOpen : undefined} className={`rounded-lg bg-white p-3 flex flex-col gap-2 ${clickable ? 'cursor-grab active:cursor-grabbing' : ''} ${it.kind === 'logged' && it.entry.at && Date.now() - it.entry.at < 2500 ? 'just-done' : ''}`} style={{ border: `1px solid ${it.overdue ? '#f5c2c2' : COLORS.cardBorder}`, opacity: dragging ? 0.4 : it.ws === 'done' ? 0.85 : 1 }}
            onMouseEnter={clickable ? (e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)') : undefined} onMouseLeave={clickable ? (e) => (e.currentTarget.style.boxShadow = 'none') : undefined}>
            <div className="flex items-start gap-2">
                <ClientAvatar name={it.company} size={20} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug" style={{ color: COLORS.text }}><KindTag it={it} />{it.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{it.company}</p>
                    {prioOf(it) && <PrioLine p={prioOf(it)!} t={t} />}
                </div>
            </div>
            <p className="text-xs leading-snug" style={{ color: COLORS.textMuted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{itemSub(it, t)}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
                {tagsOf(it).map((s) => <WorkTag key={s} s={s} />)}
                {(it.kind === 'review' || it.kind === 'reply') && <span className="ml-auto"><Button onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); onOpen(); }}>{t('Review')}</Button></span>}
            </div>
        </div>
        </>
    );
}

function WorkRow({ it, col, nextId, dnd, showCompany, last, onOpen }: { it: WorkItem; col: Col | null; nextId: string | null; dnd: Dnd; showCompany: boolean; last: boolean; onOpen: () => void }) {
    const { t } = useLang();
    const { ax } = useScopeMode();
    const clickable = true;
    return (
        <>
        {col && dnd.dragId && dnd.over?.col === col && dnd.over.beforeId === it.id && <DropLine />}
        <div {...dragProps(it, col, nextId, dnd)} className="flex items-center gap-3 p-4 bg-white" style={{ ...(last ? {} : { borderBottom: `1px solid ${COLORS.cardBorder}` }), opacity: dnd.dragId === it.id ? 0.4 : it.ws === 'done' ? 0.85 : 1, cursor: col && clickable ? 'grab' : undefined }}>
            {col && <span className="shrink-0 -ml-1" style={{ color: it.kind !== 'logged' || it.task ? '#c4c4cc' : 'transparent' }} aria-hidden><Icon name="drag" /></span>}
            <button onClick={clickable ? onOpen : undefined} className="flex-1 min-w-0 flex items-center gap-3 text-left" style={{ cursor: clickable ? 'pointer' : 'default' }} title={clickable ? t('Open task') : undefined}>
                <ClientAvatar name={it.company} size={30} />
                {ax && it.kind === 'review' ? (
                    // AX: just what matters — what's wrong / what to approve, then who and what it changes.
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium flex items-center min-w-0" style={{ color: COLORS.text }}><KindTag it={it} /><span className={`truncate ${clickable ? 'hover:underline' : ''}`}>{t(it.d.question)}</span></p>
                        <p className="text-xs mt-0.5 flex items-center gap-1.5 min-w-0" style={{ color: COLORS.textMuted }}>
                            {prioOf(it) && <span className="rounded-full shrink-0" title={t(PRIO_STYLE[prioOf(it)!.level].label)} style={{ width: 7, height: 7, background: PRIO_STYLE[prioOf(it)!.level].fg }} />}
                            <span className="shrink-0" style={{ color: COLORS.text }}>{it.company}</span>
                            {prioOf(it) && <span className="truncate">· {t(prioOf(it)!.why)}</span>}
                            <span className="shrink-0 ml-auto pl-2" style={{ color: '#a1a1aa' }} title={t('Raised by this routine')}>{routineOf(it.d).emoji} {t(routineOf(it.d).label)}</span>
                        </p>
                    </div>
                ) : (
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium flex items-center min-w-0" style={{ color: COLORS.text }}><KindTag it={it} /><span className={`truncate ${clickable ? 'hover:underline' : ''}`}>{it.title}</span></p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}><RoutineTag it={it} />{showCompany ? <>{it.company} · </> : null}{itemSub(it, t)}</p>
                    {prioOf(it) && <PrioLine p={prioOf(it)!} t={t} />}
                </div>
                )}
            </button>
            {(it.kind === 'review' || it.kind === 'reply') && <Button onClick={onOpen}>{t('Review')}</Button>}
            {/* AX: every row here is for review — no status pill (the Flag / Action tag says what it is) */}
            {!(ax && it.ws === 'review') && <div className="flex items-center gap-1.5 shrink-0">{tagsOf(it).map((s) => <WorkTag key={s} s={s} />)}</div>}
        </div>
        </>
    );
}

// ---- New task — say what needs doing, then choose who does it: EVA or a person ----------------
const TASK_TYPES = ['VAT reconciliation', 'Bank reconciliation', 'Payroll run', 'Debtor follow-up', 'Missing receipts', 'Month-end close', 'Annual report draft', 'Supplier invoice approval'];
const DUE: { key: Bucket; label: string }[] = [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This week' }, { key: 'later', label: 'Later' }];
let newId = 1;
const MY_CLIENT_NAMES = MY_PORTFOLIO.map((c) => c.name);
const TEAM_NAMES = TEAM.map((m) => m.name);

function NewTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (task: Task, eva: 'now' | 'scheduled' | null) => void }) {
    const { t } = useLang();
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState(MY_CLIENT_NAMES[0]);
    const [due, setDue] = useState<Bucket>('week');
    const [priority, setPriority] = useState<TPriority>('medium');
    const [who, setWho] = useState<'eva' | 'person'>('eva');
    const [when, setWhen] = useState<'now' | 'tonight' | 'tomorrow'>('now');
    const [person, setPerson] = useState(ME);
    const steps = evaStepsFor(title || 'task');
    const whenLabel = { now: 'Now', tonight: 'Tonight at 22:00', tomorrow: 'Tomorrow at 06:00' }[when];
    const create = () => {
        if (!title.trim()) return;
        const dueLabel = due === 'today' ? 'Today' : due === 'week' ? 'This week' : 'Later';
        const base = { id: `new-${newId++}`, title: title.trim(), company, dueLabel, bucket: due, priority };
        if (who === 'person') onCreate({ ...base, accountant: person, status: 'todo' }, null);
        else if (when === 'now') onCreate({ ...base, accountant: ME, status: 'todo' }, 'now');
        else onCreate({ ...base, accountant: ME, status: 'eva-scheduled', evaWhen: whenLabel }, 'scheduled');
    };
    const card = (on: boolean) => ({ border: `1.5px solid ${on ? '#7c3aed' : COLORS.cardBorder}`, background: on ? '#f7f4fd' : '#fff' });
    const inputStyle = { border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 560, maxHeight: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-base font-semibold flex-1" style={{ color: COLORS.text }}>{t('New task')}</p>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); create(); }} className="px-5 py-4 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('What needs doing?')}</label>
                        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('e.g. VAT reconciliation for Q3')} className="w-full mt-1.5 rounded-lg px-3 py-2 text-sm bg-white" style={inputStyle} />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {TASK_TYPES.map((x) => (
                                <button type="button" key={x} onClick={() => setTitle(x)} className="rounded-full px-2.5 py-1 text-xs" style={{ border: `1px solid ${title === x ? '#7c3aed' : COLORS.cardBorder}`, color: title === x ? '#6d28d9' : COLORS.textMuted, background: title === x ? '#f3f0fb' : '#fff' }}>{t(x)}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-3 m-stack" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)' }}>
                        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Client')}
                            <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full mt-1.5 rounded-lg px-2.5 py-2 text-sm bg-white normal-case font-normal tracking-normal" style={inputStyle}>
                                {MY_CLIENT_NAMES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Due')}
                            <select value={due} onChange={(e) => setDue(e.target.value as Bucket)} className="w-full mt-1.5 rounded-lg px-2.5 py-2 text-sm bg-white normal-case font-normal tracking-normal" style={inputStyle}>
                                {DUE.map((d) => <option key={d.key} value={d.key}>{t(d.label)}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Priority')}
                            <select value={priority} onChange={(e) => setPriority(e.target.value as TPriority)} className="w-full mt-1.5 rounded-lg px-2.5 py-2 text-sm bg-white normal-case font-normal tracking-normal" style={inputStyle}>
                                {(['high', 'medium', 'low'] as TPriority[]).map((p) => <option key={p} value={p}>{t(TPRIO[p].label)}</option>)}
                            </select>
                        </label>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: COLORS.textMuted }}>{t('Who should do it?')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setWho('eva')} className="rounded-xl p-3 text-left flex items-start gap-2.5" style={card(who === 'eva')}>
                                <span className="shrink-0 mt-0.5"><Orb size={20} /></span>
                                <span><span className="block text-sm font-semibold" style={{ color: COLORS.text }}>{t('EVA does it')}</span><span className="block text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t('EVA drafts it and hands it back for your review.')}</span></span>
                            </button>
                            <button type="button" onClick={() => setWho('person')} className="rounded-xl p-3 text-left flex items-start gap-2.5" style={card(who === 'person')}>
                                <span className="shrink-0 mt-0.5 flex items-center justify-center rounded-full" style={{ width: 20, height: 20, background: '#f1f1f3', color: '#52525b' }}><Icon name="contacts" /></span>
                                <span><span className="block text-sm font-semibold" style={{ color: COLORS.text }}>{t('A person does it')}</span><span className="block text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t('You or someone on the team — EVA can still help later.')}</span></span>
                            </button>
                        </div>
                    </div>

                    {who === 'eva' ? (
                        <div className="rounded-lg p-3.5 space-y-3" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>{t('When')}</span>
                                <SegmentedTabs value={when} onChange={(v) => setWhen(v as typeof when)} options={[{ value: 'now', label: t('Now') }, { value: 'tonight', label: t('Tonight at 22:00') }, { value: 'tomorrow', label: t('Tomorrow at 06:00') }]} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6d28d9' }}>{t('How EVA usually does it')}</p>
                                <ol className="flex flex-col gap-1" style={{ marginBottom: 0 }}>
                                    {steps.map((st, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}><span className="text-xs font-semibold mt-0.5" style={{ color: '#6d28d9', width: 12 }}>{i + 1}</span>{t(st)}</li>)}
                                </ol>
                            </div>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('Nothing is filed or sent without your approval.')}</p>
                        </div>
                    ) : (
                        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Assign to')}
                            <select value={person} onChange={(e) => setPerson(e.target.value)} className="w-full mt-1.5 rounded-lg px-2.5 py-2 text-sm bg-white normal-case font-normal tracking-normal" style={inputStyle}>
                                {TEAM_NAMES.map((n) => <option key={n} value={n}>{n === ME ? `${n} (${t('you')})` : n}</option>)}
                            </select>
                        </label>
                    )}
                </form>
                <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                    <Button appearance="primary" disabled={!title.trim()} onClick={create}>
                        {who === 'person' ? t(person === ME ? 'Add to my tasks' : 'Assign task') : when === 'now' ? t('Hand to EVA') : t('Schedule for EVA')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// What a task is — the description shown when you open it.
// What EVA prepared for a person's task (the call, the advice, the sign-off is theirs).
function evaPrepFor(title: string): string[] {
    const s = title.toLowerCase();
    if (s.includes('cash-flow')) return ['Built the 13-week cash forecast', 'Modelled four ways to bridge the dip in weeks 44–49', 'Proposed Thursday 14:00 and drafted the invite'];
    if (s.includes('quarterly review')) return ['Pulled Q3 results against the budget', 'Worked out what the new SKAT rule means for them', 'Drafted talking points for the meeting'];
    if (s.includes('sign off')) return ['Drafted the annual report', 'Reconciled every balance to the books', 'Listed the 3 judgement calls for you'];
    if (s.includes('concentration')) return ['Measured revenue per customer over 24 months', 'Compared with similar agencies', 'Drafted options and talking points'];
    if (s.includes('slower-paying')) return ['Tracked days-to-pay per customer', 'Found the 4 customers behind the slowdown', 'Drafted new payment terms to suggest'];
    if (s.includes('budget')) return ['Drafted the 2027 budget from actuals', 'Collected the owner’s goals', 'Prepared the client view to share'];
    if (s.includes('growth plan')) return ['Projected 12 months at the current growth', 'Checked cash and capacity', 'Drafted questions for the owner'];
    if (s.includes('hiring')) return ['Calculated the payroll cost of two hires', 'Ran it through the cash forecast', 'Updated the budget draft'];
    return ['Collected the numbers', 'Drafted talking points'];
}

// Work only a person should do: the client relationship, advice and professional sign-off.
// EVA prepares it; it can't be handed over.
export const isPeopleWork = (title: string) => /call|meeting|review meeting|advice|workshop|sign off|plan\b|hiring/i.test(title);

export function taskBriefFor(task: Task): string {
    const s = task.title.toLowerCase(), c = task.company;
    if (s.includes('cash-flow call')) return `Walk Ida through Café Solsikke’s 13-week cash forecast and agree how to bridge weeks 44–49 — collecting overdue invoices, spreading the Hamburg bill or a credit line.`;
    if (s.includes('quarterly review')) return `Go through ${c}’s Q3 with the owner: results against budget, project margins, and what the new SKAT reporting rule means for them.`;
    if (s.includes('sign off')) return `Review and sign ${c}’s annual report. EVA has drafted it and reconciled every balance — your professional sign-off is what’s left.`;
    if (s.includes('concentration')) return `${c} earns 41% of its revenue from one customer. Prepare advice on the risk and what to do before that contract renews next quarter.`;
    if (s.includes('slower-paying')) return `${c}’s customers pay 18 days slower than last quarter. Talk through payment terms and reminders with the owner.`;
    if (s.includes('budget 2027')) return `Build ${c}’s 2027 budget together with the owner, starting from EVA’s draft and their goals.`;
    if (s.includes('growth plan')) return `${c} is growing 22% a year. Plan the next 12 months with the owner — hiring, cash and pricing.`;
    if (s.includes('hiring plan')) return `${c} wants to hire two people. Work out what it means for payroll, cash and the budget.`;
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
export function TaskModal({ task, onClose, onHandToEva, onDone, onReopen }: { task: Task; onClose: () => void; onHandToEva?: () => void; onDone?: () => void; onReopen?: () => void }) {
    const { t } = useLang();
    const st = TSTATUS[task.status];
    const prio = TPRIO[task.priority];
    const eva = isEva(task.status);
    const people = !eva && isPeopleWork(task.title); // a person's task — EVA prepared it, it isn't handed over
    const stepsTitle = people ? 'What EVA prepared for you' : task.status === 'eva-running' ? 'What EVA is doing' : task.status === 'eva-scheduled' ? 'What EVA will do' : task.status === 'eva-done' ? 'What EVA did' : 'How EVA usually does it';
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
                        {eva && task.status !== 'eva-done' ? <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.fg }}><span className="rounded-full" style={{ width: 6, height: 6, background: st.dot }} />{t(st.label)}</span>
                            : workTagsFor(task).map((w) => <WorkTag key={w} s={w} />)}
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
                            {(people ? evaPrepFor(task.title) : evaStepsFor(task.title)).map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}>
                                    {task.status === 'eva-done' || people
                                        ? <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 16, height: 16, background: '#eef7ef', color: '#15803d', fontSize: 10 }}><Icon name="tick" /></span>
                                        : <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5 text-[10px] font-semibold" style={{ width: 16, height: 16, background: '#f1f1f3', color: '#52525b' }}>{i + 1}</span>}
                                    {t(s)}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{eva ? t('Full trace · you can always see what EVA did') : people ? t('EVA prepared this — the conversation and the call are yours.') : t('EVA can take this on and hand you a draft to approve.')}</span>
                    <div className="flex gap-2 shrink-0">
                        {task.status === 'done' ? <>
                            {onReopen && <Button onClick={onReopen}>{t('Reopen')}</Button>}
                            <Button onClick={onClose}>{t('Close')}</Button>
                        </> : <>
                        {!eva && onDone && <Button onClick={onDone}><Icon name="circle-tick" /> {t('Mark done')}</Button>}
                        {!eva && !people && onHandToEva ? <Button appearance="primary" onClick={onHandToEva}>{t('Hand to EVA')}</Button> : <Button onClick={onClose}>{t('Close')}</Button>}
                        </>}
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

