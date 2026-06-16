import { useEffect, useRef, useState } from 'react'
import { useChat } from '@economic/agents-react'

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
        // Tell the parent we're ready to receive config.
        window.parent?.postMessage({ type: 'eva-ready' }, '*')
        return () => window.removeEventListener('message', onMsg)
    }, [])

    if (!config || !config.token) {
        return <Centered>Waiting for connection…</Centered>
    }
    return <Connected key={config.userId} config={config} />
}

function Connected({ config }: { config: EvaConfig }) {
    const { status, chat } = useChat({
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
    const messages = chat?.messages ?? []
    const busy = chat?.status === 'submitted' || chat?.status === 'streaming'

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    // Surface connection status to the parent (for the dot/indicator).
    useEffect(() => {
        window.parent?.postMessage({ type: 'eva-status', status }, '*')
    }, [status])

    function send() {
        const text = input.trim()
        if (!text || !chat?.sendMessage) return
        chat.sendMessage({ role: 'user', parts: [{ type: 'text', text }] })
        setInput('')
    }

    if (status === 'unauthorized') return <Centered>Token rejected — refresh it and reconnect.</Centered>
    if (status === 'connecting') return <Centered>Connecting to Eva…</Centered>
    if (status === 'disconnected') return <Centered>Disconnected. Check the network / VPN.</Centered>

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
                        <div key={m.id} style={{ fontSize: 14, lineHeight: 1.55, color: COLORS.text, whiteSpace: 'pre-wrap' }}>{text || (busy ? '…' : '')}</div>
                    )
                })}
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

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: '#6b6b76', fontSize: 14 }}>
            {children}
        </div>
    )
}
