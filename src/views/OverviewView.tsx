import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@economic/taco';
import { Card, CountBadge, Orb, MicIcon, PageHeader, COLORS } from '../ui';
import { useLang } from '../i18n';
import type { DecisionItem, ResolveInfo } from '../day';
import { BOOKS_STATUS, CLIENTS, ME, TARGET_RATE, rateOf, type Books, type Client, type Thread } from '../practice';
import type { ViewId } from '../types';
import { ClientList, ClientDrawer } from './ClientsView';
import { DecisionRow, DecisionReview, ReplyRow } from './Decisions';
import { MonthEndCard, MonthEndReport } from './MonthEnd';
import { axHidesTask, useScopeMode } from '../edition';
import type { ShareDraft } from './Attachment';
import { PRIO_RANK, priorityOfDecision, priorityOfThread } from '../priority';
import { AgreementSelector, TaskModal, WorkTag, dueColor, handTaskToEva, isEva, workTagsFor, type Task } from './TaskManagementView';
import type { Dispatch, SetStateAction } from 'react';

// ---- Portfolio overview — where the AO starts the day ----------------------------
// One page for the morning: a greeting and a question box ("ask anything about your
// firm") at the top, then the day at a glance — your tasks, the decisions only
// you can make, where every client's books stand — the clients who need your
// expertise, and the whole portfolio. Asking a question hands off to the EVA panel.

// EVA's answers to questions asked from the overview (shown in the EVA panel).
// Morning before noon, afternoon until 18:00, evening after (and through the night).
const greetingFor = (h: number) => (h >= 5 && h < 12 ? 'Good morning, {name}' : h >= 12 && h < 18 ? 'Good afternoon, {name}' : 'Good evening, {name}');

export function overviewAnswer(q: string, lang: 'en' | 'da', ctx: { decisions: number; replies: number; ax?: boolean }): string {
    const s = q.toLowerCase();
    const da = lang === 'da';
    const mine = CLIENTS.filter((c) => c.accountant === ME);
    const names = (list: typeof mine) => list.map((c) => c.name).join(', ');
    const worth = mine.filter((c) => c.signal);
    if (ctx.ax && /walk|my day|start|today|dag|i dag|gennem/.test(s))
        return da ? `Her er din tirsdag: ${ctx.decisions} ting fra EVA er klar til din gennemgang, og 33 af 40 kunder er lukket for september — resten venter på 58 bilag, som jeg rykker for. Skal vi starte med gennemgangene?`
            : `Here’s your Tuesday: ${ctx.decisions} item${ctx.decisions === 1 ? '' : 's'} from EVA ${ctx.decisions === 1 ? 'is' : 'are'} ready for your review, and 33 of 40 clients are closed for September — the rest are waiting on 58 documents I’m chasing. Shall we start with the reviews?`;
    if (ctx.ax && /overnight|did eva|i nat/.test(s))
        return da ? 'I nat afstemte jeg bankerne for alle 40 kunder, bogførte 96 kladder og kontrollerede 1.342 posteringer. Det, der venter på dig, står i Klar til din gennemgang — og det hele står i Aktivitet.'
            : 'Overnight I reconciled the banks for all 40 clients, posted 96 drafts and checked 1,342 postings. What needs you is in Ready for your review — and it’s all in Activity.';
    if (/walk|my day|start|today|dag|i dag|gennem/.test(s))
        return da
            ? `Her er din tirsdag: ${ctx.decisions} beslutninger klar til gennemgang, ${ctx.replies} kundesamtaler med udkast til svar, og dine opgaver står i Mine opgaver. ${worth.length} af dine kunder er værd at bruge tid på — Café Solsikkes likviditet haster mest. Jeg har også lavet oktoberlønnen for 14 kunder — én undtagelse venter på dig. Skal vi starte med gennemgangene?`
            : `Here’s your Tuesday: ${ctx.decisions} decision${ctx.decisions === 1 ? '' : 's'} ready for your review, ${ctx.replies} client conversation${ctx.replies === 1 ? '' : 's'} with a drafted reply, and your tasks are in My tasks. ${worth.length} of your clients are worth your time — Café Solsikke’s cash runway is the most urgent. I’ve also drafted October payroll for 14 clients — one exception is waiting for you. Shall we start with the reviews?`;
    if (/close|september|month-end|luk/.test(s))
        return da ? '33 af dine 40 kunder er lukket for september. Resten venter på 58 bilag fra kunderne — jeg rykker hver 3. dag — og 2 kontrolmarkeringer venter på din gennemgang. Åbn månedsrapporten for at se, hvad der mangler pr. kunde.'
            : '33 of your 40 clients are closed for September. The rest are waiting on 58 documents from clients — I chase every 3 days — and 2 controlling flags are waiting for your review. Open the month-end report to see what’s left per client.';
    if (/overnight|did eva|i nat/.test(s))
        return da ? 'I nat afstemte jeg bankerne for alle 40 kunder, bogførte 96 kladder, lavede oktoberlønnen for 14 kunder og kontrollerede 1.342 posteringer. 3 ting venter på din gennemgang — det hele står i Aktivitet.'
            : 'Overnight I reconciled the banks for all 40 clients, posted 96 drafts, drafted October payroll for 14 clients and checked 1,342 postings. 3 things are waiting for your review — it’s all in Activity.';
    if (/cash|runway|likvidit/.test(s)) {
        const list = mine.filter((c) => c.signal?.kind === 'Cash flow');
        return da ? `${list.length} af dine kunder har likviditetsudfordringer: ${names(list)} — ca. seks ugers likviditet. Åbn kunden for samtalepunkter.` : `${list.length === 1 ? 'One of your clients has' : `${list.length} of your clients have`} cash-flow issues: ${names(list)} — about six weeks of runway. Open the client for talking points.`;
    }
    if (/advis|ready for|rådgivning|klar til/.test(s)) {
        const list = mine.filter((c) => c.trend >= 10 && !c.services.includes('Advisory'));
        return da ? `${list.length} af dine kunder vokser 10%+ uden rådgivning: ${list.map((c) => `${c.name} (+${c.trend}%)`).join(', ')}. Jeg har samtalepunkter klar for hver.` : `${list.length} of your clients are growing 10%+ with no advisory yet: ${list.map((c) => `${c.name} (+${c.trend}%)`).join(', ')}. I have talking points ready for each — open them from My clients.`;
    }
    if (/attention|need|kræver|opmærksom/.test(s))
        return da ? `Af dine kunder kræver ${names(worth)} opmærksomhed — Café Solsikke (likviditet) og Digital Marketing Pro (kundekoncentration) først.` : `Across your clients, ${names(worth)} need attention — Café Solsikke (cash runway) and Digital Marketing Pro (customer concentration) first.`;
    if (/expense|cost|udgift|omkostning/.test(s))
        return da ? 'Café Solsikkes varekøb er 38% af omsætningen mod 31% hos lignende — den største omkostningsstigning blandt dine kunder.' : 'Café Solsikke’s food costs are 38% of revenue vs. 31% for similar cafés — the sharpest cost increase among your clients.';
    if (/profit|lønsom|reprice|price/.test(s)) {
        const low = mine.filter((c) => rateOf(c) < TARGET_RATE).sort((a, b) => rateOf(a) - rateOf(b));
        return da ? `Blandt dine kunder ligger ${low.map((c) => `${c.name} (${rateOf(c)} kr/t)`).join(' og ')} under målet på ${TARGET_RATE} kr/t.` : `Among your clients, ${low.map((c) => `${c.name} (${rateOf(c)} kr/h)`).join(' and ')} sit below the ${TARGET_RATE} kr/h target — reprice drafts are under Practice → Profitability.`;
    }
    if (/week|ahead|uge|kommende/.test(s))
        return da ? 'Resten af ugen: likviditetsmøde med Café Solsikke torsdag, momsfrist fredag, lønkørsel og månedsafslutning fredag, kvartalsgennemgang med Nordic Build mandag.' : 'The rest of the week: runway call with Café Solsikke on Thursday, a VAT deadline on Friday, a payroll run and a month-end close on Friday, and a quarterly review with Nordic Build on Monday.';
    if (/wait|reply|inbox|venter|svar/.test(s))
        return da ? `${ctx.replies} kundesamtaler venter på dig med udkast til svar; to venter på kunden, og jeg rykker automatisk.` : `${ctx.replies} client conversations need you, each with a drafted reply; two are waiting on the client and I’ll follow up automatically.`;
    return da ? 'Spørg mig om din dag, en af dine kunder, eller hvem der er klar til rådgivning.' : 'Ask me about your day, one of your clients, or who’s ready for an advisory conversation.';
}

export default function OverviewView({ tasks, setTasks, onAddDecision, decisions, threads, onOpenThread, onResolveDecision, onAsk, onGo, onOpenBooks, onMessage, onShare, clientFilter = null, onClientChange }: {
    tasks: Task[];
    setTasks: Dispatch<SetStateAction<Task[]>>;
    onAddDecision: (d: DecisionItem) => void;
    decisions: DecisionItem[];
    threads: Thread[]; // client conversations — the ones waiting on you join the review queue
    onOpenThread: (th: Thread) => void; // review a drafted reply (a modal)
    onResolveDecision: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void;
    onAsk: (q: string) => void;
    onGo: (v: ViewId) => void;
    onOpenBooks: (name: string) => void;
    onMessage: (client: string) => void;
    onShare: (d: ShareDraft) => void;
    clientFilter?: string | null;          // AX Controlling: one client (shared with Bookkeeping's selector)
    onClientChange?: (name: string | null) => void;
}) {
    const { t } = useLang();
    const [q, setQ] = useState('');
    // The greeting follows the user's local time (and keeps up if the page stays open).
    const [hour, setHour] = useState(() => new Date().getHours());
    useEffect(() => { const id = setInterval(() => setHour(new Date().getHours()), 60_000); return () => clearInterval(id); }, []);
    const [sel, setSel] = useState<Client | null>(null);
    const [review, setReview] = useState<DecisionItem | null>(null); // AX Controlling: a finding opened from the month-end card
    const { ax } = useScopeMode();
    const chips = ax
        ? [t('Walk me through my day'), t('What’s left to close September?'), t('What did EVA do overnight?')]
        : [t('Walk me through my day'), t('Which clients are ready for an advisory call?'), t('Do I have clients with cash-flow issues?')];
    const ask = (text: string) => { if (text.trim()) { onAsk(text.trim()); setQ(''); } };

    // AX: this is Controlling — the post-booking analysis of the books. A client selector (shared with
    // Bookkeeping), the closing summary on top, then the flags the AO has to consider.
    if (ax) {
        const mineAll = decisions.filter((d) => d.accountant === ME && (!clientFilter || d.company === clientFilter));
        const flags = mineAll.filter((d) => !d.done && d.correction).sort((a, b) => PRIO_RANK[priorityOfDecision(a).level] - PRIO_RANK[priorityOfDecision(b).level]);
        const flagsByClient: Record<string, number> = {};
        decisions.forEach((d) => { if (!d.done && d.correction && d.accountant === ME) flagsByClient[d.company] = (flagsByClient[d.company] ?? 0) + 1; });
        return (
            <div className="h-full overflow-y-auto">
                <PageHeader title={t('Controlling')} showScope={false} right={<AgreementSelector value={clientFilter} onChange={(n) => onClientChange?.(n)} counts={flagsByClient} />} />
                <div className="mx-auto px-8 pt-5 pb-10 flex flex-col gap-5" style={{ maxWidth: 1240 }}>
                    {/* 1 — the closing, summarised */}
                    <div className="land"><MonthEndCard key={clientFilter ?? 'all'} decisions={mineAll} onReview={setReview} threads={threads} onResolveDecision={onResolveDecision} onOpenThread={onOpenThread} client={clientFilter} defaultOpen /></div>
                    {/* 2 — the flags to consider: EVA's findings on booked postings */}
                    <div className="land" style={{ ['--d' as string]: '120ms' }}>
                        <Card className="overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                <span className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t('Control flags')}</span>
                                <span className="text-[11px]" style={{ color: COLORS.textMuted }}>{t('Most urgent first')}</span>
                                <CountBadge n={flags.length} showZero />
                            </div>
                            {flags.length === 0 ? (
                                <div className="px-4 py-6 flex items-center gap-2.5">
                                    <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: '#e9f7ef', color: '#15803d' }}><Icon name="circle-tick" /></span>
                                    <p className="text-sm" style={{ color: COLORS.text }}>{t('No findings — the books look right.')}</p>
                                </div>
                            ) : flags.map((d, i) => <DecisionRow key={d.id} d={d} t={t} prio={priorityOfDecision(d)} last={i === flags.length - 1} onReview={() => setReview(d)} />)}
                        </Card>
                    </div>
                </div>
                {review && <DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken, info) => { onResolveDecision(review.id, taken, info); setReview(null); }} />}
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* hero — the greeting and the question box */}
            {/* no background of its own — the gradient is the screen's (see HOME_BG in App) */}
            <div className="px-8 pt-10 pb-9">
                <div className="mx-auto text-center" style={{ maxWidth: 840 }}>
                    <h1 className="text-3xl font-semibold land" style={{ color: COLORS.text }}>{t(greetingFor(hour)).replace('{name}', 'Tobias')}</h1>
                    <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-5 mx-auto rounded-full p-[2px] land" style={{ ['--d' as string]: '70ms', maxWidth: 760, background: 'linear-gradient(90deg,#7c3aed,#ed9b2c)' /* EVA purple → e-conomic orange */ }}>
                        <div className="flex items-center gap-3 rounded-full bg-white pl-4 pr-2 py-2">
                            <Orb size={20} />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Tell me where you’d like to start, or ask a question about your clients.')} className="flex-1 min-w-0 bg-transparent outline-none text-sm py-1" style={{ color: COLORS.text }} />
                            <span className="shrink-0" style={{ color: COLORS.textMuted }}><MicIcon /></span>
                            <button type="submit" disabled={!q.trim()} className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: q.trim() ? '#1c1b3a' : '#ececf0', color: q.trim() ? '#fff' : '#b0b0b8' }} aria-label={t('Send')}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        </div>
                    </form>
                    <div className="flex flex-wrap justify-center gap-2 mt-3.5 land" style={{ ['--d' as string]: '140ms' }}>
                        {chips.map((c) => (
                            <button key={c} onClick={() => ask(c)} className="rounded-full px-3 py-1 text-[13px] whitespace-nowrap" style={{ background: '#fff', border: '1px solid #c9d6f5', color: '#2f55c7' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f8ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>{c}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto px-8 pb-10 flex flex-col gap-5" style={{ maxWidth: 1240 }}>
                {/* the day at a glance */}
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
                    {/* AX has no "my tasks" — the accountant reviews EVA's work and closes the period */}
                    {!ax && <TasksWidget t={t} tasks={tasks} setTasks={setTasks} onAddDecision={onAddDecision} onGo={onGo} />}
                    <NeedsYouWidget t={t} decisions={decisions} threads={threads} onOpenThread={onOpenThread} onResolve={onResolveDecision} onGo={onGo} />
                    <BooksWidget t={t} flags={decisions.filter((d) => !d.done && d.correction && d.accountant === ME).length} decisions={decisions} threads={threads} onResolveDecision={onResolveDecision} onOpenThread={onOpenThread} />
                </div>

                <div className="land" style={{ ['--d' as string]: '440ms' }}><ClientList onSelect={setSel} /></div>
            </div>

            {sel && <ClientDrawer c={sel} onClose={() => setSel(null)} onOpenBooks={onOpenBooks} onMessage={onMessage} decisions={decisions} threads={threads} onResolveDecision={onResolveDecision} onShare={onShare} />}
        </div>
    );
}

function Widget({ title, right, children, footer, delay = 0, scroll = true }: { title: string; right?: ReactNode; children: ReactNode; footer?: ReactNode; delay?: number; scroll?: boolean }) {
    return (
        <Card className="flex flex-col overflow-hidden land" style={{ ['--d' as string]: `${delay}ms` }}>
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
                <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{title}</p>
                {right}
            </div>
            {/* capped: long content scrolls inside the box instead of stretching the row */}
            {/* lists are capped and scroll inside; a fixed visual (the donut) doesn't */}
            <div className={scroll ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain' : 'flex-1'} style={scroll ? { maxHeight: 300 } : undefined}>{children}</div>
            {footer && <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>{footer}</div>}
        </Card>
    );
}

// My tasks — a shortcut into Work: what's on your plate, and what EVA is doing for you.
function TasksWidget({ t, tasks, setTasks, onAddDecision, onGo }: { t: (s: string) => string; tasks: Task[]; setTasks: Dispatch<SetStateAction<Task[]>>; onAddDecision: (d: DecisionItem) => void; onGo: (v: ViewId) => void }) {
    const [open, setOpen] = useState<Task | null>(null);
    const ORDER: Record<string, number> = { overdue: 0, today: 1, week: 2, later: 3 };
    const mine = tasks.filter((x) => x.accountant === ME);
    const { ax } = useScopeMode();
    const plate = mine.filter((x) => !isEva(x.status) && x.status !== 'done' && !(ax && axHidesTask(x.title))).sort((a, b) => ORDER[a.bucket] - ORDER[b.bucket]);
    const running = mine.filter((x) => x.status === 'eva-running').length;
    const scheduled = mine.filter((x) => x.status === 'eva-scheduled').length;
    return (
        <>
        <Widget delay={220} title={t('My tasks')} right={<CountBadge n={plate.length} />}
            footer={<div className="flex items-center justify-between gap-2">
                <span className="text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted }}><Orb size={12} /> {t('EVA: {r} in progress · {s} scheduled').replace('{r}', String(running)).replace('{s}', String(scheduled))}</span>
                <button onClick={() => onGo('activity')} className="text-xs font-medium shrink-0" style={{ color: '#4456c7' }}>{t('Open Work')} →</button>
            </div>}>
            {plate.length === 0 ? (
                <div className="px-4 py-6 flex items-center gap-2.5">
                    <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: '#e9f7ef', color: '#15803d' }}><Icon name="circle-tick" /></span>
                    <p className="text-sm" style={{ color: COLORS.text }}>{t('Nothing on your plate — EVA has it.')}</p>
                </div>
            ) : plate.map((x, i) => {
                return (
                    <button key={x.id} onClick={() => setOpen(x)} className="w-full text-left flex items-center gap-3 px-4 py-2.5" style={i === 0 ? undefined : { borderTop: `1px solid ${COLORS.cardBorder}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm truncate" style={{ color: COLORS.text }}>{t(x.title)}</p>
                            <p className="text-xs truncate mt-0.5" style={{ color: COLORS.textMuted }}>{x.company} · <span style={{ color: dueColor(x.bucket), fontWeight: 500 }}>{t(x.dueLabel)}</span></p>
                        </div>
                        <span className="shrink-0 flex items-center gap-1.5">{workTagsFor(x).map((w) => <WorkTag key={w} s={w} />)}</span>
                    </button>
                );
            })}
        </Widget>
        {open && <TaskModal task={open} onClose={() => setOpen(null)} onHandToEva={() => { handTaskToEva(open, setTasks, onAddDecision); setOpen(null); }} onDone={() => { setTasks((prev) => prev.map((x) => (x.id === open.id ? { ...x, status: 'done' } : x))); setOpen(null); }} />}
        </>
    );
}

// Ready for your review — the same decisions as Work's review lane (shared rows and
// modal, from src/day.ts), filtered to the logged-in accountant.
function NeedsYouWidget({ t, decisions, threads, onOpenThread, onResolve, onGo }: { t: (s: string) => string; decisions: DecisionItem[]; threads: Thread[]; onOpenThread: (th: Thread) => void; onResolve: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void; onGo: (v: ViewId) => void }) {
    const open = decisions.filter((d) => !d.done && d.accountant === ME);
    const { ax } = useScopeMode();
    const replies = ax ? [] : threads.filter((x) => x.status === 'needs'); // client conversations with EVA's drafted reply (Vision)
    // one queue, ranked by EVA — most urgent first
    const queue = [
        ...open.map((d) => ({ d, th: undefined as Thread | undefined, p: priorityOfDecision(d) })),
        ...replies.map((th) => ({ d: undefined as DecisionItem | undefined, th, p: priorityOfThread(th) })),
    ].sort((a, b) => PRIO_RANK[a.p.level] - PRIO_RANK[b.p.level]);
    const [review, setReview] = useState<DecisionItem | null>(null);
    return (
        <>
            <Widget delay={290} title={t('Ready for your review')} right={<><span className="text-[11px]" style={{ color: COLORS.textMuted }}>{t('Most urgent first')}</span><CountBadge n={open.length + replies.length} /></>}
                footer={<button onClick={() => onGo('activity')} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t('Open Work')} →</button>}>
                {open.length + replies.length === 0 ? (
                    <div className="px-4 py-6 flex items-center gap-2.5">
                        <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: '#e9f7ef', color: '#15803d' }}><Icon name="circle-tick" /></span>
                        <p className="text-sm" style={{ color: COLORS.text }}>{t('Nothing in the books needs you.')}</p>
                    </div>
                ) : queue.map((q, i) => q.d
                    ? <DecisionRow key={q.d.id} d={q.d} t={t} prio={q.p} last={i === queue.length - 1} onReview={() => setReview(q.d!)} />
                    : <ReplyRow key={q.th!.id} th={q.th!} t={t} prio={q.p} last={i === queue.length - 1} onReview={() => onOpenThread(q.th!)} />)}
            </Widget>
            {review && <DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken, info) => { onResolve(review.id, taken, info); setReview(null); }} />}
        </>
    );
}

// Where every client's books stand this month — a large donut, legend underneath.
function BooksWidget({ t, flags, decisions, threads, onResolveDecision, onOpenThread }: { t: (s: string) => string; flags: number; decisions: DecisionItem[]; threads: Thread[]; onResolveDecision: (id: string, taken: 'confirm' | 'alt', info?: ResolveInfo) => void; onOpenThread: (th: Thread) => void }) {
    const [report, setReport] = useState<Books | 'all' | null>(null);
    const [hover, setHover] = useState<Books | null>(null);
    const total = BOOKS_STATUS.reduce((s, b) => s + b.count, 0);
    const SIZE = 184, R = 70, W = 24, C = 2 * Math.PI * R, GAP = 2;
    // On load the ring settles in: each slice draws itself with a soft ease-out, slightly staggered,
    // while the ring fades and turns a few degrees into place. The total doesn't count — it's simply there.
    const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const [shown, setShown] = useState(reduce);
    useEffect(() => {
        if (shown) return;
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
        const done = setTimeout(() => setShown(true), 120); // hidden tabs pause frames — don't leave an empty ring
        return () => { cancelAnimationFrame(id); clearTimeout(done); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const hv = hover ? BOOKS_STATUS.find((b) => b.key === hover)! : null;
    let acc = 0;
    return (
        <>
        <Widget delay={360} scroll={false} title={t('Books status')} right={<span className="text-xs" style={{ color: COLORS.textMuted }}>{t('This month')}</span>}
            footer={<button onClick={() => setReport('all')} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t('Month-end report')} →</button>}>
            <div className="flex flex-col items-center px-4 pb-4 pt-2">
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ opacity: shown ? 1 : 0, transition: reduce ? undefined : 'opacity 500ms ease' }} role="img" aria-label={BOOKS_STATUS.map((b) => `${t(b.label)} ${b.count}`).join(', ')} onMouseLeave={() => setHover(null)}>
                    {/* only the ring turns into place — the number stays put */}
                    <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: shown ? 'rotate(0deg)' : 'rotate(-14deg)', transition: reduce ? undefined : `transform 1100ms ${EASE}` }}>
                    <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#f1f1f3" strokeWidth={W} />
                    {BOOKS_STATUS.map((b) => {
                        const len = (b.count / total) * C;
                        const vis = shown ? len - GAP : 0;
                        const i = BOOKS_STATUS.indexOf(b);
                        const on = hover === b.key, dim = hover && !on;
                        const el = (
                            <circle key={b.key} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={b.color} strokeWidth={on ? W + 6 : W}
                                strokeDashoffset={-acc} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                                style={{ strokeDasharray: `${vis} ${C}`, opacity: dim ? 0.3 : 1, cursor: 'pointer',
                                    transition: `stroke-dasharray ${reduce ? 0 : 1000}ms ${EASE} ${reduce ? 0 : 150 + i * 140}ms, stroke-width 160ms ease, opacity 160ms ease` }}
                                onMouseEnter={() => setHover(b.key)} onClick={() => setReport(b.key)}>
                                <title>{`${t(b.label)}: ${b.count} ${t('clients')} — ${t('click to see them')}`}</title>
                            </circle>
                        );
                        acc += len;
                        return el;
                    })}
                    </g>
                    <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" fontSize="30" fontWeight="600" fill={hv ? hv.color : COLORS.text} style={{ transition: 'fill 160ms ease' }}>{hv ? hv.count : total}</text>
                    <text x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle" fontSize="12" fill={COLORS.textMuted}>{hv ? `${t(hv.label)} · ${Math.round((hv.count / total) * 100)}%` : t('clients')}</text>
                </svg>
                <div className="grid grid-cols-3 gap-2 w-full mt-4">
                    {BOOKS_STATUS.map((b) => {
                        const on = hover === b.key;
                        return (
                            <button key={b.key} onMouseEnter={() => setHover(b.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(b.key)} onBlur={() => setHover(null)} onClick={() => setReport(b.key)}
                                className="text-center rounded-lg py-1" style={{ background: on ? '#f7f7f8' : 'transparent', opacity: hover && !on ? 0.55 : 1, transition: 'opacity 160ms ease, background 160ms ease' }} title={t('Show these clients')}>
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: b.color }} />
                                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t(b.label)}</span>
                                </div>
                                <p className="text-base font-semibold mt-0.5" style={{ color: COLORS.text }}>{b.count}</p>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs mt-3 text-center" style={{ color: COLORS.textMuted }}>{t('EVA closes most of these on its own.')}</p>
            </div>
        </Widget>
        {report && <MonthEndReport onClose={() => setReport(null)} initialFilter={report === 'all' ? undefined : report} flags={flags} decisions={decisions.filter((d) => d.accountant === ME)} threads={threads} onResolveDecision={onResolveDecision} onOpenThread={onOpenThread} />}
        </>
    );
}
