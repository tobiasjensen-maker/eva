// EVA assistant (e-conomic Virtual Assistant) connection config for the prototype.
//
// EVA's official client is @economic/agents-react (React 19), which conflicts with
// this app's React 18 + taco. So the live chat runs in an isolated React-19 "island"
// (see eva-island/, built into public/eva-island/) embedded via an <iframe>. This
// module just holds the token + builds the config the island needs.
//
// The token is a short-lived e-conomic/Plex session token; kept in localStorage
// (dev-only), never committed or bundled.

const TOKEN_KEY = 'va-eva-token';

// EVA production. (Sandbox eva-agent-plex.e-conomic.dev exists but staging is flaky,
// so we point at production — token comes from a logged-in e-conomic agreement.)
export const EVA_HOST = 'eva-agent.e-conomic.com';
export const EVA_AGENT = 'eva-assistant';

export function evaToken(): string {
    try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}
export function setEvaToken(token: string) {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
// EVA is a local-dev-only feature (the sandbox is internal-network only).
export function evaConfigured(): boolean {
    return import.meta.env.DEV && !!evaToken();
}

export interface EvaConfig {
    token: string;
    host: string;
    agentName: string;
    userId: string;
    context: Record<string, unknown>;
}

// Build the config posted into the island iframe. userId scopes the Durable Object
// (one chat thread per connected agreement).
export function evaConfig(ctx: { agreementNumber?: number; companyName?: string; page?: string }): EvaConfig {
    return {
        token: evaToken(),
        host: EVA_HOST,
        agentName: EVA_AGENT,
        userId: ctx.agreementNumber ? `agreement-${ctx.agreementNumber}` : 'prototype',
        context: {
            agreementNumber: ctx.agreementNumber,
            companyName: ctx.companyName,
            page: ctx.page,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };
}

// URL of the built island, resolved against the app's base path (/eva/).
export function evaIslandSrc(): string {
    return `${import.meta.env.BASE_URL}eva-island/index.html`;
}
