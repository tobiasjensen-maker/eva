import { useEffect, useRef, useState } from 'react'
import { useAssistant } from '@economic/agents-react'

// Config handed in by the parent app over postMessage (so the token never lives in
// this bundle). Defaults target the EVA sandbox.
interface EvaConfig {
    token: string
    host: string
    agentName: string
    userId: string
    context: Record<string, unknown>
    welcomeMessage?: string
}

const COLORS = { text: '#18181b', muted: '#6b6b76', border: '#e9e9ec', accent: '#4c6ef5' }

export function EvaChat() {
    const [config, setConfig] = useState<EvaConfig | null>(null)

    useEffect(() => {
        function onMsg(e: MessageEvent) {
            if (e.data?.type === 'eva-config' && typeof e.data.token === 'string') {
                const { token, host, agentName, userId, context, welcomeMessage } = e.data
                setConfig({ token, host, agentName, userId, context: context ?? {}, welcomeMessage })
            }
        }
        window.addEventListener('message', onMsg)
        window.parent?.postMessage({ type: 'eva-ready' }, '*')
        return () => window.removeEventListener('message', onMsg)
    }, [])

    if (!config || !config.token) return <Centered>Waiting for connection…</Centered>
    return <Connected key={config.userId} config={config} />
}

// EVA is an Assistant (per-user, many chats), so we use useAssistant and auto-open or
// create a single chat for this embedded panel.
function Connected({ config }: { config: EvaConfig }) {
    const { status, assistant, chat, currentChatName } = useAssistant({
        host: config.host,
        agentName: config.agentName,
        name: config.userId,
        authToken: config.token,
        toolContext: {
            tokens: { 'X-EconomicToken': config.token },
            ...config.context,
        },
        welcomeMessage: config.welcomeMessage,
    })

    const [input, setInput] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)
    const initRef = useRef(false)

    // Once connected, open the most recent chat or start a new one.
    useEffect(() => {
        if (status !== 'connected' || currentChatName || initRef.current) return
        initRef.current = true
        void (async () => {
            try {
                const list = await assistant.getChats()
                if (list?.length) assistant.openChat(list[0].name)
                else await assistant.createChat()
            } catch {
                await assistant.createChat().catch(() => {})
            }
        })()
    }, [status, currentChatName, assistant])

    const messages = chat?.chat.messages ?? []
    const busy = chat?.chat.status === 'submitted' || chat?.chat.status === 'streaming'

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        window.parent?.postMessage({ type: 'eva-status', status }, '*')
    }, [status])

    // Diagnostics: log what EVA streams so we can see tool calls / part shapes.
    useEffect(() => {
        console.debug('[eva] status', status, 'chat.status', chat?.chat.status, 'messages', messages)
    }, [status, chat?.chat.status, messages])

    function send() {
        const text = input.trim()
        if (!text || !chat?.chat.sendMessage) return
        chat.chat.sendMessage({ role: 'user', parts: [{ type: 'text', text }] })
        setInput('')
    }

    if (status === 'unauthorized') return <Centered>Token rejected — refresh it and reconnect.</Centered>
    if (status === 'connecting') return <Centered>Connecting to Eva…</Centered>
    if (status === 'disconnected') return <Centered>Disconnected. Check the network / VPN.</Centered>
    if (!currentChatName) return <Centered>Starting chat…</Centered>

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.length === 0 && <div style={{ color: COLORS.muted, fontSize: 14 }}>Ask Eva anything about this agreement.</div>}
                {messages.map((m) => {
                    const text = (m.parts ?? []).filter((p: { type: string }) => p.type === 'text').map((p: { text: string }) => p.text).join('')
                    return m.role === 'user' ? (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ background: '#f1f1f3', color: COLORS.text, borderRadius: 16, padding: '8px 14px', fontSize: 14, maxWidth: '85%' }}>{text}</div>
                        </div>
                    ) : (
                        <div key={m.id} style={{ fontSize: 14, lineHeight: 1.55, color: COLORS.text, whiteSpace: 'pre-wrap' }}>
                            {text ? text : null}
                            {!text && toolActivity(m) && (
                                <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: COLORS.muted }}>
                                    <TypingDots /> {toolActivity(m)}
                                </span>
                            )}
                            {!text && !toolActivity(m) && busy ? <TypingDots /> : null}
                        </div>
                    )
                })}
                {/* Waiting on the first token (no assistant bubble yet). */}
                {busy && messages[messages.length - 1]?.role !== 'assistant' && <TypingDots />}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 14, background: '#fafafa', padding: 6 }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                        placeholder="Ask Eva anything"
                        rows={2}
                        style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: COLORS.text }}
                    />
                    <button
                        onClick={send}
                        disabled={!input.trim() || busy}
                        style={{ alignSelf: 'flex-end', width: 30, height: 30, borderRadius: 9, border: 'none', cursor: input.trim() && !busy ? 'pointer' : 'not-allowed', background: input.trim() && !busy ? COLORS.accent : '#e4e4e7', color: '#fff', fontSize: 16 }}
                    >
                        ↑
                    </button>
                </div>
            </div>
        </div>
    )
}

// Describe any in-progress tool/step part so the user sees EVA "looking things up".
function toolActivity(m: { parts?: { type: string; toolName?: string }[] }): string {
    const tool = (m.parts ?? []).find((p) => p.type === 'dynamic-tool' || (typeof p.type === 'string' && p.type.startsWith('tool-')))
    if (!tool) return ''
    const name = tool.toolName ?? (tool.type.startsWith('tool-') ? tool.type.slice(5) : 'data')
    return `Looking up ${name}…`
}

function TypingDots() {
    return (
        <div aria-label="Eva is thinking" style={{ display: 'flex', gap: 4, alignItems: 'center', height: 18 }}>
            {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9aa0aa', display: 'inline-block', animation: 'evaDot 1.2s infinite ease-in-out', animationDelay: `${i * 0.16}s` }} />
            ))}
        </div>
    )
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: '#6b6b76', fontSize: 14 }}>
            {children}
        </div>
    )
}
