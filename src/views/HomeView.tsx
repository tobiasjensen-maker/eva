import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@economic/taco';
import { Card, ClientAvatar, Orb, ProfileAvatar, COLORS } from '../ui';
import { useLang } from '../i18n';

// ---- Home · "My day" ----------------------------------------------------------
// Not the Cockpit. This is EVA talking you through your day like a personal
// assistant — a conversational briefing that reveals itself, with the things
// that need you surfaced inline as one-tap cards, and a composer to talk back.

const ME_FIRST = 'Tobias';
const PURPLE = '#7c3aed';
const KIND: Record<string, { bg: string; fg: string }> = {
    'Cash flow': { bg: '#fbf3e0', fg: '#92710f' },
    'Compliance': { bg: '#eef4fb', fg: '#2f6fb0' },
    'Growth': { bg: '#e9f7ef', fg: '#15803d' },
};

type Decision = { id: string; company: string; label: string; question: string; recommend: string; confirm: string; alt: string; ack: string; ackAlt: string; done?: boolean };
type Value = { id: string; company: string; extra?: string; kind: keyof typeof KIND; text: string; sub: string; action: string; ack: string; done?: boolean };

const DECISIONS0: Decision[] = [
    { id: 'd1', company: 'Nordic Build ApS', label: 'VAT return — Q1', question: 'A reverse-charge VAT line on an EU purchase looks unusual.', recommend: 'Book it as an EU acquisition and file to SKAT.', confirm: 'Confirm & file', alt: 'It’s domestic', ack: 'Done — Nordic Build’s Q1 VAT return is filed to SKAT. ✅', ackAlt: 'Got it — I’ll rebook it as domestic and hold the return for you.' },
    { id: 'd2', company: 'Café Solsikke', label: 'Bank reconciliation', question: '8 of 150 bank lines couldn’t be matched automatically.', recommend: 'Post them to a suspense account and ask the client.', confirm: 'Approve', alt: 'Let me look', ack: 'Approved — parked in suspense and I’ve messaged the client. ✅', ackAlt: 'Opening the eight lines for you — I’ll wait on your call.' },
];

const VALUES0: Value[] = [
    { id: 'v1', company: 'Café Solsikke', kind: 'Cash flow', text: 'will run low on cash in about six weeks at the current burn.', sub: 'I drafted a runway conversation with three options to walk through.', action: 'Book a call', ack: 'I’ve put 30 minutes on Thursday and attached the runway note.' },
    { id: 'v2', company: 'Nordic Build ApS', extra: '+5 others', kind: 'Compliance', text: 'and five others are affected by the new SKAT reporting rule.', sub: 'I worked out exactly who it hits and drafted what each client needs to hear.', action: 'Review 6 drafts', ack: 'Opening the six drafts — approve each and I’ll send it in your tone.' },
    { id: 'v3', company: 'Fjord Fitness', kind: 'Growth', text: 'has grown into a flat-rate VAT scheme that would save it ~14,000 kr/yr.', sub: 'I prepared the switch and a short note to send the client.', action: 'Draft proposal', ack: 'Proposal drafted — it’s in your outbox ready to review.' },
];

type Item =
    | { key: string; who: 'eva'; type: 'text'; node: ReactNode }
    | { key: string; who: 'eva'; type: 'summary' }
    | { key: string; who: 'eva'; type: 'decisions' }
    | { key: string; who: 'eva'; type: 'value' }
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
    const [decisions, setDecisions] = useState<Decision[]>(DECISIONS0);
    const [values, setValues] = useState<Value[]>(VALUES0);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const seq = useRef(0);
    const key = () => `m${seq.current++}`;

    const push = (it: Item) => setFeed((f) => [...f, it]);

    // Stick to the bottom as the conversation grows.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [feed, typing]);

    // Play the morning briefing once, revealing beat by beat.
    useEffect(() => {
        let alive = true;
        const evaText = (node: ReactNode) => push({ key: key(), who: 'eva', type: 'text', node });
        const steps: { delay: number; run: () => void }[] = [
            { delay: 500, run: () => evaText(<>{t('Good morning, {name}. 👋 Here’s your Tuesday, 15 September.').replace('{name}', ME_FIRST)}</>) },
            { delay: 850, run: () => evaText(<>{t('While you were away, I ran overnight routines across your practice. Here’s where things stand.')}</>) },
            { delay: 700, run: () => push({ key: key(), who: 'eva', type: 'summary' }) },
            { delay: 950, run: () => evaText(<>{t('Two of them need a quick call from you before I can close them. Let’s clear those first.')}</>) },
            { delay: 700, run: () => push({ key: key(), who: 'eva', type: 'decisions' }) },
            { delay: 1100, run: () => evaText(<>{t('That’s the books handled. 🎯 Now the part that actually grows the firm — I’ve done the analysis, you just decide.')}</>) },
            { delay: 800, run: () => push({ key: key(), who: 'eva', type: 'value' }) },
            { delay: 1000, run: () => evaText(<>{t('That’s everything that needs you today. I’ll keep the rest running and flag anything that changes. What do you want to dig into?')}</>) },
        ];
        (async () => {
            for (const step of steps) {
                if (!alive) return;
                setTyping(true);
                await sleep(step.delay);
                if (!alive) return;
                setTyping(false);
                step.run();
                await sleep(200);
            }
            if (alive) setReady(true);
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const evaSay = async (text: string, opts?: { openCockpit?: boolean }) => {
        setTyping(true);
        await sleep(650);
        setTyping(false);
        push({ key: key(), who: 'eva', type: 'text', node: text });
        if (opts?.openCockpit) setTimeout(onOpenCockpit, 700);
    };

    function actDecision(d: Decision, took: boolean) {
        setDecisions((ds) => ds.map((x) => (x.id === d.id ? { ...x, done: true } : x)));
        evaSay(t(took ? d.ackAlt : d.ack));
    }
    function actValue(v: Value) {
        setValues((vs) => vs.map((x) => (x.id === v.id ? { ...x, done: true } : x)));
        evaSay(t(v.ack));
    }

    function submit(text: string) {
        const q = text.trim();
        if (!q) return;
        setInput('');
        push({ key: key(), who: 'user', type: 'text', node: q });
        const a = homeAnswer(q, lang);
        evaSay(a.text, { openCockpit: a.openCockpit });
    }

    const chips = [t('How’s the week ahead?'), t('Who’s waiting on clients?'), t('Open the Cockpit')];

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
                                    {it.type === 'summary' && <SummaryCard t={t} />}
                                    {it.type === 'decisions' && <DecisionCards decisions={decisions} t={t} onAct={actDecision} />}
                                    {it.type === 'value' && <ValueCards values={values} t={t} onAct={actValue} />}
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
                    {ready && (
                        <div className="flex flex-wrap gap-2 mb-2.5 anim-in">
                            {chips.map((c, i) => (
                                <button
                                    key={c}
                                    onClick={() => (i === chips.length - 1 ? (push({ key: key(), who: 'user', type: 'text', node: c }), evaSay(t('Opening the Cockpit — that’s the full board across every client.'), { openCockpit: true })) : submit(c))}
                                    className="rounded-full px-3 py-1.5 text-sm anim-in"
                                    style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fff', color: COLORS.text }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                                >
                                    {c}
                                </button>
                            ))}
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

function DecisionCards({ decisions, t, onAct }: { decisions: Decision[]; t: (s: string) => string; onAct: (d: Decision, took: boolean) => void }) {
    return (
        <div className="flex flex-col gap-2.5 mt-1">
            {decisions.map((d) => (
                <Card key={d.id} className="p-3.5" style={{ maxWidth: 520, borderColor: d.done ? undefined : PURPLE }}>
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
            ))}
        </div>
    );
}

function ValueCards({ values, t, onAct }: { values: Value[]; t: (s: string) => string; onAct: (v: Value) => void }) {
    return (
        <div className="flex flex-col gap-2.5 mt-1">
            {values.map((v) => {
                const k = KIND[v.kind];
                return (
                    <Card key={v.id} className="p-3.5" style={{ maxWidth: 520 }}>
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
                                        <Button appearance="primary" onClick={() => onAct(v)}>{t(v.action)}</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
