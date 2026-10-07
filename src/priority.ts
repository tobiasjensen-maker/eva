import type { DecisionItem } from './day';
import type { Thread } from './practice';

// ---- EVA's priority for the review queue --------------------------------------------------
// Everything waiting on the accountant — EVA's drafts to review and client replies — is ranked
// by EVA, with the one-line reason it's where it is. Deadlines and money first.

export type Level = 'high' | 'medium' | 'low';
export type Priority = { level: Level; why: string };
export const PRIO_RANK: Record<Level, number> = { high: 0, medium: 1, low: 2 };
export const PRIO_STYLE: Record<Level, { label: string; fg: string }> = {
    high: { label: 'High', fg: '#c0392b' },
    medium: { label: 'Medium', fg: '#b9842b' },
    low: { label: 'Low', fg: '#6b6b76' },
};

const DECISION_PRIO: Record<string, Priority> = {
    'd-vat': { level: 'high', why: 'Q1 VAT return can’t be filed until this is fixed' },
    'd-ctrl': { level: 'medium', why: 'Changes Q3 VAT payable by 4.500 kr' },
    'd-payroll': { level: 'high', why: '9 people get paid on 30 Oct — approve by the 28th' },
    'd-supplier': { level: 'medium', why: 'Invoice is due for payment on Friday' },
    'd-close': { level: 'medium', why: 'The month-end report goes to the client once it’s closed' },
    'd-bank': { level: 'medium', why: 'Holds up the September close' },
};
const THREAD_PRIO: Record<string, Priority> = {
    t3: { level: 'high', why: 'Cash goes below zero in about five weeks — book the call now' },
    t1: { level: 'medium', why: 'Waiting since this morning — the last item in Bryg & Co’s September close' },
    t2: { level: 'medium', why: 'Completes the year-end file' },
};

export const priorityOfDecision = (d: DecisionItem): Priority => DECISION_PRIO[d.id] ?? { level: 'medium', why: 'You handed this to EVA — the draft is ready' };
export const priorityOfThread = (th: Thread): Priority => THREAD_PRIO[th.id] ?? { level: th.suggestion ? 'medium' : 'low', why: 'Client is waiting for your reply' };
export const byPriority = <T,>(get: (x: T) => Priority) => (a: T, b: T) => PRIO_RANK[get(a).level] - PRIO_RANK[get(b).level];
