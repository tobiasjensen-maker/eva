import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@economic/taco';
import { Card, ClientAvatar, Orb, ProfileAvatar, COLORS } from '../ui';
import { useLang } from '../i18n';

// ---- Home · "My day" ----------------------------------------------------------
// Not the Cockpit. This is EVA talking you through your day like a personal
// assistant — one beat at a time. Nothing dumps on screen at once: EVA says a
// thing, waits for you to act or say "go", and only then reveals the next.

const ME_FIRST = 'Tobias';
const PURPLE = '#7c3aed';
const KIND: Record<string, { bg: string; fg: string }> = {
    'Cash flow': { bg: '#fbf3e0', fg: '#92710f' },
    'Compliance': { bg: '#eef4fb', fg: '#2f6fb0' },
    'Growth': { bg: '#e9f7ef', fg: '#15803d' },
};

type Decision = { id: string; company: string; label: string; question: string; recommend: string; confirm: string; alt: string; ack: string; ackAlt: string; done?: boolean };
type Value = { id: string; company: string; extra?: string; kind: keyof typeof KIND; text: string; sub: string; action: string; ack: string; done?: boolean };

const DECISIONS: Decision[] = [
    { id: 'd1', company: 'Nordic Build ApS', label: 'VAT return — Q1', question: 'A reverse-charge VAT line on an EU purchase looks unusual.', recommend: 'Book it as an EU acquisition and file to SKAT.', confirm: 'Confirm & file', alt: 'It’s domestic', ack: 'Done — Nordic Build’s Q1 VAT return is filed to SKAT. ✅', ackAlt: 'Got it — I’ll rebook it as domestic and hold the return for you.' },
    { id: 'd2', company: 'Café Solsikke', label: 'Bank reconciliation', question: '8 of 150 bank lines couldn’t be matched automatically.', recommend: 'Post them to a suspense account and ask the client.', confirm: 'Approve', alt: 'Let me look', ack: 'Approved — parked in suspense and I’ve messaged the client. ✅', ackAlt: 'Opening the eight lines for you — I’ll wait on your call.' },
];

const VALUES: Value[] = [
    { id: 'v1', company: 'Café Solsikke', kind: 'Cash flow', text: 'will run low on cash in about six weeks at the current burn.', sub: 'I drafted a runway conversation with three options to walk through.', action: 'Book a call', ack: 'I’ve put 30 minutes on Thursday and attached the runway note.' },
    { id: 'v2', company: 'Nordic Build ApS', extra: '+5 others', kind: 'Compliance', text: 'and five others are affected by the new SKAT reporting rule.', sub: 'I worked out exactly who it hits and drafted what each client needs to hear.', action: 'Review 6 drafts', ack: 'Opening the six drafts — approve each and I’ll send it in your tone.' },
    { id: 'v3', company: 'Fjord Fitness', kind: 'Growth', text: 'has grown into a flat-rate VAT scheme that would save it ~14,000 kr/yr.', sub: 'I prepared the switch and a short note to send the client.', action: 'Draft proposal', ack: 'Proposal drafted — it’s in your outbox ready to review.' },
];

// The briefing, as an ordered list of beats. `next` (when present) is the label
// of a continue-chip that reveals the following beat; card beats advance when you act.
type Beat =
    | { intro: true; next: string }
    | { say: string; next?: string; done?: true }
    | { decision: number }
    | { value: number };
const BEATS: Beat[] = [
    // Greeting + overnight summary arrive together as EVA's opening message.
    { intro: true, next: 'What needs me?' },
    { decision: 0 },
    { decision: 1 },
    { say: 'That’s the books clear for today. 🎯 Now the part that actually grows the firm — want to see it?', next: 'Show me' },
    { value: 0 },
    { value: 1 },
    { value: 2 },
    { say: 'That’s everything that needs you today. I’ll keep the rest running and flag anything that changes. Ask me anything.', done: true },
];

type Item =
    | { key: string; who: 'eva'; type: 'text'; node: ReactNode }
    | { key: string; who: 'eva'; type: 'intro' }
    | { key: string; who: 'eva'; type: 'decision'; dId: string }
    | { key: string; who: 'eva'; type: 'value'; vId: string }
    | { key: string; who: 'user'; type: 'text'; node: ReactNode };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function homeAnswer(q: string, lang: 'en' | 'da'): { text: string; openCockpit?: boolean } {
    const s = q.toLowerCase();
    const da = lang === 'da';
    if (/cockpit|board|full|everything|list|tavle|oversigt/.test(s))
        return { text: da ? 'Åbner Cockpit — det er hele tavlen på tværs af alle kunder.' : 'Opening the Cockpit — that’s the full board across every client.', openCockpit: true };
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

export default function HomeView({ onOpenCockpit }: { onOpenCockpit: () => void }) {
    const { t, lang } = useLang();
    const [feed, setFeed] = useState<Item[]>([]);
    const [typing, setTyping] = useState(false);
    const [ready, setReady] = useState(false);
    const [pendingChip, setPendingChip] = useState<string | null>(null);
    const [decisions, setDecisions] = useState<Decision[]>(DECISIONS);
    const [values, setValues] = useState<Value[]>(VALUES);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const seq = useRef(0);
    const idxRef = useRef(-1);
    const started = useRef(false);
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

    // Reveal one beat, then wait for the user (a continue-chip, or acting on a card).
    async function present(i: number) {
        idxRef.current = i;
        const beat = BEATS[i];
        setTyping(true);
        await sleep(700);
        setTyping(false);
        if ('intro' in beat) push({ key: key(), who: 'eva', type: 'intro' });
        if ('say' in beat) push({ key: key(), who: 'eva', type: 'text', node: t(beat.say).replace('{name}', ME_FIRST) });
        if ('decision' in beat) push({ key: key(), who: 'eva', type: 'decision', dId: DECISIONS[beat.decision].id });
        if ('value' in beat) push({ key: key(), who: 'eva', type: 'value', vId: VALUES[beat.value].id });
        if ('next' in beat && beat.next) setPendingChip(beat.next);
        if ('done' in beat && beat.done) setReady(true);
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
    async function actDecision(d: Decision, took: boolean) {
        setDecisions((ds) => ds.map((x) => (x.id === d.id ? { ...x, done: true } : x)));
        pushUser(t(took ? d.alt : d.confirm));
        await evaSay(t(took ? d.ackAlt : d.ack));
        await advance();
    }
    async function actValue(v: Value, take: boolean) {
        setValues((vs) => vs.map((x) => (x.id === v.id ? { ...x, done: true } : x)));
        if (take) { pushUser(t(v.action)); await evaSay(t(v.ack)); }
        else { pushUser(t('Later')); }
        await advance();
    }
    function submit(text: string) {
        const q = text.trim();
        if (!q) return;
        setInput('');
        pushUser(q);
        const a = homeAnswer(q, lang);
        evaSay(a.text, { openCockpit: a.openCockpit });
    }

    const exploreChips = [t('How’s the week ahead?'), t('Who’s waiting on clients?'), t('Open the Cockpit')];

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
                                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text, paddingTop: 3 }}>{t('Good morning, {name}. 👋 Here’s your Tuesday — I went through all 40 clients overnight.').replace('{name}', ME_FIRST)}</p>
                                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{t('Here’s where things stand.')}</p>
                                            <SummaryCard t={t} />
                                        </div>
                                    )}
                                    {it.type === 'decision' && <DecisionCard d={decisions.find((x) => x.id === it.dId)!} t={t} onAct={actDecision} />}
                                    {it.type === 'value' && <ValueCard v={values.find((x) => x.id === it.vId)!} t={t} onAct={actValue} />}
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
                        <div className="flex flex-wrap gap-2 mb-2.5">
                            {pendingChip ? (
                                <button
                                    onClick={() => onContinue(pendingChip)}
                                    className="rounded-full px-3.5 py-1.5 text-sm font-medium anim-in flex items-center gap-1.5"
                                    style={{ background: PURPLE, color: '#fff' }}
                                >
                                    {pendingChip} <span aria-hidden>→</span>
                                </button>
                            ) : (
                                exploreChips.map((c, i) => (
                                    <button
                                        key={c}
                                        onClick={() => (i === exploreChips.length - 1 ? (pushUser(c), evaSay(t('Opening the Cockpit — that’s the full board across every client.'), { openCockpit: true })) : submit(c))}
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
                            style={{ width: 30, height: 30, background: input.trim() ? PURPLE : '#ececf0', color: input.trim() ? '#fff' : '#b0b0b8', cursor: input.trim() ? 'pointer' : 'default' }}
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

function SummaryCard({ t }: { t: (s: string) => string }) {
    const stats = [
        { n: '31', label: t('clients ran overnight'), c: COLORS.text },
        { n: '6', label: t('closed clean'), c: '#16a34a' },
        { n: '3', label: t('raised something'), c: '#b9842b' },
        { n: '1,240', label: t('items handled'), c: PURPLE },
    ];
    return (
        <Card className="p-4 mt-1" style={{ maxWidth: 460 }}>
            <div className="grid grid-cols-4 gap-2">
                {stats.map((s) => (
                    <div key={s.label}>
                        <p className="text-xl font-semibold leading-none" style={{ color: s.c }}>{s.n}</p>
                        <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{s.label}</p>
                    </div>
                ))}
            </div>
            <p className="text-xs mt-3 pt-3" style={{ color: COLORS.textMuted, borderTop: `1px solid ${COLORS.cardBorder}` }}>{t('The rest are mid-flight. Nothing’s on fire.')}</p>
        </Card>
    );
}

function DecisionCard({ d, t, onAct }: { d: Decision; t: (s: string) => string; onAct: (d: Decision, took: boolean) => void }) {
    return (
        <Card className="p-3.5 mt-1" style={{ maxWidth: 520, borderColor: d.done ? undefined : PURPLE }}>
            <div className="flex items-start gap-2.5">
                <ClientAvatar name={d.company} size={26} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(d.label)} · {d.company}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
                    {!d.done && <p className="text-sm mt-1 flex items-start gap-1.5" style={{ color: PURPLE }}><span className="shrink-0 mt-0.5"><Orb size={13} /></span><span>{t('My call')}: {t(d.recommend)}</span></p>}
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

function ValueCard({ v, t, onAct }: { v: Value; t: (s: string) => string; onAct: (v: Value, take: boolean) => void }) {
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
