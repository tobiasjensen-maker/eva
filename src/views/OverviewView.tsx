import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, Orb, MicIcon, COLORS, CANVAS } from '../ui';
import { useLang } from '../i18n';
import type { DecisionItem } from '../day';
import { BOOKS_STATUS, CLIENTS, FIRM_CLIENTS, type Client } from '../practice';
import type { ViewId } from '../types';
import { ExpertiseCard, ClientList, ClientDrawer } from './ClientsView';

// ---- Portfolio overview — where the AO starts the day ----------------------------
// One page for the morning: a greeting and a question box ("ask anything about your
// firm") at the top, then the day at a glance — today's calendar, the decisions only
// you can make, where every client's books stand — the clients who need your
// expertise, and the whole portfolio. Asking a question hands off to the EVA panel.

// Today's calendar (the Outlook connector).
const SKED: Record<string, { bg: string; fg: string }> = {
    'Deadline': { bg: '#fdecec', fg: '#c0392b' },
    'Advisory': { bg: '#f3f0fb', fg: '#7c3aed' },
    'Payroll': { bg: '#fbf3e0', fg: '#92710f' },
    'Period close': { bg: '#eef4fb', fg: '#2f6fb0' },
    'Meeting': { bg: '#e9f7ef', fg: '#15803d' },
};
type Event = { when: string; title: string; kind: keyof typeof SKED; note?: string; today?: boolean };
export const SCHEDULE: Event[] = [
    { when: '09:30', title: 'Team stand-up', kind: 'Meeting', today: true },
    { when: '11:00', title: 'Client call — Bryg & Co', kind: 'Meeting', today: true },
    { when: '15:30', title: 'Review — Q1 VAT, Nordic Build', kind: 'Deadline', today: true },
    { when: 'Thu 14:00', title: 'Runway call — Café Solsikke', kind: 'Advisory' },
    { when: 'Fri 09:00', title: 'VAT filing deadline', kind: 'Deadline', note: '3 clients' },
    { when: 'Fri 06:00', title: 'Payroll run — Aarhus Tandklinik', kind: 'Payroll' },
    { when: 'Fri', title: 'Month-end close — Fjord Fitness', kind: 'Period close' },
    { when: 'Mon 10:00', title: 'Quarterly review — Nordic Build ApS', kind: 'Meeting' },
];

// EVA's answers to questions asked from the overview (shown in the EVA panel).
export function overviewAnswer(q: string, lang: 'en' | 'da', ctx: { decisions: number; replies: number }): string {
    const s = q.toLowerCase();
    const da = lang === 'da';
    const worth = CLIENTS.filter((c) => c.signal).length;
    if (/walk|my day|start|today|dag|i dag|gennem/.test(s))
        return da
            ? `Her er din tirsdag: 3 møder (første: team-standup 09:30). ${ctx.decisions} beslutninger i bøgerne — ét tryk hver på oversigten. ${ctx.replies} kundesamtaler med udkast til svar i indbakken. ${worth} kunder, der er værd at bruge tid på — Café Solsikkes likviditet haster mest. Skal vi starte med beslutningerne?`
            : `Here’s your Tuesday: 3 meetings (first: Team stand-up at 09:30). ${ctx.decisions} decision${ctx.decisions === 1 ? '' : 's'} in the books — one tap each on the overview. ${ctx.replies} client conversation${ctx.replies === 1 ? '' : 's'} with a drafted reply in your Inbox. ${worth} clients worth your time — Café Solsikke’s cash runway is the most urgent. Shall we start with the decisions?`;
    if (/cash|runway|likvidit/.test(s)) {
        const list = CLIENTS.filter((c) => c.signal?.kind === 'Cash flow').map((c) => c.name);
        return da ? `${list.length} kunder har likviditetsudfordringer: ${list.join(', ')}. Café Solsikke er tættest på — ca. seks ugers likviditet. Åbn en kunde for samtalepunkter.` : `${list.length} clients have cash-flow issues: ${list.join(', ')}. Café Solsikke is nearest — about six weeks of runway. Open a client for talking points.`;
    }
    if (/advis|ready for|rådgivning|klar til/.test(s))
        return da ? 'Fire kunder vokser 10%+ uden rådgivning: Grøn Energi (+25%), Cloud Hosting (+22%), Fjord Fitness (+14%) og Nordic Build (+12%). Jeg har samtalepunkter klar for hver.' : 'Four clients are growing 10%+ with no advisory yet: Grøn Energi (+25%), Cloud Hosting (+22%), Fjord Fitness (+14%) and Nordic Build (+12%). I have talking points ready for each — open them from the client list.';
    if (/expense|cost|udgift|omkostning/.test(s))
        return da ? 'Nørre Bageri (mel og energi +31%) og Café Solsikke (varekøb 38% af omsætningen mod 31% hos lignende) har de største omkostningsstigninger.' : 'Nørre Bageri (flour and energy up 31%) and Café Solsikke (food costs 38% of revenue vs. 31% for peers) have the sharpest cost increases.';
    if (/capacity|team|kapacitet|travl/.test(s))
        return da ? 'Mette er på 116% og Jonas på 56%. Flyt tre af Mettes kunder til Jonas (31 t/md) — klar under Praksis → Kapacitet.' : 'Mette is at 116% and Jonas at 56%. Move three of Mette’s clients to Jonas (31 h/mo) — it’s ready to apply under Practice → Capacity.';
    if (/profit|lønsom|reprice|price/.test(s))
        return da ? 'Café Solsikke (382 kr/t), Lys Design (433 kr/t) og Nørre Bageri (460 kr/t) ligger under jeres mål på 900 kr/t.' : 'Café Solsikke (382 kr/h), Lys Design (433 kr/h) and Nørre Bageri (460 kr/h) sit below your 900 kr/h target — reprice drafts are under Practice → Profitability.';
    if (/week|ahead|uge|kommende/.test(s))
        return da ? 'Resten af ugen: likviditetsmøde med Café Solsikke torsdag, momsfrist for 3 kunder fredag, lønkørsel og månedsafslutning fredag, kvartalsgennemgang med Nordic Build mandag.' : 'The rest of the week: runway call with Café Solsikke on Thursday, VAT deadline for 3 clients on Friday, a payroll run and a month-end close on Friday, and a quarterly review with Nordic Build on Monday.';
    if (/wait|reply|inbox|venter|svar/.test(s))
        return da ? `${ctx.replies} kundesamtaler venter på dig med udkast til svar; to venter på kunden, og jeg rykker automatisk.` : `${ctx.replies} client conversations need you, each with a drafted reply; two are waiting on the client and I’ll follow up automatically.`;
    return da ? 'Spørg mig om din dag, en kunde, kapacitet, lønsomhed eller hvem der er klar til rådgivning.' : 'Ask me about your day, a client, team capacity, profitability, or who’s ready for an advisory conversation.';
}

export default function OverviewView({ decisions, replies, onResolveDecision, onAsk, onGo, onOpenBooks, onMessage }: {
    decisions: DecisionItem[];
    replies: number;
    onResolveDecision: (id: string, taken: 'confirm' | 'alt') => void;
    onAsk: (q: string) => void;
    onGo: (v: ViewId) => void;
    onOpenBooks: (name: string) => void;
    onMessage: (client: string) => void;
}) {
    const { t } = useLang();
    const [q, setQ] = useState('');
    const [sel, setSel] = useState<Client | null>(null);
    const open = decisions.filter((d) => !d.done).length;
    const chips = [t('Walk me through my day'), t('Which clients are ready for an advisory call?'), t('Do I have clients with cash-flow issues?')];
    const ask = (text: string) => { if (text.trim()) { onAsk(text.trim()); setQ(''); } };

    return (
        <div className="h-full overflow-y-auto">
            {/* hero — the greeting and the question box */}
            <div className="px-8 pt-10 pb-9" style={{ background: `linear-gradient(180deg, #edf3fb 0%, #f4f0fb 70%, ${CANVAS} 100%)` }}>
                <div className="mx-auto text-center" style={{ maxWidth: 760 }}>
                    <h1 className="text-3xl font-semibold" style={{ color: COLORS.text }}>{t('Good morning, {name}').replace('{name}', 'Tobias')}</h1>
                    <p className="text-sm mt-2" style={{ color: COLORS.textMuted }}>
                        {t('Overnight I handled 1,240 items across {n} clients.').replace('{n}', String(FIRM_CLIENTS))}{' '}
                        {(() => {
                            const parts = [
                                open ? (open === 1 ? t('1 decision') : t('{n} decisions').replace('{n}', String(open))) : '',
                                replies ? (replies === 1 ? t('1 client reply') : t('{n} client replies').replace('{n}', String(replies))) : '',
                            ].filter(Boolean);
                            return parts.length ? t('{list} need you.').replace('{list}', parts.join(` ${t('and')} `)) : t('Nothing needs you right now.');
                        })()}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-5 rounded-full p-[2px]" style={{ background: 'linear-gradient(90deg,#4c6ef5,#7c3aed 45%,#16a34a)' }}>
                        <div className="flex items-center gap-3 rounded-full bg-white pl-4 pr-2 py-2">
                            <Orb size={20} />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Tell me where you’d like to start, or ask a question about your firm.')} className="flex-1 min-w-0 bg-transparent outline-none text-sm py-1" style={{ color: COLORS.text }} />
                            <span className="shrink-0" style={{ color: COLORS.textMuted }}><MicIcon /></span>
                            <button type="submit" disabled={!q.trim()} className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: q.trim() ? '#1c1b3a' : '#ececf0', color: q.trim() ? '#fff' : '#b0b0b8' }} aria-label={t('Send')}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        </div>
                    </form>
                    <div className="flex flex-wrap justify-center gap-2 mt-3.5">
                        {chips.map((c) => (
                            <button key={c} onClick={() => ask(c)} className="rounded-full px-3.5 py-1.5 text-sm" style={{ background: '#fff', border: '1px solid #c9d6f5', color: '#2f55c7' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f8ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>{c}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto px-8 pb-10 flex flex-col gap-5" style={{ maxWidth: 1240 }}>
                {/* the day at a glance */}
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
                    <TodayWidget t={t} />
                    <NeedsYouWidget t={t} decisions={decisions} replies={replies} onResolve={onResolveDecision} onGo={onGo} />
                    <BooksWidget t={t} onGo={onGo} />
                </div>

                <ExpertiseCard onOpen={setSel} />

                <ClientList onSelect={setSel} />
            </div>

            {sel && <ClientDrawer c={sel} onClose={() => setSel(null)} onOpenBooks={onOpenBooks} onMessage={onMessage} />}
        </div>
    );
}

function Widget({ title, right, children, footer }: { title: string; right?: ReactNode; children: ReactNode; footer?: ReactNode }) {
    return (
        <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
                <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{title}</p>
                {right}
            </div>
            <div className="flex-1">{children}</div>
            {footer && <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>{footer}</div>}
        </Card>
    );
}

function TodayWidget({ t }: { t: (s: string) => string }) {
    const [week, setWeek] = useState(false);
    const rows = SCHEDULE.filter((e) => week || e.today);
    return (
        <Widget title={t('Today')} right={<span className="text-xs" style={{ color: COLORS.textMuted }}>{t('From your calendar')}</span>}
            footer={<button onClick={() => setWeek((w) => !w)} className="text-xs font-medium" style={{ color: '#4456c7' }}>{week ? t('Show today only') : `${t('View the week')} →`}</button>}>
            {rows.map((e, i) => {
                const k = SKED[e.kind];
                const firstLater = week && !e.today && (i === 0 || rows[i - 1].today);
                return (
                    <div key={e.title}>
                        {firstLater && <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Later this week')}</p>}
                        <div className="flex items-center gap-3 px-4 py-2">
                            <span className="shrink-0 text-xs font-semibold" style={{ color: COLORS.text, width: 58 }}>{t(e.when)}</span>
                            <span className="shrink-0 rounded-full" style={{ width: 7, height: 7, background: k.fg }} />
                            <p className="text-sm truncate flex-1 min-w-0" style={{ color: COLORS.text }}>{t(e.title)}</p>
                        </div>
                    </div>
                );
            })}
        </Widget>
    );
}

// The decisions only the accountant can make. Each opens a review — what EVA did,
// the facts behind the question, EVA's call — where you decide.
function NeedsYouWidget({ t, decisions, replies, onResolve, onGo }: { t: (s: string) => string; decisions: DecisionItem[]; replies: number; onResolve: (id: string, taken: 'confirm' | 'alt') => void; onGo: (v: ViewId) => void }) {
    const open = decisions.filter((d) => !d.done);
    const [review, setReview] = useState<DecisionItem | null>(null);
    return (
        <>
            <Widget title={t('Needs your decision')} right={open.length > 0 ? <span className="rounded-full text-xs font-semibold" style={{ background: '#1c1b3a', color: '#fff', padding: '1px 8px' }}>{open.length}</span> : undefined}
                footer={<button onClick={() => onGo('inbox')} className="text-xs font-medium flex items-center gap-1.5" style={{ color: '#4456c7' }}><Icon name="chat" /> {replies > 0 ? t('{n} client replies drafted in your Inbox').replace('{n}', String(replies)) : t('No client replies waiting')} →</button>}>
                {open.length === 0 ? (
                    <div className="px-4 py-6 flex items-center gap-2.5">
                        <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: '#e9f7ef', color: '#15803d' }}><Icon name="circle-tick" /></span>
                        <p className="text-sm" style={{ color: COLORS.text }}>{t('Nothing in the books needs you.')}</p>
                    </div>
                ) : open.map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3" style={i === 0 ? undefined : { borderTop: `1px solid ${COLORS.cardBorder}` }}>
                        <ClientAvatar name={d.company} size={26} />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{d.company} · {t(d.label)}</p>
                            <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
                        </div>
                        <Button appearance="primary" onClick={() => setReview(d)}>{t('Review')}</Button>
                    </div>
                ))}
            </Widget>
            {review && <DecisionReview d={review} t={t} onClose={() => setReview(null)} onResolve={(taken) => { onResolve(review.id, taken); setReview(null); }} />}
        </>
    );
}

// Review a decision: what EVA did, the facts, EVA's call — then decide.
function DecisionReview({ d, t, onClose, onResolve }: { d: DecisionItem; t: (s: string) => string; onClose: () => void; onResolve: (taken: 'confirm' | 'alt') => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden" style={{ maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={d.company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t(d.label)}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{d.company}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">
                    <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: '#fbf3e0', border: '1px solid #efdcb0' }}>
                        <span className="shrink-0" style={{ color: '#b9842b' }}><Icon name="circle-warning" /></span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#92710f' }}>{t('Needs your review')}</p>
                            <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('The facts')}</p>
                        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                            {d.evidence.map((e, i) => (
                                <div key={e.label} className="flex gap-3 px-3 py-2 text-sm" style={i === 0 ? undefined : { borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                    <span className="shrink-0" style={{ color: COLORS.textMuted, width: 128 }}>{t(e.label)}</span>
                                    <span style={{ color: COLORS.text }}>{t(e.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('What EVA did')}</p>
                        <ol className="flex flex-col gap-1.5">
                            {d.steps.map((st, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}>
                                    <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 16, height: 16, background: '#eef7ef', color: '#15803d', fontSize: 10 }}><Icon name="tick" /></span>
                                    {t(st)}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                        <span className="shrink-0 mt-0.5"><Orb size={16} /></span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6d28d9' }}>{t('EVA’s call')}</p>
                            <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.recommend)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('You stand behind this — EVA logs your decision.')}</span>
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={() => onResolve('alt')}>{t(d.alt)}</Button>
                        <Button appearance="primary" onClick={() => onResolve('confirm')}><Icon name="circle-tick" /> {t(d.confirm)}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Where every client's books stand this month — a large donut, legend underneath.
function BooksWidget({ t, onGo }: { t: (s: string) => string; onGo: (v: ViewId) => void }) {
    const total = BOOKS_STATUS.reduce((s, b) => s + b.count, 0);
    const SIZE = 184, R = 70, W = 24, C = 2 * Math.PI * R;
    let acc = 0;
    return (
        <Widget title={t('Books status')} right={<span className="text-xs" style={{ color: COLORS.textMuted }}>{t('This month')}</span>}
            footer={<button onClick={() => onGo('activity')} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t('Open Work')} →</button>}>
            <div className="flex flex-col items-center px-4 pb-4 pt-2">
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#f1f1f3" strokeWidth={W} />
                    {BOOKS_STATUS.map((b) => {
                        const len = (b.count / total) * C;
                        const el = <circle key={b.key} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={b.color} strokeWidth={W} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />;
                        acc += len;
                        return el;
                    })}
                    <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" fontSize="30" fontWeight="600" fill={COLORS.text}>{total}</text>
                    <text x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle" fontSize="12" fill={COLORS.textMuted}>{t('clients')}</text>
                </svg>
                <div className="grid grid-cols-3 gap-2 w-full mt-4">
                    {BOOKS_STATUS.map((b) => (
                        <div key={b.key} className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                                <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: b.color }} />
                                <span className="text-xs" style={{ color: COLORS.textMuted }}>{t(b.label)}</span>
                            </div>
                            <p className="text-base font-semibold mt-0.5" style={{ color: COLORS.text }}>{b.count}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs mt-3 text-center" style={{ color: COLORS.textMuted }}>{t('EVA closes most of these on its own.')}</p>
            </div>
        </Widget>
    );
}
