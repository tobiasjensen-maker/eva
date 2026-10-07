import { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Icon, useToast } from '@economic/taco';
import {
    COLORS,
    CANVAS,
    EconomicLogo,
    NodeMark,
    Orb,
    ProfileAvatar,
    TasksIcon,
    ReviewIcon,
    RoutinesIcon,
    ChatIcon,
    HomeIcon,
    InboxIcon,
    PracticeIcon,
    ConnectorsIcon,
    CustomersIcon,
    SidebarTooltip,
    CountBadge,
    COUNT_DOT,
    ScopeContext,
    useIsMobile,
} from './ui';

// An EVA draft waiting for review, as it appears in the activity log.
function decisionEntry(d: DecisionItem, live: boolean): LogEntry {
    const e = workEntry({ id: `log-${d.id}`, title: d.label, client: d.company, actor: 'EVA', decisionId: d.id, status: 'needs-review',
        desc: `EVA drafted “${d.label}” — ready for your review`, reasoning: [d.question, ...d.steps], suggestions: [d.confirm, d.alt] });
    return live ? { ...e, event: undefined } : { ...e, event: undefined, time: '07:40', at: undefined };
}

// Portfolio overview: the hero's soft blue → lilac wash is the screen's own background —
// shell and main alike (behind the sidebar too), fading into the canvas below the hero.
const HOME_BG = `linear-gradient(180deg, #edf3fb 0px, #f4f0fb 260px, ${CANVAS} 380px)`;

// The "done" confirmation: slides up, draws a check, a small burst — then gets out of the way.
type Celebrate = { key: number; verb: string; title: string; sub: string; undo?: () => void };
function DoneToast({ verb = 'Done', title, sub = 'Nice work — logged in Activity.', t, onUndo, onClose }: { verb?: string; title: string; sub?: string; t: (s: string) => string; onUndo?: () => void; onClose: () => void }) {
    const [leaving, setLeaving] = useState(false);
    useEffect(() => {
        const a = setTimeout(() => setLeaving(true), 3800), b = setTimeout(onClose, 4240);
        return () => { clearTimeout(a); clearTimeout(b); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const dots = [['#ed9b2c', -26, -20], ['#16a34a', 24, -24], ['#7c3aed', 30, 6], ['#ed9b2c', -30, 10], ['#16a34a', -6, -32], ['#7c3aed', 8, 28]] as const;
    return (
        <div role="status" aria-live="polite" className={`done-toast fixed z-[60] flex items-center gap-3 rounded-2xl bg-white pl-3 pr-2 py-2.5 ${leaving ? 'leaving' : ''}`}
            style={{ left: '50%', bottom: window.innerWidth < 768 ? 84 : 28, minWidth: Math.min(340, window.innerWidth - 24), maxWidth: 'min(520px, calc(100vw - 24px))', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1px solid #e9e9ec' }}>
            <span className="relative shrink-0" style={{ width: 32, height: 32 }}>
                {dots.map(([c, x, y], i) => <span key={i} className="done-dot absolute rounded-full" style={{ left: 13, top: 13, width: 6, height: 6, background: c, ['--bx' as string]: `${x}px`, ['--by' as string]: `${y}px` }} />)}
                <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden>
                    <circle cx="14" cy="14" r="12" fill="#e9f7ef" />
                    <circle className="done-ring" cx="14" cy="14" r="12" fill="none" stroke="#16a34a" strokeWidth="2" transform="rotate(-90 14 14)" />
                    <path className="done-tick" d="M8.5 14.5l3.5 3.5 7-7.5" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{t(verb)} · {title}</p>
                <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{t(sub)}</p>
            </div>
            {onUndo && <button onClick={onUndo} className="text-sm font-medium rounded-lg px-2.5 py-1.5" style={{ color: '#4456c7' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f6')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>{t('Undo')}</button>}
            <button onClick={() => { setLeaving(true); setTimeout(onClose, 420); }} aria-label={t('Close')} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
        </div>
    );
}

const SIDEBAR_BG = 'rgb(41, 40, 62)';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.10)';
import { INITIAL_SKILLS, INITIAL_SPACES, AGREEMENTS } from './data';
import type { Skill, Space, ViewId } from './types';
import ChatView from './views/ChatView';
import InsightsView, { INSIGHTS_PRICE, insightsAnswer, insightsIntro, insightsChips } from './views/InsightsView';
import { ACTIVITY_ENTRIES, reviewAnswer, isAdvisory, ActivityFeedView, workEntry, type LogEntry } from './views/ActivityView';
import SkillsView, { SYSTEM_CAPS, type ConnStatus } from './views/SkillsView';
import TaskManagementView, { AgreementSelector, tasksAnswer, TASKS, TaskModal, handTaskToEva, type WorkTab } from './views/TaskManagementView';
import { DecisionReview, ReplyReview } from './views/Decisions';
import { EconomicShell, journalAnswer } from './views/EconomicShell';
import { AX_HIDDEN_SKILLS, ScopeModeContext, initialScope, isPayroll, type Scope as ScopeMode } from './edition';
import type { ShareDraft } from './views/Attachment';
import OverviewView, { overviewAnswer } from './views/OverviewView';
import InboxView from './views/InboxView';
import PracticeView from './views/PracticeView';
import { THREADS, TEAM, CLIENTS as FIRM_CLIENT_LIST, MY_PORTFOLIO, rateOf, TARGET_RATE, type Thread } from './practice';
import SpacesView from './views/SpacesView';
import CustomersView from './views/CustomersView';
import { ChatPanel, type PendingAsk, type Turn } from './ChatPanel';
import { Onboarding } from './Onboarding';
import { LangContext, translate, type Lang } from './i18n';
import { SEED_DECISIONS, type DecisionItem, type ResolveInfo } from './day';
import { useEcoConnection } from './eco';
import { evaConfigured, evaToken, setEvaToken, evaConfig, evaIslandSrc } from './eva';

// Hide the live e-conomic connection UI for now (agreement picker's connected group,
// account-menu connection status, EVA connect, sidebar dot, Customers page). Flip to
// re-enable the whole connected-agreement layer.
const SHOW_CONNECTION = false;

// Global UI density — scale the whole app down a touch so more fits on larger
// screens (16"+). The shell compensates its width/height so it still fills the
// viewport with no gap. Bump toward 1 for larger, down for denser.
const APP_ZOOM = 1;

// EVA's post-onboarding greeting, shown as the first message in the side-panel on Cockpit.
const WELCOME_MSG =
    "Welcome! I'm EVA — I've just been through your whole portfolio. Across your 8 clients (4,80 mio. kr revenue) you have 214.500 kr overdue and 3 things worth a look first: Café Solsikke’s cash runway is under 2 months, Nordic Build ApS has your largest overdue exposure, and there’s an unusual 14.900 kr charge at Office Supplies Co. Where would you like to start?";

const RAIL: { id: ViewId; label: string; Icon: (p: { active: boolean }) => JSX.Element }[] = [
    // Chat is reached via the expand icon in the EVA side panel, not the rail.
    // Home is "My day" — EVA's conversational morning briefing (the landing surface).
    // Where the day starts: ask EVA, the day at a glance, and the whole client portfolio.
    // (Home and Clients merged; a client's deep analysis — the old Advisory page — opens from here.)
    { id: 'home', label: 'Portfolio overview', Icon: HomeIcon },
    // Work — one place: your plate + what EVA is handling (Tasks), what EVA has done
    // (Activity), and what's automated (Routines).
    { id: 'activity', label: 'Work', Icon: TasksIcon },
    // Every client conversation in one place.
    { id: 'inbox', label: 'Inbox', Icon: InboxIcon },
    // Live e-conomic data — only reachable when the dev proxy is available.
    ...(import.meta.env.DEV && SHOW_CONNECTION ? [{ id: 'customers' as ViewId, label: 'Customers', Icon: CustomersIcon }] : []),
    // The systems EVA works through (and the skills each exposes).
    { id: 'connectors', label: 'Connectors', Icon: ConnectorsIcon },
    // The office as a business — capacity, profitability, growth, playbooks.
    { id: 'practice', label: 'Practice', Icon: PracticeIcon },
    // (Advisory → a client's analysis, reached from Clients; Views → #/views, off the rail.)
];

// AX's menu — two places: Tasks (the queue of Actions and Flags, with the activity log as a tab) and the
// routine setup. (They reuse Work's views.)
const AX_RAIL: typeof RAIL = [
    // EVA, full screen — the same conversation as the docked panel (which steps aside while it's open)
    { id: 'chat', label: 'Chat', Icon: ChatIcon },
    { id: 'activity', label: 'Tasks', Icon: ReviewIcon },
    { id: 'skills', label: 'Routines', Icon: RoutinesIcon },
];
const AX_VIEWS: ViewId[] = ['activity', 'activitylog', 'skills', 'chat'];

// Work's tabs map to their own views/URLs, so each tab is linkable.
const WORK_TAB_OF: Partial<Record<ViewId, WorkTab>> & Record<'activity' | 'activitylog' | 'skills', WorkTab> = { activity: 'tasks', activitylog: 'activity', skills: 'routines' };
const WORK_VIEW_OF: Record<WorkTab, ViewId> = { tasks: 'activity', activity: 'activitylog', routines: 'skills' };

const VIEW_IDS: ViewId[] = ['home', 'inbox', 'practice', 'connectors', 'chat', 'insights', 'activity', 'activitylog', 'tasks', 'skills', 'spaces', 'customers'];

// Friendly URL slugs for each page (the Review page's internal id is 'activity';
// Artifacts kept the internal id 'spaces' — '#/spaces' is a legacy alias).
const VIEW_SLUG: Record<ViewId, string> = { home: 'home', inbox: 'inbox', clients: 'clients', practice: 'practice', connectors: 'connectors', chat: 'chat', activity: 'work', activitylog: 'activity', tasks: 'tasks', insights: 'insights', skills: 'routines', spaces: 'views', customers: 'customers' };
const SLUG_VIEW: Record<string, ViewId> = { home: 'home', 'my-day': 'home', today: 'home', inbox: 'inbox', clients: 'home', portfolio: 'home', overview: 'home', practice: 'practice', connectors: 'connectors', integrations: 'connectors', firm: 'practice', playbooks: 'practice', capacity: 'practice', chat: 'chat', work: 'activity', review: 'activity', cockpit: 'activity', tasks: 'activity', praksis: 'activity', activity: 'activitylog', insights: 'insights', routines: 'skills', skills: 'skills', views: 'spaces', artifacts: 'spaces', spaces: 'spaces', customers: 'customers' };

const ACCOUNT_ITEMS: { icon: string; label: string; badge?: boolean }[] = [
    { icon: 'search', label: 'Search' },
    { icon: 'circle-questionmark', label: 'Help & support' },
    { icon: 'settings', label: 'Settings' },
    { icon: 'bell-solid', label: 'Notifications', badge: true },
];

let spaceSeq = 100;
let skillSeq = 100;

export default function App() {
    const toast = useToast();
    const [view, setView] = useState<ViewId>(() => {
        const h = window.location.hash.replace(/^#\/?/, '');
        if (SLUG_VIEW[h]) return SLUG_VIEW[h];
        const saved = localStorage.getItem('va-view') as ViewId | null;
        // "My day" (Home) is the landing surface — EVA's conversational briefing.
        return saved && VIEW_IDS.includes(saved) ? saved : 'home';
    });
    useEffect(() => {
        localStorage.setItem('va-view', view);
    }, [view]);

    // Shared "your day" — decisions + advisory moments, so acting in Home ("My day")
    // is reflected in the Cockpit's Focus view and vice-versa.
    const [dayDecisions, setDayDecisions] = useState(SEED_DECISIONS);
    // Resolving a decision — from the overview, the Tasks board or the Activity log — is
    // one act, recorded on the decision and on its entry in the activity log.
    const resolveDecision = (id: string, taken: 'confirm' | 'alt', info: ResolveInfo = {}) => {
        const { backToYou = false, reason, fixed, overridden } = info;
        const d = dayDecisions.find((x) => x.id === id);
        if (d && !d.done) {
            // the same confirmation as a task done — with Undo that puts the draft back in your queue
            const before = activity.find((e) => e.decisionId === id);
            const undo = backToYou ? undefined : () => {
                setDayDecisions((all) => all.map((x) => (x.id === id ? { ...x, done: false, taken: undefined } : x)));
                if (before) setActivity((prev) => prev.map((e) => (e.decisionId === id ? before : e)));
            };
            setDoneToast({ key: Date.now(), title: d.label, undo,
                verb: fixed ? 'Fixed' : reason ? 'Dismissed' : backToYou ? 'Taken back' : taken === 'alt' ? 'Done' : 'Approved',
                sub: fixed ? 'EVA corrected the posting and logged it.' : reason ? 'EVA will remember why.' : backToYou ? 'It’s back on your To do.' : taken === 'alt' ? `You chose “${d.alt}” — logged in Activity.` : 'EVA takes it from here — logged in Activity.' });
        }
        setDayDecisions((all) => all.map((x) => (x.id === id ? { ...x, done: true, taken } : x)));
        if (!d) return;
        const choice = taken === 'alt' ? d.alt : d.confirm;
        setActivity((prev) => prev.map((e) => (e.decisionId === id ? {
            ...workEntry({ id: e.id, title: d.label, client: d.company, actor: 'you', decisionId: id, source: e.source, suggestions: e.suggestions,
                event: backToYou ? 'taken-back' : taken === 'alt' ? 'alternative' : 'approved',
                desc: backToYou ? `You took “${d.label}” back from EVA`
                    : fixed ? `You applied EVA’s correction to “${d.label}”${overridden ? ' (with your changes)' : ''}`
                    : reason ? `You dismissed EVA’s flag on “${d.label}”`
                    : `You reviewed EVA’s draft of “${d.label}” — ${choice}`,
                reasoning: [...(fixed ? [`Changed — ${fixed}.`, d.correction?.effect ?? ''] : []), ...(reason ? [`Your reason: ${reason}. EVA uses this to flag better next time.`] : []), ...e.reasoning].filter(Boolean),
                resolution: backToYou ? 'Taken back by you' : fixed ? 'Fixed by you' : reason ? 'Dismissed by you' : taken === 'alt' ? `You chose “${choice}”` : 'Approved by you' }),
        } : e)));
    };
    // A task handed to EVA in Work comes back as a decision in the same shared list.
    const addDecision = (d: DecisionItem) => {
        setDayDecisions((all) => [d, ...all]);
        setActivity((prev) => [decisionEntry(d, true), ...prev]);
    };
    const [routineOpen, setRoutineOpen] = useState(false);
    // AX: Work filtered to one client (from the overview's client list) — dropped once you leave Work.
    const [workClient, setWorkClient] = useState<string | null>(null);
    // (shared by Bookkeeping and Controlling in AX)
    useEffect(() => { if (!['activity', 'activitylog', 'skills', 'home', 'chat'].includes(view)) setWorkClient(null); }, [view]);
    const [newRoutineTick, setNewRoutineTick] = useState(0);
    // Connector status — shared by Routines (template gating) and the Connectors page.
    const [connStatus, setConnStatus] = useState<Record<string, ConnStatus>>(() => Object.fromEntries(SYSTEM_CAPS.map((c) => [c.id, 'connected' as ConnStatus])));
    // The work board's tasks — shared by Work and the Portfolio overview's "My tasks".
    const [tasks, setTasks] = useState(TASKS);
    // Client conversations — shared so the rail badge and client profiles stay in sync.
    const [threads, setThreads] = useState(THREADS);
    const [inboxFocus, setInboxFocus] = useState<string | null>(null);
    // A forecast/budget shared from a client: the Inbox opens with this drafted message + attachment.
    const [compose, setCompose] = useState<ShareDraft | null>(null);
    const needsReply = threads.filter((x) => x.status === 'needs').length;
    // Menu counts — one subtle badge style for every item.
    // Work's badge is its For review queue: EVA's drafts to review + client replies drafted in the Inbox.
    // Vision (the full product) vs AX (what we build first: agent management + period closing).
    const [scopeMode, setScopeModeState] = useState<ScopeMode>(initialScope);
    const ax = scopeMode === 'ax';
    // The logged-in accountant's open decisions — the Work badge and the overview count.
    // AX leaves payroll out — screens get these filtered lists; actions still update the full state.
    const decisionsShown = ax ? dayDecisions.filter((d) => !isPayroll(d.label)) : dayDecisions;
    const tasksShown = ax ? tasks.filter((x) => !isPayroll(x.title)) : tasks;
    const openDecisions = decisionsShown.filter((d) => !d.done && d.accountant === 'Tobias Holm Jensen').length;
    const setScopeMode = (m: ScopeMode) => {
        setScopeModeState(m);
        try {
            localStorage.setItem('va-scope', m);
            // a ?scope= link only sets the starting point — drop it so a refresh keeps your choice
            const url = new URL(window.location.href);
            if (url.searchParams.has('scope')) { url.searchParams.delete('scope'); window.history.replaceState(null, '', url.toString()); }
        } catch { /* ignore */ }
    };
    const rail = ax ? AX_RAIL : RAIL;
    // Menu colours: Vision's dark floating menu; AX's white menu flush in the overlay with dark icons.
    const sb = ax
        ? { bg: '#ffffff', fg: '#52525b', muted: '#71717a', activeFg: '#1c1b3a', activeBg: 'rgba(28, 27, 58, 0.07)', hover: 'rgba(28, 27, 58, 0.045)' }
        : { bg: SIDEBAR_BG, fg: 'rgba(255,255,255,0.65)', muted: 'rgba(255,255,255,0.6)', activeFg: '#ffffff', activeBg: 'rgba(255,255,255,0.12)', hover: 'rgba(255,255,255,0.06)' };
    useEffect(() => { if (ax && !AX_VIEWS.includes(view)) goView('activity'); }, [ax, view]); // eslint-disable-line react-hooks/exhaustive-deps
    // AX: Bookkeeping holds the whole queue — Actions (before booking) and Flags (findings on booked postings).
    const mineOpen = decisionsShown.filter((d) => !d.done && d.accountant === 'Tobias Holm Jensen');
    const badgeFor: Partial<Record<ViewId, number>> = ax
        ? { activity: mineOpen.length } // Bookkeeping: actions and flags, one queue
        : { inbox: needsReply, activity: openDecisions + needsReply };

    const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
    // AX: no payroll routine
    const skillsShown = ax ? skills.filter((sk) => sk.id !== 'payroll') : skills;
    const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
    const [activeSpace, setActiveSpace] = useState<Space | null>(null);
    // The activity log — EVA's own work plus everything done on the Tasks board.
    const [activity, setActivity] = useState<LogEntry[]>(() => [...SEED_DECISIONS.map((d) => decisionEntry(d, false)), ...ACTIVITY_ENTRIES]);
    const [activityFocus, setActivityFocus] = useState<string | null>(null);
    // Clicking a task (or an EVA draft) in the activity log opens the same modal as on the Tasks tab.
    const [logTask, setLogTask] = useState<string | null>(null);
    const [logDecision, setLogDecision] = useState<string | null>(null);
    // A client reply from the review queue opens in a modal (not the Inbox) and is sent from there.
    const [replyOpen, setReplyOpen] = useState<string | null>(null);
    const openReply = (th: Thread) => setReplyOpen(th.id);
    function sendReply(id: string, text: string, withAction: boolean) {
        setThreads((all) => all.map((x) => x.id !== id ? x : {
            ...x,
            status: withAction ? 'done' : 'waiting',
            suggestion: withAction ? undefined : x.suggestion,
            messages: [...x.messages, { from: 'firm', who: 'Tobias Holm Jensen', at: 'Now', text },
                ...(withAction && x.suggestion ? [{ from: 'eva' as const, who: 'EVA', at: 'Now', text: t(x.suggestion.result) }] : [])],
        }));
        setReplyOpen(null);
    }
    const openFromLog = (e: LogEntry) => {
        if (e.threadId) { const th = threads.find((x) => x.id === e.threadId && x.status === 'needs'); if (th) { openReply(th); return true; } }
        const openDecision = (id?: string) => { const d = id ? dayDecisions.find((x) => x.id === id && !x.done) : undefined; if (d) setLogDecision(d.id); return !!d; };
        if (openDecision(e.decisionId)) return true;
        if (e.taskId) {
            if (tasks.some((x) => x.id === e.taskId && x.status !== 'eva-running')) { setLogTask(e.taskId); return true; }
            if (openDecision(`d-${e.taskId}`)) return true; // handed to EVA — its draft is what's open now
        }
        return false; // EVA's own work (or a settled review): expand the entry in place
    };
    // Board moves (mark done, reopen, hand to EVA) are written to the log as they happen —
    // whichever surface made them (Work, the overview's My tasks, the task modal).
    // Marked done (overview, Work, a modal): a confirmation with a small celebration, and Undo.
    const [doneToast, setDoneToast] = useState<Celebrate | null>(null);
    const prevTasks = useRef(tasks);
    useEffect(() => {
        const before = new Map(prevTasks.current.map((x) => [x.id, x]));
        prevTasks.current = tasks;
        const logged: LogEntry[] = [];
        tasks.forEach((x) => {
            const was = before.get(x.id);
            if (!was || was.status === x.status || x.accountant !== 'Tobias Holm Jensen') return;
            const base = { title: x.title, client: x.company, actor: 'you' as const, taskId: x.id };
            const id = `w-${x.id}-${Date.now()}`;
            if (x.status === 'done') { const prev = was.status; setDoneToast({ key: Date.now(), verb: 'Done', title: x.title, sub: 'Nice work — logged in Activity.', undo: () => setTasks((all) => all.map((y) => (y.id === x.id ? { ...y, status: prev } : y))) }); }
            if (x.status === 'done') logged.push(workEntry({ ...base, id, event: 'done', desc: `You marked “${x.title}” done`, resolution: 'Done by you', reasoning: [`Moved to Done on the Tasks board (was due ${x.dueLabel.toLowerCase()}).`] }));
            else if (was.status === 'done') logged.push(workEntry({ ...base, id, event: 'reopened', desc: `You reopened “${x.title}”`, resolution: 'Reopened', reasoning: ['Moved back to To do on the Tasks board.'] }));
            else if (x.status === 'eva-running') logged.push(workEntry({ ...base, id, event: 'handed', desc: `You handed “${x.title}” to EVA`, resolution: 'Handed to EVA', reasoning: ['EVA drafts it and brings it back to you for review.'] }));
        });
        if (logged.length) setActivity((prev) => [...logged, ...prev]);
    }, [tasks]);
    // Client replies waiting on you are in the log as "ready for your review" (derived from the
    // threads, so they clear the moment you send); sending one is logged as done.
    const prevThreads = useRef(threads);
    useEffect(() => {
        const before = new Map(prevThreads.current.map((x) => [x.id, x]));
        prevThreads.current = threads;
        const logged: LogEntry[] = [];
        threads.forEach((x) => {
            const was = before.get(x.id);
            if (!was || was.status !== 'needs' || x.status === 'needs') return;
            const usedEva = !!was.suggestion && !x.suggestion;
            if (x.messages.length > was.messages.length) setDoneToast({ key: Date.now(), verb: 'Sent', title: `Reply to ${x.contact.split(' ')[0]}`, sub: usedEva && was.suggestion ? `EVA also: ${was.suggestion.result}` : 'Logged in Activity.' });
            logged.push(workEntry({ id: `w-${x.id}-${Date.now()}`, title: `Reply to ${x.contact.split(' ')[0]}`, client: x.client, actor: 'you', origin: 'inbox', skill: 'inbox', threadId: x.id, event: 'done',
                desc: x.status === 'done' && !usedEva && x.messages.length === was.messages.length ? `You closed “${x.subject}”` : `You replied to ${x.contact} — ${x.subject}`,
                resolution: usedEva ? 'Approved and sent by you' : 'Sent by you',
                reasoning: [...(usedEva && was.suggestion ? [`EVA also: ${was.suggestion.result}.`] : []), `Conversation with ${x.contact} in the Inbox.`] }));
        });
        if (logged.length) setActivity((prev) => [...logged, ...prev]);
    }, [threads]);
    const activityAll = useMemo<LogEntry[]>(() => [
        ...threads.filter((x) => x.status === 'needs').map((x) => ({
            ...workEntry({ id: `inbox-${x.id}`, title: `Reply to ${x.contact.split(' ')[0]}`, client: x.client, actor: 'EVA', origin: 'inbox', skill: 'inbox', threadId: x.id, status: 'needs-review',
                desc: x.suggestion ? `EVA drafted a reply to ${x.contact} — ${x.subject}` : `${x.contact} is waiting for your reply — ${x.subject}`,
                reasoning: x.suggestion ? [`Draft: “${x.suggestion.reply}”`, `When you send, EVA will also: ${x.suggestion.action.toLowerCase()}.`] : [] }),
            time: x.at.includes(':') ? x.at : '08:00', dateLabel: x.at.includes(':') ? 'Today' : x.at, daysAgo: x.at.includes(':') ? 0 : 1, bucket: (x.at.includes(':') ? 'today' : 'yesterday') as LogEntry['bucket'], at: undefined,
        })),
        ...activity,
    ], [threads, activity]);

    // Accepting or dismissing an EVA draft in the Activity log resolves the same decision.
    useEffect(() => {
        activity.forEach((e) => {
            if (!e.decisionId || e.status !== 'completed' || e.event) return;
            const d = dayDecisions.find((x) => x.id === e.decisionId);
            if (d && !d.done) resolveDecision(d.id, e.resolution === 'Dismissed' || e.resolution === d.alt ? 'alt' : 'confirm', { reason: e.feedback });
        });
    }, [activity]); // eslint-disable-line react-hooks/exhaustive-deps
    const mobile = useIsMobile();
    // Open/closed survives a refresh; first visit on a phone starts closed.
    const [chatCollapsed, setChatCollapsed] = useState(() => {
        const saved = localStorage.getItem('va-chat-collapsed');
        return saved !== null ? saved === '1' : typeof window !== 'undefined' && window.innerWidth < 768;
    });
    useEffect(() => {
        localStorage.setItem('va-chat-collapsed', chatCollapsed ? '1' : '0');
    }, [chatCollapsed]);
    const [pendingAsk, setPendingAsk] = useState<PendingAsk | null>(null);
    const [insightsPro, setInsightsPro] = useState(() => localStorage.getItem('va-insights-pro') === '1');
    useEffect(() => {
        localStorage.setItem('va-insights-pro', insightsPro ? '1' : '0');
    }, [insightsPro]);
    function upgradeInsights() {
        if (insightsPro) return;
        setInsightsPro(true);
        toast.success(`Financial Insights unlocked · ${INSIGHTS_PRICE} kr/month`);
    }
    const [accountOpen, setAccountOpen] = useState(false);
    const [, setEvaTick] = useState(0); // bump to re-render after the EVA token changes
    const [evaInput, setEvaInput] = useState(() => evaToken());
    // Live e-conomic connection — local dev only (the public build has no proxy), and
    // only when the connected-agreement layer is switched on.
    const ecoEnabled = import.meta.env.DEV && SHOW_CONNECTION;
    const eco = useEcoConnection(ecoEnabled);
    const ecoCompany = ecoEnabled && eco.status === 'connected' ? eco.company : 'e-conomic Topco';
    const ecoDot = eco.status === 'connected' ? '#22c55e' : eco.status === 'connecting' ? '#d4a72c' : '#9ca3af';
    // The real connected agreement, surfaced in the agreement picker when live.
    const liveAgreement =
        ecoEnabled && eco.status === 'connected'
            ? { id: `live-${eco.agreementNumber}`, name: eco.company, number: eco.agreementNumber }
            : null;
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('va-lang') === 'da' ? 'da' : 'en'));
    useEffect(() => {
        localStorage.setItem('va-lang', lang);
    }, [lang]);
    const t = (s: string) => translate(lang, s);
    // Hash routing — every page has its own URL (#/chat, #/review, …, plus #/onboarding).
    const [route, setRoute] = useState<string>(() => window.location.hash.replace(/^#\/?/, ''));
    useEffect(() => {
        const onHash = () => {
            const h = window.location.hash.replace(/^#\/?/, '');
            setRoute(h);
            if (SLUG_VIEW[h]) setView(SLUG_VIEW[h]);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    // On first load, make sure the URL reflects the current page so it's directly linkable.
    useEffect(() => {
        const h = window.location.hash.replace(/^#\/?/, '');
        if (!SLUG_VIEW[h] && h !== 'onboarding' && h !== 'economic') {
            history.replaceState(null, '', `#/${VIEW_SLUG[view]}`);
            setRoute(VIEW_SLUG[view]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    function navigate(slug: string) {
        window.location.hash = `#/${slug}`;
    }
    function goView(v: ViewId) {
        setView(v);
        navigate(VIEW_SLUG[v]);
    }
    const [welcome, setWelcome] = useState(false);
    // AX: EVA as an overlay on today's e-conomic (#/economic) — side panel first, then full screen.
    // The universe is the EVA app shown in a rounded container next to the docked panel (kept across a refresh).
    const ssGet = (k: string) => { try { return sessionStorage.getItem(k) === '1'; } catch { return false; } };
    const [ecoPanel, setEcoPanel] = useState(() => ssGet('va-eco-panel'));
    const [ecoUniverse, setEcoUniverse] = useState(() => ssGet('va-eco-universe'));
    const [ecoFlagged, setEcoFlagged] = useState(false);
    const showEco = route === 'economic' || (ecoUniverse && ax); // the universe overlay is an AX thing
    // Close the universe back to e-conomic — the EVA panel stays open (route set now, so the shell never unmounts).
    // It retracts into the panel first (eva-universe-out), then goes.
    const [ecoClosing, setEcoClosing] = useState(false);
    const closeUniverse = (alsoPanel = false) => {
        if (ecoClosing) return;
        setEcoClosing(true);
        setTimeout(() => { setEcoClosing(false); setEcoUniverse(false); if (alsoPanel) setEcoPanel(false); setEcoSeed((n) => n + 1); setRoute('economic'); navigate('economic'); }, 240);
    };
    const embedded = ecoUniverse && ax && !mobile;
    // AX: full-screen EVA has no side panel on any page — the panel *expands* into it (landing in Chat) and the
    // menu leads to the other pages; shrinking turns it back into the panel, same conversation.
    const [ecoSeed, setEcoSeed] = useState(0); // bump to reload the docked panel's conversation
    const ECO_CHAT_KEY = 'va-chat-msgs:eva-economic';
    const prevView = useRef(view);
    useEffect(() => {
        if (ax && prevView.current === 'chat' && view !== 'chat') setEcoSeed((n) => n + 1); // back from full screen
        prevView.current = view;
    }, [view, ax]);
    // AX: "Ask EVA" on a flag/action — Chat opens with the item explained (the panel's conversation continues)
    const askEvaAbout = (d: DecisionItem) => {
        let turns: Turn[] = [];
        try { turns = JSON.parse(sessionStorage.getItem(ECO_CHAT_KEY) ?? '[]'); } catch { /* none */ }
        const q = lang === 'da' ? `Fortæl mig om “${t(d.label)}” for ${d.company}` : `Tell me about “${d.label}” for ${d.company}`;
        const a = `${t(d.question)} ${t(d.recommend)}\n\n${lang === 'da' ? 'Det har jeg gjort' : 'What I did'}:\n• ${d.steps.map((x) => t(x)).join('\n• ')}`;
        try { sessionStorage.setItem(ECO_CHAT_KEY, JSON.stringify([...turns, { role: 'user', text: q }, { role: 'assistant', text: a }])); } catch { /* ignore */ }
        openAxChat();
    };
    const openAxChat = () => {
        let turns: Turn[] = [];
        try { turns = JSON.parse(sessionStorage.getItem(ECO_CHAT_KEY) ?? '[]'); } catch { /* none */ }
        setChatCarry(turns.length ? turns : null);
        setChatKey((k) => k + 1);
        if (view !== 'chat') setChatReturn(view);
        goView('chat');
    };
    useEffect(() => { try { sessionStorage.setItem('va-eco-panel', ecoPanel ? '1' : '0'); sessionStorage.setItem('va-eco-universe', ecoUniverse ? '1' : '0'); } catch { /* ignore */ } }, [ecoPanel, ecoUniverse]);
    const [chatKey, setChatKey] = useState(0);
    const [panelSeed, setPanelSeed] = useState(0); // bump to remount the EVA panel (e.g. to seed the welcome)
    // The conversation travels: panel → full-window chat on expand, and back again on close.
    const [chatCarry, setChatCarry] = useState<Turn[] | null>(null);
    const [panelCarry, setPanelCarry] = useState<{ view: ViewId; turns: Turn[] } | null>(null);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('va-collapsed') === '1');
    useEffect(() => {
        localStorage.setItem('va-collapsed', collapsed ? '1' : '0');
    }, [collapsed]);

    // (its own key — 'va-scope' is the Vision / AX switch)
    const [scope, setScope] = useState<string>(() => localStorage.getItem('va-agreement-scope') || 'portfolio');
    const [pendingScope, setPendingScope] = useState<string | null>(null);
    const [chatActive, setChatActive] = useState(false);
    const [chatReturn, setChatReturn] = useState<ViewId>('activity'); // where to return when closing full chat
    useEffect(() => {
        localStorage.setItem('va-agreement-scope', scope);
    }, [scope]);
    // With the connected-agreement layer hidden, clear any stale live scope / Customers view.
    useEffect(() => {
        if (SHOW_CONNECTION) return;
        if (scope.startsWith('live-')) setScope('portfolio');
        if (view === 'customers') setView('activity');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const nameOf = (s: string) => (s === 'portfolio' ? 'Portfolio' : liveAgreement && s === liveAgreement.id ? liveAgreement.name : AGREEMENTS.find((a) => a.id === s)?.name ?? 'Portfolio');
    const scopeName = scope === 'portfolio' ? 'All agreements' : nameOf(scope);
    // Review items (bookkeeping "Needs you") per client, for the scope picker.
    const reviewCounts = useMemo(() => {
        const m: Record<string, number> = {};
        activity.forEach((e) => { if ((e.status === 'needs-review' || e.status === 'failed') && !isAdvisory(e)) m[e.client] = (m[e.client] || 0) + 1; });
        return m;
    }, [activity]);

    function skillsAnswer(q: string): string {
        const s = q.toLowerCase();
        const active = skills.filter((x) => x.state === 'active').length;
        const da = lang === 'da';
        if (/which|enable|recommend|should|next|flow|hvilke|aktiver|anbefal/.test(s))
            return da
                ? `Du har ${active} aktive flows. Ud fra dine bøger ville jeg sætte “Indsaml manglende bilag” og “Afslut bøgerne” op som de næste — de sparer mest manuelt arbejde.`
                : `You have ${active} flows running. Based on your books I'd set up “Collect missing documents” and “Close the books” next — they'd save the most manual work.`;
        if (/reconcil|bank|afstem/.test(s))
            return da
                ? 'Bankafstemning matcher ind- og udbetalinger med fakturaer og regninger og bogfører dem på den rigtige konto — du gennemgår kun det, der har lav sikkerhed.'
                : 'Bank reconciliation matches incoming and outgoing payments to invoices and bills, then books them to the right account — you only review anything low-confidence.';
        if (/remind|rykker/.test(s))
            return da
                ? 'Rykker-handlingen overvåger forfaldne fakturaer og sender den rigtige skabelon pr. klient og sprog, logger en note og følger automatisk op.'
                : 'The reminders skill watches overdue invoices and sends the right template per client and language, logs a note, and follows up automatically.';
        return da
            ? 'Hver handling automatiserer én opgave — afstemning, rykkere, bilagsindsamling, overvågning og mere. Åbn en handling for at sætte dens udløser, autonomi og værn. Hvad vil du automatisere?'
            : 'Each skill automates one job — reconciliation, reminders, document collection, monitoring and more. Open a skill to set its trigger, autonomy and guardrails. What do you want to automate?';
    }
    // Firm-level questions — capacity, profitability, who needs you — for Clients / Inbox / Practice.
    function firmAnswer(q: string): string {
        const s = q.toLowerCase();
        const da = lang === 'da';
        if (/capacity|over|busy|utili|kapacitet|travl|team/.test(s)) {
            const over = TEAM.filter((m) => m.booked > m.capacity).map((m) => m.name.split(' ')[0]);
            const room = TEAM.filter((m) => m.booked / m.capacity < 0.65).map((m) => m.name.split(' ')[0]);
            return da ? `${over.join(', ')} er over kapacitet; ${room.join(', ')} har plads. Jeg foreslår at flytte 3 af Mettes kunder til Jonas (31 t/md).` : `${over.join(', ')} is over capacity; ${room.join(', ')} has room. I’d move 3 of Mette’s clients to Jonas (31 h/mo) — it’s ready to apply under Practice → Capacity.`;
        }
        if (/profit|rate|price|pris|lønsom|margin/.test(s)) {
            const low = FIRM_CLIENT_LIST.filter((c) => rateOf(c) < TARGET_RATE).sort((a, b) => rateOf(a) - rateOf(b)).slice(0, 3).map((c) => `${c.name} (${rateOf(c)} kr/h)`);
            return da ? `Mindst lønsomme: ${low.join(', ')}. Faste pakker og to rutiner mere ville give ca. 11.000 kr/md.` : `Least profitable right now: ${low.join(', ')}. Fixed-fee packages plus two more routines would add about 11.000 kr a month.`;
        }
        if (/advis|ready|sell|opportun|grow|vækst|salg/.test(s))
            return da ? 'Fire kunder vokser 10%+ uden rådgivning — Grøn Energi, Cloud Hosting, Fjord Fitness og Nordic Build. Det er ca. 32.000 kr/md i en kvartalspakke.' : 'Four clients are growing 10%+ with no advisory yet — Grøn Energi, Cloud Hosting, Fjord Fitness and Nordic Build. That’s about 32.000 kr/mo as a quarterly package; the proposals are one click under Practice → Growth.';
        if (/wait|reply|inbox|message|svar|besked|venter/.test(s))
            return da ? `${needsReply} samtaler venter på dig; jeg har foreslået næste skridt i hver. To venter på kunden — jeg rykker automatisk.` : `${needsReply} conversations need you — I’ve proposed the next step in each. Two are waiting on the client; I’ll follow up automatically.`;
        return da ? 'Spørg mig om kapacitet, lønsomhed pr. kunde, hvem der er klar til rådgivning, eller hvad der venter i indbakken.' : 'Ask me about team capacity, profitability per client, who’s ready for an advisory conversation, or what’s waiting in the inbox.';
    }
    function spacesAnswer(q: string): string {
        const s = q.toLowerCase().replace(/[?.!]/g, '').trim();
        const da = lang === 'da';
        if (activeSpace)
            return da
                ? `Det klarer jeg — jeg ${s} for “${activeSpace.title}” og opdaterer det live.`
                : `On it — I'll ${s} for “${activeSpace.title}” and update it live.`;
        if (/dashboard|revenue|omsætning/.test(s))
            return da
                ? 'Jeg kan bygge et omsætningsdashboard med månedlig udvikling, periodesammenligning og en prognose. Skal jeg oprette det nu?'
                : 'I can build a revenue dashboard with a monthly trend, period comparison and a forecast. Want me to create it now?';
        if (/receivable|aged|report|debitor|rapport/.test(s))
            return da
                ? 'En aldersfordelt debitorrapport grupperer åbne fakturaer i 0–30 / 31–60 / 61–90 / 90+ dage og fremhæver den største eksponering. Jeg kan gemme den som et artefakt.'
                : 'An aged receivables report buckets open invoices by 0–30 / 31–60 / 61–90 / 90+ days and flags the worst exposure. I can save it as an artifact.';
        return da
            ? 'Et artefakt er et genanvendeligt dashboard, en rapport, en liste eller en formular bygget på dine data. Fortæl mig, hvad du vil se, så opretter jeg det.'
            : 'An artifact is a reusable dashboard, report, list or form built from your data. Tell me what you want to see and I’ll create it.';
    }

    // The contextual EVA chat panel (third shell block) — present on every content page.
    const subjectLabel = scope === 'portfolio' ? (lang === 'da' ? 'din portefølje' : 'your portfolio') : scopeName;
    const chatPanel =
        view === 'home'
            ? {
                  subtitle: 'portfolio assistant',
                  intro: "I'm EVA. Ask me about your day, one of your clients, or who in your portfolio is ready for an advisory conversation.",
                  chips: ['Walk me through my day', 'Which of my clients need attention?', 'Who are my least profitable clients?'],
                  respond: (q: string) => overviewAnswer(q, lang, { decisions: openDecisions, replies: needsReply, ax }),
              }
        : view === 'inbox'
            ? {
                  subtitle: 'inbox assistant',
                  intro: "I'm EVA. I ask clients for missing details, follow up when they go quiet, and draft the next step when they reply. What do you need?",
                  chips: ['What’s waiting on me?', 'Summarise today’s client replies', 'Who hasn’t answered yet?'],
                  respond: firmAnswer,
              }
        : view === 'practice'
            ? {
                  subtitle: 'practice assistant',
                  intro: "I'm EVA. Ask me about your team's capacity, which clients are profitable, and where the practice can grow.",
                  chips: ['Who on my team is over capacity?', 'Which clients should we reprice?', 'What could we sell next?'],
                  respond: firmAnswer,
              }
        : view === 'activity'
            ? {
                  subtitle: 'practice assistant',
                  intro: "I'm EVA. Ask me what I've taken over, what's waiting on your approval, who's overloaded, or what's due this week.",
                  chips: ['What has EVA taken over?', 'What’s waiting on my approval?', 'Who has the most on their plate?'],
                  respond: (q: string) => tasksAnswer(q, lang),
              }
        : view === 'activitylog'
            ? {
                  subtitle: 'review assistant',
                  intro: "I'm EVA. Ask me about your review queue — or hit “Ask EVA” on a flagged item and I'll explain my thinking.",
                  chips: ['What needs my attention most?', 'Summarize today’s actions', 'Anything risky?'],
                  respond: (q: string) => reviewAnswer(activity, q, lang),
              }
            : view === 'insights'
            ? {
                  subtitle: 'insights analyst',
                  intro: insightsIntro(insightsPro, subjectLabel, lang),
                  chips: insightsChips(insightsPro),
                  respond: (q: string) => insightsAnswer(scope, insightsPro, subjectLabel, q, lang),
              }
            : view === 'connectors'
            ? {
                  subtitle: 'connectors assistant',
                  intro: "I'm EVA. Connectors are the systems I work through — each one gives me skills. Ask what a connector lets me do, or what to connect next.",
                  chips: ['What can EVA do with Zenegy?', 'Which connector should we add next?', 'What happens if a connection is lost?'],
                  respond: skillsAnswer,
              }
            : view === 'skills'
            ? {
                  subtitle: 'routines assistant',
                  intro: "I'm EVA. I can help you set up a routine, explain the skills each one uses, or show what I can do with your data and partner integrations. What are you trying to get done?",
                  chips: ['Which routines should I set up?', 'What does bank reconciliation do?', 'Help me set up reminders'],
                  respond: skillsAnswer,
              }
            : view === 'spaces'
            ? {
                  subtitle: activeSpace ? 'about this view' : 'views assistant',
                  intro: activeSpace
                      ? (lang === 'da'
                          ? `Bed mig forfine “${activeSpace.title}” — tilføj en prognose, filtrér den, eller eksportér den.`
                          : `Ask me to refine “${activeSpace.title}” — add a forecast, filter it, or export it.`)
                      : "I'm EVA. Tell me what you want to track and I'll render a view — a dashboard, report, list or form.",
                  chips: activeSpace
                      ? ['Add a forecast', 'Filter to last quarter', 'Export as PDF']
                      : ['Build a revenue dashboard', 'Create an aged receivables report', 'What can a view do?'],
                  respond: spacesAnswer,
              }
            : null;
    // Remount the panel (fresh conversation) when the page, the open artifact, or the language changes.
    // One EVA across every screen: the same panel, the same conversation, one intro — it
    // doesn't reset or rename itself per page. (It still knows which page you're on when it answers.)
    const panelKey = 'eva-' + lang + panelSeed;
    const EVA_INTRO = "I'm EVA. Ask me about your day, your clients, your work or your practice — I'll take it from there.";
    const EVA_CHIPS = ax ? ['Walk me through my day', 'What’s left to close September?', 'What did EVA do overnight?'] : ['Walk me through my day', 'What’s waiting on me?', 'Which of my clients need attention?'];
    const activityShown = ax ? activityAll.filter((e) => !AX_HIDDEN_SKILLS.has(e.skill) && !isPayroll(e.title ?? e.desc)) : activityAll;

    function applyScope(s: string) {
        setScope(s);
        setChatKey((k) => k + 1); // reset the chat — context changed
        setPendingScope(null);
    }
    function chooseScope(s: string) {
        if (s === scope) return;
        // Warn only if there's a live conversation to lose
        if (view === 'chat' && chatActive) {
            setPendingScope(s);
        } else {
            applyScope(s);
        }
    }

    function enableSkill(id: string) {
        setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, state: 'active', stat: 'Just enabled' } : s)));
        const sk = skills.find((s) => s.id === id);
        if (sk) toast.success(`Enabled “${sk.title}” for ${sk.price} DKK/month`);
    }

    // A custom skill created from a data view in the chat ("Automate this").
    function createSkillFromChat(title: string, description: string) {
        setSkills((prev) => [...prev, {
            id: `custom-${skillSeq++}`,
            emoji: '🪄',
            title,
            description,
            color: '#8b46d6',
            state: 'active',
            stat: t('Just created'),
        }]);
        toast.success(lang === 'da' ? `Flow “${title}” oprettet` : `Created flow “${title}”`);
    }

    function addSpace(title: string, description: string) {
        const t = title.toLowerCase();
        const emoji = /dashboard|revenue|chart|trend/.test(t)
            ? '📊'
            : /report|receivable|aged|summary/.test(t)
            ? '📈'
            : /form|expense/.test(t)
            ? '🧾'
            : /invoice|template/.test(t)
            ? '📄'
            : /customer|client/.test(t)
            ? '👥'
            : /budget|cost/.test(t)
            ? '💰'
            : '🗂️';
        const space: Space = { id: `sp-${spaceSeq++}`, title, description, updated: 'Jun 4, 2026', messages: 1, emoji, source: 'eva' };
        setSpaces((prev) => [space, ...prev]);
        toast.success(`Created artifact “${title}”`);
    }

    const panelShadow = '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)';

    return (
        <LangContext.Provider value={{ lang, setLang, t }}>
        <ScopeModeContext.Provider value={{ scope: scopeMode, ax, setScope: setScopeMode }}>
        <ScopeContext.Provider value={{ scope, onChoose: chooseScope, liveAgreement, reviewCounts }}>
        <div className={`flex ${mobile ? 'flex-col' : ''} ${embedded ? (ecoClosing ? 'eva-universe-out' : 'eva-universe-in') : ''}`} style={mobile
            ? { width: '100%', height: '100%', background: view === 'home' && !ax ? HOME_BG : CANVAS }
            : embedded
            // the EVA universe over e-conomic: a rounded container left of the docked EVA panel
            // (right edge meets the docked panel, which carries on the same canvas — one plane; the shadow is
            // cast left only, so no seam shows. No lasting clip-path: it would cut modal backdrops off at the panel.)
            ? { position: 'fixed', top: 10, left: 10, bottom: 10, right: 10, zIndex: 61, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(15, 14, 40, 0.35)', background: view === 'home' && !ax ? HOME_BG : CANVAS, padding: 10, gap: 10 }
            : { zoom: APP_ZOOM, width: `calc(100vw / ${APP_ZOOM})`, height: `calc(100vh / ${APP_ZOOM})`, background: view === 'home' && !ax ? HOME_BG : CANVAS, padding: 10, gap: 10 }}>
            {/* Left sidebar — floating (desktop; phones get the bottom tabs) */}
            {!mobile && (
            <aside
                className={`flex flex-col shrink-0 ${ax ? '' : 'rounded-2xl'}`}
                style={{
                    width: collapsed ? 68 : ax ? 180 : 240, // AX: a quarter narrower
                    background: sb.bg,
                    // AX: no card of its own — flush to the container's top, left and bottom edges (in the overlay it
                    // takes the overlay's rounded corners), pulled out over the shell's 10px padding
                    ...(ax ? { margin: '-10px 0 -10px -10px', borderRight: '1px solid #e9e9ec' } : { border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: panelShadow }),
                    transition: 'width .18s ease',
                }}
            >
                {/* Brand + collapse toggle */}
                <div
                    className="flex items-center"
                    style={{ height: 60, justifyContent: collapsed ? 'center' : 'space-between', paddingLeft: collapsed ? 0 : 16, paddingRight: collapsed ? 0 : 8 }}
                >
                    {collapsed ? (
                        <button
                            onClick={() => setCollapsed(false)}
                            title="Expand sidebar"
                            className="rounded-md p-1.5"
                            onMouseEnter={(e) => (e.currentTarget.style.background = sb.hover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            {ax ? <Orb size={24} /> : <NodeMark size={24} />}
                        </button>
                    ) : (
                        <>
                            <span className="flex items-center gap-2">
                                {ax ? <span className="flex items-center gap-2"><Orb size={24} /><span className="text-base font-semibold" style={{ color: '#1c1b3a' }}>EVA</span></span> : <EconomicLogo white />}
                            </span>
                            <button
                                onClick={() => setCollapsed(true)}
                                title="Collapse sidebar"
                                className="rounded-md p-1.5"
                                style={{ color: sb.muted }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = sb.hover)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <Icon name="layout-first" />
                            </button>
                        </>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1 mt-3" style={{ paddingLeft: collapsed ? 10 : 12, paddingRight: collapsed ? 10 : 12 }}>
                    {rail.map(({ id, label: railLabel, Icon: RIcon }) => {
                        // The Activity log is a subpage of Cockpit — keep Cockpit lit while there.
                        // Sub-pages keep their parent lit: Work's Activity and Routines tabs, a client's analysis under the overview.
                        const active = ax ? view === id || (id === 'activity' && view === 'activitylog') : view === id || (id === 'activity' && (view === 'activitylog' || view === 'skills')) || (id === 'home' && view === 'insights');
                        const label = t(railLabel);
                        return (
                            <SidebarTooltip key={id} label={label} show={collapsed}>
                            <button
                                onClick={() => (ax && id === 'chat' ? openAxChat() : goView(id))}
                                className="flex items-center gap-3 rounded-lg text-sm text-left w-full"
                                style={{
                                    padding: collapsed ? '9px 0' : '8px 12px',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    background: active ? sb.activeBg : 'transparent',
                                    color: active ? sb.activeFg : sb.fg,
                                    fontWeight: active ? 600 : 500,
                                }}
                                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = sb.hover; }}
                                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span className="relative flex items-center shrink-0">
                                    <RIcon active={active} />
                                    {collapsed && (badgeFor[id] ?? 0) > 0 && (
                                        <span className="absolute rounded-full" style={{ top: -3, right: -4, width: 7, height: 7, background: ax ? '#ed9b2c' : COUNT_DOT, border: `2px solid ${sb.bg}` }} />
                                    )}
                                </span>
                                {!collapsed && <span className="flex-1">{label}</span>}
                                {!collapsed && <CountBadge n={badgeFor[id] ?? 0} onDark={!ax} />}
                            </button>
                            </SidebarTooltip>
                        );
                    })}
                </nav>

                <div className="flex-1" />

                {/* Account (bottom) — not in AX: AX is the EVA overlay on e-conomic, whose header owns the profile.
                    (Switch scope with ?scope=vision / ?scope=ax.) */}
                {!ax && (
                <div className="relative" style={{ padding: collapsed ? 8 : 12 }}>
                    {accountOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setAccountOpen(false)} />
                            <div
                                className="absolute z-40 rounded-xl bg-white overflow-hidden anim-in"
                                style={
                                    collapsed
                                        ? { left: 'calc(100% - 2px)', bottom: 8, width: 224, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }
                                        : { left: 12, right: 12, bottom: 58, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.14)' }
                                }
                            >
                                {/* Live e-conomic connection status (via the dev proxy) — dev only */}
                                {ecoEnabled && (
                                <div className="flex items-start gap-2.5 px-3 py-2.5" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, marginTop: 4, background: ecoDot }} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium" style={{ color: COLORS.text }}>
                                            {eco.status === 'connected' ? t('Connected to e-conomic') : eco.status === 'connecting' ? t('Connecting to e-conomic…') : t('Not connected')}
                                        </div>
                                        <div className="text-xs truncate" style={{ color: COLORS.textMuted }} title={eco.status === 'error' ? eco.error : undefined}>
                                            {eco.status === 'connected'
                                                ? `${eco.company} · ${t('Agreement')} ${eco.agreementNumber}`
                                                : eco.status === 'error'
                                                    ? eco.error
                                                    : t('Verifying tokens…')}
                                        </div>
                                    </div>
                                </div>
                                )}
                                {/* EVA assistant connection (sandbox) — dev only. Inline input (no window.prompt). */}
                                {ecoEnabled && (
                                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: evaConfigured() ? '#22c55e' : '#9ca3af' }} />
                                        <span className="text-sm font-medium" style={{ color: COLORS.text }}>{evaConfigured() ? t('EVA assistant connected') : t('Connect EVA assistant')}</span>
                                        {evaConfigured() && (
                                            <button onClick={() => { setEvaToken(''); setEvaInput(''); setEvaTick((n) => n + 1); toast.information('EVA disconnected'); }} className="ml-auto text-xs" style={{ color: COLORS.textMuted }}>{t('Disconnect')}</button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="password"
                                            value={evaInput}
                                            onChange={(e) => setEvaInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && evaInput.trim()) { setEvaToken(evaInput.trim()); setEvaTick((n) => n + 1); toast.information('EVA connected'); } }}
                                            placeholder={t('Paste Plex token')}
                                            className="flex-1 min-w-0 rounded-md px-2 py-1 text-xs outline-none"
                                            style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, background: '#fafafa' }}
                                        />
                                        <button
                                            onClick={() => { if (evaInput.trim()) { setEvaToken(evaInput.trim()); setEvaTick((n) => n + 1); toast.information('EVA connected'); } }}
                                            disabled={!evaInput.trim()}
                                            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium"
                                            style={{ background: evaInput.trim() ? '#4c6ef5' : '#e4e4e7', color: evaInput.trim() ? '#fff' : '#b0b0b8', cursor: evaInput.trim() ? 'pointer' : 'not-allowed' }}
                                        >
                                            {t('Connect')}
                                        </button>
                                    </div>
                                </div>
                                )}
                                {ACCOUNT_ITEMS.map((it) => (
                                    <button
                                        key={it.label}
                                        onClick={() => { toast.information(t(it.label)); setAccountOpen(false); }}
                                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                        style={{ color: COLORS.text }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Icon name={it.icon as never} style={{ color: COLORS.textMuted }} />
                                        <span className="flex-1">{t(it.label)}</span>
                                        {it.badge && <span className="rounded-full" style={{ width: 7, height: 7, background: '#ef4444' }} />}
                                    </button>
                                ))}
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                {/* Scope — the full Vision, or AX (what we build first) */}
                                <div className="flex items-center gap-3 px-3 py-2.5">
                                    <Icon name="layout" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1 text-sm" style={{ color: COLORS.text }}>{t('Scope')}</span>
                                    <div className="flex items-center rounded-lg p-0.5" style={{ background: '#f1f1f3' }}>
                                        {(['vision', 'ax'] as ScopeMode[]).map((m) => (
                                            <button key={m} onClick={() => { setScopeMode(m); if (m === 'ax') { setAccountOpen(false); setEcoUniverse(false); setEcoPanel(false); navigate('economic'); } }} className="rounded-md text-xs font-semibold" title={t(m === 'ax' ? 'Agent management and period closing — what we build first' : 'The full product vision')}
                                                style={{ padding: '3px 9px', background: scopeMode === m ? '#fff' : 'transparent', color: scopeMode === m ? COLORS.text : COLORS.textMuted, boxShadow: scopeMode === m ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                                                {m === 'ax' ? 'AX' : t('Vision')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Language — for demoing in Danish */}
                                <div className="flex items-center gap-3 px-3 py-2.5">
                                    <Icon name="website" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1 text-sm" style={{ color: COLORS.text }}>{t('Language')}</span>
                                    <div className="flex items-center rounded-lg p-0.5" style={{ background: '#f1f1f3' }}>
                                        {(['en', 'da'] as Lang[]).map((l) => (
                                            <button
                                                key={l}
                                                onClick={() => setLang(l)}
                                                className="rounded-md text-xs font-semibold"
                                                style={{
                                                    padding: '3px 9px',
                                                    background: lang === l ? '#fff' : 'transparent',
                                                    color: lang === l ? COLORS.text : COLORS.textMuted,
                                                    boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                                }}
                                            >
                                                {l === 'en' ? 'EN' : 'DA'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                {ax && (
                                    <button
                                        onClick={() => { if (ecoUniverse) closeUniverse(); else navigate('economic'); setAccountOpen(false); }}
                                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                        style={{ color: COLORS.text }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Icon name="arrow-left" style={{ color: COLORS.textMuted }} />
                                        <span className="flex-1">{t('Back to e-conomic')}</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { navigate('onboarding'); setAccountOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                    style={{ color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Icon name="play" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1">{t('Replay onboarding')}</span>
                                </button>
                                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                                <button
                                    onClick={() => { toast.information('Log out'); setAccountOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm"
                                    style={{ color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Icon name="log-out" style={{ color: COLORS.textMuted }} />
                                    <span className="flex-1">{t('Log out')}</span>
                                </button>
                            </div>
                        </>
                    )}

                    <SidebarTooltip label={t('Account settings')} show={collapsed}>
                    <button
                        onClick={() => setAccountOpen((o) => !o)}
                        className="flex items-center gap-2 w-full rounded-lg"
                        style={{
                            padding: collapsed ? 4 : '6px 8px',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            border: `1px solid ${accountOpen ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
                            background: accountOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!accountOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={(e) => { if (!accountOpen) e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span className="relative shrink-0">
                            <ProfileAvatar size={28} />
                        </span>
                        {!collapsed && (
                            <>
                                <span className="flex-1 min-w-0 text-xs truncate text-left">
                                    <span className="font-medium" style={{ color: '#ffffff' }}>Tobias Holm Jensen</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}> · </span>
                                    {ecoEnabled && <span className="inline-block rounded-full align-middle" style={{ width: 6, height: 6, background: ecoDot, marginRight: 4 }} />}
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{ecoCompany}</span>
                                </span>
                                <Icon name={accountOpen ? 'chevron-up' : 'chevron-down'} className="shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />
                            </>
                        )}
                    </button>
                    </SidebarTooltip>
                </div>
                )}
            </aside>
            )}

            {/* Main content — floating */}
            <main
                className={`flex-grow overflow-hidden min-h-0 ${mobile ? '' : 'rounded-2xl'}`}
                style={{ background: view === 'chat' ? '#fff' : view === 'home' ? 'transparent' : CANVAS }}
            >
                {view === 'chat' && (
                    <ChatView
                        key={chatKey}
                        skills={skillsShown}
                        spaces={spaces}
                        onEnableSkill={enableSkill}
                        onNavigate={goView}
                        onCreateSpace={(title) => addSpace(title, 'Generated from a chat conversation.')}
                        onCreateSkill={createSkillFromChat}
                        seedWelcome={welcome}
                        onWelcomeConsumed={() => setWelcome(false)}
                        scope={scope}
                        scopeName={scopeName}
                        onActiveChange={setChatActive}
                        analyticsUnlocked={insightsPro}
                        onSelectClient={applyScope}
                        seedTurns={chatCarry}
                        onMinimise={embedded ? () => closeUniverse() : undefined}
                        // AX: the same client picker as on Tasks (shared client), instead of the agreement pill
                        headerLeft={ax ? <AgreementSelector align="left" value={workClient} onChange={setWorkClient} counts={Object.fromEntries(MY_PORTFOLIO.map(({ name: n }) => [n, decisionsShown.filter((d) => !d.done && d.accountant === 'Tobias Holm Jensen' && d.company === n).length]))} /> : undefined}
                        onTurns={ax ? (turns) => { try { sessionStorage.setItem(ECO_CHAT_KEY, JSON.stringify(turns)); } catch { /* ignore */ } } : undefined}
                        onClose={(turns) => {
                            // AX overlay: X closes EVA altogether, like the docked panel's X (conversation is already saved)
                            if (embedded) { setChatCarry(null); closeUniverse(true); return; }
                            setPanelCarry(turns.length ? { view: chatReturn, turns } : null); setChatCarry(null); setChatCollapsed(false); goView(chatReturn);
                        }}
                    />
                )}
                {view === 'inbox' && <InboxView threads={threads} setThreads={setThreads} focusClient={inboxFocus} compose={compose} onComposeConsumed={() => setCompose(null)} />}
                {view === 'practice' && <PracticeView />}
                {view === 'home' && (
                    <OverviewView
                        tasks={tasksShown}
                        setTasks={setTasks}
                        onAddDecision={addDecision}
                        decisions={decisionsShown}
                        threads={threads}
                        onOpenThread={openReply}
                        onResolveDecision={resolveDecision}
                        onGo={goView}
                        clientFilter={workClient}
                        onClientChange={setWorkClient}
                        // The question box hands off to the EVA panel, answer included.
                        onAsk={(q) => { setPendingAsk({ user: q, answer: overviewAnswer(q, lang, { decisions: openDecisions, replies: needsReply, ax }) }); setChatCollapsed(false); }}
                        onMessage={(client) => { setInboxFocus(client); goView('inbox'); }}
                        onShare={(d) => { setCompose(d); goView('inbox'); }}
                        onOpenBooks={(name) => {
                            // Clients that are also agreements open their analysis in scope; the rest in a new tab.
                            const a = AGREEMENTS.find((x) => x.name === name);
                            if (a) { applyScope(a.id); goView('insights'); }
                            else toast.information(lang === 'da' ? `Åbner ${name}s regnskab i en ny fane` : `Opening ${name}’s books in a new tab`);
                        }}
                    />
                )}
                {view === 'insights' && <InsightsView scope={scope} scopeName={scopeName} live={!!liveAgreement && scope === liveAgreement.id} pro={insightsPro} onUpgrade={upgradeInsights} activity={activity} setActivity={setActivity} onAskEva={(user, answer) => { setPendingAsk({ user, answer }); setChatCollapsed(false); }} />}
                {/* Work — one page, three tabs, one URL each: #/work (Tasks), #/activity, #/routines */}
                {(view === 'activity' || view === 'activitylog' || view === 'skills') && (
                    <TaskManagementView
                        tab={WORK_TAB_OF[view]}
                        onTab={(tb) => goView(WORK_VIEW_OF[tb])}
                        clientFilter={workClient}
                        onClientChange={setWorkClient}
                        evaControls={embedded ? { onMinimise: () => closeUniverse(), onClose: () => closeUniverse(true) } : undefined}
                        onAskEva={embedded ? askEvaAbout : undefined}
                        bare={view === 'skills' && routineOpen}
                        onNewRoutine={() => setNewRoutineTick((n) => n + 1)}
                        tasks={tasksShown}
                        setTasks={setTasks}
                        decisions={decisionsShown}
                        onResolveDecision={resolveDecision}
                        onAddDecision={addDecision}
                        activity={activityShown}
                        threads={threads}
                        onOpenThread={openReply}
                        onOpenActivity={(id) => { setActivityFocus(id); goView('activitylog'); }}
                        activityLog={<ActivityFeedView embedded clientFilter={ax ? workClient : null} focusId={activityFocus} onOpenEntry={openFromLog} entries={activityShown} setEntries={setActivity} scope="portfolio" onAskEva={(user, answer) => { setPendingAsk({ user, answer }); setChatCollapsed(false); }} />}
                        routines={<SkillsView page="routines" skills={skillsShown} onEnable={enableSkill} connStatus={connStatus} setConnStatus={setConnStatus} onDetailChange={setRoutineOpen} newRoutineTick={newRoutineTick} />}
                    />
                )}
                {view === 'customers' && <CustomersView />}
                {doneToast && <DoneToast key={doneToast.key} verb={doneToast.verb} title={t(doneToast.title)} sub={doneToast.sub} t={t} onClose={() => setDoneToast(null)}
                    onUndo={doneToast.undo ? () => { const u = doneToast.undo!; setDoneToast(null); u(); } : undefined} />}
                {(() => {
                    const tk = logTask ? tasks.find((x) => x.id === logTask) : undefined;
                    const d = logDecision ? dayDecisions.find((x) => x.id === logDecision) : undefined;
                    const close = () => { setLogTask(null); setLogDecision(null); };
                    return <>
                        {tk && <TaskModal task={tk} onClose={close}
                            onHandToEva={() => { handTaskToEva(tk, setTasks, addDecision); close(); }}
                            onDone={() => { setTasks((prev) => prev.map((x) => (x.id === tk.id ? { ...x, status: 'done' } : x))); close(); }}
                            onReopen={() => { setTasks((prev) => prev.map((x) => (x.id === tk.id ? { ...x, status: 'todo' } : x))); close(); }} />}
                        {d && <DecisionReview d={d} t={t} onClose={close} onResolve={(taken, info) => { resolveDecision(d.id, taken, info); close(); }} />}
                        {(() => { const th = replyOpen ? threads.find((x) => x.id === replyOpen) : undefined; return th ? <ReplyReview key={th.id} th={th} t={t} onClose={() => setReplyOpen(null)} onSend={(text, withAction) => sendReply(th.id, text, withAction)} /> : null; })()}
                    </>;
                })()}
                {view === 'connectors' && <SkillsView page="connectors" skills={skillsShown} onEnable={enableSkill} connStatus={connStatus} setConnStatus={setConnStatus} />}
                {view === 'spaces' && <SpacesView spaces={spaces} onCreate={addSpace} onActiveSpaceChange={setActiveSpace} />}
            </main>

            {/* Phones: the five places as a bottom tab bar */}
            {mobile && (
                <nav className="shrink-0 flex items-stretch justify-around" style={{ background: SIDEBAR_BG, paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    {rail.map(({ id, label: railLabel, Icon: RIcon }) => {
                        const active = ax ? view === id || (id === 'activity' && view === 'activitylog') : view === id || (id === 'activity' && (view === 'activitylog' || view === 'skills')) || (id === 'home' && view === 'insights');
                        const n = badgeFor[id] ?? 0;
                        return (
                            <button key={id} onClick={() => (ax && id === 'chat' ? openAxChat() : goView(id))} className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 min-w-0"
                                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.6)' }} aria-current={active ? 'page' : undefined}>
                                <span className="relative flex items-center"><RIcon active={active} />
                                    {n > 0 && <span className="absolute rounded-full" style={{ top: -3, right: -5, width: 8, height: 8, background: ax ? '#ed9b2c' : COUNT_DOT, border: `2px solid ${SIDEBAR_BG}` }} />}
                                </span>
                                <span className="text-[10px] font-medium truncate max-w-full px-1">{t(id === 'home' && !ax ? 'Overview' : railLabel)}</span>
                            </button>
                        );
                    })}
                </nav>
            )}

            {chatPanel && !embedded && (
                <ChatPanel
                    key={panelKey}
                    storageKey="eva"
                    mobile={mobile}
                    subtitle=""
                    intro={EVA_INTRO}
                    chips={EVA_CHIPS}
                    respond={(q) => (EVA_CHIPS.includes(q) ? overviewAnswer(q, lang, { decisions: openDecisions, replies: needsReply, ax }) : chatPanel.respond(q))}
                    evaConfig={evaConfigured() ? evaConfig({ agreementNumber: liveAgreement?.number, companyName: ecoCompany, page: view }) : null}
                    evaSrc={evaIslandSrc()}
                    collapsed={chatCollapsed}
                    onToggleCollapsed={() => setChatCollapsed((c) => !c)}
                    onExpand={(turns) => { setChatCarry(turns); setPanelCarry(null); setChatReturn(view); goView('chat'); }}
                    seed={panelCarry ? panelCarry.turns : null}
                    welcome={welcome && view === 'activity' ? t(WELCOME_MSG) : null}
                    onWelcomeConsumed={() => setWelcome(false)}
                    pendingAsk={pendingAsk}
                    onPendingConsumed={() => setPendingAsk(null)}
                />
            )}

            {pendingScope && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setPendingScope(null)}>
                    <div className="bg-white rounded-2xl w-full p-6 anim-in" style={{ maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-3 mb-2">
                            <span className="flex items-center justify-center shrink-0 rounded-xl" style={{ width: 38, height: 38, background: '#fdf8ec', color: '#92710f' }}>
                                <Icon name="circle-warning" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>Switch to {nameOf(pendingScope)}?</h2>
                                <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                                    Your current chat will be cleared — it's specific to {scopeName}. Switching loads {nameOf(pendingScope) === 'Portfolio' ? 'your whole portfolio' : nameOf(pendingScope)} instead.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <Button onClick={() => setPendingScope(null)}>Cancel</Button>
                            <Button appearance="primary" onClick={() => applyScope(pendingScope)}>Switch & clear chat</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Onboarding lives at its own linkable URL (#/onboarding), shown as a full-screen overlay. */}
            {route === 'onboarding' && (
                <Onboarding
                    onClose={() => navigate(VIEW_SLUG[view])}
                    onComplete={() => { setWelcome(true); setPanelSeed((k) => k + 1); setChatCollapsed(false); goView('home'); }}
                />
            )}
        </div>
        {/* AX: today's e-conomic with EVA on top (#/economic). EVA docks on the right; expanding it opens
            the EVA universe (the app above) in a rounded container over e-conomic, next to the same panel. */}
        {showEco && (
            <EconomicShell
                panelOpen={ecoPanel && !embedded}
                onTogglePanel={() => setEcoPanel((o) => !o)}
                flagged={ecoFlagged}
                universe={embedded}
                closing={ecoClosing}
                // the gear: back to the Vision (leaves e-conomic for the full product) and the language.
                // Turning AX on (here or in Vision's account menu) lands in plain Regnskab — no overlay, EVA closed.
                settings={{
                    scope: scopeMode, lang,
                    onScope: (m) => { if (m === 'vision') { setEcoUniverse(false); setScopeMode('vision'); goView('home'); } else { setScopeMode('ax'); if (ecoUniverse) closeUniverse(); } },
                    onLang: setLang,
                }}
                panel={
                    <ChatPanel
                        key={'eco-' + lang + '-' + ecoSeed}
                        storageKey="eva-economic"
                        subtitle=""
                        intro="I'm EVA. I can see you're in the daily journal — 15 entries, 3 without a document. Want me to check it before you post?"
                        chips={['Check this journal before I post it', 'What’s left to close September?', 'What did EVA do overnight?']}
                        respond={(q) => {
                            const j = journalAnswer(q, lang);
                            if (j) { setEcoFlagged(true); return j; }
                            return EVA_CHIPS.includes(q) || !chatPanel ? overviewAnswer(q, lang, { decisions: openDecisions, replies: needsReply, ax: true }) : chatPanel.respond(q);
                        }}
                        collapsed={false}
                        // X closes EVA altogether — the universe retracts, then the panel goes (shrink ⤡ keeps the panel)
                        onToggleCollapsed={() => { if (ecoUniverse) closeUniverse(true); else setEcoPanel(false); }}
                        expanded={embedded}
                        docked={embedded}
                        onExpand={() => {
                            if (ecoUniverse) { closeUniverse(); return; } // back to e-conomic
                            if (!mobile) setEcoUniverse(true);
                            openAxChat(); // full-screen EVA opens in the chat, with the panel's conversation
                        }}
                        // in the universe this is the EVA panel — the overview's question box asks here
                        pendingAsk={embedded ? pendingAsk : null}
                        onPendingConsumed={() => setPendingAsk(null)}
                    />
                }
            />
        )}
        </ScopeContext.Provider>
        </ScopeModeContext.Provider>
        </LangContext.Provider>
    );
}
