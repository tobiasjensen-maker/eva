import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@economic/taco';
import { Orb, MicIcon, EvaChip, COLORS } from './ui';
import { useLang } from './i18n';
import { type EvaConfig } from './eva';

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
function Stream({ text, onTick }: { text: string; onTick: () => void }) {
    const words = useMemo(() => text.split(/(\s+)/), [text]);
    const [n, setN] = useState(0);
    useEffect(() => {
        setN(0);
        // Hidden tabs throttle timers hard — skip the typing animation there.
        if (document.visibilityState === 'hidden') {
            setN(words.length);
            onTick();
            return;
        }
        let i = 0;
        const id = setInterval(() => {
            i++;
            setN(i);
            onTick();
            if (i >= words.length) clearInterval(id);
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

export function ChatPanel({
    subtitle, intro, chips, respond, evaConfig, evaSrc, collapsed, onToggleCollapsed, onExpand, pendingAsk, onPendingConsumed,
}: {
    subtitle: string;
    intro: string;
    chips: string[];
    respond: (q: string) => string;
    // When set (EVA connected), the panel body is the live EVA chat island (an iframe).
    evaConfig?: EvaConfig | null;
    evaSrc?: string;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onExpand?: () => void; // open the full-window chat
    pendingAsk: PendingAsk | null;
    onPendingConsumed: () => void;
}) {
    const { t } = useLang();
    const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: 0, role: 'assistant', text: t(intro), instant: true }]);
    const [input, setInput] = useState('');
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

    // External "Ask EVA about this" requests from the main content.
    useEffect(() => {
        if (!pendingAsk) return;
        deliver(pendingAsk.user, pendingAsk.answer);
        onPendingConsumed();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingAsk]);

    // Collapsed: a slim floating rail with the EVA mark, like the collapsed sidebar.
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
            className="shrink-0 flex flex-col rounded-2xl overflow-hidden relative"
            style={{ width, background: '#fff', border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: PANEL_SHADOW }}
        >
            {/* drag the left edge to widen the panel */}
            <div
                onMouseDown={startResize}
                title={t('Drag to resize')}
                className="absolute top-0 left-0 h-full z-20 group"
                style={{ width: 8, cursor: 'col-resize' }}
            >
                <span className="absolute top-1/2 -translate-y-1/2 left-0.5 rounded-full" style={{ width: 3, height: 34, background: COLORS.cardBorder }} />
            </div>
            <div className="flex items-center gap-2 px-4 shrink-0" style={{ minHeight: 62, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <Orb size={22} />
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>EVA</span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>· {t(subtitle)}</span>
                <div className="ml-auto flex items-center gap-0.5">
                    {onExpand && (
                        <button
                            onClick={onExpand}
                            title={t('Open in full window')}
                            className="rounded-md p-1"
                            style={{ color: COLORS.textMuted }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Icon name="expand-view" />
                        </button>
                    )}
                    <button
                        onClick={onToggleCollapsed}
                        title="Collapse"
                        className="rounded-md p-1"
                        style={{ color: COLORS.textMuted }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <Icon name="layout-last" />
                    </button>
                </div>
            </div>

            {evaConfig && evaSrc ? (
                <EvaIframe src={evaSrc} config={evaConfig} />
            ) : (
            <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
                {msgs.map((m) =>
                    m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end">
                            <div className="rounded-2xl px-3.5 py-2 text-sm" style={{ background: '#f1f1f3', color: COLORS.text, maxWidth: '85%' }}>{m.text}</div>
                        </div>
                    ) : (
                        <div key={m.id} className="flex gap-2.5">
                            <div className="shrink-0 mt-0.5"><Orb size={22} thinking={m.thinking} /></div>
                            <div className="flex-1 min-w-0 text-sm leading-relaxed" style={{ color: COLORS.text }}>
                                {m.thinking ? <Thinking /> : m.instant ? m.text : <Stream text={m.text} onTick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })} />}
                            </div>
                        </div>
                    )
                )}
            </div>

            <div className="px-3 pb-3">
                {chips.length > 0 && (
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
