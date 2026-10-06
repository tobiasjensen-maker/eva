import { createContext, useContext } from 'react';
import type { ViewId } from './types';

// ---- Two scopes, one prototype ------------------------------------------------------------
// "Vision" is the full product. "AX" is what we build first: agent management (what EVA runs,
// what it did, what it hands back) and period closing (month-end, controlling, the books).
// It is the same app with parts filtered out — so every change to a shared screen shows up in
// both. Switch in the settings menu, or link with ?scope=ax / ?scope=vision.

export type Scope = 'vision' | 'ax';

export const ScopeModeContext = createContext<{ scope: Scope; ax: boolean; setScope: (s: Scope) => void }>({
    scope: 'vision', ax: false, setScope: () => {},
});
export const useScopeMode = () => useContext(ScopeModeContext);

// Pages that are Vision-only.
export const AX_HIDDEN_VIEWS: ViewId[] = ['inbox', 'practice', 'insights', 'spaces', 'customers'];

// Activity skills that are advisory (Vision-only).
export const AX_HIDDEN_SKILLS = new Set(['monitor', 'advisory', 'regulations', 'inbox', 'payroll']);

export function initialScope(): Scope {
    try {
        const fromUrl = new URLSearchParams(window.location.search).get('scope');
        if (fromUrl === 'ax' || fromUrl === 'vision') { localStorage.setItem('va-scope', fromUrl); return fromUrl; }
        return localStorage.getItem('va-scope') === 'ax' ? 'ax' : 'vision';
    } catch {
        return 'vision';
    }
}

// People's tasks that are advisory or relationship work (Vision-only). Professional sign-off stays in AX.
export const axHidesTask = (title: string) => /call|meeting|advice|workshop|plan\b|hiring/i.test(title) && !/sign off/i.test(title);

// Payroll is Vision-only (tasks, routine, scheduled runs, the payroll exception).
export const isPayroll = (text: string) => /payroll|salar(y|ies) run/i.test(text);
