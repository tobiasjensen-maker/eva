import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@economic/taco';
import { Orb, MicIcon, EvaChip, COLORS } from './ui';
import { useLang } from './i18n';
import { type EvaConfig } from './eva';
import { CLIENTS } from './practice';
import { downloadCsv } from './exportCsv';

// An answer that lists clients can be turned into a table or an Excel file — people often
// only know they want a table once they've seen the text (a Komma learning).
function AnswerFormats({ text }: { text: string }) {
    const { t } = useLang();
    const [table, setTable] = useState(false);
    const hits = CLIENTS.filter((c) => text.includes(c.name));
    // Only data overviews — an answer that lists several clients. A passing mention of one
    // client (e.g. in "walk me through my day") isn't something you'd want as a table.
    if (hits.length < 2) return null;
    const books = { closed: 'Closed', todo: 'To do', blocked: 'Blocked' } as const;
    const head = [t('Client'), t('Industry'), t('Revenue'), t('Books'), t('Why it matters')];
    const rows = hits.map((c) => [c.name, t(c.industry), `${c.trend > 0 ? '+' : ''}${c.trend}%`, t(books[c.books]), c.signal ? t(c.signal.text) : '—']);
    return (
        <div className="mt-2">
            <div className="flex gap-1.5">
                <button onClick={() => setTable((v) => !v)} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ border: `1px solid ${COLORS.cardBorder}`, color: table ? '#6d28d9' : COLORS.textMuted, background: table ? '#f3f0fb' : '#fff' }}>{t(table ? 'Hide table' : 'Show as table')}</button>
                <button onClick={() => downloadCsv('EVA answer.csv', [head, ...rows])} className="rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.textMuted, background: '#fff' }}><Icon name="download" /> {t('Excel')}</button>
            </div>
            {table && (
                <div className="mt-2 rounded-lg overflow-x-auto" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                    <table className="w-full text-xs">
                        {/* the panel is narrow: Industry is left to the Excel file */}
                        <thead><tr style={{ background: '#fafafa', color: COLORS.textMuted }}>{head.filter((_, i) => i !== 1).map((h) => <th key={h} className="text-left font-medium px-2 py-1.5 whitespace-nowrap">{h}</th>)}</tr></thead>
                        <tbody>{rows.map((r) => <tr key={r[0]} style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>{r.filter((_, i) => i !== 1).map((v, i) => <td key={i} className="px-2 py-1.5 align-top" style={{ color: COLORS.text, whiteSpace: i < 3 ? 'nowrap' : undefined }}>{v}</td>)}</tr>)}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// The live EVA chat runs in an isolated React-19 iframe (eva-island). We post the
// config (token + agreement context) once the island signals it's ready.
function EvaIframe({ src, config }: { src: string; config: EvaConfig }) {
    const ref = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
        const post = () => ref.current?.contentWindow?.postMessage({ type: 'eva-config', ...config }, '*');
        const onMsg = (e: MessageEvent) => { if (e.data?.type === 'eva-ready') post(); };
        window.addEventListener('message', onMsg);
        const id = setTimeout(post, 600); // fallback if the ready signal was missed
        return () => { window.removeEventListener('message', onMsg); clearTimeout(id); };
    }, [config]);
    return <iframe ref={ref} src={src} title="EVA" style={{ flex: 1, width: '100%', border: 'none' }} />;
}

const PANEL_SHADOW = '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)';
const SIDEBAR_BORDER = '#e9e9ec';

interface Msg { id: number; role: 'user' | 'assistant'; text: string; thinking?: boolean; instant?: boolean }
let pid = 1;
const nid = () => pid++;

// Word-by-word reveal, matching the main Chat page.
// Calls onDone once fully shown, so the message never types itself out again (e.g. when the
// panel is collapsed and reopened).
function Stream({ text, onTick, onDone }: { text: string; onTick: () => void; onDone?: () => void }) {
    const words = useMemo(() => text.split(/(\s+)/), [text]);
    const [n, setN] = useState(0);
    useEffect(() => {
        setN(0);
        // Hidden tabs throttle timers hard — skip the typing animation there.
        if (document.visibilityState === 'hidden') {
            setN(words.length);
            onTick();
            onDone?.();
            return;
        }
        let i = 0;
        const id = setInterval(() => {
            i++;
            setN(i);
            onTick();
            if (i >= words.length) { clearInterval(id); onDone?.(); }
        }, 28);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);
    return <>{words.slice(0, n).join('')}</>;
}

function Thinking() {
    const { t } = useLang();
    const phrases = [t('Thinking…'), t('Looking at your data…'), t('Putting it together…')];
    const [i, setI] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setI((x) => (x < phrases.length - 1 ? x + 1 : x)), 700);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <span className="text-sm" style={{ color: COLORS.textMuted }}>{phrases[i]}</span>;
}

export interface PendingAsk { user: string; answer: string }
// A conversation as plain turns — how it travels between the panel and the full-window chat.
export type Turn = { role: 'user' | 'assistant'; text: string };

// Past panel conversations — kept for the session, across pages (seeded with a few examples).
type Past = { id: number; title: string; when: string; turns: Turn[] };
const PANEL_HISTORY: Past[] = [
    { id: -1, title: 'Which of my clients need attention?', when: 'Yesterday', turns: [
        { role: 'user', text: 'Which of my clients need attention?' },
        { role: 'assistant', text: 'Across your clients, Nordic Build ApS, Café Solsikke and Digital Marketing Pro need attention — Café Solsikke (cash runway) and Digital Marketing Pro (customer concentration) first.' },
    ] },
    { id: -2, title: 'Summarise today’s client replies', when: 'Mon', turns: [
        { role: 'user', text: 'Summarise today’s client replies' },
        { role: 'assistant', text: 'Three replies came in: Mads confirmed the restaurant bill was a business dinner, Louise sent the six year-end documents, and Ida hasn’t answered the cash-position note yet.' },
    ] },
    { id: -3, title: 'What’s due this week?', when: 'Last week', turns: [
        { role: 'user', text: 'What’s due this week?' },
        { role: 'assistant', text: 'A VAT deadline on Friday, a payroll run and month-end close on Friday, and a quarterly review with Nordic Build on Monday.' },
    ] },
];

export function ChatPanel({
    subtitle, intro, chips, respond, evaConfig, evaSrc, collapsed, onToggleCollapsed, onExpand, expanded = false, docked = false, welcome, onWelcomeConsumed, pendingAsk, onPendingConsumed, seed, mobile = false, storageKey,
}: {
    storageKey?: string; // keeps this page's conversation across a refresh (session storage)
    mobile?: boolean; // phones: a floating EVA button, and the chat opens full screen
    subtitle: string;
    intro: string;
    chips: string[];
    respond: (q: string) => string;
    // When set (EVA connected), the panel body is the live EVA chat island (an iframe).
    evaConfig?: EvaConfig | null;
    evaSrc?: string;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onExpand?: (turns: Turn[]) => void; // open the full-window chat, taking the conversation along
    expanded?: boolean; // the full view is open next to this panel — the button closes it again
    docked?: boolean; // a side panel flush to its container's edges (no card of its own) — e.g. over e-conomic
    seed?: Turn[] | null; // a conversation to continue (e.g. coming back from the full-window chat)
    // A one-off welcome brief seeded as the first message (e.g. right after onboarding).
    welcome?: string | null;
    onWelcomeConsumed?: () => void;
    pendingAsk: PendingAsk | null;
    onPendingConsumed: () => void;
}) {
    const { t } = useLang();
    const saveKey = storageKey ? `va-chat-msgs:${storageKey}` : null;
    const [msgs, setMsgs] = useState<Msg[]>(() => {
        if (seed?.length) return seed.map((x) => ({ id: nid(), role: x.role, text: x.text, instant: true }));
        // After a refresh: the conversation as it was, shown in full (not re-typed).
        try {
            const saved: Turn[] | null = saveKey && !welcome ? JSON.parse(sessionStorage.getItem(saveKey) ?? 'null') : null;
            if (saved?.length) return saved.map((x) => ({ id: nid(), role: x.role, text: x.text, instant: true }));
        } catch { /* storage unavailable — start fresh */ }
        return [{ id: 0, role: 'assistant', text: welcome ? welcome : t(intro), instant: true }];
    });
    useEffect(() => {
        if (!saveKey) return;
        try { sessionStorage.setItem(saveKey, JSON.stringify(msgs.filter((m) => !m.thinking && m.text).map((m) => ({ role: m.role, text: m.text })))); } catch { /* ignore */ }
    }, [msgs, saveKey]);
    // Consume the welcome once so it doesn't reappear on later remounts.
    useEffect(() => {
        if (welcome) onWelcomeConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [input, setInput] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState<Past[]>(() => [...PANEL_HISTORY]);
    const started = msgs.some((m) => m.role === 'user');
    const turnsOf = (list: Msg[]): Turn[] => list.filter((m) => !m.thinking && m.text).map((m) => ({ role: m.role, text: m.text }));
    const [loadedId, setLoadedId] = useState<number | null>(null); // the history entry currently open, if any
    // File the current conversation (if you asked anything) — updating its entry if it came from history.
    function fileCurrent() {
        if (!started) return;
        const item: Past = { id: loadedId ?? nid(), title: msgs.find((m) => m.role === 'user')!.text.slice(0, 60), when: 'Just now', turns: turnsOf(msgs) };
        const at = PANEL_HISTORY.findIndex((h) => h.id === item.id);
        if (at >= 0) PANEL_HISTORY.splice(at, 1);
        PANEL_HISTORY.unshift(item);
        setHistory([...PANEL_HISTORY]);
    }
    // New chat: file the current conversation, start fresh.
    function newChat() {
        fileCurrent();
        setLoadedId(null);
        setMsgs([{ id: nid(), role: 'assistant', text: t(intro), instant: true }]);
        setHistoryOpen(false);
    }
    function openPast(p: Past) {
        if (p.id !== loadedId) fileCurrent();
        setLoadedId(p.id);
        setMsgs(p.turns.map((x) => ({ id: nid(), role: x.role, text: x.text, instant: true })));
        setHistoryOpen(false);
    }
    const scrollRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

    // User-resizable panel width (drag the left edge). Persisted for the session.
    const [width, setWidth] = useState(() => {
        const saved = Number(localStorage.getItem('va-chat-width'));
        return saved >= 320 && saved <= 760 ? saved : 360;
    });
    useEffect(() => { localStorage.setItem('va-chat-width', String(width)); }, [width]);
    function startResize(e: { clientX: number; preventDefault: () => void }) {
        e.preventDefault();
        const startX = e.clientX;
        const startW = width;
        const onMove = (ev: MouseEvent) => setWidth(Math.min(760, Math.max(320, startW + (startX - ev.clientX))));
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.userSelect = ''; };
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [msgs]);

    function deliver(userText: string, answerText: string) {
        const tid = nid();
        setMsgs((m) => [...m, { id: nid(), role: 'user', text: userText }, { id: tid, role: 'assistant', text: '', thinking: true }]);
        setInput('');
        setTimeout(() => {
            setMsgs((m) => m.map((x) => (x.id === tid ? { id: tid, role: 'assistant', text: answerText } : x)));
        }, 1100);
    }
    function send(text: string) {
        const t = text.trim();
        if (!t) return;
        deliver(t, respond(t));
        requestAnimationFrame(() => taRef.current?.focus());
    }

    // External "Ask EVA about this" requests from the main content (e.g. the overview's question box).
    // The conversation continues here, so the panel's input takes the focus once it's open.
    const wantFocus = useRef(false);
    useEffect(() => {
        if (!pendingAsk) return;
        deliver(pendingAsk.user, pendingAsk.answer);
        onPendingConsumed();
        wantFocus.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingAsk]);
    useEffect(() => {
        if (!wantFocus.current || collapsed || !taRef.current) return;
        wantFocus.current = false;
        taRef.current.focus({ preventScroll: true });
    });

    // Collapsing mid-answer: show it in full next time rather than typing it out again.
    useEffect(() => {
        if (collapsed) setMsgs((m) => m.map((x) => (x.thinking || x.instant ? x : { ...x, instant: true })));
    }, [collapsed]);
    const settle = (id: number) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, instant: true } : x)));

    // Collapsed: a slim floating rail with the EVA mark, like the collapsed sidebar.
    if (collapsed && mobile) {
        return (
            <button onClick={onToggleCollapsed} aria-label="Open EVA" className="fixed z-40 flex items-center justify-center rounded-full bg-white"
                style={{ right: 16, bottom: 'calc(76px + env(safe-area-inset-bottom))', width: 52, height: 52, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: `1px solid ${SIDEBAR_BORDER}` }}>
                <Orb size={26} />
            </button>
        );
    }
    if (collapsed) {
        return (
            <aside
                className="shrink-0 flex flex-col items-center rounded-2xl"
                style={{ width: 52, background: '#fff', border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: PANEL_SHADOW, paddingTop: 12, paddingBottom: 12 }}
            >
                <button
                    onClick={onToggleCollapsed}
                    title="Open EVA"
                    className="rounded-lg p-1.5"
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <Orb size={24} />
                </button>
            </aside>
        );
    }

    return (
        <aside
            className={mobile ? 'fixed inset-0 z-[55] flex flex-col overflow-hidden anim-in' : `shrink-0 flex flex-col overflow-hidden relative ${docked ? '' : 'rounded-2xl'}`}
            style={mobile ? { background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)' } : docked ? { width, background: '#fff', borderLeft: `1px solid ${SIDEBAR_BORDER}` } : { width, background: '#fff', border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: PANEL_SHADOW }}
        >
            {/* drag the left edge to widen the panel (desktop) */}
            {!mobile && <div
                onMouseDown={startResize}
                title={t('Drag to resize')}
                className="absolute top-0 left-0 h-full z-20 group"
                style={{ width: 8, cursor: 'col-resize' }}
            >
                <span className="absolute top-1/2 -translate-y-1/2 left-0.5 rounded-full" style={{ width: 3, height: 34, background: COLORS.cardBorder }} />
            </div>}
            <div className="flex items-center gap-2 px-4 shrink-0" style={{ minHeight: 62, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <Orb size={22} />
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>EVA</span>
                {subtitle && <span className="text-xs" style={{ color: COLORS.textMuted }}>· {t(subtitle)}</span>}
                <div className="ml-auto flex items-center gap-0.5">
                    {/* conversation options: new chat, history */}
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            title={t('More options')}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            className="rounded-md p-1"
                            style={{ color: COLORS.textMuted, background: menuOpen ? '#f4f4f5' : 'transparent' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = menuOpen ? '#f4f4f5' : 'transparent')}
                        >
                            <Icon name="more" />
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <div role="menu" className="absolute right-0 z-50 mt-1 rounded-xl bg-white py-1" style={{ minWidth: 210, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 12px 32px rgba(0,0,0,0.16)' }}>
                                    {[
                                        { icon: 'circle-plus', label: 'New chat', run: newChat, disabled: !started },
                                        { icon: 'time', label: 'Conversation history', run: () => setHistoryOpen(true), disabled: false },
                                    ].map((it) => (
                                        <button key={it.label} role="menuitem" disabled={it.disabled} onClick={() => { setMenuOpen(false); it.run(); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm"
                                            style={{ color: it.disabled ? '#b0b0b8' : COLORS.text, cursor: it.disabled ? 'default' : 'pointer' }}
                                            onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = '#fafafa'; }} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                            <Icon name={it.icon as never} /> {t(it.label)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {onExpand && (
                        <button
                            onClick={() => onExpand(turnsOf(msgs))}
                            title={t(expanded ? 'Close full screen' : 'Open in full window')}
                            className="rounded-md p-1"
                            style={{ color: COLORS.textMuted }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Icon name={expanded ? 'modal-shrink' : 'expand-view'} />
                        </button>
                    )}
                    <button
                        onClick={onToggleCollapsed}
                        title={t('Close')}
                        className="rounded-md p-1"
                        style={{ color: COLORS.textMuted }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            </div>

            {evaConfig && evaSrc ? (
                <EvaIframe src={evaSrc} config={evaConfig} />
            ) : (
            <>
            {historyOpen ? (
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <div className="flex items-center gap-2 px-1 pb-2">
                        <button onClick={() => setHistoryOpen(false)} className="rounded-md p-1" style={{ color: COLORS.textMuted }} title={t('Back')}><Icon name="arrow-left" /></button>
                        <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t('Conversation history')}</p>
                    </div>
                    {history.map((h) => (
                        <button key={h.id} onClick={() => openPast(h)} className="w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5"
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <span className="shrink-0 mt-0.5" style={{ color: COLORS.textMuted }}><Icon name="chat" /></span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm truncate" style={{ color: COLORS.text }}>{t(h.title)}</span>
                                <span className="block text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t(h.when)} · {h.turns.filter((x) => x.role === 'user').length} {t(h.turns.filter((x) => x.role === 'user').length === 1 ? 'question' : 'questions')}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
                {msgs.map((m) =>
                    m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end">
                            <div className="rounded-2xl px-3.5 py-2 text-sm" style={{ background: '#f1f1f3', color: COLORS.text, maxWidth: '85%' }}>{m.text}</div>
                        </div>
                    ) : (
                        <div key={m.id} className="flex gap-2.5">
                            <div className="shrink-0 mt-0.5"><Orb size={22} thinking={m.thinking} /></div>
                            <div className="flex-1 min-w-0 text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.text }}>
                                {m.thinking ? <Thinking /> : m.instant ? m.text : <Stream text={m.text} onTick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })} onDone={() => settle(m.id)} />}
                                {!m.thinking && <AnswerFormats text={m.text} />}
                            </div>
                        </div>
                    )
                )}
            </div>
            )}

            <div className="px-3 pb-3">
                {/* suggestions are a way in — gone once the conversation has started */}
                {chips.length > 0 && !msgs.some((m) => m.role === 'user') && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {chips.map((c) => (
                            // Display the translated chip, but match the canned answer on the English key.
                            <EvaChip key={c} label={t(c)} onClick={() => deliver(t(c), respond(c))} />
                        ))}
                    </div>
                )}
                <div className="relative rounded-2xl" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                    <textarea
                        ref={taRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                        placeholder={t('Ask EVA anything')}
                        rows={2}
                        className="w-full resize-none bg-transparent px-3.5 py-2.5 text-sm outline-none"
                        style={{ color: COLORS.text }}
                    />
                    <div className="absolute bottom-2 right-2.5 flex items-center gap-2">
                        <button style={{ color: COLORS.textMuted }} title="Voice input"><MicIcon /></button>
                        <button
                            onClick={() => send(input)}
                            disabled={!input.trim()}
                            className="flex items-center justify-center rounded-lg"
                            style={{ width: 28, height: 28, background: input.trim() ? '#4c6ef5' : '#e4e4e7', color: input.trim() ? '#fff' : '#b0b0b8', cursor: input.trim() ? 'pointer' : 'not-allowed' }}
                        >
                            <Icon name="arrow-up" />
                        </button>
                    </div>
                </div>
            </div>
            </>
            )}
        </aside>
    );
}
