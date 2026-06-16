// Thin client for the e-conomic REST API. Requests go through the Vite dev proxy
// at /eco/* (see vite.config.ts), which attaches the App Secret + Agreement Grant
// tokens server-side. In the static GitHub Pages build there is no proxy, so calls
// will fail there by design — the live connection is a local-dev feature.
import { useEffect, useState } from 'react';

const BASE = '/eco';

export async function ecoFetch<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        let detail = '';
        try {
            const body = await res.json();
            detail = (body && (body.message || body.errorCode)) || '';
        } catch {
            /* non-JSON error body */
        }
        throw new Error(detail ? `${res.status} · ${detail}` : `${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

// Shape of the /self endpoint (only the bits we use).
export interface EcoSelf {
    agreementNumber: number;
    userName?: string;
    company: { name: string; vatNumber?: string };
}

export type EcoConnection =
    | { status: 'connecting' }
    | { status: 'connected'; company: string; agreementNumber: number; userName?: string }
    | { status: 'error'; error: string };

// ---- Customers & invoices ----

export interface EcoCustomer {
    customerNumber: number;
    name: string;
    email?: string;
    currency: string;
    balance: number;
}

export interface EcoInvoice {
    kind: 'booked' | 'draft';
    number: number;
    date: string;
    dueDate?: string;
    customerNumber?: number;
    recipientName: string;
    grossAmount: number;
    remainder?: number; // outstanding amount (booked only)
    currency: string;
}

interface Paged<T> { collection: T[]; pagination?: { results: number } }

// Same-origin PDF URL (served through the dev proxy) — can be used directly as an
// <iframe>/<a> src. Booked and draft invoices have separate endpoints.
export function invoicePdfUrl(inv: Pick<EcoInvoice, 'kind' | 'number'>): string {
    return `${BASE}/invoices/${inv.kind === 'draft' ? 'drafts' : 'booked'}/${inv.number}/pdf`;
}

export async function getCustomers(): Promise<EcoCustomer[]> {
    const data = await ecoFetch<Paged<Record<string, unknown>>>('/customers?pagesize=1000');
    return (data.collection ?? []).map((c) => ({
        customerNumber: c.customerNumber as number,
        name: (c.name as string) ?? '—',
        email: c.email as string | undefined,
        currency: (c.currency as string) ?? 'DKK',
        balance: (c.balance as number) ?? 0,
    }));
}

export async function getInvoices(): Promise<EcoInvoice[]> {
    const [booked, drafts] = await Promise.all([
        ecoFetch<Paged<Record<string, any>>>('/invoices/booked?pagesize=1000').catch(() => ({ collection: [] })),
        ecoFetch<Paged<Record<string, any>>>('/invoices/drafts?pagesize=1000').catch(() => ({ collection: [] })),
    ]);
    const b: EcoInvoice[] = (booked.collection ?? []).map((i) => ({
        kind: 'booked',
        number: i.bookedInvoiceNumber,
        date: i.date,
        dueDate: i.dueDate,
        customerNumber: i.customer?.customerNumber,
        recipientName: i.recipient?.name ?? '—',
        grossAmount: i.grossAmount ?? 0,
        remainder: i.remainder,
        currency: i.currency ?? 'DKK',
    }));
    const d: EcoInvoice[] = (drafts.collection ?? []).map((i) => ({
        kind: 'draft',
        number: i.draftInvoiceNumber,
        date: i.date,
        dueDate: i.dueDate,
        customerNumber: i.customer?.customerNumber,
        recipientName: i.recipient?.name ?? '—',
        grossAmount: i.grossAmount ?? 0,
        currency: i.currency ?? 'DKK',
    }));
    return [...b, ...d];
}

// Calls /self once on mount to verify the App + Agreement tokens and read the
// connected company. Drives the connection indicator in the sidebar.
export function useEcoConnection(enabled = true): EcoConnection {
    const [state, setState] = useState<EcoConnection>({ status: 'connecting' });
    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        ecoFetch<EcoSelf>('/self')
            .then((self) => {
                if (alive) setState({ status: 'connected', company: self.company?.name ?? 'Unknown company', agreementNumber: self.agreementNumber, userName: self.userName });
            })
            .catch((e) => {
                if (alive) setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
            });
        return () => { alive = false; };
    }, [enabled]);
    return state;
}
