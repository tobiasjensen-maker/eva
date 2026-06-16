// Client for the real EVA assistant (e-conomic Virtual Assistant), built on the
// @economic/agents SDK (Cloudflare Workers + Durable Objects, streamed over a
// WebSocket using the Vercel AI SDK wire protocol).
//
// EVA's sandbox allows CORS from localhost and accepts the auth token via the
// `Sec-WebSocket-Protocol: ["bearer", <token>]` subprotocol, so the browser can
// connect directly in local dev — no proxy needed. The token is a short-lived
// e-conomic/Plex session token; it's kept in localStorage (dev-only), never
// committed or bundled.
//
// NOTE: the exact stream-frame shapes below are implemented per the AI SDK data
// protocol and are intentionally tolerant — verify/adjust against real frames on
// the first live connection (every raw frame is logged in dev).

const SANDBOX_WS = 'wss://eva-agent-plex.e-conomic.dev';
const TOKEN_KEY = 'va-eva-token';

export function evaToken(): string {
    try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}
export function setEvaToken(token: string) {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
// EVA is a local-dev-only feature (like the e-conomic REST connection).
export function evaConfigured(): boolean {
    return import.meta.env.DEV && !!evaToken();
}

export interface EvaTurn { role: 'user' | 'assistant'; text: string }
export interface EvaContext { agreementNumber?: number; companyName?: string; page?: string }

// Opens a WebSocket to EVA, sends the conversation, and invokes onDelta with the
// cumulative assistant text as it streams. Resolves when the turn completes.
export function streamEva(
    history: EvaTurn[],
    ctx: EvaContext,
    onDelta: (fullText: string) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const token = evaToken();
        if (!token) return reject(new Error('No EVA token set'));

        // Stable instance name per user/agreement → same Durable Object (chat with memory).
        const userId = ctx.agreementNumber ? `agreement-${ctx.agreementNumber}` : 'prototype';
        const url = `${SANDBOX_WS}/agents/eva-assistant/${encodeURIComponent(userId)}`;
        const ws = new WebSocket(url, ['bearer', token]);

        let full = '';
        let settled = false;
        const finish = (err?: Error) => {
            if (settled) return;
            settled = true;
            try { ws.close(); } catch { /* ignore */ }
            err ? reject(err) : resolve(full);
        };
        const timeout = setTimeout(() => finish(new Error('EVA timed out')), 30000);

        ws.onopen = () => {
            const messages = history.map((m) => ({
                id: `${m.role}-${Math.round(performance.now())}-${Math.random().toString(36).slice(2, 8)}`,
                role: m.role,
                parts: [{ type: 'text', text: m.text }],
            }));
            ws.send(JSON.stringify({ messages, context: ctx }));
        };

        ws.onmessage = (event) => {
            if (import.meta.env.DEV) console.debug('[eva] frame', event.data);
            const delta = extractTextDelta(event.data);
            if (delta) { full += delta; onDelta(full); }
            if (isDone(event.data)) { clearTimeout(timeout); finish(); }
        };
        ws.onerror = () => { clearTimeout(timeout); finish(new Error('EVA connection error')); };
        ws.onclose = () => { clearTimeout(timeout); finish(); };
    });
}

// Best-effort extraction of an assistant text delta from one WS frame. Handles the
// common AI SDK shapes; tolerant of formats we haven't seen live yet.
function extractTextDelta(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    // AI SDK SSE-style data-stream line: `0:"chunk"`
    const sse = raw.match(/^0:(".*")$/s);
    if (sse) { try { return JSON.parse(sse[1]); } catch { return ''; } }
    try {
        const obj = JSON.parse(raw);
        if (typeof obj?.delta === 'string') return obj.delta;
        if (typeof obj?.textDelta === 'string') return obj.textDelta;
        if (obj?.type === 'text-delta' && typeof obj?.text === 'string') return obj.text;
        if (obj?.type === 'text' && typeof obj?.text === 'string') return obj.text;
        if (obj?.role === 'assistant' && Array.isArray(obj?.parts)) {
            return obj.parts.filter((p: { type: string }) => p.type === 'text').map((p: { text: string }) => p.text).join('');
        }
    } catch { /* not JSON */ }
    return '';
}

function isDone(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    if (/^d:|"type"\s*:\s*"(finish|done|message-stop)"/.test(raw)) return true;
    try { const o = JSON.parse(raw); return o?.type === 'finish' || o?.type === 'done' || o?.done === true; } catch { return false; }
}
