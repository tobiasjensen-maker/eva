import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@economic/taco';
import { Orb, MicIcon, COLORS } from './ui';

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
    const phrases = ['Thinking…', 'Looking at your data…', 'Putting it together…'];
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
    subtitle, intro, chips, respond, collapsed, onToggleCollapsed, pendingAsk, onPendingConsumed,
}: {
    subtitle: string;
    intro: string;
    chips: string[];
    respond: (q: string) => string;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    pendingAsk: PendingAsk | null;
    onPendingConsumed: () => void;
}) {
    const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: 0, role: 'assistant', text: intro, instant: true }]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

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

    // External "Ask Eva about this" requests from the main content.
    useEffect(() => {
        if (!pendingAsk) return;
        deliver(pendingAsk.user, pendingAsk.answer);
        onPendingConsumed();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingAsk]);

    // Collapsed: a slim floating rail with the Eva mark, like the collapsed sidebar.
    if (collapsed) {
        return (
            <aside
                className="shrink-0 flex flex-col items-center rounded-2xl"
                style={{ width: 52, background: '#fff', border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: PANEL_SHADOW, paddingTop: 12, paddingBottom: 12, gap: 10 }}
            >
                <button
                    onClick={onToggleCollapsed}
                    title="Open Eva"
                    className="rounded-lg p-1.5"
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <Orb size={24} />
                </button>
                <button
                    onClick={onToggleCollapsed}
                    title="Open Eva"
                    className="rounded-lg p-1.5"
                    style={{ color: COLORS.textMuted }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <Icon name="chevron-left-double" />
                </button>
            </aside>
        );
    }

    return (
        <aside
            className="shrink-0 flex flex-col rounded-2xl overflow-hidden"
            style={{ width: 360, background: '#fff', border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: PANEL_SHADOW }}
        >
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <Orb size={22} />
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Eva</span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>· {subtitle}</span>
                <button
                    onClick={onToggleCollapsed}
                    title="Collapse"
                    className="ml-auto rounded-md p-1"
                    style={{ color: COLORS.textMuted }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <Icon name="chevron-right-double" />
                </button>
            </div>

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
                            <button
                                key={c}
                                onClick={() => send(c)}
                                className="rounded-full px-2.5 py-1 text-xs"
                                style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, background: '#fff' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
                <div className="relative rounded-2xl" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                    <textarea
                        ref={taRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                        placeholder="Ask Eva anything"
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
        </aside>
    );
}
