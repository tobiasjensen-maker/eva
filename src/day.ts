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
    label: string;      // task type — also the trace key
    question: string;   // what EVA is unsure about
    recommend: string;  // EVA's recommendation
    confirm: string;    // primary action label
    alt: string;        // the alternative
    ack: string;        // EVA's reply after you confirm
    ackAlt: string;     // EVA's reply after you take the alternative
    done?: boolean;
    taken?: 'confirm' | 'alt';
};

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
    { id: 'd-vat', company: 'Nordic Build ApS', label: 'VAT return — Q1', question: 'A reverse-charge VAT line on an EU purchase looks unusual.', recommend: 'Book it as an EU acquisition and file to SKAT.', confirm: 'Confirm & file', alt: 'It’s domestic', ack: 'Done — Nordic Build’s Q1 VAT return is filed to SKAT. ✅', ackAlt: 'Got it — I’ll rebook it as domestic and hold the return for you.' },
    { id: 'd-supplier', company: 'Digital Marketing Pro', label: 'Supplier invoice approval', question: 'This supplier charge is 12% above their usual.', recommend: 'It matches the new contract — approve and book it.', confirm: 'Approve', alt: 'Query supplier', ack: 'Approved and booked to Digital Marketing Pro. ✅', ackAlt: 'Flagged for the supplier — I’ll hold it until they confirm.' },
];

export const SEED_VALUES: ValueItem[] = [
    { id: 'v-cash', company: 'Café Solsikke', kind: 'Cash flow', text: 'will run low on cash in about six weeks at the current burn.', sub: 'I drafted a runway conversation with three options to walk through.', action: 'Book a call', ack: 'I’ve put 30 minutes on Thursday and attached the runway note.' },
    { id: 'v-rule', company: 'Nordic Build ApS', extra: '+5 others', kind: 'Compliance', text: 'and five others are affected by the new SKAT reporting rule.', sub: 'I worked out exactly who it hits and drafted what each client needs to hear.', action: 'Review 6 drafts', ack: 'Opening the six drafts — approve each and I’ll send it in your tone.' },
    { id: 'v-risk', company: 'Digital Marketing Pro', kind: 'Risk', text: 'now earns 41% of its revenue from a single client.', sub: 'A concentration risk worth raising before the contract renews next quarter.', action: 'Add to review', ack: 'Added to your next review with the numbers attached.' },
    { id: 'v-growth', company: 'Fjord Fitness', kind: 'Growth', text: 'has grown into a flat-rate VAT scheme that would save it ~14,000 kr/yr.', sub: 'I prepared the switch and a short note to send the client.', action: 'Draft proposal', ack: 'Proposal drafted — it’s in your outbox ready to review.' },
];
