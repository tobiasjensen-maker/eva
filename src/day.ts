// Shared "your day" state — the handful of things that need the accountant and the
// advisory moments worth their time. Both Home ("My day") and the Cockpit's Focus
// view read and write these, so acting in one is reflected in the other.

export const KIND: Record<string, { bg: string; fg: string }> = {
    'Cash flow': { bg: '#fbf3e0', fg: '#92710f' },
    'Compliance': { bg: '#eef4fb', fg: '#2f6fb0' },
    'Risk': { bg: '#fdecec', fg: '#c0392b' },
    'Growth': { bg: '#e9f7ef', fg: '#15803d' },
};

// A judgement call EVA has drafted and handed back. `label` matches the trace
// helpers (evaStepsFor / evaFlagFor) so the Cockpit can show "what EVA did".
export type DecisionItem = {
    id: string;
    company: string;
    accountant: string; // who stands behind it (My work vs. Whole practice)
    label: string;      // task type — also the trace key
    question: string;   // what EVA is unsure about
    recommend: string;  // EVA's recommendation
    confirm: string;    // primary action label
    alt: string;        // the alternative
    ack: string;        // EVA's reply after you confirm
    ackAlt: string;     // EVA's reply after you take the alternative
    steps: string[];    // what EVA did before handing it back
    evidence: { label: string; value: string }[]; // the facts behind the question
    // "Fix it": the exact posting change EVA will make — shown field by field, editable,
    // and only applied when you approve (controlling's most-wanted feature in Komma).
    correction?: { voucher: string; fields: { label: string; from: string; to: string; options?: string[] }[]; effect: string };
    altIsDismiss?: boolean; // the alternative means "the flag is wrong" → ask why, so EVA learns
    done?: boolean;
    taken?: 'confirm' | 'alt';
};

// How a decision was settled — logged with it in the activity log.
export type ResolveInfo = { reason?: string; fixed?: string; overridden?: boolean; backToYou?: boolean };

export type ValueItem = {
    id: string;
    company: string;
    extra?: string;
    kind: keyof typeof KIND;
    text: string;
    sub: string;
    action: string;
    ack: string;
    done?: boolean;
};

export const SEED_DECISIONS: DecisionItem[] = [
    { id: 'd-vat', company: 'Nordic Build ApS', accountant: 'Tobias Holm Jensen', label: 'VAT return — Q1', question: 'A reverse-charge VAT line on an EU purchase looks unusual.', recommend: 'Book it as an EU acquisition and file to SKAT.', confirm: 'Apply fix & file', alt: 'It’s domestic', ack: 'Done — Nordic Build’s Q1 VAT return is filed to SKAT. ✅', ackAlt: 'Got it — I’ll rebook it as domestic and hold the return for you.',
        steps: ['Pulled the Q1 VAT accounts and reconciled them against the calculation', 'Drafted the return for SKAT', 'Stopped on one line I’m not confident about'],
        evidence: [{ label: 'Supplier', value: 'Holz Handel GmbH (Germany)' }, { label: 'Amount', value: '48.200 kr' }, { label: 'Booked as', value: 'Domestic purchase, 25% VAT' }, { label: 'Why it looks off', value: 'EU supplier with a German VAT number — normally reverse charge' }],
        altIsDismiss: true,
        correction: { voucher: 'Voucher #2231 · 14 Feb 2026', effect: 'The 12.050 kr of input VAT becomes reverse charge (acquisition and input VAT cancel out) — the Q1 return is then correct and ready to file.', fields: [
            { label: 'Account', from: '5510 · Purchases, domestic', to: '5520 · Purchases, EU goods', options: ['5510 · Purchases, domestic', '5520 · Purchases, EU goods', '5530 · Purchases, EU services'] },
            { label: 'VAT code', from: 'I25 · Domestic input VAT 25%', to: 'EUK · EU acquisition, reverse charge', options: ['I25 · Domestic input VAT 25%', 'EUK · EU acquisition, reverse charge', 'EUY · EU services, reverse charge'] },
            { label: 'Amount', from: '48.200 kr', to: '48.200 kr' },
        ] } },
    { id: 'd-payroll', company: 'Office Supplies Co', accountant: 'Tobias Holm Jensen', label: 'Payroll run — October', question: 'New hire Laura Kim has no tax card yet — run her pay on the standard 55% rate, or wait?', recommend: 'Run it now on the standard rate; EVA corrects it in November when the tax card arrives.', confirm: 'Run payroll', alt: 'Wait for tax card', ack: 'Done — October payroll for Office Supplies is approved and pays on 30 Oct. ✅', ackAlt: 'Holding Laura’s pay until her tax card arrives — the other 8 are approved.',
        steps: ['Collected hours, absence and changes for 9 employees', 'Calculated salaries, A-tax, AM-contribution, ATP and pension', 'Found no tax card for Laura Kim (started 1 Oct)'],
        evidence: [{ label: 'Employees', value: '9 · 1 new this month' }, { label: 'Gross pay', value: '312.400 kr' }, { label: 'Laura Kim', value: 'Started 1 Oct · no tax card in eIndkomst' }, { label: 'Pay date', value: 'Friday 30 Oct' }] },
    { id: 'd-ctrl', company: 'Tech Equipment AS', accountant: 'Tobias Holm Jensen', label: 'Controlling — August', question: 'August rent was booked with 25% input VAT — this lease has no VAT.', recommend: 'Remove the input VAT from the posting. The correction is ready.', confirm: 'Apply fix', alt: 'Not an error', ack: 'Fixed — voucher #4410 corrected in e-conomic. ✅', ackAlt: 'Got it — I’ll leave it and remember why.',
        steps: ['Checked 318 August postings against the account plan and the last 12 months', 'Found one VAT code that differs from how this rent has been booked since January', 'Prepared the correction'],
        evidence: [{ label: 'Posting', value: 'Voucher #4410 · 1 Aug · Ejendomsselskabet Industrivej' }, { label: 'Amount', value: '18.000 kr' }, { label: 'Booked with', value: 'I25 · Input VAT 25% (4.500 kr)' }, { label: 'History', value: 'Jan–Jul booked without VAT — the lease has no VAT option' }],
        altIsDismiss: true,
        correction: { voucher: 'Voucher #4410 · 1 Aug 2026', effect: 'Q3 VAT payable goes up by 4.500 kr — it’s already in Tech Equipment’s cash forecast.', fields: [
            { label: 'Account', from: '4310 · Rent', to: '4310 · Rent' },
            { label: 'VAT code', from: 'I25 · Input VAT 25%', to: 'None · No VAT', options: ['I25 · Input VAT 25%', 'None · No VAT'] },
            { label: 'Input VAT', from: '4.500 kr', to: '0 kr' },
        ] } },
    { id: 'd-supplier', company: 'Digital Marketing Pro', accountant: 'Tobias Holm Jensen', label: 'Supplier invoice approval', question: 'This supplier charge is 12% above their usual.', recommend: 'It matches the new contract — approve and book it.', confirm: 'Approve', alt: 'Query supplier', ack: 'Approved and booked to Digital Marketing Pro. ✅', ackAlt: 'Flagged for the supplier — I’ll hold it until they confirm.',
        steps: ['Read the invoice and matched it to the supplier', 'Compared the amount with the last 12 invoices', 'Found the new contract in the documents from March'],
        evidence: [{ label: 'Supplier', value: 'AdTech Nordic ApS' }, { label: 'This invoice', value: '36.400 kr' }, { label: 'Usual amount', value: '32.500 kr (12-month average)' }, { label: 'Contract', value: 'New rate from 1 March, signed by the client' }] },
    { id: 'd-bank', company: 'Cloud Hosting Ltd', accountant: 'Anders Holm', label: 'Bank reconciliation', question: '8 of 150 bank lines couldn’t be matched automatically.', recommend: 'Post them to a suspense account and ask the client.', confirm: 'Approve', alt: 'Let me look', ack: 'Approved — parked in suspense and I’ve messaged the client. ✅', ackAlt: 'Opening the eight lines — I’ll wait on your call.',
        steps: ['Imported the bank statement', 'Matched 142 of 150 lines and booked them', 'Left 8 lines I couldn’t match with confidence'],
        evidence: [{ label: 'Bank account', value: 'Danske Bank · 7310' }, { label: 'Unmatched', value: '8 lines · 23.940 kr in total' }, { label: 'Largest', value: '9.800 kr from “STRIPE PAYOUT 0921”' }, { label: 'Likely cause', value: 'Payouts not yet exported from Stripe' }] },
];

export const SEED_VALUES: ValueItem[] = [
    { id: 'v-cash', company: 'Café Solsikke', kind: 'Cash flow', text: 'will run low on cash in about six weeks at the current burn.', sub: 'I drafted a runway conversation with three options to walk through.', action: 'Book a call', ack: 'I’ve put 30 minutes on Thursday and attached the runway note.' },
    { id: 'v-rule', company: 'Nordic Build ApS', extra: '+5 others', kind: 'Compliance', text: 'and five others are affected by the new SKAT reporting rule.', sub: 'I worked out exactly who it hits and drafted what each client needs to hear.', action: 'Review 6 drafts', ack: 'Opening the six drafts — approve each and I’ll send it in your tone.' },
    { id: 'v-risk', company: 'Digital Marketing Pro', kind: 'Risk', text: 'now earns 41% of its revenue from a single client.', sub: 'A concentration risk worth raising before the contract renews next quarter.', action: 'Add to review', ack: 'Added to your next review with the numbers attached.' },
    { id: 'v-growth', company: 'Fjord Fitness', kind: 'Growth', text: 'has grown into a flat-rate VAT scheme that would save it ~14,000 kr/yr.', sub: 'I prepared the switch and a short note to send the client.', action: 'Draft proposal', ack: 'Proposal drafted — it’s in your outbox ready to review.' },
];
