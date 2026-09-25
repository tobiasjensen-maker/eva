import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, Orb, ProfileAvatar, COLORS } from '../ui';
import { useLang } from '../i18n';
import { KIND, type DecisionItem, type ValueItem } from '../day';
import { FIRM_CLIENTS, type Thread } from '../practice';
import type { ViewId } from '../types';

// ---- Home · "My day" ----------------------------------------------------------
// Where the AO starts the day. EVA opens with the day's agenda — meetings,
// decisions, client replies, what's worth your time — then walks through it one
// group at a time. Rows tick off as you go and each one links to the page where
// you'd go deeper, so the rest of the app is "further in", never "somewhere else".

const ME_FIRST = 'Tobias';
const ACCENT = '#1c1b3a'; // dark navy — the user's own voice (proceed chip + send button)

// What's coming up — pulled from the AO's calendar (the Outlook connector).
const SKED: Record<string, { bg: string; fg: string }> = {
    'Deadline': { bg: '#fdecec', fg: '#c0392b' },
    'Advisory': { bg: '#f3f0fb', fg: '#7c3aed' },
    'Payroll': { bg: '#fbf3e0', fg: '#92710f' },
    'Period close': { bg: '#eef4fb', fg: '#2f6fb0' },
    'Meeting': { bg: '#e9f7ef', fg: '#15803d' },
};
type Event = { when: string; title: string; kind: keyof typeof SKED; client?: string; note?: string; today?: boolean };
const SCHEDULE: Event[] = [
    // Today — the "day at a glance"
    { when: '09:30', title: 'Team stand-up', kind: 'Meeting', today: true },
    { when: '11:00', title: 'Client call — Bryg & Co', kind: 'Meeting', client: 'Bryg & Co ApS', today: true },
    { when: '15:30', title: 'Review — Q1 VAT, Nordic Build', kind: 'Deadline', client: 'Nordic Build ApS', today: true },
    // Later this week
    { when: 'Thu 14:00', title: 'Runway call — Café Solsikke', kind: 'Advisory', client: 'Café Solsikke' },
    { when: 'Fri 09:00', title: 'VAT filing deadline', kind: 'Deadline', note: '3 clients' },
    { when: 'Fri 06:00', title: 'Payroll run — Aarhus Tandklinik', kind: 'Payroll', client: 'Aarhus Tandklinik' },
    { when: 'Fri', title: 'Month-end close — Fjord Fitness', kind: 'Period close', client: 'Fjord Fitness' },
    { when: 'Mon 10:00', title: 'Quarterly review — Nordic Build ApS', kind: 'Meeting', client: 'Nordic Build ApS' },
];

// The briefing: the agenda, then one message per group that needs you, then a
// close. Empty groups are skipped; a group advances once you've dealt with it.
type Beat = { intro: true } | { decisions: true } | { replies: true } | { values: true; next: string } | { close: true };
const BEATS: Beat[] = [
    { intro: true },
    { decisions: true },
    { replies: true },
    { values: true, next: 'That’s enough for now' },
    { close: true },
];

type Item =
    | { key: string; who: 'eva'; type: 'text'; node: ReactNode }
    | { key: string; who: 'eva'; type: 'intro' }
    | { key: string; who: 'eva'; type: 'decisions'; ids: string[] }
    | { key: string; who: 'eva'; type: 'replies'; ids: string[] }
    | { key: string; who: 'eva'; type: 'values'; ids: string[] }
    | { key: string; who: 'user'; type: 'text'; node: ReactNode };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function homeAnswer(q: string, lang: 'en' | 'da'): { text: string; openCockpit?: boolean } {
    const s = q.toLowerCase();
    const da = lang === 'da';
    if (/cockpit|board|full|everything|list|tavle|oversigt/.test(s))
        return { text: da ? 'Åbner Arbejde — hele tavlen på tværs af alle kunder.' : 'Opening Work — the full board across every client.', openCockpit: true };
    // Firm-level questions — the AO running the practice, not just the books.
    if (/advis|ready for|rådgivning|klar til/.test(s))
        return { text: da ? 'Fire kunder vokser 10%+ uden rådgivning: Grøn Energi (+25%), Cloud Hosting (+22%), Fjord Fitness (+14%) og Nordic Build (+12%). Jeg har samtalepunkter klar for hver — se dem under Kunder.' : 'Four clients are growing 10%+ with no advisory yet: Grøn Energi (+25%), Cloud Hosting (+22%), Fjord Fitness (+14%) and Nordic Build (+12%). I have talking points ready for each — open them under Clients.' };
    if (/capacity|over capacity|team|kapacitet|travl/.test(s))
        return { text: da ? 'Mette er på 116% og Jonas på 56%. Flyt Solvang Tømrer, Kilde Klinik og Nørre Bageri (31 t/md) til Jonas, så lander begge mellem 79% og 94%. Klar under Praksis → Kapacitet.' : 'Mette is at 116% and Jonas at 56%. Move Solvang Tømrer, Kilde Klinik and Nørre Bageri (31 h/mo) to Jonas and both land between 79% and 94%. It’s ready to apply under Practice → Capacity.' };
    if (/profit|lønsom|reprice|price/.test(s))
        return { text: da ? 'Café Solsikke (382 kr/t), Lys Design (433 kr/t) og Nørre Bageri (460 kr/t) ligger langt under jeres mål på 900 kr/t. Faste pakker ville løfte dem.' : 'Café Solsikke (382 kr/h), Lys Design (433 kr/h) and Nørre Bageri (460 kr/h) sit well below your 900 kr/h target. Fixed-fee packages would lift them — drafts are one click under Practice → Profitability.' };
    if (/week|ahead|coming|schedul|uge|kommende/.test(s))
        return { text: da ? 'Ugen er let. 12 routiner er planlagt — 3 momsangivelser, 2 lønkørsler og en månedsafslutning for Fjord Fitness fredag. Jeg kører dem og viser dig kun det, der kræver dig. Intet er forfaldent.' : 'The week’s light. 12 routines are scheduled — 3 VAT returns, 2 payrolls, and a month-end close for Fjord Fitness on Friday. I’ll run them and only surface what needs you. Nothing overdue.' };
    if (/wait|client|receipt|chas|owe|venter|kunde|bilag/.test(s))
        return { text: da ? 'Seks kunder skylder mig noget: 4 manglende bilag og 2 ubesvarede spørgsmål. Jeg har allerede rykket alle og sat påmindelser til torsdag. Kun Jonas fra VVS-firmaet holder en afslutning tilbage.' : 'Six clients owe me something: 4 missing receipts and 2 unanswered questions. I’ve chased them all and set Thursday reminders. Only Jonas at the plumbing firm is holding up a close.' };
    if (/cash|runway|money|advis|likvidit|råd/.test(s))
        return { text: da ? 'På tværs af dine 40 kunder falder fire under 60 dages likviditet i år — Café Solsikke er tættest på. Jeg har lavet udkast til en samtale for hver. Skal jeg sætte møderne op?' : 'Across your 40 clients, four will drop below 60 days of cash this quarter — Café Solsikke is nearest. I’ve drafted a conversation for each. Want me to line up the calls?' };
    if (/overdue|owed|debtor|forfald|debitor/.test(s))
        return { text: da ? '214.500 kr forfaldent i porteføljen; Nordic Build ApS er størst med 96.000 kr. Rykkere er sendt — jeg kan eskalere de tre ældste.' : '214,500 kr overdue across the portfolio; Nordic Build ApS is the biggest at 96,000 kr. Reminders are out — I can escalate the oldest three.' };
    if (/thank|thanks|tak|super|great|perfect/.test(s))
        return { text: da ? 'Altid. Jeg holder det hele i gang og siger til, hvis noget kræver dig.' : 'Anytime. I’ll keep everything moving and ping you if something needs you.' };
    return { text: da ? 'Jeg kan tage dig gennem hvad der kørte i nat, hvad der venter på kunder, ugen der kommer, eller en enkelt kundes bøger. Hvad vil hjælpe?' : 'I can walk you through what ran overnight, what’s waiting on clients, the week ahead, or any single client’s books. What would help?' };
}

export default function HomeView({ onGo, decisions, values, threads, onResolveDecision, onResolveValue, onResolveThread }: {
    onGo: (v: ViewId) => void;
    decisions: DecisionItem[];
    values: ValueItem[];
    threads: Thread[];
    onResolveDecision: (id: string, taken: 'confirm' | 'alt') => void;
    onResolveValue: (id: string) => void;
    onResolveThread: (id: string) => void;
}) {
    const onOpenCockpit = () => onGo('activity');
    const { t, lang } = useLang();
    const [feed, setFeed] = useState<Item[]>([]);
    const [typing, setTyping] = useState(false);
    const [ready, setReady] = useState(false);
    const [pendingChip, setPendingChip] = useState<string | null>(null);
    const [input, setInput] = useState('');
    // Latest items in a ref so async beat-playing sees resolutions made mid-flow.
    const itemsRef = useRef({ decisions, values, threads });
    itemsRef.current = { decisions, values, threads };
    const needsReply = (ts: Thread[]) => ts.filter((x) => x.status === 'needs' && x.suggestion);
    const scrollRef = useRef<HTMLDivElement>(null);
    const seq = useRef(0);
    const idxRef = useRef(-1);
    const started = useRef(false);
    const dealt = useRef<Set<string>>(new Set()); // advisory items acted on or deferred
    const shownAny = useRef(false); // did anything actually need the user this visit?
    const key = () => `m${seq.current++}`;
    const push = (it: Item) => setFeed((f) => [...f, it]);
    const pushUser = (text: string) => push({ key: key(), who: 'user', type: 'text', node: text });

    // Stick to the bottom as the conversation grows.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [feed, typing, pendingChip, ready]);

    async function evaSay(text: string, opts?: { openCockpit?: boolean }) {
        setTyping(true);
        await sleep(650);
        setTyping(false);
        push({ key: key(), who: 'eva', type: 'text', node: text });
        if (opts?.openCockpit) setTimeout(onOpenCockpit, 800);
    }

    // Reveal one beat, then wait for the user (a continue-chip, or dealing with the cards).
    async function present(i: number) {
        idxRef.current = i;
        const beat = BEATS[i];
        setTyping(true);
        await sleep(700);
        setTyping(false);
        if ('intro' in beat) {
            push({ key: key(), who: 'eva', type: 'intro' });
            // One clear first step, named after whatever needs you first; nothing open → straight to the close.
            const { decisions: ds, threads: ts, values: vs } = itemsRef.current;
            const first = ds.some((d) => !d.done) ? 'Start with the decisions' : needsReply(ts).length ? 'Start with the client replies' : vs.some((v) => !v.done) ? 'Show me what’s worth my time' : null;
            if (first) setPendingChip(first); else await advance();
            return;
        }
        if ('replies' in beat) {
            const ids = needsReply(itemsRef.current.threads).map((x) => x.id);
            if (ids.length === 0) { await advance(); return; }
            push({ key: key(), who: 'eva', type: 'replies', ids });
            shownAny.current = true;
            return; // advances once each reply is sent or parked
        }
        if ('close' in beat) {
            // If nothing needed the user this visit, EVA just reassures rather than recap.
            push({ key: key(), who: 'eva', type: 'text', node: shownAny.current ? t('That’s everything that needs you today. I’ll keep the rest running and flag anything that changes. Ask me anything.') : t('You’re all caught up — everything’s handled and every ledger’s current. I’ll flag anything that comes up. Ask me anything.') });
            setReady(true);
            return;
        }
        // Only surface items that still need the user; skip anything already handled.
        if ('decisions' in beat) {
            const ids = itemsRef.current.decisions.filter((d) => !d.done).map((d) => d.id);
            if (ids.length === 0) { await advance(); return; }
            push({ key: key(), who: 'eva', type: 'decisions', ids });
            shownAny.current = true;
            return; // advances when the user has dealt with them
        }
        if ('values' in beat) {
            const ids = itemsRef.current.values.filter((v) => !v.done && !dealt.current.has(v.id)).map((v) => v.id);
            if (ids.length === 0) { await advance(); return; }
            push({ key: key(), who: 'eva', type: 'values', ids });
            shownAny.current = true;
            if ('next' in beat && beat.next) setPendingChip(beat.next);
        }
    }
    async function advance() {
        setPendingChip(null);
        if (idxRef.current + 1 < BEATS.length) await present(idxRef.current + 1);
    }

    // Kick off the briefing (guard against StrictMode double-mount).
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        present(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function onContinue(label: string) {
        setPendingChip(null);
        pushUser(label);
        await advance();
    }
    // Acting on a card just flips it in place (no extra chatter); when the whole
    // group is dealt with, EVA moves on to the next message on its own.
    async function actDecision(d: DecisionItem, took: boolean) {
        onResolveDecision(d.id, took ? 'alt' : 'confirm');
        const remaining = itemsRef.current.decisions.filter((x) => !x.done && x.id !== d.id).length;
        if (remaining === 0) await advance();
    }
    // A client reply: send EVA's suggested answer, or park it for the Inbox.
    const parked = useRef<Set<string>>(new Set());
    const [, setBump] = useState(0); // re-render when a reply is parked (the set lives in a ref)
    async function actReply(th: Thread, send: boolean) {
        if (send) onResolveThread(th.id); else { parked.current.add(th.id); setBump((n) => n + 1); }
        const remaining = needsReply(itemsRef.current.threads).filter((x) => x.id !== th.id && !parked.current.has(x.id)).length;
        if (remaining === 0) await advance();
    }
    async function actValue(v: ValueItem, take: boolean) {
        if (take) onResolveValue(v.id);
        dealt.current.add(v.id);
        const remaining = itemsRef.current.values.filter((x) => !x.done && !dealt.current.has(x.id)).length;
        if (remaining === 0) await advance();
    }
    function submit(text: string) {
        const q = text.trim();
        if (!q) return;
        setInput('');
        pushUser(q);
        const a = homeAnswer(q, lang);
        evaSay(a.text, { openCockpit: a.openCockpit });
    }

    const exploreChips = [t('Which clients are ready for an advisory call?'), t('Who on my team is over capacity?'), t('How’s the week ahead?'), t('Open Work')];

    return (
        <div className="h-full flex flex-col">
            {/* slim header */}
            <div className="flex items-center gap-2.5 px-6 shrink-0" style={{ height: 56, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <Orb size={22} />
                <div className="leading-tight">
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('My day')}</p>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('with EVA')}</p>
                </div>
            </div>

            {/* conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto flex flex-col gap-4 px-5 py-7" style={{ maxWidth: 680 }}>
                    {feed.map((it) =>
                        it.who === 'user' ? (
                            <div key={it.key} className="flex items-end gap-2.5 justify-end anim-in">
                                <div className="rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm" style={{ background: '#1c1b3a', color: '#fff', maxWidth: '78%' }}>{it.node}</div>
                                <ProfileAvatar size={26} />
                            </div>
                        ) : (
                            <div key={it.key} className="flex items-start gap-2.5 anim-in">
                                <span className="shrink-0 mt-0.5"><Orb size={26} /></span>
                                <div className="min-w-0 flex-1">
                                    {it.type === 'text' && <p className="text-sm leading-relaxed" style={{ color: COLORS.text, paddingTop: 3 }}>{it.node}</p>}
                                    {it.type === 'intro' && (
                                        <div className="flex flex-col gap-2.5">
                                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text, paddingTop: 3 }}>{t('Good morning, {name}. 👋 Here’s your Tuesday:').replace('{name}', ME_FIRST)}</p>
                                            <TodayCard t={t} decisions={decisions} values={values} replies={needsReply(threads).length} onGo={onGo} />
                                        </div>
                                    )}
                                    {it.type === 'replies' && (
                                        <div className="flex flex-col gap-2.5">
                                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text, paddingTop: 3 }}>{it.ids.length > 1 ? t('{n} client conversations need you — I’ve drafted each next step:').replace('{n}', String(it.ids.length)) : t('One client conversation needs you — I’ve drafted the next step:')}</p>
                                            {it.ids.map((id) => threads.find((x) => x.id === id)).filter((x): x is Thread => !!x).map((th) => <ReplyCard key={th.id} th={th} t={t} parked={parked.current.has(th.id)} onAct={actReply} onOpen={() => onGo('inbox')} />)}
                                        </div>
                                    )}
                                    {it.type === 'decisions' && (
                                        <div className="flex flex-col gap-2.5">
                                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text, paddingTop: 3 }}>{it.ids.length > 1 ? t('Two quick calls before I can close the books:') : t('One quick call before I can close the books:')}</p>
                                            {it.ids.map((id) => decisions.find((x) => x.id === id)).filter((d): d is DecisionItem => !!d).map((d) => <DecisionCard key={d.id} d={d} t={t} onAct={actDecision} />)}
                                        </div>
                                    )}
                                    {it.type === 'values' && (
                                        <div className="flex flex-col gap-2.5">
                                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text, paddingTop: 3 }}>{shownAny.current && feed.some((f) => f.type === 'decisions') ? t('That’s the books clear. 🎯 Here’s where your time is worth most:') : t('Here’s where your time is worth most:')}</p>
                                            {it.ids.map((id) => values.find((x) => x.id === id)).filter((v): v is ValueItem => !!v).map((v) => <ValueCard key={v.id} v={v} t={t} onAct={actValue} />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                    {typing && (
                        <div className="flex items-start gap-2.5 anim-in">
                            <span className="shrink-0 mt-0.5"><Orb size={26} thinking /></span>
                            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md px-3" style={{ height: 34, background: '#fff', border: `1px solid ${COLORS.cardBorder}` }}>
                                <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* composer */}
            <div className="shrink-0 px-5 pb-5 pt-2">
                <div className="mx-auto" style={{ maxWidth: 680 }}>
                    {(pendingChip || ready) && (
                        <div className="flex flex-wrap gap-2 mb-2.5 justify-end">
                            {pendingChip ? (
                                <button
                                    onClick={() => onContinue(pendingChip)}
                                    className="rounded-full px-4 py-2 text-sm font-medium anim-in flex items-center gap-1.5"
                                    style={{ background: ACCENT, color: '#fff' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                                >
                                    {pendingChip} <span aria-hidden>→</span>
                                </button>
                            ) : (
                                exploreChips.map((c, i) => (
                                    <button
                                        key={c}
                                        onClick={() => (i === exploreChips.length - 1 ? (pushUser(c), evaSay(t('Opening Work — the full board across every client.'), { openCockpit: true })) : submit(c))}
                                        className="rounded-full px-3 py-1.5 text-sm anim-in"
                                        style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fff', color: COLORS.text }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                                    >
                                        {c}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                    <form
                        onSubmit={(e) => { e.preventDefault(); submit(input); }}
                        className="flex items-center gap-2 rounded-2xl px-3 py-2"
                        style={{ background: '#fff', border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                    >
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('Ask EVA anything about your day…')}
                            className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                            style={{ color: COLORS.text }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="shrink-0 flex items-center justify-center rounded-full"
                            style={{ width: 30, height: 30, background: input.trim() ? ACCENT : '#ececf0', color: input.trim() ? '#fff' : '#b0b0b8', cursor: input.trim() ? 'pointer' : 'default' }}
                            aria-label={t('Send')}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function Dot({ d = 0 }: { d?: number }) {
    return <span className="rounded-full" style={{ width: 5, height: 5, background: '#c3c3cc', display: 'inline-block', animation: 'evaBlink 1s ease-in-out infinite', animationDelay: `${d}s` }} />;
}

// The day's agenda — the shape of the day in four rows. Counts tick down live as
// you work through the briefing; each row links to where you'd go deeper.
function TodayCard({ t, decisions, values, replies, onGo }: { t: (s: string) => string; decisions: DecisionItem[]; values: ValueItem[]; replies: number; onGo: (v: ViewId) => void }) {
    const [showDay, setShowDay] = useState(false);
    const meetings = SCHEDULE.filter((e) => e.today);
    const rows: { icon: string; label: string; count: number; doneText: string; sub?: string; go?: { label: string; view: ViewId } }[] = [
        { icon: 'circle-tick', label: 'Decisions in the books', count: decisions.filter((d) => !d.done).length, doneText: 'All decided', go: { label: 'Work', view: 'activity' } },
        { icon: 'chat', label: 'Client conversations', count: replies, doneText: 'All answered', go: { label: 'Inbox', view: 'inbox' } },
        { icon: 'ai-stars', label: 'Worth your time', count: values.filter((v) => !v.done).length, doneText: 'All handled', go: { label: 'Clients', view: 'clients' } },
    ];
    return (
        <>
            <Card className="overflow-hidden mt-1" style={{ maxWidth: 520 }}>
                {/* meetings — expands to the day's calendar */}
                <div className="flex items-center gap-3 px-3.5 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 28, height: 28, background: '#eef4fb', color: '#2f6fb0' }}><Icon name="time" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: COLORS.text }}>{meetings.length} {t('meetings today')}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('First: {title} at {time}').replace('{title}', t(meetings[0].title)).replace('{time}', meetings[0].when)}</p>
                    </div>
                    <button onClick={() => setShowDay((v) => !v)} className="text-xs font-medium shrink-0" style={{ color: '#4456c7' }}>{showDay ? t('Hide') : t('View day')}</button>
                </div>
                {rows.map((r) => {
                    const done = r.count === 0;
                    return (
                        <div key={r.label} className="flex items-center gap-3 px-3.5 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 28, height: 28, background: done ? '#e9f7ef' : '#f3f0fb', color: done ? '#15803d' : '#6d28d9' }}><Icon name={(done ? 'circle-tick' : r.icon) as never} /></span>
                            <p className="text-sm font-medium flex-1 min-w-0" style={{ color: done ? COLORS.textMuted : COLORS.text }}>{t(r.label)}</p>
                            {done
                                ? <span className="text-xs font-medium shrink-0" style={{ color: '#15803d' }}>✓ {t(r.doneText)}</span>
                                : <span className="rounded-full text-xs font-semibold shrink-0" style={{ background: '#1c1b3a', color: '#fff', padding: '1px 8px' }}>{r.count}</span>}
                            {r.go && <button onClick={() => onGo(r.go!.view)} className="text-xs font-medium shrink-0" style={{ color: '#4456c7', width: 64, textAlign: 'right' }}>{t(r.go.label)} →</button>}
                        </div>
                    );
                })}
                <p className="px-3.5 py-2.5 text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted, background: '#fafafa' }}>
                    <Orb size={12} /> {t('Overnight I handled 1,240 items across {n} clients — nothing’s on fire.').replace('{n}', String(FIRM_CLIENTS))}
                </p>
            </Card>
            {showDay && <ScheduleCard t={t} />}
        </>
    );
}

// A client conversation that needs you, with EVA's drafted next step.
function ReplyCard({ th, t, parked, onAct, onOpen }: { th: Thread; t: (s: string) => string; parked: boolean; onAct: (th: Thread, send: boolean) => void; onOpen: () => void }) {
    const done = th.status === 'done';
    const last = [...th.messages].reverse().find((m) => m.from === 'client') ?? th.messages[th.messages.length - 1];
    const result = done ? th.messages[th.messages.length - 1]?.text : '';
    return (
        <Card className="p-3.5 mt-1" style={{ maxWidth: 520 }}>
            <div className="flex items-start gap-2.5">
                <ClientAvatar name={th.contact} size={26} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{th.client} · {t(th.subject)}</p>
                    <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{last.from === 'client' ? `“${t(last.text)}”` : t(last.text)}</p>
                    {!done && !parked && th.suggestion && <p className="text-sm mt-1 flex items-start gap-1.5" style={{ color: '#6d28d9' }}><span className="shrink-0 mt-0.5"><Orb size={13} /></span><span>{t('My call')}: {t(th.suggestion.action)}</span></p>}
                </div>
            </div>
            {done ? (
                <p className="text-sm mt-2 pl-9" style={{ color: '#15803d' }}>✓ {t('Sent')} — {t(result)}</p>
            ) : parked ? (
                <p className="text-sm mt-2 pl-9" style={{ color: COLORS.textMuted }}>{t('Left in your Inbox')}</p>
            ) : (
                <div className="flex items-center gap-2 mt-3 pl-9">
                    <Button onClick={() => { onAct(th, false); onOpen(); }}>{t('Open in Inbox')}</Button>
                    <Button onClick={() => onAct(th, false)}>{t('Later')}</Button>
                    <Button appearance="primary" onClick={() => onAct(th, true)}>{t('Approve & send')}</Button>
                </div>
            )}
        </Card>
    );
}

function EventRow({ e, t }: { e: Event; t: (s: string) => string }) {
    const k = SKED[e.kind];
    return (
        <div className="flex items-center gap-3 px-3.5 py-2.5" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <span className="shrink-0 text-xs font-semibold text-right" style={{ color: COLORS.text, width: 58 }}>{t(e.when)}</span>
            <span className="shrink-0 rounded-full" style={{ width: 7, height: 7, background: k.fg }} />
            <div className="min-w-0 flex-1">
                <p className="text-sm truncate" style={{ color: COLORS.text }}>{t(e.title)}</p>
            </div>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: k.bg, color: k.fg }}>{e.note ? `${t(e.kind)} · ${t(e.note)}` : t(e.kind)}</span>
        </div>
    );
}

function ScheduleCard({ t }: { t: (s: string) => string }) {
    const [week, setWeek] = useState(false);
    const today = SCHEDULE.filter((e) => e.today);
    const later = SCHEDULE.filter((e) => !e.today);
    return (
        <Card className="overflow-hidden mt-1" style={{ maxWidth: 520 }}>
            {today.map((e) => <EventRow key={e.title} e={e} t={t} />)}
            {week && (
                <>
                    <div className="px-3.5 py-1.5" style={{ background: '#fafafa', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Later this week')}</span>
                    </div>
                    {later.map((e) => <EventRow key={e.title} e={e} t={t} />)}
                </>
            )}
            <button onClick={() => setWeek((w) => !w)} className="w-full text-center py-2.5 text-sm font-medium" style={{ color: '#4456c7' }}>
                {week ? t('Show today only') : `${t('View the week')} →`}
            </button>
        </Card>
    );
}

function DecisionCard({ d, t, onAct }: { d: DecisionItem; t: (s: string) => string; onAct: (d: DecisionItem, took: boolean) => void }) {
    return (
        <Card className="p-3.5 mt-1" style={{ maxWidth: 520 }}>
            <div className="flex items-start gap-2.5">
                <ClientAvatar name={d.company} size={26} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(d.label)} · {d.company}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
                    {!d.done && <p className="text-sm mt-1 flex items-start gap-1.5" style={{ color: '#6d28d9' }}><span className="shrink-0 mt-0.5"><Orb size={13} /></span><span>{t('My call')}: {t(d.recommend)}</span></p>}
                </div>
            </div>
            {d.done ? (
                <p className="text-sm mt-2 pl-9 flex items-center gap-1.5" style={{ color: '#15803d' }}>✓ {t('Handled')}</p>
            ) : (
                <div className="flex items-center gap-2 mt-3 pl-9">
                    <Button onClick={() => onAct(d, true)}>{t(d.alt)}</Button>
                    <Button appearance="primary" onClick={() => onAct(d, false)}>{t(d.confirm)}</Button>
                </div>
            )}
        </Card>
    );
}

function ValueCard({ v, t, onAct }: { v: ValueItem; t: (s: string) => string; onAct: (v: ValueItem, take: boolean) => void }) {
    const k = KIND[v.kind];
    return (
        <Card className="p-3.5 mt-1" style={{ maxWidth: 520 }}>
            <div className="flex items-start gap-2.5">
                <ClientAvatar name={v.company} size={26} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: k.bg, color: k.fg }}>{t(v.kind)}</span>
                        <p className="text-sm" style={{ color: COLORS.text }}><span className="font-medium">{v.company}</span>{v.extra ? <span style={{ color: COLORS.textMuted }}> {v.extra}</span> : null} {t(v.text)}</p>
                    </div>
                    <p className="text-sm mt-1.5 flex items-start gap-1.5" style={{ color: COLORS.textMuted }}><span className="shrink-0 mt-0.5"><Orb size={13} /></span><span>{t(v.sub)}</span></p>
                    <div className="mt-2.5">
                        {v.done ? (
                            <span className="text-sm flex items-center gap-1.5" style={{ color: '#15803d' }}>✓ {t('On it')}</span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button appearance="primary" onClick={() => onAct(v, true)}>{t(v.action)}</Button>
                                <button onClick={() => onAct(v, false)} className="text-sm" style={{ color: COLORS.textMuted }}>{t('Later')}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
