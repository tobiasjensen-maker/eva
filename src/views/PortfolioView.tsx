import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon } from '@economic/taco';
import { ClientAvatar, EvaWindowControls, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { DOC_REQUESTS, ME, MY_PORTFOLIO } from '../practice';
import type { DecisionItem } from '../day';
import { DOC_REMINDERS, FOCUS, SETUPS, SHARED, SMART_INBOX, type BulkItem } from '../portfolio';
import { workEntry, type LogEntry } from './ActivityView';

// ---- AX: Portfolio — EVA across every agreement ---------------------------------
// Where to start (ranked, with EVA's reasons), the same task on several agreements handled in one plan,
// how each agreement is set up (and what EVA could automate), and what colleagues did on shared agreements.
// Plan → approve → result per agreement → logged on each agreement as done by you via EVA.

type Tab = 'priorities' | 'setup' | 'colleagues';
const TAB_KEY = 'va-ax-portfolio-tab';
const PURPLE = { bg: '#faf7fe', border: '#ece2fc' };
const TAG = {
    flag: { background: '#fdecec', color: '#b42318' },
    action: { background: '#eef2ff', color: '#3341a8' },
    doc: { background: '#fdf1dc', color: '#92710f' },
    ok: { background: '#e9f7ef', color: '#15803d' },
    muted: { background: '#f1f1f3', color: '#52525b' },
};
const first = (n: string) => n.split(' ')[0];

export default function PortfolioView({ decisions, onOpenTasks, onAsk, onLog, evaControls }: {
    decisions: DecisionItem[];
    onOpenTasks: (name: string) => void; // Tasks, scoped to that agreement
    onAsk: (q: string, a: string, name?: string) => void; // a follow-up in Chat, the answer included
    onLog: (entries: LogEntry[]) => void; // each agreement's log: done by you via EVA
    evaControls?: { onMinimise: () => void; onClose: () => void };
}) {
    const { t, lang } = useLang();
    const da = lang === 'da';
    const [tab, setTabState] = useState<Tab>(() => { try { return (localStorage.getItem(TAB_KEY) as Tab) || 'priorities'; } catch { return 'priorities'; } });
    const setTab = (v: Tab) => { setTabState(v); try { localStorage.setItem(TAB_KEY, v); } catch { /* ignore */ } };
    // Bulk plans: which one is open, and the ones already run (their per-agreement results stay visible)
    const [plan, setPlan] = useState<'reminders' | 'inbox' | null>(null);
    const [ran, setRan] = useState<Record<string, Result[]>>({});
    const [inboxOn, setInboxOn] = useState<string[]>([]);

    const open = decisions.filter((d) => !d.done && d.accountant === ME);
    const runPlan = (key: 'reminders' | 'inbox', results: Result[]) => {
        setRan((r) => ({ ...r, [key]: results }));
        if (key === 'inbox') setInboxOn(results.filter((x) => x.ok).map((x) => x.client));
        onLog(results.map((x, i) => workEntry({
            id: `pf-${key}-${Date.now()}-${i}`, client: x.client, actor: 'EVA', skill: key === 'inbox' ? 'documents' : 'reminders',
            title: key === 'inbox' ? 'Smart Inbox turned on' : 'Reminder sent',
            desc: `${x.ok ? x.done : x.fail ?? ''} · ${da ? 'godkendt af' : 'approved by'} ${ME}`, status: x.ok ? 'completed' : 'failed',
            resolution: `${da ? 'Godkendt af' : 'Approved by'} ${ME} via EVA`,
            reasoning: [da ? `Del af en plan på tværs af ${results.length} aftaler, godkendt af ${ME}.` : `Part of a plan across ${results.length} agreements, approved by ${ME}.`],
        })));
    };

    const controls = evaControls ? <EvaWindowControls onMinimise={evaControls.onMinimise} onClose={evaControls.onClose} /> : undefined;
    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Portfolio')} showScope={false}
                badge={<SegmentedTabs value={tab} onChange={(v) => setTab(v as Tab)} options={[{ value: 'priorities', label: t('Priorities') }, { value: 'setup', label: t('Setup') }, { value: 'colleagues', label: t('Colleagues') }]} />}
                right={controls} />
            <div className="mx-auto px-8 pt-5 pb-10" style={{ maxWidth: 1240 }}>
                {tab === 'priorities' && <Priorities open={open} ran={ran.reminders} onPlan={() => setPlan('reminders')} onOpenTasks={onOpenTasks} onAsk={onAsk} onColleagues={() => setTab('colleagues')} />}
                {tab === 'setup' && <SetupTab inboxOn={inboxOn} ran={ran.inbox} onPlan={() => setPlan('inbox')} />}
                {tab === 'colleagues' && <Colleagues onAsk={onAsk} />}
            </div>
            {plan && createPortal(
                <div onClick={(e) => e.stopPropagation()}>
                    <BulkPlan
                        title={t(plan === 'inbox' ? 'Set up Smart Inbox' : 'Remind agreements about documents')}
                        intro={t(plan === 'inbox' ? 'Here’s my plan for each agreement. Nothing changes until you approve.' : 'Here’s my plan for each agreement. Nothing is sent until you approve.')}
                        items={plan === 'inbox' ? SMART_INBOX : DOC_REMINDERS}
                        line={(it) => plan === 'inbox' ? it.what.map(t).join(' · ') : `${da ? 'Påmind' : 'Remind'} ${it.to}: ${it.what.map(t).join(' · ')}`}
                        doneLine={(it) => plan === 'inbox' ? t('Smart Inbox is on — bills go to Weekly Bookkeeping') : `${da ? 'Påmindelse sendt til' : 'Reminder sent to'} ${it.to}`}
                        verb={t(plan === 'inbox' ? 'Set up' : 'Send')}
                        onClose={() => setPlan(null)}
                        onRan={(r) => runPlan(plan, r)}
                    />
                </div>, document.body)}
        </div>
    );
}

// ---- Priorities — where to start, and why ----------------------------------------
function Priorities({ open, ran, onPlan, onOpenTasks, onAsk, onColleagues }: {
    open: DecisionItem[]; ran?: Result[]; onPlan: () => void; onOpenTasks: (name: string) => void;
    onAsk: (q: string, a: string, name?: string) => void; onColleagues: () => void;
}) {
    const { t, lang } = useLang();
    const da = lang === 'da';
    const [expanded, setExpanded] = useState<string | null>(null);
    const rows = FOCUS.map((f) => {
        const items = open.filter((d) => d.company === f.name);
        const docs = DOC_REQUESTS[f.name] ?? [];
        return { f, items, docs, flags: items.filter((d) => d.correction).length, actions: items.filter((d) => !d.correction).length, shared: SHARED.find((s) => s.client === f.name) };
    });
    const top = rows[0];
    const docClients = DOC_REMINDERS.map((r) => r.client);
    const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

    return (
        <div className="flex flex-col gap-5">
            {/* EVA's read of the whole portfolio, in one line */}
            <div className="flex items-start gap-3 land" style={{ ['--d' as string]: '200ms' }}>
                <Orb size={26} />
                <p className="text-base leading-relaxed" style={{ color: COLORS.text }}>
                    {da ? `${rows.length} af dine ${MY_PORTFOLIO.length} aftaler har brug for dig. Start med ` : `${rows.length} of your ${MY_PORTFOLIO.length} agreements need you. Start with `}
                    <span className="font-semibold">{top.f.name}</span> — {lc(t(top.f.why[0]))}.
                </p>
            </div>

            {/* Same task, several agreements — one plan */}
            <section className="land" style={{ ['--d' as string]: '260ms' }}>
                <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>{t('Handle together')}</h2>
                <div className="flex items-center gap-4 rounded-xl p-4" style={{ background: PURPLE.bg, border: `1px solid ${PURPLE.border}` }}>
                    <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, ...TAG.doc }}><Icon name="document" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{da ? `${docClients.length} aftaler venter på bilag til september` : `${docClients.length} agreements are waiting on September documents`}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{docClients.join(' · ')}</p>
                        {ran && <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: '#15803d' }}><Icon name="circle-tick" />
                            {da ? `Påmindelser sendt til ${ran.filter((r) => r.ok).length} af ${ran.length}` : `Reminders sent to ${ran.filter((r) => r.ok).length} of ${ran.length}`}
                            {ran.some((r) => !r.ok) && <span style={{ color: '#92710f' }}> · {da ? `${ran.filter((r) => !r.ok).length} kræver dig` : `${ran.filter((r) => !r.ok).length} needs you`}</span>}
                        </p>}
                    </div>
                    {!ran && <Button appearance="primary" onClick={onPlan}>{t('Send reminders')}</Button>}
                </div>
            </section>

            {/* Ranked — every rank says why */}
            <section className="land" style={{ ['--d' as string]: '320ms' }}>
                <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>{t('Where to start')}</h2>
                <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                    {rows.map((r, i) => {
                        const isOpen = expanded === r.f.name;
                        const c = MY_PORTFOLIO.find((x) => x.name === r.f.name);
                        const parts = [
                            r.flags && `${r.flags} ${t(r.flags === 1 ? 'flag' : 'flags')}`,
                            r.actions && `${r.actions} ${t(r.actions === 1 ? 'action' : 'actions')}`,
                            r.docs.length && `${r.docs.length} ${t(r.docs.length === 1 ? 'document requested' : 'documents requested')}`,
                        ].filter(Boolean) as string[];
                        return (
                            <div key={r.f.name} style={i === rows.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                <button onClick={() => setExpanded(isOpen ? null : r.f.name)} className="w-full flex items-center gap-3 p-4 text-left bg-white">
                                    <span className="w-5 text-center text-xs font-semibold shrink-0" style={{ color: COLORS.textMuted }}>{i + 1}</span>
                                    <ClientAvatar name={r.f.name} size={30} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{r.f.name} <span className="font-normal" style={{ color: COLORS.textMuted }}>· {c?.no}</span></p>
                                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{t(r.f.why[0])}{parts.length ? ` · ${parts.join(' · ')}` : ''}</p>
                                    </div>
                                    {r.shared && <span className="hidden md:flex items-center gap-1.5 text-xs shrink-0" style={{ color: COLORS.textMuted }} title={`${t('Shared with')} ${r.shared.with}`}><ClientAvatar name={r.shared.with} size={18} /> {first(r.shared.with)}</span>}
                                    {r.f.due && <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={TAG.doc}>{t(r.f.due)}</span>}
                                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8' }} />
                                </button>
                                {isOpen && (
                                    <div className="px-4 pb-4 anim-in">
                                        <div className="rounded-xl p-4" style={{ border: '1px solid #7c3aed26', background: '#7c3aed0a' }}>
                                            <div className="flex items-center gap-2">
                                                <Orb size={18} />
                                                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{da ? `Derfor er den nr. ${i + 1}` : `Why it’s #${i + 1}`}</span>
                                            </div>
                                            <ul className="mt-2 flex flex-col gap-1">
                                                {r.f.why.map((w) => <li key={w} className="text-sm flex gap-2" style={{ color: COLORS.text }}><span style={{ color: '#7c3aed' }}>•</span>{t(w)}</li>)}
                                                {r.f.due && <li className="text-sm flex gap-2" style={{ color: COLORS.text }}><span style={{ color: '#7c3aed' }}>•</span>{t(r.f.due)}</li>}
                                            </ul>
                                            {(r.items.length > 0 || r.docs.length > 0) && (
                                                <div className="mt-3 flex flex-col gap-1.5">
                                                    {r.items.map((d) => (
                                                        <p key={d.id} className="text-sm flex items-center gap-2 min-w-0" style={{ color: COLORS.text }}>
                                                            <span className="shrink-0 rounded-md px-1.5 py-px text-[11px] font-semibold" style={d.correction ? TAG.flag : TAG.action}>{d.correction ? `⚑ ${t('Flag')}` : `✓ ${t('Action')}`}</span>
                                                            <span className="truncate">{t(d.question)}</span>
                                                        </p>
                                                    ))}
                                                    {r.docs.map((x) => (
                                                        <p key={x.what} className="text-sm flex items-center gap-2 min-w-0" style={{ color: COLORS.text }}>
                                                            <span className="shrink-0 rounded-md px-1.5 py-px text-[11px] font-semibold" style={TAG.doc}>{t('Requested')}</span>
                                                            <span className="truncate">{t(x.what)} · {t('Asked {name}').replace('{name}', x.to)}</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {r.shared && (
                                                <div className="mt-3 rounded-lg p-3 bg-white" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                                    <p className="text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                                        <ClientAvatar name={r.shared.with} size={16} /> {da ? `Siden du var her sidst (${t(r.shared.last)})` : `Since you were last here (${r.shared.last})`}
                                                    </p>
                                                    <p className="text-sm mt-1" style={{ color: COLORS.text }}>{t(r.shared.summary)}</p>
                                                    <button onClick={onColleagues} className="text-xs font-medium mt-1.5" style={{ color: '#4456c7' }}>{t('See what colleagues did')}</button>
                                                </div>
                                            )}
                                            <div style={{ borderTop: '1px solid #7c3aed1f', margin: '14px -16px 0' }} />
                                            <div className="flex items-center justify-between pt-3 gap-3">
                                                <AskEva onClick={() => onAsk(
                                                    da ? `Hvad sker der hos ${r.f.name}?` : `What’s going on at ${r.f.name}?`,
                                                    [
                                                        ...r.f.why.map((w) => `• ${t(w)}`),
                                                        ...(r.f.due ? [`• ${t(r.f.due)}`] : []),
                                                        ...(r.shared ? ['', t(r.shared.summary)] : []),
                                                        '', da ? 'Spørg løs — fx om en bestemt post, eller hvad der mangler for at lukke måneden.' : 'Ask me anything — about a specific entry, or what’s left to close the month.',
                                                    ].join('\n'),
                                                    r.f.name,
                                                )} />
                                                <Button appearance="primary" onClick={() => onOpenTasks(r.f.name)}>{t('See tasks')}</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

// ---- Setup — package, add-ons, automation, routines per agreement ------------------
function SetupTab({ inboxOn, ran, onPlan }: { inboxOn: string[]; ran?: Result[]; onPlan: () => void }) {
    const { t, lang } = useLang();
    const da = lang === 'da';
    const [all, setAll] = useState(false);
    const hours = SMART_INBOX.reduce((s, x) => s + (x.saves ?? 0), 0);
    const fmtH = (h: number) => (da ? h.toFixed(1).replace('.', ',') : h.toFixed(1));
    const suggested = new Set(SMART_INBOX.map((x) => x.client));
    // lowest automation first — the most to gain at the top
    const rows = [...SETUPS].sort((a, b) => a.c.eva - b.c.eva);
    const shown = all ? rows : rows.slice(0, 10);
    const avg = Math.round(SETUPS.reduce((s, x) => s + x.c.eva, 0) / SETUPS.length);
    const chip = (label: string, style: CSSProperties, title?: string) => (
        <span key={label} title={title} className="rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap" style={style}>{label}</span>
    );
    return (
        <div className="flex flex-col gap-5">
            {/* EVA's suggestion — an automation not used yet, with the time it saves (from your own work) */}
            <div className="flex items-start gap-4 rounded-xl p-4 land" style={{ ['--d' as string]: '200ms', background: PURPLE.bg, border: `1px solid ${PURPLE.border}` }}>
                <Orb size={26} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
                        {da ? `${SMART_INBOX.length} aftaler bruger ikke Smart Inbox endnu` : `${SMART_INBOX.length} agreements don’t use Smart Inbox yet`}
                    </p>
                    <p className="text-sm mt-1" style={{ color: COLORS.text }}>
                        {da ? `Ud fra det arbejde, du har lavet på dem, kunne det spare dig ca. ${fmtH(hours)} timer om ugen.` : `Based on your work on them, it could save you about ${fmtH(hours)} hours a week.`}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {SMART_INBOX.map((x) => <span key={x.client} className="inline-flex items-center gap-1.5 rounded-full bg-white pl-1 pr-2 py-0.5 text-xs" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                            <ClientAvatar name={x.client} size={16} /> {x.client} <span style={{ color: COLORS.textMuted }}>~{fmtH(x.saves ?? 0)} {da ? 't/uge' : 'h/wk'}</span>
                        </span>)}
                    </div>
                    {ran && <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: '#15803d' }}><Icon name="circle-tick" />{da ? `Sat op for ${ran.filter((r) => r.ok).length} aftaler` : `Set up for ${ran.filter((r) => r.ok).length} agreements`}</p>}
                </div>
                {!ran && <Button appearance="primary" onClick={onPlan}>{da ? `Sæt op for ${SMART_INBOX.length}` : `Set up for ${SMART_INBOX.length}`}</Button>}
            </div>

            {/* the comparison — gaps and setups worth reusing */}
            <section className="land" style={{ ['--d' as string]: '260ms' }}>
                <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('How your agreements are set up')}</h2>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{da ? `Gennemsnitlig automatisering ${avg}% · laveste først` : `Average automation ${avg}% · lowest first`}</span>
                </div>
                <div className="rounded-xl bg-white overflow-x-auto" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                    <table className="w-full text-sm" style={{ minWidth: 820 }}>
                        <thead>
                            <tr className="text-left text-xs" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                {['Agreement', 'Package', 'Add-ons', 'Automation', 'Routines'].map((h) => <th key={h} className="font-medium px-4 py-2.5">{t(h)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map(({ c, s }, i) => {
                                const inbox = s.addOns.includes('Smart Inbox') || inboxOn.includes(c.name);
                                const gap = !inbox && suggested.has(c.name);
                                const eva = inboxOn.includes(c.name) ? Math.min(99, c.eva + 4) : c.eva;
                                return (
                                    <tr key={c.id} style={i === shown.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <ClientAvatar name={c.name} size={24} />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate" style={{ color: COLORS.text }}>{c.name}</p>
                                                    <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{c.no}{s.shared ? ` · ${t('Shared with')} ${first(s.shared)}` : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5" style={{ color: COLORS.text }}>{s.pkg}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-wrap gap-1">
                                                {[...s.addOns, ...(inboxOn.includes(c.name) && !s.addOns.includes('Smart Inbox') ? ['Smart Inbox'] : [])].map((a) => chip(t(a), TAG.muted))}
                                                {gap && chip(`+ ${t('Smart Inbox')}`, { color: '#6d28d9', border: '1px dashed #c4b5fd', background: '#fff' }, t('EVA suggests turning this on'))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2" style={{ width: 120 }}>
                                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#ececf0' }}>
                                                    <div className="h-full rounded-full" style={{ width: `${eva}%`, background: eva < 75 ? '#d97706' : '#7c3aed' }} />
                                                </div>
                                                <span className="text-xs tabular-nums" style={{ color: COLORS.text }}>{eva}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-wrap gap-1">
                                                {s.routines.map((r) => chip(t(r), TAG.action, s.setBy?.[r] ? `${t('Set up by')} ${s.setBy[r]}` : undefined))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {rows.length > 10 && <button onClick={() => setAll((v) => !v)} className="text-sm font-medium mt-2" style={{ color: '#4456c7' }}>{all ? t('Hide') : da ? `Vis alle ${rows.length}` : `Show all ${rows.length}`}</button>}
            </section>
        </div>
    );
}

// ---- Colleagues — what happened on shared agreements --------------------------------
function Colleagues({ onAsk }: { onAsk: (q: string, a: string, name?: string) => void }) {
    const { t, lang } = useLang();
    const da = lang === 'da';
    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm land" style={{ color: COLORS.textMuted, ['--d' as string]: '200ms' }}>
                {da ? `Du deler ${SHARED.length} aftaler med kolleger. Her er, hvad de har lavet, siden du sidst var der — og hvad de har sat op, så du ikke gør det to gange.` : `You share ${SHARED.length} agreements with colleagues. Here’s what they did since you were last there — and what they set up, so you don’t do it twice.`}
            </p>
            {SHARED.map((s, i) => (
                <div key={s.client} className="rounded-xl bg-white land" style={{ ['--d' as string]: `${240 + i * 60}ms`, border: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="flex items-center gap-3 px-4 pt-4">
                        <ClientAvatar name={s.client} size={30} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{s.client}</p>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('Shared with')} {s.with} · {da ? `du var her sidst ${t(s.last)}` : `you were last here ${s.last}`}</p>
                        </div>
                        <AskEva onClick={() => onAsk(
                            da ? `Hvad er ændret hos ${s.client}, siden jeg var der sidst?` : `What’s changed at ${s.client} since I was last there?`,
                            [t(s.summary), '', ...s.events.map((e) => `• ${t(e.what)} — ${first(e.who)}, ${t(e.when)}`)].join('\n'),
                            s.client,
                        )} />
                    </div>
                    <div className="mx-4 mt-3 rounded-lg p-3 flex gap-2.5" style={{ background: PURPLE.bg, border: `1px solid ${PURPLE.border}` }}>
                        <Orb size={16} />
                        <p className="text-sm" style={{ color: COLORS.text }}>{t(s.summary)}</p>
                    </div>
                    <div className="px-4 pt-3 pb-1">
                        {s.events.map((e) => (
                            <div key={e.what} className="flex items-center gap-3 py-2" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                <ClientAvatar name={e.who} size={22} />
                                <p className="text-sm flex-1 min-w-0" style={{ color: COLORS.text }}>
                                    <span className="font-medium">{first(e.who)}</span> · {t(e.what)}
                                    {e.viaEva && <span className="ml-2 rounded-md px-1.5 py-px text-[11px] font-semibold" style={{ background: '#f3f0fb', color: '#6d28d9' }}>{t('via EVA')}</span>}
                                </p>
                                <span className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>{t(e.when)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 px-4 py-3" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                        <span className="text-xs mr-1" style={{ color: COLORS.textMuted }}>{t('Set up by')} {first(s.with)}:</span>
                        {s.setUp.map((x) => <span key={x.label} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={x.kind === 'Routine' ? TAG.action : TAG.muted}>{t(x.kind)} · {t(x.label)}</span>)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AskEva({ onClick }: { onClick: () => void }) {
    const { t } = useLang();
    return (
        <button onClick={onClick} className="flex items-center gap-1.5 rounded-full font-semibold shrink-0" style={{ padding: '5px 12px 5px 8px', fontSize: 13, background: '#fff7ed', color: COLORS.text, border: '1px solid #efddc0' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fdeed8')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff7ed')}>
            <Orb size={16} /> {t('Ask EVA')}
        </button>
    );
}

// ---- One plan, several agreements -----------------------------------------------------
// Review (every agreement and what happens to it; take one out) → approve → runs one by one → result per agreement.
interface Result { client: string; ok: boolean; done: string; fail?: string }
function BulkPlan({ title, intro, items, line, doneLine, verb, onClose, onRan }: {
    title: string; intro: string; items: BulkItem[]; line: (it: BulkItem) => string; doneLine: (it: BulkItem) => string;
    verb: string; onClose: () => void; onRan: (r: Result[]) => void;
}) {
    const { t, lang } = useLang();
    const da = lang === 'da';
    const [removed, setRemoved] = useState<Set<number>>(new Set());
    const [phase, setPhase] = useState<'review' | 'running' | 'done'>('review');
    const [step, setStep] = useState(0); // how many have run
    const chosen = items.map((it, i) => ({ it, i })).filter(({ i }) => !removed.has(i));
    useEffect(() => {
        if (phase !== 'running') return;
        if (step >= chosen.length) {
            setPhase('done');
            onRan(chosen.map(({ it }) => ({ client: it.client, ok: !it.fail, done: doneLine(it), fail: it.fail && t(it.fail) })));
            return;
        }
        const id = setTimeout(() => setStep((s) => s + 1), 550);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, step]);
    const ok = chosen.filter(({ it }) => !it.fail).length;

    const status = (it: BulkItem, k: number): ReactNode => {
        if (phase === 'review') return null;
        if (k >= step) return k === step ? <span className="w-4 h-4 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: '#c4b5fd', borderTopColor: '#7c3aed' }} /> : <span className="w-4 h-4 rounded-full shrink-0" style={{ border: `2px solid ${COLORS.cardBorder}` }} />;
        return it.fail ? <span className="shrink-0" style={{ color: '#b45309' }}><Icon name="warning" /></span> : <span className="shrink-0" style={{ color: '#15803d' }}><Icon name="circle-tick" /></span>;
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(15, 14, 40, 0.45)' }} onClick={phase === 'running' ? undefined : onClose}>
            <div className="w-full rounded-2xl bg-white anim-in flex flex-col" style={{ maxWidth: 600, maxHeight: '85vh', boxShadow: '0 24px 64px rgba(15, 14, 40, 0.3)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2.5 px-5 pt-5">
                    <Orb size={22} />
                    <h2 className="text-base font-semibold flex-1" style={{ color: COLORS.text }}>{title}</h2>
                    {phase !== 'running' && <button onClick={onClose} aria-label={t('Close')} className="flex items-center justify-center rounded-md" style={{ width: 28, height: 28, color: COLORS.textMuted }}><Icon name="close" /></button>}
                </div>
                <p className="text-sm px-5 mt-2" style={{ color: COLORS.textMuted }}>
                    {phase === 'done' ? (da ? `Færdig — ${ok} af ${chosen.length} gik igennem.` : `Done — ${ok} of ${chosen.length} went through.`) : intro}
                </p>
                <div className="px-5 mt-4 overflow-y-auto flex flex-col" style={{ minHeight: 0 }}>
                    {items.map((it, i) => {
                        const off = removed.has(i);
                        if (off && phase !== 'review') return null;
                        const k = chosen.findIndex((x) => x.i === i);
                        const ran = phase !== 'review' && k < step;
                        return (
                            <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderTop: `1px solid ${COLORS.cardBorder}`, opacity: off ? 0.45 : 1 }}>
                                <ClientAvatar name={it.client} size={26} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate" style={{ color: COLORS.text, textDecoration: off ? 'line-through' : undefined }}>{it.client}</p>
                                    <p className="text-xs mt-0.5" style={{ color: ran && it.fail ? '#b45309' : COLORS.textMuted }}>{ran ? (it.fail ? t(it.fail) : doneLine(it)) : line(it)}</p>
                                </div>
                                {phase === 'review'
                                    ? <button onClick={() => setRemoved((s) => { const n = new Set(s); if (off) n.delete(i); else n.add(i); return n; })} className="text-xs font-medium shrink-0" style={{ color: off ? '#4456c7' : COLORS.textMuted }}>{t(off ? 'Add back' : 'Remove')}</button>
                                    : status(it, k)}
                            </div>
                        );
                    })}
                </div>
                <div className="px-5 py-4 mt-2 flex items-center gap-3" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-xs flex-1" style={{ color: COLORS.textMuted }}>{da ? `Logges på hver aftale som udført af ${ME} via EVA.` : `Logged on each agreement as done by ${ME} via EVA.`}</p>
                    {phase === 'review' && <><Button onClick={onClose}>{t('Cancel')}</Button><Button appearance="primary" disabled={!chosen.length} onClick={() => { setStep(0); setPhase('running'); }}>{`${verb} (${chosen.length})`}</Button></>}
                    {phase === 'done' && <Button appearance="primary" onClick={onClose}>{t('Done')}</Button>}
                </div>
            </div>
        </div>
    );
}
