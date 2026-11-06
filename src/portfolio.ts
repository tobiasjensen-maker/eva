// AX — EVA across the portfolio (brief: "EVA Cross Portfolio Collaboration").
// EVA looks across every agreement you have access to: what needs doing where, ranked with reasons; the same
// action on several agreements in one plan; what colleagues did on shared agreements; and how each agreement
// is set up (package, add-ons, automation, routines) with automations it could take on. Mock data.
import { DOC_REQUESTS, MY_PORTFOLIO, type Client } from './practice';

// EVA's ranking — where to start, and why (every rank says why, so you can trust it).
export interface Focus { name: string; why: string[]; due?: string }
export const FOCUS: Focus[] = [
    { name: 'Café Solsikke', why: ['Books are blocked — September can’t close', 'Supplier invoices and a bank statement are still missing', 'About six weeks of cash runway left'], due: 'VAT due in 4 days' },
    { name: 'Nordic Build ApS', why: ['A booked entry needs correcting before the VAT return', 'A 14.900 kr receipt is still missing'], due: 'VAT due in 4 days' },
    { name: 'Office Supplies Co', why: ['September isn’t closed yet', 'A tax card is missing for a new employee'], due: 'Close by Friday' },
    { name: 'Digital Marketing Pro', why: ['An action to approve before the close', '41% of revenue comes from one customer'] },
    { name: 'Nielsen Malerfirma', why: ['Three receipts are missing for September'], due: 'Close by Friday' },
    { name: 'Tech Equipment AS', why: ['One finding to approve — nothing else open'] },
    { name: 'Fjord Fitness', why: ['September isn’t closed yet'] },
];

// Same task, several agreements — handled together in one plan. Per agreement: what EVA will do, and
// (for the demo) one that doesn't go through, so the result shows what succeeded and what didn't.
export interface BulkItem { client: string; what: string[]; to?: string; fail?: string; saves?: number }
// One row per agreement — every document it's waiting on, in one reminder.
export const DOC_REMINDERS: BulkItem[] = Object.entries(DOC_REQUESTS).map(([client, reqs]) => ({
    client, what: reqs.map((r) => r.what), to: reqs[0].to,
    fail: client === 'Nielsen Malerfirma' ? 'Lars’s email bounced — call him instead' : undefined,
}));

// Package, add-ons, automation and routines per agreement — the setup overview.
export type Pkg = 'Basis' | 'Smart' | 'Premium';
export interface Setup { pkg: Pkg; addOns: string[]; routines: string[]; shared?: string; setBy?: Record<string, string> }
const SETUP: Record<string, Setup> = {
    'Café Solsikke': { pkg: 'Smart', addOns: ['Bank feeds'], routines: ['Weekly Bookkeeping', 'Monthly Close'], shared: 'Sofie Lund' },
    'Nordic Build ApS': { pkg: 'Premium', addOns: ['Bank feeds', 'Smart Inbox', 'Projects'], routines: ['Weekly Bookkeeping', 'Monthly Controlling', 'Monthly Close'], shared: 'Anders Holm', setBy: { 'Monthly Controlling': 'Anders Holm' } },
    'Tech Equipment AS': { pkg: 'Premium', addOns: ['Bank feeds', 'Smart Inbox', 'Inventory'], routines: ['Weekly Bookkeeping', 'Monthly Controlling', 'Monthly Close', 'Stock-aware reordering'] },
    'Office Supplies Co': { pkg: 'Smart', addOns: ['Bank feeds'], routines: ['Weekly Bookkeeping', 'Monthly Close'] },
    'Digital Marketing Pro': { pkg: 'Premium', addOns: ['Bank feeds', 'Smart Inbox', 'Multi-currency'], routines: ['Weekly Bookkeeping', 'Monthly Controlling', 'Monthly Close'] },
    'Bryg & Co ApS': { pkg: 'Smart', addOns: ['Bank feeds', 'Smart Inbox'], routines: ['Weekly Bookkeeping', 'Monthly Close', 'Automated debt collection'] },
    'Fjord Fitness': { pkg: 'Basis', addOns: ['Bank feeds'], routines: ['Weekly Bookkeeping'], shared: 'Camilla Berg' },
    'Grøn Energi A/S': { pkg: 'Premium', addOns: ['Bank feeds', 'Smart Inbox', 'Projects'], routines: ['Weekly Bookkeeping', 'Monthly Controlling', 'Monthly Close'], shared: 'Camilla Berg', setBy: { 'Monthly Controlling': 'Camilla Berg' } },
};
const PKGS: Pkg[] = ['Basis', 'Smart', 'Premium'];
export function setupOf(c: Client, i: number): Setup {
    return SETUP[c.name] ?? {
        pkg: PKGS[i % 3],
        addOns: ['Bank feeds', ...(i % 2 === 0 ? ['Smart Inbox'] : [])],
        routines: ['Weekly Bookkeeping', ...(i % 3 !== 0 ? ['Monthly Close'] : []), ...(i % 4 === 0 ? ['Monthly Controlling'] : [])],
    };
}
export const SETUPS: { c: Client; s: Setup }[] = MY_PORTFOLIO.map((c, i) => ({ c, s: setupOf(c, i) }));

// Automations not used yet, where EVA has seen you do the work by hand — hours saved a week, from your own work.
export const SMART_INBOX: BulkItem[] = [
    { client: 'Café Solsikke', what: ['Turn on Smart Inbox and send incoming bills to Weekly Bookkeeping'], saves: 1.2 },
    { client: 'Office Supplies Co', what: ['Turn on Smart Inbox and send incoming bills to Weekly Bookkeeping'], saves: 0.8 },
    { client: 'Fjord Fitness', what: ['Turn on Smart Inbox and send incoming bills to Weekly Bookkeeping'], saves: 0.5 },
];

// Shared agreements — what colleagues did since you were last there, and what they set up.
export interface ColleagueEvent { who: string; what: string; when: string; viaEva?: boolean }
export interface Shared { client: string; with: string; last: string; summary: string; events: ColleagueEvent[]; setUp: { kind: 'Routine' | 'Rule' | 'Task'; label: string }[] }
export const SHARED: Shared[] = [
    {
        client: 'Café Solsikke', with: 'Sofie Lund', last: '9 Oct',
        summary: 'Sofie reconciled the Lunar account, booked 23 vouchers and asked Ida for the Hørkram invoices. She added a rule for Hørkram bills — no need to set one up.',
        events: [
            { who: 'Sofie Lund', what: 'Reconciled the Lunar bank account up to 10 Oct', when: 'Yesterday', viaEva: true },
            { who: 'Sofie Lund', what: 'Booked 23 vouchers from the bank feed', when: 'Mon', viaEva: true },
            { who: 'Sofie Lund', what: 'Added a rule: Hørkram bills → 1310 Goods', when: 'Mon' },
            { who: 'Sofie Lund', what: 'Asked Ida for supplier invoices — Hørkram, September', when: '2 Oct', viaEva: true },
        ],
        setUp: [{ kind: 'Rule', label: 'Hørkram bills → 1310 Goods' }, { kind: 'Task', label: 'Follow up on Hørkram invoices' }],
    },
    {
        client: 'Nordic Build ApS', with: 'Anders Holm', last: '6 Oct',
        summary: 'Anders corrected the VAT code on 4 subcontractor invoices and turned on Monthly Controlling. He noted that Henrik is sending the Bauhaus receipt this week.',
        events: [
            { who: 'Anders Holm', what: 'Corrected the VAT code on 4 subcontractor invoices', when: 'Tue', viaEva: true },
            { who: 'Anders Holm', what: 'Turned on the Monthly Controlling routine', when: 'Tue' },
            { who: 'Anders Holm', what: 'Note: Henrik is sending the Bauhaus receipt this week', when: 'Tue' },
        ],
        setUp: [{ kind: 'Routine', label: 'Monthly Controlling' }],
    },
    {
        client: 'Grøn Energi A/S', with: 'Camilla Berg', last: '1 Oct',
        summary: 'Camilla prepared the Q3 accrual for the solar park lease and turned on Monthly Controlling. Nothing is waiting on you.',
        events: [
            { who: 'Camilla Berg', what: 'Prepared the Q3 accrual for the solar park lease', when: '8 Oct', viaEva: true },
            { who: 'Camilla Berg', what: 'Turned on the Monthly Controlling routine', when: '3 Oct' },
        ],
        setUp: [{ kind: 'Routine', label: 'Monthly Controlling' }],
    },
];

// EVA's answers to the cross-portfolio questions (Chat, and the side panel in e-conomic).
export function portfolioAnswer(q: string, da: boolean): string | null {
    const s = q.toLowerCase();
    if (/where should i start|start today|across my agreements|hvor skal jeg starte|på tværs af mine aftaler/.test(s))
        return da
            ? `7 af dine ${MY_PORTFOLIO.length} aftaler har brug for dig. Start med Café Solsikke — bogføringen er blokeret, og momsen forfalder om 4 dage. Derefter Nordic Build ApS (en bogført post skal rettes før momsangivelsen) og Office Supplies Co (september er ikke lukket). 4 aftaler venter på bilag — dem kan jeg minde om på én gang. Se det hele under Portefølje.`
            : `7 of your ${MY_PORTFOLIO.length} agreements need you. Start with Café Solsikke — its books are blocked and VAT is due in 4 days. Then Nordic Build ApS (a booked entry needs correcting before the VAT return) and Office Supplies Co (September isn’t closed). 4 agreements are waiting on documents — I can remind them all at once. See it all in Portfolio.`;
    if (/colleague|shared agreement|kolleg|delte aftaler/.test(s))
        return da
            ? 'På dine 3 delte aftaler: Sofie har afstemt Lunar-kontoen og bogført 23 bilag hos Café Solsikke og lavet en regel for Hørkram-regninger. Anders har rettet momskoden på 4 underleverandørfakturaer hos Nordic Build ApS og slået Månedlig kontrol til. Camilla har lavet Q3-periodiseringen hos Grøn Energi A/S. Du behøver ikke sætte noget af det op igen.'
            : 'On your 3 shared agreements: Sofie reconciled the Lunar account and booked 23 vouchers at Café Solsikke, and added a rule for Hørkram bills. Anders corrected the VAT code on 4 subcontractor invoices at Nordic Build ApS and turned on Monthly Controlling. Camilla prepared the Q3 accrual at Grøn Energi A/S. None of it needs setting up again.';
    if (/automat|smart inbox|save (me )?time|spare tid/.test(s))
        return da
            ? 'Café Solsikke, Office Supplies Co og Fjord Fitness bruger ikke Smart Inbox endnu. Ud fra det arbejde, du har lavet på dem, kunne det spare dig ca. 2,5 timer om ugen. Vil du have, at jeg sætter det op for de tre? Du kan godkende planen under Portefølje › Opsætning.'
            : 'Café Solsikke, Office Supplies Co and Fjord Fitness don’t use Smart Inbox yet. Based on your work on them, it could save you about 2.5 hours a week. Want me to set it up for all three? You can approve the plan in Portfolio › Setup.';
    return null;
}

// the requested documents, in Danish (lower-case, mid-sentence)
const DA_DOC: Record<string, string> = {
    'Receipt — Bauhaus 14.900 kr': 'kvittering — Bauhaus 14.900 kr',
    'Supplier invoices — Hørkram, September': 'leverandørfakturaer — Hørkram, september',
    'Bank statement — Lunar, September': 'kontoudtog — Lunar, september',
    '3 receipts — paint and materials, September': '3 kvitteringer — maling og materialer, september',
    'Tax card — Laura Kim': 'skattekort — Laura Kim',
};
// "Who's waiting on documents?" — answered as a plan: one reminder per agreement, edit before you approve.
export function reminderPlan(da: boolean) {
    const n = DOC_REMINDERS.length;
    return {
        intro: da
            ? `${n} aftaler venter på bilag til september. Her er min plan for at minde dem om det — der bliver ikke sendt noget, før du godkender. Fjern en aftale under Rediger.`
            : `${n} agreements are waiting on September documents. Here’s my plan to remind them — nothing is sent until you approve. Remove an agreement under Modify.`,
        steps: DOC_REMINDERS.map((r) => da ? `${r.client}: påmind ${r.to} om ${r.what.map((w) => DA_DOC[w] ?? w).join(' og ')}` : `${r.client}: remind ${r.to} about ${r.what.map((w) => w.charAt(0).toLowerCase() + w.slice(1)).join(' and ')}`),
        result: da
            ? `Sendt til ${n - 1} af ${n}. Lars’ e-mail hos Nielsen Malerfirma kom retur — ring til ham i stedet. Hver aftale logger påmindelsen som sendt af dig via EVA.`
            : `Sent to ${n - 1} of ${n}. Lars’s email at Nielsen Malerfirma bounced — call him instead. Each agreement logs the reminder as sent by you via EVA.`,
        outcome: { title: da ? `${n - 1} påmindelser sendt` : `${n - 1} reminders sent`, sub: da ? '1 kræver dig · Nielsen Malerfirma' : '1 needs you · Nielsen Malerfirma' },
    };
}
