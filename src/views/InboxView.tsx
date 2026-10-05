import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Button, Icon, Switch } from '@economic/taco';
import { ClientAvatar, CountBadge, Orb, PageHeader, SegmentedTabs, COLORS, useIsMobile } from '../ui';
import { useLang } from '../i18n';
import { CLIENTS, ME, OWNER, type Thread, type ThreadStatus } from '../practice';
import { LiquidityModal } from './Liquidity';
import { AttachmentCard, type Attachment, type ShareDraft } from './Attachment';

// ---- Inbox — every client conversation in one place --------------------------------
// Questions, documents and follow-ups with clients, tied to the transaction they're
// about. EVA asks clients for missing details on its own, chases when they go quiet,
// and proposes the next step when a reply comes in — the AO approves and sends.

const TAB: { key: ThreadStatus | 'all'; label: string }[] = [
    { key: 'needs', label: 'Needs action' },
    { key: 'waiting', label: 'Waiting on client' },
    { key: 'all', label: 'All' },
];

export default function InboxView({ threads, setThreads, focusClient, compose, onComposeConsumed }: { threads: Thread[]; setThreads: (f: (t: Thread[]) => Thread[]) => void; focusClient?: string | null; compose?: ShareDraft | null; onComposeConsumed?: () => void }) {
    const { t } = useLang();
    const [tab, setTab] = useState<ThreadStatus | 'all'>('needs');
    const [selId, setSelId] = useState<string>(() => threads.find((x) => x.status === 'needs')?.id ?? threads[0].id);
    // One draft per conversation — switching threads keeps what you were writing where it belongs.
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const draft = drafts[selId] ?? '';
    const setDraft = (v: string) => setDrafts((d) => ({ ...d, [selId]: v }));
    const [settings, setSettings] = useState(false);
    // Phones: one pane at a time — the thread list, or the open conversation (with a back button).
    const mobile = useIsMobile();
    const [showThread, setShowThread] = useState(false);
    // Attachments waiting to be sent, per conversation (a forecast or budget shared from a client).
    const [attach, setAttach] = useState<Record<string, Attachment>>({});

    // Arriving with a shared forecast/budget: open (or start) that client's conversation with the
    // drafted message and the preview attached — you review it and send.
    useEffect(() => {
        if (!compose) return;
        const th = threads.find((x) => x.client === compose.client && x.status !== 'done') ?? threads.find((x) => x.client === compose.client);
        const id = th?.id ?? `share-${Date.now()}`;
        if (!th) setThreads((all) => [{ id, client: compose.client, contact: OWNER[compose.client] ?? 'Owner', subject: compose.subject, status: 'waiting', at: 'Now', messages: [] }, ...all]);
        setSelId(id);
        setShowThread(true);
        setTab(th && th.status !== 'done' ? th.status : 'all');
        setDrafts((d) => ({ ...d, [id]: compose.text }));
        setAttach((a) => ({ ...a, [id]: compose.attachment }));
        onComposeConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compose]);

    // Arriving from a client profile: open that client's thread.
    useEffect(() => {
        if (!focusClient) return;
        const th = threads.find((x) => x.client === focusClient);
        if (th) { setSelId(th.id); setTab(th.status === 'done' ? 'all' : th.status); setShowThread(true); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusClient]);

    const list = threads.filter((x) => tab === 'all' || x.status === tab);
    const sel = threads.find((x) => x.id === selId) ?? list[0];
    // The conversation opens at, and follows, the latest message.
    const msgsRef = useRef<HTMLDivElement>(null);
    const lastCount = sel?.messages.length ?? 0;
    useEffect(() => {
        const el = msgsRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [sel?.id, lastCount]);
    const count = (k: ThreadStatus) => threads.filter((x) => x.status === k).length;

    function send(text: string, extra?: { result?: string; status?: ThreadStatus }) {
        if (!sel || !text.trim()) return;
        setThreads((all) => all.map((x) => x.id !== sel.id ? x : {
            ...x,
            status: extra?.status ?? 'waiting',
            suggestion: extra?.result ? undefined : x.suggestion,
            messages: [
                ...x.messages,
                { from: 'firm', who: ME, at: 'Now', text, ...(attach[x.id] ? { attachment: attach[x.id] } : {}) },
                ...(extra?.result ? [{ from: 'eva' as const, who: 'EVA', at: 'Now', text: extra.result }] : []),
            ],
        }));
        setDraft('');
        if (sel && attach[sel.id]) setAttach((a) => { const n = { ...a }; delete n[sel.id]; return n; });
    }

    const [cashFor, setCashFor] = useState<string | null>(null);
    const cashRisk = (client: string) => CLIENTS.find((c) => c.name === client)?.signal?.kind === 'Cash flow';

    // EVA's suggestion lives in the composer: the reply as ghost text (Tab to use) and the
    // bookkeeping action as one quiet line that happens when you send (untick to skip it).
    const [skipped, setSkipped] = useState<Set<string>>(new Set()); // threads where you dismissed the suggestion
    const [withAction, setWithAction] = useState(true);
    useEffect(() => { setWithAction(true); }, [selId]);
    const sugg = sel && sel.status === 'needs' && !skipped.has(sel.id) ? sel.suggestion : undefined;
    const ghost = sugg && !draft ? t(sugg.reply) : '';

    // The composer grows with the message (up to a cap, then scrolls) — and fits the ghost reply.
    const taRef = useRef<HTMLTextAreaElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = taRef.current; if (!el) return;
        el.style.height = 'auto';
        const want = Math.max(el.scrollHeight, 72, ghostRef.current?.offsetHeight ?? 0);
        el.style.height = `${Math.min(want, 320)}px`;
        el.style.overflowY = el.scrollHeight > 320 ? 'auto' : 'hidden';
    }, [draft, selId, ghost]);
    const sendNow = () => {
        if (!sel || !draft.trim()) return;
        send(draft, sugg && withAction ? { result: t(sugg.result), status: 'done' } : undefined);
        setSkipped((p) => new Set(p).add(sel.id));
    };

    // Resizable thread list — drag the divider (double-click resets). Width is a per-viewer convenience.
    const LIST_MIN = 320, LIST_MAX = 560; // below 320 the tabs no longer fit
    const [listW, setListW] = useState(() => { try { return Math.min(LIST_MAX, Math.max(LIST_MIN, Number(localStorage.getItem('va-inbox-list-w')) || 340)); } catch { return 340; } });
    useEffect(() => { try { localStorage.setItem('va-inbox-list-w', String(listW)); } catch { /* storage unavailable */ } }, [listW]);
    const startResize = (e: ReactMouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const col = e.currentTarget.parentElement!;
        const scale = col.getBoundingClientRect().width / col.offsetWidth || 1; // the app shell is zoomed
        const x0 = e.clientX, w0 = listW;
        const move = (ev: MouseEvent) => setListW(Math.min(LIST_MAX, Math.max(LIST_MIN, w0 + (ev.clientX - x0) / scale)));
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
        document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    };

    return (
        <div className="h-full flex flex-col">
            <PageHeader title={t('Inbox')} showScope={false} maxWidth={1240}
                right={<Button onClick={() => setSettings(true)}><Icon name="settings" /> {t('Client settings')}</Button>} />
            <div className="flex-1 min-h-0 mx-auto w-full px-8 pb-6" style={{ maxWidth: 1240 }}>
                <div className="h-full flex rounded-xl bg-white overflow-hidden land" style={{ ['--d' as string]: '80ms', border: `1px solid ${COLORS.cardBorder}` }}>
                    {/* thread list */}
                    <div className="relative flex flex-col shrink-0" style={mobile ? { width: '100%', display: showThread ? 'none' : 'flex' } : { width: listW, borderRight: `1px solid ${COLORS.cardBorder}` }}>
                        {!mobile && <div onMouseDown={startResize} onDoubleClick={() => setListW(340)} title={t('Drag to resize')} className="absolute top-0 bottom-0 z-10 group" style={{ right: -4, width: 8, cursor: 'col-resize' }}>
                            <div className="mx-auto h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 2, background: '#7c3aed' }} />
                        </div>}
                        <div className="p-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <SegmentedTabs value={tab} onChange={(v) => setTab(v as ThreadStatus | 'all')} options={TAB.map((x) => ({ value: x.key, label: x.key === 'all' ? t(x.label) : <>{t(x.label)} <CountBadge n={count(x.key as ThreadStatus)} showZero /></> }))} />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {list.map((x) => {
                                const on = sel?.id === x.id;
                                const last = x.messages[x.messages.length - 1];
                                return (
                                    <button key={x.id} onClick={() => { setSelId(x.id); setShowThread(true); }} className="w-full text-left flex items-start gap-2.5 px-3.5 py-3" style={{ background: on ? '#f4f4f6' : 'transparent', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                        <ClientAvatar name={x.contact} size={30} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm truncate flex-1 ${x.status === 'needs' ? 'font-semibold' : 'font-medium'}`} style={{ color: COLORS.text }}>{x.contact}</p>
                                                <span className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>{t(x.at)}</span>
                                            </div>
                                            <p className="text-sm truncate" style={{ color: COLORS.text }}>{t(x.subject)}</p>
                                            <p className="text-xs truncate mt-0.5" style={{ color: COLORS.textMuted }}>{last.from === 'eva' ? '✦ ' : ''}{t(last.text)}</p>
                                            <span className="inline-block mt-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: '#eef4fb', color: '#2f6fb0' }}>{x.client}</span>
                                        </div>
                                    </button>
                                );
                            })}
                            {list.length === 0 && <p className="text-sm text-center py-10" style={{ color: COLORS.textMuted }}>{t('Nothing here — you’re all caught up.')}</p>}
                        </div>
                    </div>

                    {/* conversation */}
                    {sel && (!mobile || showThread) && (
                        <div className="flex-1 min-w-0 flex flex-col">
                            <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                {mobile && <button onClick={() => setShowThread(false)} aria-label={t('All conversations')} className="rounded-md p-1 -ml-2" style={{ color: COLORS.textMuted }}><Icon name="arrow-left" /></button>}
                                <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold truncate" style={{ color: COLORS.text }}>{t(sel.subject)}</p>
                                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{sel.client} · {sel.contact}</p>
                                </div>
                                {cashRisk(sel.client) && <Button onClick={() => setCashFor(sel.client)}><Icon name="chart-line" /> {t('Cash forecast')}</Button>}
                                {sel.status !== 'done' && <Button onClick={() => setThreads((all) => all.map((x) => x.id === sel.id ? { ...x, status: 'done' } : x))}><Icon name="circle-tick" /> {t('Mark done')}</Button>}
                            </div>

                            {sel.txn && (
                                <div className="mx-5 mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: `1px solid ${COLORS.cardBorder}`, maxWidth: 420 }}>
                                    <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 30, height: 30, background: '#f1f1f3', color: COLORS.textMuted }}><Icon name="wallet" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium" style={{ color: COLORS.text }}>{sel.txn.label}</p>
                                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{sel.txn.account} · {sel.txn.date}</p>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{sel.txn.amount}</span>
                                </div>
                            )}

                            <div ref={msgsRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                                {sel.messages.map((m, i) => {
                                    const mine = m.from !== 'client';
                                    return (
                                        <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                            <div className="rounded-xl px-3.5 py-2.5" style={{ maxWidth: '76%', background: m.from === 'eva' ? '#7c3aed0d' : mine ? '#f1f1f3' : '#fff', border: `1px solid ${m.from === 'eva' ? '#7c3aed26' : COLORS.cardBorder}` }}>
                                                <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                                    {m.from === 'eva' && <Orb size={12} />}<span className="font-medium" style={{ color: COLORS.text }}>{t(m.who)}</span> · {t(m.at)}
                                                </p>
                                                <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{t(m.text)}</p>
                                                {m.attachment && <div className="mt-2"><AttachmentCard a={m.attachment} /></div>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {sel.status === 'waiting' && (
                                    <p className="text-xs text-center mt-1 flex items-center justify-center gap-1.5" style={{ color: COLORS.textMuted }}><Orb size={12} /> {t('EVA will follow up automatically if there’s no reply in 3 days.')}</p>
                                )}
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); sendNow(); }} className="mx-5 mb-5 flex flex-col gap-2 rounded-xl px-3.5 pt-3 pb-2.5" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                {/* Enter sends, Shift+Enter adds a new line, Tab takes EVA's suggested reply */}
                                {attach[sel.id] && <AttachmentCard a={attach[sel.id]} onRemove={() => setAttach((a) => { const n = { ...a }; delete n[sel.id]; return n; })} />}
                                <div className="relative">
                                    {ghost && (
                                        <div ref={ghostRef} aria-hidden className="absolute inset-x-0 top-0 text-sm leading-relaxed whitespace-pre-wrap pointer-events-none" style={{ color: '#a1a1aa' }}>{ghost}</div>
                                    )}
                                    <textarea
                                        ref={taRef}
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab' && ghost) { e.preventDefault(); setDraft(ghost); }
                                            else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNow(); }
                                        }}
                                        rows={3}
                                        placeholder={ghost ? '' : t('Write to {name}…').replace('{name}', sel.contact.split(' ')[0])}
                                        aria-label={ghost ? `${t('Suggested reply')}: ${ghost}` : undefined}
                                        className="relative w-full bg-transparent outline-none text-sm leading-relaxed resize-none block"
                                        style={{ color: COLORS.text, minHeight: 72 }}
                                    />
                                </div>
                                {sugg && (
                                    <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: COLORS.textMuted }}>
                                        <input type="checkbox" className="mt-0.5" checked={withAction} onChange={(e) => setWithAction(e.target.checked)} style={{ accentColor: '#7c3aed' }} />
                                        <span><span style={{ color: '#6d28d9', fontWeight: 500 }}>{t('When you send, EVA will also')}</span> {t(sugg.action).charAt(0).toLowerCase() + t(sugg.action).slice(1)}</span>
                                    </label>
                                )}
                                <div className="flex items-center justify-between gap-2">
                                    {ghost ? (
                                        <span className="text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                            <Orb size={12} /> {t('EVA’s suggested reply')} ·
                                            <button type="button" onClick={() => { setDraft(ghost); taRef.current?.focus(); }} className="font-medium" style={{ color: '#4456c7' }}>{t('Use')}</button>
                                            <kbd className="rounded px-1 text-[10px]" style={{ border: `1px solid ${COLORS.cardBorder}` }}>Tab</kbd>
                                            <button type="button" onClick={() => setSkipped((p) => new Set(p).add(sel.id))} className="ml-1" style={{ color: COLORS.textMuted }}>{t('Dismiss')}</button>
                                        </span>
                                    ) : (
                                        <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('Shift + Enter for a new line')}</span>
                                    )}
                                    <button type="submit" disabled={!draft.trim()} className="rounded-lg px-3.5 py-1.5 text-sm font-medium shrink-0" style={{ background: draft.trim() ? '#1c1b3a' : '#ececf0', color: draft.trim() ? '#fff' : '#b0b0b8' }}>{t(sugg && withAction ? 'Approve & send' : 'Send')}</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {settings && <InboxSettings onClose={() => setSettings(false)} />}
            {cashFor && <LiquidityModal company={cashFor} owner={OWNER[cashFor]} onClose={() => setCashFor(null)} onDiscuss={(d) => { setCashFor(null); setDrafts((x) => ({ ...x, [selId]: d.text })); setAttach((a) => ({ ...a, [selId]: d.attachment })); }} />}
        </div>
    );
}

function InboxSettings({ onClose }: { onClose: () => void }) {
    const { t } = useLang();
    const [s, setS] = useState({ follow: true, me: true, client: true, digest: false });
    const rows: { k: keyof typeof s; title: string; desc: string }[] = [
        { k: 'follow', title: 'AI follow-up', desc: 'EVA asks clients for missing details when a reply is incomplete, and chases after 3 days of silence.' },
        { k: 'me', title: 'Notify me of client replies', desc: 'Get a notification when a client answers — the reply lands in Needs action.' },
        { k: 'client', title: 'Client reminders', desc: 'Clients get a gentle reminder about open questions every Monday at 09:00.' },
        { k: 'digest', title: 'Weekly digest to the partner', desc: 'A summary of open client questions across the office, every Friday.' },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in" style={{ maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Client settings')}</p>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>
                <div>
                    {rows.map((r, i) => (
                        <div key={r.k} className="flex items-start gap-4 px-5 py-4" style={i === rows.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t(r.title)}</p>
                                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t(r.desc)}</p>
                            </div>
                            <Switch checked={s[r.k]} onChange={(v: boolean) => setS((p) => ({ ...p, [r.k]: v }))} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                    <Button appearance="primary" onClick={onClose}>{t('Save')}</Button>
                </div>
            </div>
        </div>
    );
}
