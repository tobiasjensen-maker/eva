// The accounting office as a business — its clients, team, client conversations and
// playbooks. Shared by Clients, Inbox and Practice so the numbers line up everywhere.
// All mock data.

export const ME = 'Tobias Holm Jensen';
export const COST_PER_HOUR = 550; // the firm's internal cost of an accountant hour (kr)
export const TARGET_RATE = 900;   // effective kr / hour the firm aims for per client
export const FIRM_CLIENTS = 212;  // total clients in the office (the tables show a slice)
export const MY_CLIENTS = 40;     // the logged-in accountant's portfolio (TEAM entry for ME)

export type Books = 'closed' | 'todo' | 'blocked'; // same vocabulary as the books-status diagram

export interface Client {
    id: string;
    no: string;          // firm-specific client number
    name: string;
    industry: string;
    accountant: string;
    services: string[];
    fee: number;         // monthly fee (kr)
    hours: number;       // human hours / month still spent on it
    eva: number;         // % of the work EVA does
    books: Books;
    open: number;        // items needing a human
    trend: number;       // revenue change vs last year (%)
    playbook?: string;
    signal?: { kind: 'Cash flow' | 'Risk' | 'Growth' | 'Compliance'; text: string };
}

export const CLIENTS: Client[] = [
    { id: 'nordic', no: 'C-1001', name: 'Nordic Build ApS', industry: 'Construction', accountant: ME, services: ['Bookkeeping', 'VAT', 'Payroll', 'Annual report'], fee: 14500, hours: 9, eva: 88, books: 'closed', open: 2, trend: 12, playbook: 'construction', signal: { kind: 'Compliance', text: 'Affected by the new SKAT reporting rule' } },
    { id: 'cafe', no: 'C-1002', name: 'Café Solsikke', industry: 'Hospitality', accountant: ME, services: ['Bookkeeping', 'VAT', 'Payroll'], fee: 4200, hours: 11, eva: 71, books: 'blocked', open: 4, trend: -8, playbook: 'hospitality', signal: { kind: 'Cash flow', text: 'About six weeks of cash runway left' } },
    { id: 'tech', no: 'C-1003', name: 'Tech Equipment AS', industry: 'Wholesale', accountant: ME, services: ['Bookkeeping', 'VAT', 'Annual report'], fee: 9800, hours: 6, eva: 91, books: 'closed', open: 1, trend: 5 },
    { id: 'office', no: 'C-1004', name: 'Office Supplies Co', industry: 'Retail', accountant: ME, services: ['Bookkeeping', 'VAT', 'Payroll'], fee: 7600, hours: 7, eva: 84, books: 'todo', open: 2, trend: 2, playbook: 'retail' },
    { id: 'dmp', no: 'C-1005', name: 'Digital Marketing Pro', industry: 'Agency', accountant: ME, services: ['Bookkeeping', 'VAT', 'Advisory'], fee: 11200, hours: 5, eva: 93, books: 'closed', open: 1, trend: 18, playbook: 'tech', signal: { kind: 'Risk', text: '41% of revenue comes from one customer' } },
    { id: 'cloud', no: 'C-1006', name: 'Cloud Hosting Ltd', industry: 'Tech & SaaS', accountant: 'Anders Holm', services: ['Bookkeeping', 'VAT', 'Annual report'], fee: 8900, hours: 4, eva: 95, books: 'closed', open: 0, trend: 22, playbook: 'tech' },
    { id: 'bryg', no: 'C-1007', name: 'Bryg & Co ApS', industry: 'Hospitality', accountant: ME, services: ['Bookkeeping', 'VAT'], fee: 5400, hours: 8, eva: 76, books: 'closed', open: 2, trend: 3, playbook: 'hospitality' },
    { id: 'lys', no: 'C-1008', name: 'Lys Design', industry: 'Retail', accountant: 'Sofie Lund', services: ['Bookkeeping', 'VAT'], fee: 3900, hours: 9, eva: 68, books: 'blocked', open: 3, trend: -2, playbook: 'retail', signal: { kind: 'Cash flow', text: 'Customers are paying 18 days slower than last quarter' } },
    { id: 'fjord', no: 'C-1009', name: 'Fjord Fitness', industry: 'Fitness', accountant: ME, services: ['Bookkeeping', 'VAT', 'Payroll'], fee: 6800, hours: 6, eva: 86, books: 'todo', open: 1, trend: 14, signal: { kind: 'Growth', text: 'Grown into a VAT scheme that saves ~14,000 kr/yr' } },
    { id: 'tand', no: 'C-1010', name: 'Aarhus Tandklinik', industry: 'Dental', accountant: 'Camilla Berg', services: ['Bookkeeping', 'VAT', 'Payroll', 'Annual report'], fee: 12400, hours: 10, eva: 82, books: 'closed', open: 1, trend: 6, playbook: 'dental' },
    { id: 'solvang', no: 'C-1011', name: 'Solvang Tømrer ApS', industry: 'Construction', accountant: 'Mette Sørensen', services: ['Bookkeeping', 'VAT', 'Payroll'], fee: 7200, hours: 12, eva: 74, books: 'blocked', open: 3, trend: 9, playbook: 'construction' },
    { id: 'havn', no: 'C-1012', name: 'Havn Rederi', industry: 'Transport', accountant: 'Mette Sørensen', services: ['Bookkeeping', 'VAT', 'Payroll', 'Annual report'], fee: 16800, hours: 14, eva: 79, books: 'closed', open: 2, trend: 4 },
    { id: 'kilde', no: 'C-1013', name: 'Kilde Klinik', industry: 'Health', accountant: 'Mette Sørensen', services: ['Bookkeeping', 'VAT'], fee: 5100, hours: 9, eva: 72, books: 'todo', open: 2, trend: 1, playbook: 'dental' },
    { id: 'bageri', no: 'C-1014', name: 'Nørre Bageri', industry: 'Hospitality', accountant: 'Mette Sørensen', services: ['Bookkeeping', 'VAT', 'Payroll'], fee: 4600, hours: 10, eva: 70, books: 'blocked', open: 4, trend: -4, playbook: 'hospitality', signal: { kind: 'Cash flow', text: 'Flour and energy costs up 31% — margin squeezed' } },
    { id: 'pixel', no: 'C-1015', name: 'Pixel Studio', industry: 'Agency', accountant: 'Jonas Vestergaard', services: ['Bookkeeping', 'VAT'], fee: 4800, hours: 3, eva: 94, books: 'closed', open: 0, trend: 11, playbook: 'tech' },
    { id: 'gron', no: 'C-1016', name: 'Grøn Energi A/S', industry: 'Energy', accountant: ME, services: ['Bookkeeping', 'VAT', 'Payroll', 'Annual report', 'Advisory'], fee: 19500, hours: 11, eva: 87, books: 'closed', open: 1, trend: 25, signal: { kind: 'Growth', text: 'Revenue up 25% — ready for a CFO-level conversation' } },
];

// Where the logged-in accountant's clients' books stand this month (their 40).
export const BOOKS_STATUS: { key: Books; label: string; count: number; color: string }[] = [
    { key: 'closed', label: 'Closed', count: 33, color: '#16a34a' },
    { key: 'todo', label: 'To do', count: 5, color: '#2f6fb0' },
    { key: 'blocked', label: 'Blocked', count: 2, color: '#dc2626' },
];

export const rateOf = (c: Client) => Math.round(c.fee / Math.max(c.hours, 1));
export const marginOf = (c: Client) => c.fee - c.hours * COST_PER_HOUR;

// ---- The team — capacity across the whole office (212 clients) -------------------
export interface Member { name: string; role: string; clients: number; booked: number; capacity: number; eva: number }
export const TEAM: Member[] = [
    { name: ME, role: 'Senior accountant', clients: 40, booked: 118, capacity: 140, eva: 86 },
    { name: 'Mette Sørensen', role: 'Senior accountant', clients: 46, booked: 163, capacity: 140, eva: 74 },
    { name: 'Jonas Vestergaard', role: 'Accountant', clients: 28, booked: 79, capacity: 140, eva: 88 },
    { name: 'Sofie Lund', role: 'Accountant', clients: 34, booked: 131, capacity: 140, eva: 71 },
    { name: 'Anders Holm', role: 'Accountant', clients: 36, booked: 102, capacity: 140, eva: 90 },
    { name: 'Camilla Berg', role: 'Bookkeeper · part-time', clients: 28, booked: 96, capacity: 112, eva: 83 },
];
// EVA's rebalancing suggestion: move three of Mette's clients to Jonas.
export const REBALANCE = { from: 'Mette Sørensen', to: 'Jonas Vestergaard', clients: ['Solvang Tømrer ApS', 'Kilde Klinik', 'Nørre Bageri'], hours: 31 };

// ---- Growth — services the firm could sell, and new clients looking for an AO ------
export interface Opportunity { id: string; title: string; why: string; clients: string[]; monthly: number; action: string }
export const OPPORTUNITIES: Opportunity[] = [
    { id: 'o-advisory', title: 'Quarterly advisory package', why: 'Growing fast (+10% or more) and no advisory service yet.', clients: ['Grøn Energi A/S', 'Cloud Hosting Ltd', 'Fjord Fitness', 'Nordic Build ApS'], monthly: 32000, action: 'Draft 4 proposals' },
    { id: 'o-payroll', title: 'Payroll service', why: 'Have employees on the books but run payroll somewhere else.', clients: ['Tech Equipment AS', 'Bryg & Co ApS', 'Pixel Studio'], monthly: 13500, action: 'Draft 3 proposals' },
    { id: 'o-cash', title: 'Cash-flow coaching', why: 'Under 60 days of runway — they need a plan, not just the books.', clients: ['Café Solsikke', 'Lys Design', 'Nørre Bageri'], monthly: 9000, action: 'Draft 3 proposals' },
];
export const LEADS = [
    { id: 'l1', name: 'Vestkyst Byg ApS', industry: 'Construction', where: 'Esbjerg', size: '14 employees', why: 'Looking for an accountant who knows construction — matches your Construction playbook.' },
    { id: 'l2', name: 'Kaffe & Kage I/S', industry: 'Hospitality', where: 'Aarhus C', size: '6 employees', why: 'Just outgrew doing the books themselves.' },
    { id: 'l3', name: 'Nordlys Tandpleje', industry: 'Dental', where: 'Aalborg', size: '9 employees', why: 'Switching accountant after a merger.' },
];

// ---- Client conversations — the inbox -------------------------------------------
export type ThreadStatus = 'needs' | 'waiting' | 'done';
export interface Msg { from: 'firm' | 'client' | 'eva'; who: string; at: string; text: string }
export interface Thread {
    id: string;
    client: string;
    contact: string;
    subject: string;
    status: ThreadStatus;
    at: string;
    txn?: { label: string; amount: string; account: string; date: string };
    messages: Msg[];
    suggestion?: { action: string; reply: string; result: string }; // EVA's proposed next step
}
export const THREADS: Thread[] = [
    {
        id: 't1', client: 'Bryg & Co ApS', contact: 'Mads Bryg', subject: 'Question about a restaurant bill', status: 'needs', at: '09:14',
        txn: { label: 'Restaurant Kødbyen', amount: '2.860 kr', account: 'Danske Bank · 4471', date: '11 Sep' },
        messages: [
            { from: 'eva', who: 'EVA for Tobias', at: 'Yesterday 16:02', text: 'Hi Mads — what was the purpose of the dinner at Restaurant Kødbyen on 11 Sep (2.860 kr)? I need it to book the VAT correctly.' },
            { from: 'client', who: 'Mads Bryg', at: '09:14', text: 'That was dinner with our new distributor from Hamburg.' },
        ],
        suggestion: { action: 'Book it as business entertainment (25% VAT deductible) and reply', reply: 'Thanks Mads — booked as business entertainment. Nothing else needed from you.', result: 'Booked as business entertainment · VAT 25% deductible' },
    },
    {
        id: 't2', client: 'Digital Marketing Pro', contact: 'Louise Holm', subject: 'Year-end documents', status: 'needs', at: '08:31',
        messages: [
            { from: 'firm', who: 'Tobias Holm Jensen', at: 'Mon 10:20', text: 'Hi Louise — could you upload the year-end documents when you have a moment?' },
            { from: 'client', who: 'Louise Holm', at: '08:31', text: 'Uploaded 6 files — the lease, the loan statement and 4 contracts.' },
            { from: 'eva', who: 'EVA', at: '08:33', text: 'I read the 6 files. The loan statement matches the books. One contract (the new office lease) should be recognised as a lease liability — I drafted the entry.' },
        ],
        suggestion: { action: 'Approve EVA’s lease entry and thank Louise', reply: 'Thanks Louise — all six received and booked. You’re all set for year-end.', result: 'Lease liability booked · year-end file complete' },
    },
    {
        id: 't3', client: 'Café Solsikke', contact: 'Ida Solsikke', subject: 'Your cash position for the next weeks', status: 'needs', at: 'Yesterday',
        messages: [
            { from: 'eva', who: 'EVA · draft for Tobias', at: 'Yesterday 07:10', text: 'Draft: Hi Ida — looking at your bank and upcoming bills, you have about six weeks of cash at the current pace. I’d like to walk you through three options. Do you have 30 minutes on Thursday?' },
        ],
        suggestion: { action: 'Send EVA’s draft and book Thursday 14:00', reply: 'Hi Ida — looking at your bank and upcoming bills, you have about six weeks of cash at the current pace. I’d like to walk you through three options. Does Thursday 14:00 work?', result: 'Sent · Thursday 14:00 held in your calendar' },
    },
    {
        id: 't4', client: 'Nordic Build ApS', contact: 'Henrik Nord', subject: 'Missing receipt — Bauhaus 14.900 kr', status: 'waiting', at: 'Mon',
        txn: { label: 'Bauhaus Aarhus', amount: '14.900 kr', account: 'Jyske Bank · 0932', date: '2 Sep' },
        messages: [
            { from: 'eva', who: 'EVA for Tobias', at: 'Thu 09:00', text: 'Hi Henrik — could you snap a photo of the Bauhaus receipt from 2 Sep (14.900 kr)?' },
            { from: 'eva', who: 'EVA · automatic follow-up', at: 'Mon 09:00', text: 'A friendly nudge on the Bauhaus receipt — just reply with a photo and I’ll take it from there.' },
        ],
    },
    {
        id: 't5', client: 'Fjord Fitness', contact: 'Sara Fjord', subject: 'Switching VAT scheme', status: 'waiting', at: 'Tue',
        messages: [
            { from: 'firm', who: 'Tobias Holm Jensen', at: 'Tue 11:45', text: 'Hi Sara — you now qualify for a VAT scheme that would save you about 14.000 kr a year. Shall I set it up from next quarter?' },
        ],
    },
    {
        id: 't6', client: 'Tech Equipment AS', contact: 'Peter Lund', subject: 'Laptop purchase — asset or expense?', status: 'done', at: 'Last week',
        txn: { label: 'Proshop', amount: '18.450 kr', account: 'Nordea · 2218', date: '4 Sep' },
        messages: [
            { from: 'eva', who: 'EVA for Tobias', at: '5 Sep', text: 'Hi Peter — are the 3 laptops from Proshop for staff use (18.450 kr)?' },
            { from: 'client', who: 'Peter Lund', at: '5 Sep', text: 'Yes, for our new sales team.' },
            { from: 'eva', who: 'EVA', at: '5 Sep', text: 'Thanks — capitalised as fixed assets and set to depreciate over 3 years.' },
        ],
    },
];

// ---- Playbooks — how the firm sets up a client, by industry -----------------------
export interface PlaybookPart { name: string; desc: string; on: boolean }
export interface Playbook {
    id: string;
    name: string;
    desc: string;
    author: 'firm' | 'e-conomic';
    clients: number;
    updated: string;
    draft?: boolean;
    parts: { group: string; items: PlaybookPart[] }[];
}
const part = (name: string, desc: string, on = true): PlaybookPart => ({ name, desc, on });
export const PLAYBOOKS: Playbook[] = [
    { id: 'construction', name: 'Construction & trades', desc: 'Contractors and subcontractors — project costs, reverse-charge VAT, on-account invoicing.', author: 'firm', clients: 14, updated: '3 weeks ago', parts: [
        { group: 'Client setup', items: [part('Chart of accounts', 'Construction chart with project and WIP accounts'), part('VAT setup', 'Reverse charge on construction services'), part('Accounting policies', 'Project accounting, percentage-of-completion')] },
        { group: 'Routines EVA runs', items: [part('Bank reconciliation', 'Runs on its own every night'), part('Receipt collection', 'EVA asks the client after 3 days, follows up weekly'), part('Month-end close', 'Checklist, accruals and sign-off')] },
        { group: 'Connectors', items: [part('Minuba', 'Pull job costs and hours from the field'), part('Bank feeds', 'Live transactions')] },
        { group: 'Guardrails', items: [part('Ask before booking over 15.000 kr', 'EVA drafts, you approve anything larger'), part('Hold VAT filing for sign-off', 'You stand behind every return', true)] },
    ] },
    { id: 'hospitality', name: 'Hospitality', desc: 'Cafés, restaurants and bakeries — till integrations, tips, perishable stock.', author: 'firm', clients: 22, updated: '1 month ago', parts: [
        { group: 'Client setup', items: [part('Chart of accounts', 'Hospitality chart with food & beverage split'), part('VAT setup', 'Standard 25% with representation rules'), part('Accounting policies', 'Daily till settlement')] },
        { group: 'Routines EVA runs', items: [part('Till settlement', 'Books daily sales from the POS'), part('Receipt collection', 'EVA asks the client after 2 days'), part('Cash-flow watch', 'Flags when runway drops below 60 days')] },
        { group: 'Connectors', items: [part('Shopify', 'Till and online sales'), part('Zenegy', 'Payroll and tips')] },
        { group: 'Guardrails', items: [part('Ask before booking over 10.000 kr', 'EVA drafts, you approve anything larger')] },
    ] },
    { id: 'dental', name: 'Dental & health', desc: 'Clinics and practices — VAT-exempt services, equipment leasing.', author: 'e-conomic', clients: 9, updated: '2 months ago', parts: [
        { group: 'Client setup', items: [part('Chart of accounts', 'Health-sector chart'), part('VAT setup', 'Mixed exempt / taxable services')] },
        { group: 'Routines EVA runs', items: [part('Bank reconciliation', 'Runs on its own every night'), part('Payroll', 'Monthly run, posted to the ledger')] },
        { group: 'Guardrails', items: [part('Hold VAT filing for sign-off', 'You stand behind every return')] },
    ] },
    { id: 'tech', name: 'Tech & SaaS', desc: 'Agencies and software companies — subscriptions, deferred revenue, card payments.', author: 'firm', clients: 17, updated: '2 months ago', parts: [
        { group: 'Client setup', items: [part('Chart of accounts', 'SaaS chart with deferred revenue'), part('Accounting policies', 'Revenue recognised over the subscription')] },
        { group: 'Routines EVA runs', items: [part('Subscription revenue', 'Recognises recurring revenue monthly'), part('Bank reconciliation', 'Runs on its own every night')] },
        { group: 'Connectors', items: [part('Stripe', 'Card and subscription payments'), part('HubSpot', 'New customers from won deals')] },
    ] },
    { id: 'retail', name: 'Retail & e-commerce', desc: 'Shops and web stores — stock, payouts and returns.', author: 'e-conomic', clients: 12, updated: '3 months ago', parts: [
        { group: 'Client setup', items: [part('Chart of accounts', 'Retail chart with stock accounts'), part('VAT setup', 'Standard 25%, EU distance sales')] },
        { group: 'Routines EVA runs', items: [part('Payout reconciliation', 'Matches Shopify payouts and fees'), part('Stock valuation', 'Month-end stock count')] },
        { group: 'Connectors', items: [part('Shopify', 'Till and online sales')] },
    ] },
    { id: 'nonprofit', name: 'Non-profit', desc: 'Associations and foundations — grants and restricted funds.', author: 'firm', clients: 0, updated: '4 days ago', draft: true, parts: [
        { group: 'Client setup', items: [part('Chart of accounts', 'Association chart with restricted funds'), part('Accounting policies', 'Grant accounting', false)] },
    ] },
];

// ---- What to say — talking points and peer benchmarks for a client conversation ----
export function talkingPoints(c: Client): string[] {
    switch (c.id) {
        case 'cafe': return ['Cash covers about six weeks at the current burn — peers in hospitality hold ~9 weeks.', 'Food costs are 38% of revenue vs. 31% for similar cafés — supplier terms are the fastest lever.', 'Suggest: renegotiate the two largest suppliers and set up a small overdraft as a buffer.'];
        case 'dmp': return ['Revenue up 18% — strong, but 41% now comes from a single customer.', 'Peers in agencies keep their largest customer under 25%.', 'Suggest: talk about pipeline diversification before that contract renews next quarter.'];
        case 'gron': return ['Revenue up 25% year on year and margins holding — the business is scaling.', 'They are close to the size where a quarterly CFO review pays for itself.', 'Suggest: offer the quarterly advisory package and a 12-month forecast.'];
        case 'nordic': return ['Revenue up 12%; project margins steady at 19% (peers: 16%).', 'The new SKAT reporting rule affects them from next quarter — EVA has drafted what to tell them.', 'Suggest: a short call to walk through the rule and confirm project cost coding.'];
        case 'fjord': return ['Revenue up 14% — they now qualify for a VAT scheme that saves ~14.000 kr a year.', 'Membership revenue is steady; churn is below the fitness-sector median.', 'Suggest: switch the VAT scheme from next quarter.'];
        case 'bageri': return ['Flour and energy costs up 31% — gross margin down from 64% to 57%.', 'Peers raised prices ~6% this year; they haven’t yet.', 'Suggest: a pricing conversation, backed by the peer numbers.'];
        default: return [`Revenue ${c.trend >= 0 ? 'up' : 'down'} ${Math.abs(c.trend)}% vs. last year.`, `EVA handles ${c.eva}% of the bookkeeping; ${c.open} item${c.open === 1 ? '' : 's'} still need a human.`, 'No urgent topics — a good moment for a check-in on their plans for next year.'];
    }
}
export function benchmarks(c: Client): { label: string; you: number; peers: number; unit: string; better: 'higher' | 'lower' }[] {
    const seed = c.no.charCodeAt(c.no.length - 1);
    const margin = c.id === 'cafe' ? 22 : c.id === 'bageri' ? 18 : 20 + (seed % 14);
    const dso = c.id === 'lys' ? 46 : 18 + (seed % 20);
    return [
        { label: 'Revenue growth', you: c.trend, peers: 6, unit: '%', better: 'higher' },
        { label: 'Gross margin', you: margin, peers: 26, unit: '%', better: 'higher' },
        { label: 'Days to get paid', you: dso, peers: 28, unit: ' days', better: 'lower' },
    ];
}
// "Show work" — how EVA concluded the client needs attention.
export function whyOf(c: Client): string[] {
    const s = c.signal;
    if (!s) return [];
    if (s.kind === 'Cash flow') return ['Read the bank balance and the next 60 days of bills and payroll', 'Projected cash at the current burn rate', `Compared with ${c.industry.toLowerCase()} peers on e-conomic`];
    if (s.kind === 'Risk') return ['Grouped revenue by customer over the last 12 months', 'Found one customer at 41% of the total', 'Compared with agencies of a similar size'];
    if (s.kind === 'Growth') return ['Compared revenue with the same period last year', 'Checked the thresholds for services and VAT schemes', 'Estimated the value of acting now'];
    return ['Matched the new rule against every client’s activity', 'Found the transactions it applies to', 'Drafted a plain-language note for the client'];
}

// ---- The logged-in accountant's whole book (their 40) — for the paginated client list ----
// The 8 detailed clients above plus 32 lighter ones, with books statuses that add up to the
// Portfolio overview's donut (33 closed · 5 to do · 2 blocked).
const EXTRA: [string, string][] = [
    ['Aalborg Auto ApS', 'Automotive'], ['Bakkehuset Café', 'Hospitality'], ['Blå Bølge Sejl', 'Leisure'], ['Dahl Elektrik', 'Construction'],
    ['Egholm Tømrer', 'Construction'], ['Fisker & Co', 'Wholesale'], ['Frederiksen VVS', 'Construction'], ['Gade Blomster', 'Retail'],
    ['Hansen Transport', 'Transport'], ['Holm Møbler', 'Retail'], ['Iversen IT', 'Tech & SaaS'], ['Jensen Bageri', 'Hospitality'],
    ['Kjær Arkitekter', 'Agency'], ['Lind Frisør', 'Health'], ['Lund Logistik', 'Transport'], ['Madsen Maskiner', 'Wholesale'],
    ['Mølle Kaffe', 'Hospitality'], ['Nielsen Malerfirma', 'Construction'], ['Nord Fisk', 'Wholesale'], ['Olsen Optik', 'Retail'],
    ['Pedersen Gartneri', 'Retail'], ['Poulsen Tandpleje', 'Dental'], ['Rask Rengøring', 'Services'], ['Rosen Mode', 'Retail'],
    ['Skov Energi', 'Energy'], ['Strand Hotel', 'Hospitality'], ['Sund Fysioterapi', 'Health'], ['Thomsen Byg', 'Construction'],
    ['Vang Vin', 'Wholesale'], ['Vest Marketing', 'Agency'], ['Østerby Dyreklinik', 'Health'], ['Bech Rejser', 'Travel'],
];
// 28 closed, 3 to do, 1 blocked among the extras (the detailed 8 add 5 · 2 · 1).
const EXTRA_BOOKS: Books[] = EXTRA.map((_, i) => (i === 17 ? 'blocked' : i === 5 || i === 13 || i === 24 ? 'todo' : 'closed'));
export const MY_PORTFOLIO: Client[] = [
    ...CLIENTS.filter((c) => c.accountant === ME),
    ...EXTRA.map(([name, industry], i): Client => ({
        id: `x${i}`, no: `C-${1101 + i}`, name, industry, accountant: ME,
        services: ['Bookkeeping', 'VAT', ...(i % 3 === 0 ? ['Payroll'] : []), ...(i % 5 === 0 ? ['Annual report'] : [])],
        fee: 3200 + ((i * 1370) % 11000), hours: 3 + (i % 7), eva: 72 + ((i * 7) % 24),
        books: EXTRA_BOOKS[i], open: EXTRA_BOOKS[i] === 'closed' ? i % 3 === 0 ? 1 : 0 : 2, trend: ((i * 5) % 19) - 3,
    })),
];
