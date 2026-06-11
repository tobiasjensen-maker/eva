import { useRef, useState, useEffect, useMemo } from 'react';
import { Button, Icon } from '@economic/taco';
import { Orb, MicIcon, EmojiTile, ScopeSwitcher, EvaChip, COLORS } from '../ui';
import { ArtifactPreview } from '../SpaceArtifact';
import { CHAT_SUGGESTIONS, AGREEMENTS } from '../data';
import { useLang } from '../i18n';
import type { Skill, Space, ViewId } from '../types';

type PlanStep = { label: string; status: 'todo' | 'running' | 'done' };

type AssistantMsg =
    | { id: number; role: 'assistant'; kind: 'text'; text: string }
    | { id: number; role: 'assistant'; kind: 'data'; dataKey: string }
    | { id: number; role: 'assistant'; kind: 'clienttable'; dataKey: string }
    | {
          id: number;
          role: 'assistant';
          kind: 'plan';
          intro: string;
          steps: PlanStep[];
          phase: 'awaiting' | 'running' | 'done';
          result?: string;
          createsSpace?: string;
          outcome?: { title: string; sub: string };
      }
    | { id: number; role: 'assistant'; kind: 'skill'; skillId: string; text: string }
    | { id: number; role: 'assistant'; kind: 'spacecall'; spaceId: string; note: string }
    | { id: number; role: 'assistant'; kind: 'upsell'; text: string }
    | { id: number; role: 'assistant'; kind: 'getstarted' }
    | { id: number; role: 'assistant'; kind: 'thinking'; statuses: string[] };

type ChatMsg = { id: number; role: 'user'; text: string } | AssistantMsg;

let idc = 1;
const nextId = () => idc++;

interface Props {
    skills: Skill[];
    spaces: Space[];
    onEnableSkill: (id: string) => void;
    onNavigate: (v: ViewId) => void;
    onCreateSpace: (title: string) => void;
    onCreateSkill: (title: string, description: string) => void;
    seedWelcome?: boolean;
    onWelcomeConsumed?: () => void;
    scope?: string;
    scopeName?: string;
    onActiveChange?: (active: boolean) => void;
    analyticsUnlocked?: boolean;
    onSelectClient?: (id: string) => void;
}

const MONTHS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
];

// ---- portfolio (cross-client) mode ----
const PORTFOLIO_SUGGESTIONS = [
    'Which clients have overdue invoices?',
    'Which client had the highest revenue last month?',
    'Show me clients with missing documents',
    "Which clients haven't been reconciled this month?",
    'Flag any client with a cash runway under 2 months',
];

interface ClientRow {
    id: string;
    cells: string[]; // values after the Client column
    negative?: number[]; // indices of cells to show in red
}
interface ClientTableData {
    summary: string;
    head: string[]; // includes 'Client' as the first column
    rows: ClientRow[];
}

const CLIENT_TABLES: Record<string, ClientTableData> = {
    overdue: {
        summary: '5 of your 8 clients have overdue invoices, totalling 214.500 DKK.',
        head: ['Client', 'Overdue', 'Oldest', 'Invoices'],
        rows: [
            { id: 'nordic', cells: ['84.200 kr', '38 days', '3'], negative: [0] },
            { id: 'tech', cells: ['52.650 kr', '33 days', '2'], negative: [0] },
            { id: 'dmp', cells: ['38.500 kr', '42 days', '2'], negative: [0] },
            { id: 'office', cells: ['24.900 kr', '21 days', '1'], negative: [0] },
            { id: 'cafe', cells: ['14.250 kr', '36 days', '1'], negative: [0] },
        ],
    },
    revenue: {
        summary: 'Across your 8 clients, Nordic Build ApS had the highest revenue last month at 1,90 mio. kr.',
        head: ['Client', 'Revenue', 'vs prev', 'Margin'],
        rows: [
            { id: 'nordic', cells: ['1,90 mio. kr', '+12%', '31%'] },
            { id: 'tech', cells: ['880.000 kr', '+8%', '18%'] },
            { id: 'cloud', cells: ['760.000 kr', '+34%', '78%'] },
            { id: 'bryg', cells: ['520.000 kr', '+15%', '42%'] },
            { id: 'dmp', cells: ['310.000 kr', '+22%', '62%'] },
            { id: 'office', cells: ['290.000 kr', '+5%', '34%'] },
            { id: 'lys', cells: ['270.000 kr', '+18%', '58%'] },
            { id: 'cafe', cells: ['155.000 kr', '+6%', '22%'] },
        ],
    },
    docs: {
        summary: '3 of your 8 clients have entries missing documentation — 14 receipts in total.',
        head: ['Client', 'Missing', 'Oldest', 'Value'],
        rows: [
            { id: 'cafe', cells: ['6 receipts', '28 days', '8.400 kr'] },
            { id: 'tech', cells: ['5 receipts', '19 days', '31.200 kr'] },
            { id: 'office', cells: ['3 receipts', '12 days', '6.900 kr'] },
        ],
    },
    reconcile: {
        summary: "4 of your 8 clients haven't been reconciled this month.",
        head: ['Client', 'Unreconciled', 'Last reconciled', 'Amount'],
        rows: [
            { id: 'nordic', cells: ['14 transactions', '18 days ago', '142.000 kr'] },
            { id: 'cafe', cells: ['9 transactions', '22 days ago', '18.430 kr'] },
            { id: 'office', cells: ['6 transactions', '15 days ago', '24.100 kr'] },
            { id: 'lys', cells: ['4 transactions', '11 days ago', '9.800 kr'] },
        ],
    },
    runway: {
        summary: '2 of your 8 clients have a cash runway under 2 months — worth flagging.',
        head: ['Client', 'Runway', 'Cash', 'Monthly burn'],
        rows: [
            { id: 'cafe', cells: ['1,4 mo.', '85.000 kr', '61.000 kr'], negative: [0] },
            { id: 'tech', cells: ['1,8 mo.', '480.000 kr', '267.000 kr'], negative: [0] },
        ],
    },
};

const PORTFOLIO_REMINDER_PLAN = {
    intro: "Here's my plan to send reminders across every client with overdue invoices. Review it before I start — nothing goes out until you approve.",
    steps: [
        'Process 5 clients · 9 invoices · draft reminder emails per client',
        'Pick the right template and currency for each client',
        'Send and log a note on each invoice',
        'Schedule a 7-day follow-up for anything still unpaid',
    ],
    result: 'Sent 9 reminders across 5 clients (214.500 DKK overdue). I logged a note on each invoice and will follow up automatically in 7 days.',
    outcome: { title: '9 reminders sent across 5 clients', sub: '214.500 DKK overdue · logged to each invoice' },
};

// ---- domain catalogue: areas the assistant can help with ----
interface Domain {
    key: string;
    label: string;
    keywords: string[];
    intro: string;
    head: string[];
    rows: string[][];
    outro?: string;
}

const DOMAINS: Domain[] = [
    {
        key: 'years',
        label: 'Accounting Years',
        keywords: ['accounting year', 'regnskabsår', 'fiscal year', 'financial year'],
        intro: 'Here are your accounting years:',
        head: ['Year', 'Period', 'Status'],
        rows: [['2025', '01 Jan – 31 Dec', 'Open'], ['2024', '01 Jan – 31 Dec', 'Closed'], ['2023', '01 Jan – 31 Dec', 'Closed']],
        outro: 'I can close 2024 or open a new year — just ask.',
    },
    {
        key: 'accounts',
        label: 'Accounts',
        keywords: ['chart of accounts', 'kontoplan', 'account ', 'accounts', 'ledger account'],
        intro: 'A snapshot of your chart of accounts:',
        head: ['Account', 'Name', 'Balance (DKK)'],
        rows: [['1000', 'Sales', '2.480.000'], ['1310', 'Trade debtors', '312.000'], ['5000', 'Cost of goods sold', '-1.120.000'], ['8050', 'Financial income', '12.400']],
    },
    {
        key: 'entries',
        label: 'Booked Entries',
        keywords: ['booked entries', 'booked entry', 'posteringer', 'ledger entries'],
        intro: 'Your most recent booked entries:',
        head: ['Date', 'Text', 'Account', 'Amount (DKK)'],
        rows: [['28 Jan', 'MobilePay settlement', '1000', '18.430,00'], ['27 Jan', 'Office rent', '3410', '-12.000,00'], ['26 Jan', 'Supplier payment', '5000', '-7.400,00']],
    },
    {
        key: 'budgets',
        label: 'Budgets',
        keywords: ['budget'],
        intro: 'Budget vs. actual for this quarter:',
        head: ['Account', 'Budget', 'Actual', 'Variance'],
        rows: [['Revenue', '2.400.000', '2.480.000', '+80.000'], ['COGS', '-1.100.000', '-1.120.000', '-20.000'], ['Opex', '-900.000', '-890.000', '+10.000']],
    },
    {
        key: 'customers',
        label: 'Customers',
        keywords: ['customer', 'kunde', 'debtor'],
        intro: 'Your customers and their balances:',
        head: ['Customer', 'Open (DKK)', 'Overdue', 'Status'],
        rows: [['Digital Marketing Pro', '30.900', '12.500', 'At risk'], ['Nordic Build ApS', '52.200', '34.200', 'Overdue'], ['Café Solsikke', '9.200', '—', 'OK']],
        outro: 'Want me to send reminders to the overdue ones?',
    },
    {
        key: 'dimensions',
        label: 'Dimensions',
        keywords: ['dimension'],
        intro: 'Your dimensions for analytical reporting:',
        head: ['Dimension', 'Type', 'Values'],
        rows: [['Department', 'Standard', '5'], ['Cost center', 'Standard', '12'], ['Region', 'Custom', '4']],
    },
    {
        key: 'documents',
        label: 'Documents',
        keywords: ['document', 'bilag', 'receipt'],
        intro: 'Recent documents in your inbox:',
        head: ['Document', 'Type', 'Status', 'Date'],
        rows: [['Faktura_DMK-001.pdf', 'Invoice', 'Booked', '15 Jan'], ['Kvittering_taxa.jpg', 'Receipt', 'Needs review', '24 Jan'], ['Lejekontrakt.pdf', 'Contract', 'Filed', '02 Jan']],
    },
    {
        key: 'journals',
        label: 'Journals',
        keywords: ['journal', 'kassekladde', 'daybook'],
        intro: 'Your journals:',
        head: ['Journal', 'Entries', 'Status'],
        rows: [['Daily journal', '24', 'Open'], ['Salary journal', '3', 'Open'], ['Bank journal', '41', 'Posted']],
    },
    {
        key: 'products',
        label: 'Products',
        keywords: ['product', 'vare', 'inventory', 'stock item'],
        intro: 'Your products:',
        head: ['Product', 'Price (DKK)', 'In stock'],
        rows: [['Consulting hour', '1.200', '—'], ['Software licence', '6.000', '∞'], ['Hardware kit', '3.400', '37']],
    },
    {
        key: 'projects',
        label: 'Projects',
        keywords: ['project', 'projekt'],
        intro: 'Your active projects:',
        head: ['Project', 'Customer', 'Budget', 'Spent'],
        rows: [['Website redesign', 'Nordic Build', '120.000', '84.000'], ['Q1 campaign', 'Digital Marketing Pro', '60.000', '61.500'], ['ERP rollout', 'Café Solsikke', '200.000', '45.000']],
    },
    {
        key: 'q2c',
        label: 'Quote to Cash',
        keywords: ['quote to cash', 'quote-to-cash', 'q2c', 'quote', 'sales pipeline', 'order to cash'],
        intro: 'Your quote-to-cash pipeline:',
        head: ['Stage', 'Count', 'Value (DKK)'],
        rows: [['Quotes', '14', '842.000'], ['Orders', '9', '510.000'], ['Invoiced', '22', '1.240.000'], ['Paid', '18', '1.010.000']],
    },
    {
        key: 'subscriptions',
        label: 'Subscriptions',
        keywords: ['subscription', 'abonnement', 'recurring revenue', 'mrr'],
        intro: 'Your active subscriptions:',
        head: ['Customer', 'Plan', 'MRR (DKK)', 'Renews'],
        rows: [['Nordic Build ApS', 'Retainer', '18.000', '01 Mar'], ['Digital Marketing Pro', 'Standard', '4.500', '15 Feb'], ['Café Solsikke', 'Basic', '1.200', '20 Feb']],
    },
    {
        key: 'suppliers',
        label: 'Suppliers',
        keywords: ['supplier', 'leverandør', 'vendor', 'creditor'],
        intro: 'Your suppliers:',
        head: ['Supplier', 'Open bills (DKK)', 'Due', 'Status'],
        rows: [['Tech Equipment AS', '25.600', '22 Jan', 'Partial'], ['Office Supplies Co', '14.900', '05 Feb', 'Flagged'], ['Cloud Hosting Ltd', '3.400', '10 Feb', 'OK']],
    },
    {
        key: 'webhooks',
        label: 'Webhooks',
        keywords: ['webhook', 'integration event', 'api event'],
        intro: 'Your configured webhooks:',
        head: ['Event', 'Endpoint', 'Status', 'Last fired'],
        rows: [['invoice.created', '/hooks/invoices', 'Active', '2 min ago'], ['payment.received', '/hooks/payments', 'Active', '1 h ago'], ['customer.updated', '/hooks/crm', 'Paused', '3 d ago']],
        outro: 'I can add a new webhook or test an endpoint.',
    },
];

function findDomain(t: string): Domain | undefined {
    return DOMAINS.find((d) => d.keywords.some((k) => t.includes(k)));
}

// ---- data answers ----
function getData(dataKey: string): { intro: string; head: string[]; rows: string[][]; emphasizeLast?: boolean; outro?: string } {
    const dom = DOMAINS.find((d) => d.key === dataKey);
    if (dom) return { intro: dom.intro, head: dom.head, rows: dom.rows, outro: dom.outro };
    if (dataKey === 'overdue') {
        return {
            intro: '4 invoices are overdue by more than 30 days, totalling 74.200,00 DKK:',
            head: ['Customer', 'Invoice', 'Overdue', 'Amount (DKK)'],
            rows: [
                ['Digital Marketing Pro', '#DMK-014', '42 days', '12.500,00'],
                ['Nordic Build ApS', '#NB-228', '38 days', '34.200,00'],
                ['Café Solsikke', '#CS-090', '36 days', '4.850,00'],
                ['Tech Equipment AS', '#TE-188', '33 days', '22.650,00'],
            ],
            outro: 'Want me to send reminders? Just ask “send reminders to overdue customers”.',
        };
    }
    if (dataKey === 'unreconciled') {
        return {
            intro: 'You have 9 unreconciled transactions from last month. Here are the largest:',
            head: ['Date', 'Description', 'Amount (DKK)'],
            rows: [
                ['28 Jan', 'Overførsel — Digital Marketing Pro', '6.750,00'],
                ['27 Jan', 'MobilePay indbetaling', '1.299,00'],
                ['24 Jan', 'Tech Equipment AS', '-25.600,00'],
                ['22 Jan', 'Currency exchange adjustment', '-850,00'],
            ],
        };
    }
    if (dataKey === 'cashflow') {
        return {
            intro: 'Operating cash flow analysis — last 6 months (DKK, thousands):',
            head: ['Month', 'Inflow', 'Outflow', 'Net'],
            rows: [
                ['Feb', '720', '-640', '+80'],
                ['Mar', '810', '-700', '+110'],
                ['Apr', '760', '-690', '+70'],
                ['May', '940', '-820', '+120'],
                ['Jun', '880', '-698', '+182'],
            ],
            outro: 'Net operating cash flow is up to +182k this month. The biggest swing is payroll timing — at the current burn you have ~4.2 months of runway.',
        };
    }
    if (dataKey === 'margins') {
        return {
            intro: 'Profitability & margin trend:',
            head: ['Month', 'Gross margin', 'Net margin'],
            rows: [
                ['Apr', '51,0%', '16,8%'],
                ['May', '53,1%', '18,1%'],
                ['Jun', '54,8%', '18,9%'],
            ],
            outro: 'Gross margin rose +1,2 pp, driven by a better mix of consulting vs. hardware.',
        };
    }
    if (dataKey === 'forecast') {
        return {
            intro: 'Cash flow forecast — next quarter (DKK, thousands):',
            head: ['Month', 'Projected net', 'End cash'],
            rows: [
                ['Jul', '+150', '1.390'],
                ['Aug', '+170', '1.560'],
                ['Sep', '-100', '1.460'],
            ],
            emphasizeLast: true,
            outro: 'Projected cash at ~1,46 mio. kr by end of Q3 (±6%). Clearing the 74.200 kr overdue would add ~2 weeks of runway.',
        };
    }
    if (dataKey === 'anomalies') {
        return {
            intro: 'Anomalies & risks I flagged this period:',
            head: ['Signal', 'Detail', 'Severity'],
            rows: [
                ['Supplier charge spike', 'Office Supplies Co · 3× average', 'High'],
                ['Receivables aging', 'Slower vs. Q3', 'Medium'],
                ['VAT deadline', 'Due in 6 days', 'Medium'],
            ],
            outro: 'Want me to open any of these in Review?',
        };
    }
    if (dataKey === 'benchmark') {
        return {
            intro: 'Peer benchmarking vs. similar businesses in your portfolio:',
            head: ['Metric', 'This client', 'Peers'],
            rows: [
                ['Gross margin', '54,8%', '49%'],
                ['Days to pay (DSO)', '38 days', '31 days'],
                ['Revenue growth', '+14%', '+6%'],
            ],
            outro: 'Collection speed is the main gap — receivables run a week slower than peers.',
        };
    }
    if (dataKey === 'analysis') {
        return {
            intro: 'Financial health summary:',
            head: ['Area', 'Reading', 'Trend'],
            rows: [
                ['Revenue', '880k / mo', '+14%'],
                ['Gross margin', '54,8%', '+1,2 pp'],
                ['Cash & runway', '1,24M · 4,2 mo', 'Stable'],
                ['Receivables', '74,2k overdue', 'Watch'],
            ],
            outro: 'Overall healthy: growing revenue and improving margin. The one thing to watch is overdue collection.',
        };
    }
    return {
        intro: 'Profit & loss summary for Q4 2024:',
        head: ['', 'DKK'],
        rows: [
            ['Revenue', '2.480.000'],
            ['Cost of goods sold', '-1.120.000'],
            ['Gross profit', '1.360.000'],
            ['Operating expenses', '-890.000'],
            ['Operating profit (EBIT)', '470.000'],
        ],
        emphasizeLast: true,
    };
}

function statusesFor(reply: AssistantMsg): string[] {
    switch (reply.kind) {
        case 'plan':
            return ['Understanding the request…', 'Gathering transactions…', 'Checking your chart of accounts…', 'Preparing a plan…'];
        case 'spacecall':
            return ['Finding the artifact…', 'Loading the latest data…'];
        case 'skill':
            return ['Checking what I can do…', 'Looking up available skills…'];
        case 'upsell':
            return ['Checking your plan…', 'Seeing what this needs…'];
        case 'clienttable':
            return ['Checking all 8 agreements…', 'Gathering the numbers…', 'Comparing across clients…'];
        case 'data': {
            const k = (reply as Extract<AssistantMsg, { kind: 'data' }>).dataKey;
            if (k === 'overdue') return ['Searching invoices…', 'Checking due dates…'];
            if (k === 'unreconciled') return ['Scanning bank transactions…', 'Matching against entries…'];
            if (['cashflow', 'margins', 'forecast', 'anomalies', 'benchmark', 'analysis'].includes(k))
                return ['Pulling the figures…', 'Crunching the numbers…', 'Spotting the trends…'];
            return ['Pulling Q4 figures…', 'Tallying the accounts…'];
        }
        default:
            return ['Thinking…'];
    }
}

interface HistoryItem {
    id: number;
    title: string;
    when: string;
    daysAgo: number;
    messages: ChatMsg[];
}

const SEED_HISTORY: HistoryItem[] = [
    {
        id: 9001,
        title: 'Which invoices are overdue by more than 30 days?',
        when: 'Yesterday',
        daysAgo: 1,
        messages: [
            { id: -11, role: 'user', text: 'Which invoices are overdue by more than 30 days?' },
            { id: -12, role: 'assistant', kind: 'data', dataKey: 'overdue' },
        ],
    },
    {
        id: 9002,
        title: 'Send reminders to overdue customers',
        when: '2 days ago',
        daysAgo: 2,
        messages: [
            { id: -21, role: 'user', text: 'Send reminders to overdue customers' },
            {
                id: -22,
                role: 'assistant',
                kind: 'plan',
                intro: "Here's my plan to send payment reminders. Review it before I start — nothing goes out until you approve.",
                steps: [
                    { label: 'Find invoices overdue by 30+ days (8 found)', status: 'done' },
                    { label: 'Group by customer and pick the right reminder template', status: 'done' },
                    { label: 'Draft a reminder email per customer', status: 'done' },
                    { label: 'Send and log a note on each invoice', status: 'done' },
                ],
                phase: 'done',
                result: 'Sent 8 reminders across 6 customers (74.200 DKK overdue). I logged a note on each invoice and will follow up automatically in 7 days if unpaid.',
            },
        ],
    },
    {
        id: 9003,
        title: 'Profit and loss summary for Q4',
        when: 'Last week',
        daysAgo: 7,
        messages: [
            { id: -31, role: 'user', text: 'Show me the profit and loss summary for Q4' },
            { id: -32, role: 'assistant', kind: 'data', dataKey: 'pnl' },
        ],
    },
];

export default function ChatView({ skills, spaces, onEnableSkill, onNavigate, onCreateSpace, onCreateSkill, seedWelcome, onWelcomeConsumed, scope = 'portfolio', scopeName = 'All agreements', onActiveChange, analyticsUnlocked = false, onSelectClient }: Props) {
    const { t, lang } = useLang();
    // Seed Eva's getting-started message right after onboarding (lazy init → StrictMode-safe)
    const [messages, setMessages] = useState<ChatMsg[]>(() => (seedWelcome ? [{ id: 0, role: 'assistant', kind: 'getstarted' }] : []));
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>(SEED_HISTORY);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [instantIds, setInstantIds] = useState<Set<number>>(() => (seedWelcome ? new Set([0]) : new Set()));
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (seedWelcome) onWelcomeConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function newChat() {
        if (messages.length) {
            const firstUser = messages.find((m) => m.role === 'user') as { text: string } | undefined;
            const title = firstUser ? firstUser.text.slice(0, 60) : 'New conversation';
            setHistory((h) => [{ id: nextId(), title, when: 'Just now', daysAgo: 0, messages }, ...h]);
        }
        setMessages([]);
        setHistoryOpen(false);
    }

    function loadConversation(item: HistoryItem) {
        setMessages(item.messages);
        setInstantIds(new Set(item.messages.map((m) => m.id)));
        setHistoryOpen(false);
    }

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // Report whether there's a live conversation (so a scope switch can warn before clearing it)
    useEffect(() => {
        onActiveChange?.(messages.some((m) => m.role === 'user'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    function classify(text: string): AssistantMsg {
        const t = text.toLowerCase();

        const mentioned = spaces.find((s) => t.includes('@' + s.title.toLowerCase()));
        if (mentioned) {
            const month = MONTHS.find((m) => t.includes(m));
            const ctx = month ? ` for ${month.charAt(0).toUpperCase()}${month.slice(1)}` : '';
            return {
                id: nextId(),
                role: 'assistant',
                kind: 'spacecall',
                spaceId: mentioned.id,
                note: `Here's your “${mentioned.title}” artifact${ctx}. I pulled it in live — ask me to filter, extend, or export it.`,
            };
        }

        // ---- portfolio (cross-client) mode: answer across all agreements ----
        if (scope === 'portfolio') {
            // Cross-client action: send reminders to every client with overdue invoices.
            if (/remind|chase|follow up/.test(t) && /all client|every client|overdue|across/.test(t)) {
                return {
                    id: nextId(),
                    role: 'assistant',
                    kind: 'plan',
                    intro: PORTFOLIO_REMINDER_PLAN.intro,
                    steps: PORTFOLIO_REMINDER_PLAN.steps.map((label) => ({ label, status: 'todo' as const })),
                    phase: 'awaiting',
                    result: PORTFOLIO_REMINDER_PLAN.result,
                    outcome: PORTFOLIO_REMINDER_PLAN.outcome,
                };
            }
            // Cross-client utilities surfaced as follow-ups.
            if (/export/.test(t) && /pdf|report/.test(t)) {
                return { id: nextId(), role: 'assistant', kind: 'text', text: "Done — I've generated a PDF report of this view across your 8 clients and saved it to your Documents. In production this would download or land in your inbox." };
            }
            if (/weekly alert|set up.*alert|alert for this|weekly/.test(t)) {
                return { id: nextId(), role: 'assistant', kind: 'text', text: "I'll run this check every Monday at 08:00 and message you a summary whenever something changes. You can manage alerts anytime in Settings." };
            }
            // Cross-client data tables.
            const ctKey =
                /overdue/.test(t) ? 'overdue' :
                /highest revenue|revenue last month|top.*revenue|highest.*revenue|best.*revenue/.test(t) ? 'revenue' :
                /missing document|missing receipt|missing doc|documents?/.test(t) ? 'docs' :
                /reconcil/.test(t) ? 'reconcile' :
                /runway|cash runway|burn/.test(t) ? 'runway' :
                null;
            if (ctKey) return { id: nextId(), role: 'assistant', kind: 'clienttable', dataKey: ctKey };
        }

        const gate = (kw: string[], skillId: string) => (kw.some((k) => t.includes(k)) ? skillId : null);
        const skillId =
            gate(['payroll', 'salary', 'løn'], 'payroll') ||
            gate(['annual report', 'årsrapport', 'annual account'], 'annual-reports') ||
            gate(['close the books', 'month-end', 'period-end', 'closing'], 'close-books') ||
            gate(['regulation', 'compliance', 'law'], 'regulations');
        if (skillId) {
            return { id: nextId(), role: 'assistant', kind: 'skill', skillId, text: `That requires a capability I don't have switched on yet.` };
        }

        // Financial analysis questions are gated behind the Insights subscription.
        const analyticsKey =
            /cash ?flow|liquidity|runway|burn rate/.test(t) ? 'cashflow' :
            /margin|profitab/.test(t) ? 'margins' :
            /forecast|predict|projection|next quarter|outlook/.test(t) ? 'forecast' :
            /anomal|unusual|risk|red flag/.test(t) ? 'anomalies' :
            /benchmark|peer|compare.*(client|portfolio|peer)/.test(t) ? 'benchmark' :
            /\banalyse\b|\banalyze\b|analysis|financial health|what changed|what's driving|whats driving|trend|growth rate/.test(t) ? 'analysis' :
            null;
        if (analyticsKey) {
            if (!analyticsUnlocked) {
                return {
                    id: nextId(),
                    role: 'assistant',
                    kind: 'upsell',
                    text: lang === 'da'
                        ? `Det er et dybt finansanalyse-spørgsmål. Det er en del af Financial Insights, som endnu ikke er slået til for ${scopeName}.`
                        : `That's a deep financial-analysis question. It's part of Financial Insights, which isn't switched on yet for ${scopeName}.`,
                };
            }
            return { id: nextId(), role: 'assistant', kind: 'data', dataKey: analyticsKey };
        }

        const isAction =
            /\b(remind|chase|reconcile|send|pay|transfer|write[- ]?off|create|add|set ?up|close|generate|prepare|draft|book|post|run|delete|update|cancel|enable)\b/.test(t) ||
            t.includes('follow up') ||
            t.includes('aged receivable');
        if (isAction) {
            if (/aged receivable|generate.*report|report for all clients/.test(t)) {
                return {
                    id: nextId(),
                    role: 'assistant',
                    kind: 'plan',
                    intro: "Here's my plan to build the aged receivables report. I'll save it as an artifact when done so you can reuse it.",
                    steps: [
                        { label: 'Pull all open receivables across 14 clients', status: 'todo' },
                        { label: 'Bucket by age: 0–30, 31–60, 61–90, 90+ days', status: 'todo' },
                        { label: 'Flag clients with >25% balance in the 90+ bucket', status: 'todo' },
                        { label: 'Generate report and save as an artifact', status: 'todo' },
                    ],
                    phase: 'awaiting',
                    result: 'Done. I aged 312 open invoices (1.84M DKK total). 3 clients have significant 90+ day exposure. I saved the report as an artifact — you can open or share it anytime.',
                    createsSpace: 'Aged Receivables — All Clients',
                    outcome: { title: 'Aged Receivables — All Clients', sub: 'Report saved as an artifact' },
                };
            }
            if (/remind|chase|follow up/.test(t)) {
                return {
                    id: nextId(),
                    role: 'assistant',
                    kind: 'plan',
                    intro: "Here's my plan to send payment reminders. Review it before I start — nothing goes out until you approve.",
                    steps: [
                        { label: 'Find invoices overdue by 30+ days (8 found)', status: 'todo' },
                        { label: 'Group by customer and pick the right reminder template', status: 'todo' },
                        { label: 'Draft a reminder email per customer', status: 'todo' },
                        { label: 'Send and log a note on each invoice', status: 'todo' },
                    ],
                    phase: 'awaiting',
                    result: 'Sent 8 reminders across 6 customers (74.200 DKK overdue). I logged a note on each invoice and will follow up automatically in 7 days if unpaid.',
                    outcome: { title: '8 payment reminders sent', sub: '74.200 DKK across 6 customers' },
                };
            }
            const dom = findDomain(t);
            if (dom) {
                const noun = dom.label.toLowerCase();
                return {
                    id: nextId(),
                    role: 'assistant',
                    kind: 'plan',
                    intro: `Here's my plan for that in ${dom.label}. Approve and I'll get started — nothing changes until you do.`,
                    steps: [
                        { label: `Review your current ${noun}`, status: 'todo' },
                        { label: 'Prepare the change and validate it against your setup', status: 'todo' },
                        { label: 'Apply it and log the result', status: 'todo' },
                    ],
                    phase: 'awaiting',
                    result: `Done — your ${noun} are updated. You can see the change in Review.`,
                    outcome: { title: `${dom.label} updated`, sub: 'Added to your Review queue' },
                };
            }
            return {
                id: nextId(),
                role: 'assistant',
                kind: 'plan',
                intro: "Here's how I'd approach that. Approve the plan and I'll get started.",
                steps: [
                    { label: 'Gather the relevant transactions and documents', status: 'todo' },
                    { label: 'Match and validate against your chart of accounts', status: 'todo' },
                    { label: 'Prepare entries for your review', status: 'todo' },
                ],
                phase: 'awaiting',
                result: 'Done — entries prepared and posted. You can see them in Review.',
                outcome: { title: 'Entries prepared', sub: 'Ready for you in the Review feed' },
            };
        }

        // domain data lookup (Accounts, Customers, Products, Projects, …)
        const dom = findDomain(t);
        if (dom) return { id: nextId(), role: 'assistant', kind: 'data', dataKey: dom.key };

        if (/overdue/.test(t)) return { id: nextId(), role: 'assistant', kind: 'data', dataKey: 'overdue' };
        if (/unreconciled|bank transaction/.test(t)) return { id: nextId(), role: 'assistant', kind: 'data', dataKey: 'unreconciled' };
        if (/profit|loss|p&l|p and l|q4|revenue/.test(t)) return { id: nextId(), role: 'assistant', kind: 'data', dataKey: 'pnl' };
        return {
            id: nextId(),
            role: 'assistant',
            kind: 'text',
            text: "I can help across your whole ledger — accounts, booked entries, customers, suppliers, products, projects, budgets, journals, dimensions, documents, subscriptions, quote-to-cash, accounting years and webhooks. Ask me to show any of them, take an action (with your approval), or type @ to bring in a saved artifact.",
        };
    }

    // `display` lets translated suggestion chips show their localized text while the
    // canned-answer matching still runs on the English original.
    function send(text: string, display?: string) {
        const trimmed = text.trim();
        if (!trimmed) return;
        const userMsg: ChatMsg = { id: nextId(), role: 'user', text: display ?? trimmed };
        const reply = classify(trimmed);
        const thinking: AssistantMsg = { id: reply.id, role: 'assistant', kind: 'thinking', statuses: statusesFor(reply) };
        setMessages((m) => [...m, userMsg, thinking]);
        setInput('');
        const delay = reply.kind === 'plan' ? 1900 : reply.kind === 'data' ? 1200 : 1500;
        setTimeout(() => {
            setMessages((m) => m.map((x) => (x.id === reply.id ? reply : x)));
        }, delay);
    }

    function approvePlan(msgId: number) {
        setMessages((prev) =>
            prev.map((m) => (m.id === msgId && m.role === 'assistant' && m.kind === 'plan' ? { ...m, phase: 'running' as const } : m))
        );
        const planMsg = messages.find((m) => m.id === msgId) as Extract<AssistantMsg, { kind: 'plan' }>;
        const total = planMsg.steps.length;
        let i = 0;
        const tick = () => {
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== msgId || m.role !== 'assistant' || m.kind !== 'plan') return m;
                    const steps = m.steps.map((s, idx): PlanStep => {
                        if (idx < i) return { ...s, status: 'done' };
                        if (idx === i) return { ...s, status: 'running' };
                        return s;
                    });
                    return { ...m, steps };
                })
            );
            i++;
            if (i <= total) setTimeout(tick, 750);
            else {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId && m.role === 'assistant' && m.kind === 'plan'
                            ? { ...m, phase: 'done' as const, steps: m.steps.map((s) => ({ ...s, status: 'done' as const })) }
                            : m
                    )
                );
                if (planMsg.createsSpace) onCreateSpace(planMsg.createsSpace);
            }
        };
        setTimeout(tick, 400);
    }

    const empty = messages.length === 0;
    const suggestions = scope === 'portfolio' ? PORTFOLIO_SUGGESTIONS : CHAT_SUGGESTIONS;

    return (
        <div className="flex h-full">
            <div className="flex flex-col flex-1 min-w-0 h-full">
            <div className="flex items-center justify-between gap-2 px-6 py-3">
                <ScopeSwitcher />
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5"
                        style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}
                    >
                        <Icon name="time" /> {t('History')}
                    </button>
                    {!empty && (
                        <button
                            onClick={newChat}
                            className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5"
                            style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}
                        >
                            <Icon name="circle-plus" /> {t('New chat')}
                        </button>
                    )}
                </div>
            </div>

            {empty ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <Orb />
                    <h1 className="mt-6 text-2xl font-semibold" style={{ color: COLORS.text }}>{t('What can I do for you?')}</h1>
                    <div className="w-full" style={{ maxWidth: 720 }}>
                        <Composer value={input} onChange={setInput} onSend={() => send(input)} spaces={spaces} className="mt-7" />
                        <p className="mt-5 mb-2 text-sm" style={{ color: COLORS.textMuted }}>{t('Suggestions:')}</p>
                        <div className="flex flex-wrap items-start gap-2">
                            {suggestions.map((s) => (
                                <EvaChip key={s} label={t(s)} onClick={() => send(s, t(s))} />
                            ))}
                        </div>
                        <p className="mt-4 text-xs flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                            <Icon name="ai-stars" /> {lang === 'da' ? <>Tip: skriv <b className="font-semibold">@</b> for at hente et gemt artefakt ind i chatten.</> : <>Tip: type <b className="font-semibold">@</b> to bring a saved artifact into the chat.</>}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
                        <div className="mx-auto flex flex-col gap-5" style={{ maxWidth: 720 }}>
                            {messages.map((m, idx) =>
                                m.role === 'user' ? (
                                    <div key={m.id} className="flex justify-end">
                                        <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: '#f1f1f3', color: COLORS.text, maxWidth: '85%' }}>
                                            <UserText text={m.text} />
                                        </div>
                                    </div>
                                ) : (
                                    <div key={m.id} className="flex gap-3">
                                        <div className="shrink-0 mt-0.5"><Orb size={26} thinking={m.kind === 'thinking'} /></div>
                                        <div className="flex-1 min-w-0">
                                            <AssistantBubble
                                                msg={m}
                                                skills={skills}
                                                spaces={spaces}
                                                instant={instantIds.has(m.id)}
                                                isLast={idx === messages.length - 1}
                                                onApprove={() => approvePlan(m.id)}
                                                onEnableSkill={onEnableSkill}
                                                onNavigate={onNavigate}
                                                onFollowUp={(q) => send(q, t(q))}
                                                onSelectClient={onSelectClient}
                                                onCreateSpace={onCreateSpace}
                                                onCreateSkill={onCreateSkill}
                                                onStream={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })}
                                            />
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                    <div className="px-6 pb-5">
                        <div className="mx-auto" style={{ maxWidth: 720 }}>
                            <Composer value={input} onChange={setInput} onSend={() => send(input)} spaces={spaces} autoFocus />
                        </div>
                    </div>
                </>
            )}

            </div>

            <HistoryPanel
                open={historyOpen}
                items={history}
                onClose={() => setHistoryOpen(false)}
                onSelect={loadConversation}
            />
        </div>
    );
}

const DATE_RANGES: { key: string; label: string; max: number }[] = [
    { key: 'all', label: 'All time', max: Infinity },
    { key: 'today', label: 'Today', max: 0 },
    { key: '7', label: 'Last 7 days', max: 7 },
    { key: '30', label: 'Last 30 days', max: 30 },
];

const HISTORY_BUCKETS: { label: string; test: (d: number) => boolean }[] = [
    { label: 'Today', test: (d) => d === 0 },
    { label: 'Previous 7 days', test: (d) => d > 0 && d <= 7 },
    { label: 'Earlier', test: (d) => d > 7 },
];

function HistoryPanel({
    open, items, onClose, onSelect,
}: {
    open: boolean;
    items: HistoryItem[];
    onClose: () => void;
    onSelect: (item: HistoryItem) => void;
}) {
    const [query, setQuery] = useState('');
    const [range, setRange] = useState('all');

    if (!open) return null;

    const maxDays = DATE_RANGES.find((r) => r.key === range)!.max;
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
        if (item.daysAgo > maxDays) return false;
        if (!q) return true;
        const preview = (item.messages.find((m) => m.role === 'user') as { text: string } | undefined)?.text ?? '';
        return item.title.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
    });

    const buckets = HISTORY_BUCKETS.map((b) => ({ label: b.label, items: filtered.filter((i) => b.test(i.daysAgo)) })).filter((b) => b.items.length > 0);

    return (
        <aside
            className="shrink-0 bg-white flex flex-col h-full"
            style={{ width: 320, borderLeft: `1px solid ${COLORS.cardBorder}` }}
        >
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <span className="text-base font-semibold" style={{ color: COLORS.text }}>Conversation history</span>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5">
                        <Icon name="close" />
                    </button>
                </div>

                {/* search */}
                <div className="px-5">
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                        <Icon name="search" style={{ color: COLORS.textMuted }} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search conversations"
                            className="flex-1 bg-transparent text-sm outline-none"
                            style={{ color: COLORS.text }}
                        />
                        {query && (
                            <button onClick={() => setQuery('')} style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                        )}
                    </div>
                </div>

                {/* date range chips */}
                <div className="flex flex-wrap gap-1.5 px-5 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    {DATE_RANGES.map((r) => {
                        const active = range === r.key;
                        return (
                            <button
                                key={r.key}
                                onClick={() => setRange(r.key)}
                                className="rounded-full px-2.5 py-1 text-xs"
                                style={{
                                    background: active ? COLORS.text : '#fff',
                                    color: active ? '#fff' : COLORS.textMuted,
                                    border: `1px solid ${active ? COLORS.text : COLORS.cardBorder}`,
                                }}
                            >
                                {r.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {filtered.length === 0 && (
                        <p className="text-sm px-5 py-6" style={{ color: COLORS.textMuted }}>
                            {items.length === 0 ? 'No past conversations yet.' : 'No conversations match your search.'}
                        </p>
                    )}
                    {buckets.map((bucket) => (
                        <div key={bucket.label}>
                            <p className="text-xs font-medium px-5 pt-3 pb-1" style={{ color: '#a8a8b0' }}>{bucket.label}</p>
                            {bucket.items.map((item) => {
                                const preview = (item.messages.find((m) => m.role === 'user') as { text: string } | undefined)?.text ?? '';
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelect(item)}
                                        className="w-full text-left px-5 py-3"
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <Icon name="chat" style={{ color: '#9b9ba4', marginTop: 2 }} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{item.title}</p>
                                                <p className="text-xs truncate mt-0.5" style={{ color: COLORS.textMuted }}>{preview}</p>
                                                <p className="text-xs mt-1" style={{ color: '#a8a8b0' }}>{item.when}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </aside>
    );
}

// ---- streaming text (word by word) ----
function StreamText({ text, onDone, onTick, speed = 45 }: { text: string; onDone?: () => void; onTick?: () => void; speed?: number }) {
    const words = useMemo(() => text.split(/(\s+)/), [text]);
    const [n, setN] = useState(0);
    useEffect(() => {
        setN(0);
        // Hidden tabs throttle timers hard — skip the typing animation there.
        if (document.visibilityState === 'hidden') {
            setN(words.length);
            onTick?.();
            onDone?.();
            return;
        }
        let i = 0;
        const id = setInterval(() => {
            i++;
            setN(i);
            onTick?.();
            if (i >= words.length) {
                clearInterval(id);
                onDone?.();
            }
        }, speed);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);
    return <>{words.slice(0, n).join('')}</>;
}

function ThinkingBubble({ statuses }: { statuses: string[] }) {
    const { t } = useLang();
    const [i, setI] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setI((x) => (x < statuses.length - 1 ? x + 1 : x)), 700);
        return () => clearInterval(id);
    }, [statuses]);
    return (
        <div className="flex items-center py-1.5">
            <span className="text-sm" style={{ color: COLORS.textMuted }}>{t(statuses[i])}</span>
        </div>
    );
}

function UserText({ text }: { text: string }) {
    const parts = text.split(/(@[^@]+?(?=\s|$))/g);
    return (
        <>
            {parts.map((p, i) =>
                p.startsWith('@') ? (
                    <span key={i} className="font-medium" style={{ color: '#a855f7' }}>{p}</span>
                ) : (
                    <span key={i}>{p}</span>
                )
            )}
        </>
    );
}

function Composer({
    value, onChange, onSend, spaces, className = '', autoFocus = false,
}: {
    value: string; onChange: (v: string) => void; onSend: () => void; spaces: Space[]; className?: string; autoFocus?: boolean;
}) {
    const { t } = useLang();
    const taRef = useRef<HTMLTextAreaElement>(null);
    const atIdx = value.lastIndexOf('@');
    const query = atIdx >= 0 ? value.slice(atIdx + 1) : '';
    const showMenu = atIdx >= 0 && !query.includes(' ');
    const matches = showMenu ? spaces.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];

    function pick(space: Space) {
        onChange(value.slice(0, atIdx) + '@' + space.title + ' ');
        taRef.current?.focus();
    }

    const canSend = value.trim().length > 0;

    function doSend() {
        if (!canSend) return;
        onSend();
        // keep the field focused so the user can immediately keep typing
        requestAnimationFrame(() => taRef.current?.focus());
    }

    return (
        <div className={`relative ${className}`}>
            {matches.length > 0 && (
                <div
                    className="absolute left-0 right-0 rounded-xl bg-white overflow-hidden z-10"
                    style={{ bottom: 'calc(100% + 6px)', border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}
                >
                    <p className="px-3 pt-2.5 pb-1 text-xs font-medium" style={{ color: COLORS.textMuted }}>{t('Call an artifact into the chat')}</p>
                    {matches.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => pick(s)}
                            className="flex items-center gap-3 w-full text-left px-3 py-2.5"
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <EmojiTile emoji={s.emoji} size={28} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{s.title}</p>
                                <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{s.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            <div className="relative rounded-2xl" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                <textarea
                    ref={taRef}
                    autoFocus={autoFocus}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (matches.length > 0) pick(matches[0]);
                            else doSend();
                        }
                    }}
                    placeholder={t('Ask your virtual assistant anything')}
                    rows={2}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none"
                    style={{ color: COLORS.text }}
                />
                <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
                    <button style={{ color: COLORS.textMuted }} title="Voice input"><MicIcon /></button>
                    <button
                        onClick={doSend}
                        disabled={!canSend}
                        className="flex items-center justify-center rounded-lg"
                        style={{
                            width: 30,
                            height: 30,
                            background: canSend ? '#4c6ef5' : '#e4e4e7',
                            color: canSend ? '#fff' : '#b0b0b8',
                            cursor: canSend ? 'pointer' : 'not-allowed',
                            transition: 'background .15s, color .15s',
                        }}
                    >
                        <Icon name="arrow-up" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function followUpsFor(msg: AssistantMsg): string[] {
    switch (msg.kind) {
        case 'data': {
            const k = (msg as Extract<AssistantMsg, { kind: 'data' }>).dataKey;
            if (k === 'overdue') return ['Send reminders to overdue customers', 'Which client owes the most?', 'Break it down by age'];
            if (k === 'unreconciled') return ['Reconcile these for me', 'Show only transactions over 10.000', 'Which ones need a receipt?'];
            if (k === 'customers') return ['Send reminders to overdue customers', 'Add a new customer', 'Export the list as a PDF'];
            if (k === 'suppliers') return ['Show bills due this week', 'Add a new supplier', 'Export the list as a PDF'];
            if (k === 'years') return ['Close the 2024 accounting year', 'Open a new accounting year', 'Show the year-end checklist'];
            if (k === 'webhooks') return ['Add a new webhook', 'Test an endpoint', 'Show recent deliveries'];
            if (k === 'budgets') return ['Update the revenue budget', 'Show variance by month', 'Export as a PDF'];
            if (k === 'projects') return ['Flag projects over budget', 'Add a new project', 'Export as a PDF'];
            if (k === 'products') return ['Add a new product', 'Show low-stock items', 'Update a price'];
            if (k === 'subscriptions') return ['Show churn this month', 'Add a subscription', 'Forecast next-month MRR'];
            if (k === 'cashflow') return ['Forecast next quarter', 'What’s driving the outflows?', 'Any anomalies?'];
            if (k === 'margins') return ['What’s driving the change?', 'Compare to peers', 'Forecast next quarter'];
            if (k === 'forecast') return ['What are the assumptions?', 'Analyze cash flow', 'Any risks to this?'];
            if (k === 'anomalies') return ['Open these in Review', 'Why is this unusual?', 'Analyze cash flow'];
            if (k === 'benchmark') return ['How do I close the gap?', 'Analyze margins', 'Forecast next quarter'];
            if (k === 'analysis') return ['Analyze cash flow', 'Forecast next quarter', 'Any anomalies?'];
            if (DOMAINS.some((d) => d.key === k)) return ['Export as a PDF', 'Filter the list', 'What changed this month?'];
            return ['Compare Q4 to Q3', 'Show revenue by month', 'Export as a PDF'];
        }
        case 'clienttable': {
            const k = (msg as Extract<AssistantMsg, { kind: 'clienttable' }>).dataKey;
            if (k === 'overdue') return ['Send reminders to all clients with overdue invoices', 'Export this as a PDF report', 'Set up a weekly alert for this'];
            if (k === 'revenue') return ['Show me clients with missing documents', 'Export this as a PDF report', 'Set up a weekly alert for this'];
            if (k === 'docs') return ["Which clients haven't been reconciled this month?", 'Export this as a PDF report', 'Set up a weekly alert for this'];
            if (k === 'reconcile') return ['Which clients have overdue invoices?', 'Export this as a PDF report', 'Set up a weekly alert for this'];
            if (k === 'runway') return ['Which client had the highest revenue last month?', 'Export this as a PDF report', 'Set up a weekly alert for this'];
            return ['Export this as a PDF report', 'Set up a weekly alert for this'];
        }
        case 'plan':
            return ['Show me the result in Review', 'Set this to run every month', 'Summarise what changed'];
        case 'spacecall':
            return ['Filter to last quarter', 'Add a forecast', 'Export as a PDF'];
        case 'upsell':
            return [];
        case 'skill':
            return ['What else can you automate?', 'Show my active skills'];
        case 'text':
            return ['Which invoices are overdue?', 'Show my Q4 P&L', 'Send payment reminders'];
        default:
            return [];
    }
}

function FollowUps({ items, onPick }: { items: string[]; onPick: (t: string) => void }) {
    const { t } = useLang();
    if (!items.length) return null;
    return (
        <div className="mt-4 anim-in">
            <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                <Icon name="ai-stars" /> {t('Suggested follow-ups')}
            </p>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    // Show the translated chip; matching runs on the English original.
                    <EvaChip key={item} label={t(item)} onClick={() => onPick(item)} />
                ))}
            </div>
        </div>
    );
}

function AssistantBubble({
    msg, skills, spaces, instant, isLast, onApprove, onEnableSkill, onNavigate, onStream, onFollowUp, onSelectClient, onCreateSpace, onCreateSkill,
}: {
    msg: AssistantMsg;
    skills: Skill[];
    spaces: Space[];
    instant: boolean;
    isLast: boolean;
    onApprove: () => void;
    onEnableSkill: (id: string) => void;
    onNavigate: (v: ViewId) => void;
    onStream: () => void;
    onFollowUp: (t: string) => void;
    onSelectClient?: (id: string) => void;
    onCreateSpace: (title: string) => void;
    onCreateSkill: (title: string, description: string) => void;
}) {
    const { t, lang } = useLang();
    const [textDone, setTextDone] = useState(instant);
    useEffect(() => {
        if (textDone) onStream();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textDone]);

    const reveal = instant || textDone;
    const lead = (text: string) =>
        instant ? (
            <>{text}</>
        ) : (
            <StreamText text={text} onTick={onStream} onDone={() => setTextDone(true)} />
        );

    if (msg.kind === 'thinking') return <ThinkingBubble statuses={msg.statuses} />;

    const body = (() => {
        if (msg.kind === 'getstarted') {
            const opts = [
                { emoji: '🔎', tint: '#eef2ff', title: t('Ask about your data'), desc: t('Overdue invoices, your Q4 P&L, balances…'), onClick: () => onFollowUp('Which invoices are overdue by more than 30 days?') },
                { emoji: '⚡', tint: '#fff4e6', title: t('Enable a new skill'), desc: t('Automate reconciliation, reminders & more'), onClick: () => onNavigate('skills') },
                { emoji: '🧩', tint: '#f3f0fb', title: t('Create an artifact'), desc: t('Build a dashboard, report or list'), onClick: () => onNavigate('spaces') },
                { emoji: '💡', tint: '#ecfdf5', title: t('Something else'), desc: t('Tell me what you need and I’ll help'), onClick: () => onFollowUp('What else can you help me with?') },
            ];
            return (
                <div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: COLORS.text }}>
                        {t("Hi, I'm Eva. Your books are imported and I'm ready to go. Here are a few ways to see what I can do:")}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {opts.map((o) => (
                            <button
                                key={o.title}
                                onClick={o.onClick}
                                className="flex flex-col text-left rounded-2xl p-3.5 bg-white"
                                style={{ border: `1px solid ${COLORS.cardBorder}`, transition: 'background .15s, border-color .15s, transform .15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d6d6db'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = COLORS.cardBorder; e.currentTarget.style.transform = 'none'; }}
                            >
                                <span className="flex items-center justify-center rounded-xl" style={{ width: 38, height: 38, background: o.tint, fontSize: 20, lineHeight: 1 }}>{o.emoji}</span>
                                <p className="text-sm font-semibold mt-2.5" style={{ color: COLORS.text }}>{o.title}</p>
                                <p className="text-xs mt-1 leading-snug" style={{ color: COLORS.textMuted }}>{o.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }
        if (msg.kind === 'text') {
            return (
                <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{lead(t(msg.text))}</p>
            );
        }
        if (msg.kind === 'clienttable') {
            const d = CLIENT_TABLES[msg.dataKey];
            return (
                <div>
                    <p className="text-sm mb-3" style={{ color: COLORS.text }}>{lead(t(d.summary))}</p>
                    {reveal && (
                        <div className="anim-in">
                            <ClientTable data={d} onPick={(id) => onSelectClient?.(id)} />
                            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                <Icon name="info" /> {t('Click a row to switch to that client.')}
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        if (msg.kind === 'data') {
            const d = getData(msg.dataKey);
            return (
                <div>
                    <p className="text-sm mb-3" style={{ color: COLORS.text }}>{lead(t(d.intro))}</p>
                    {reveal && (
                        <div className="anim-in">
                            <MiniTable head={d.head} rows={d.rows} emphasizeLast={d.emphasizeLast} />
                            {d.outro && <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>{t(d.outro)}</p>}
                        </div>
                    )}
                </div>
            );
        }
        if (msg.kind === 'spacecall') {
            const space = spaces.find((s) => s.id === msg.spaceId);
            if (!space) return null;
            return (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <EmojiTile emoji={space.emoji} size={22} />
                        <span className="text-sm font-medium" style={{ color: COLORS.text }}>{space.title}</span>
                        <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: '#f3f0fb', color: '#8b46d6' }}>{t('Artifact')}</span>
                    </div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: COLORS.text }}>{lead(msg.note)}</p>
                    {reveal && (
                        <div className="anim-in">
                            <ArtifactPreview space={space} compact />
                            <div className="mt-3"><Button onClick={() => onNavigate('spaces')}>{t('Open in Artifacts')}</Button></div>
                        </div>
                    )}
                </div>
            );
        }
        if (msg.kind === 'skill') {
            const sk = skills.find((s) => s.id === msg.skillId)!;
            const enabled = sk.state !== 'locked';
            const leadText = enabled
                ? (lang === 'da'
                    ? `Godt — handlingen “${t(sk.title)}” er aktiveret. Det kan jeg gøre nu. Spørg mig igen, så går jeg i gang.`
                    : `Great — the “${sk.title}” skill is enabled. I can do this now. Ask me again and I'll get started.`)
                : t(msg.text);
            return (
                <div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: COLORS.text }}>{lead(leadText)}</p>
                    {!enabled && reveal && (
                        <div className="rounded-xl p-4 anim-in" style={{ border: '1px solid #e6dcfb', background: '#faf6ff' }}>
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 9, background: sk.color }}>
                                    <Icon name="lock" className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Skill required:')} {t(sk.title)}</p>
                                    <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>{t(sk.description)}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <Button appearance="primary" onClick={() => onEnableSkill(sk.id)}>{lang === 'da' ? `Aktivér for ${sk.price} DKK/md.` : `Enable for ${sk.price} DKK/month`}</Button>
                                        <Button onClick={() => onNavigate('skills')}>{t('View in Skills')}</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        if (msg.kind === 'upsell') {
            return (
                <div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: COLORS.text }}>{lead(t(msg.text))}</p>
                    {reveal && (
                        <div className="rounded-xl p-4 anim-in" style={{ border: '1px solid #efe1c4', background: '#fdf8ec' }}>
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 9, background: '#b9842b' }}>
                                    <Icon name="ai-stars" className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>Financial Insights</p>
                                    <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>
                                        {t("Unlock deep cash-flow, margin, anomaly and forecast analysis — and I'll answer analysis questions right here in chat.")}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <Button appearance="primary" onClick={() => onNavigate('insights')}>{t('See Insights')}</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        // plan
        return (
            <div className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fcfcfd' }}>
                <p className="text-sm leading-relaxed mb-3" style={{ color: COLORS.text }}>{lead(t(msg.intro))}</p>
                {reveal && (
                    <div className="anim-in">
                        <div className="flex flex-col gap-2.5">
                            {msg.steps.map((s, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <StepMarker status={s.status} index={i + 1} />
                                    <span className="text-sm" style={{ color: s.status === 'todo' ? COLORS.textMuted : COLORS.text }}>{t(s.label)}</span>
                                </div>
                            ))}
                        </div>
                        {msg.phase === 'awaiting' && (
                            <div className="flex items-center gap-2 mt-4">
                                <Button appearance="primary" onClick={onApprove}>{t('Approve plan')}</Button>
                                <Button>{t('Modify')}</Button>
                            </div>
                        )}
                        {msg.phase === 'running' && (
                            <p className="text-xs mt-4 flex items-center gap-2" style={{ color: COLORS.textMuted }}>
                                <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                {t('Working on it…')}
                            </p>
                        )}
                        {msg.phase === 'done' && msg.result && (
                            <div className="mt-4 rounded-lg px-3 py-2.5 text-sm flex items-start gap-2" style={{ background: '#ecfdf5', color: '#065f46' }}>
                                <Icon name="circle-tick" /> <span>{t(msg.result)}</span>
                            </div>
                        )}
                        {msg.phase === 'done' && msg.outcome && (() => {
                            const toSpaces = !!msg.createsSpace;
                            return (
                                <div className="mt-3">
                                    <button
                                        onClick={() => onNavigate(toSpaces ? 'spaces' : 'activity')}
                                        className="w-full flex items-center gap-3 rounded-xl p-3 text-left bg-white"
                                        style={{ border: `1px solid ${COLORS.cardBorder}` }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <span
                                            className="flex items-center justify-center shrink-0 rounded-lg"
                                            style={{ width: 34, height: 34, background: toSpaces ? '#f3f0fb' : '#ecfdf5', color: toSpaces ? '#8b46d6' : '#16a34a' }}
                                        >
                                            <Icon name={toSpaces ? 'ai-stars' : 'circle-tick'} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{t(msg.outcome.title)}</p>
                                            <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{t(msg.outcome.sub)}</p>
                                        </div>
                                        <span className="flex items-center gap-1 text-sm font-medium shrink-0" style={{ color: COLORS.text }}>
                                            {toSpaces ? t('Open in Artifacts') : t('View in Review')} <Icon name="chevron-right" />
                                        </span>
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        );
    })();

    if (body === null) return null;

    const planUnfinished = msg.kind === 'plan' && msg.phase !== 'done';
    const showFollowUps = isLast && reveal && !planUnfinished;
    // Any rendered data view can be kept: saved as an artifact, or turned into a recurring skill.
    const savable = reveal && (msg.kind === 'data' || msg.kind === 'clienttable');

    return (
        <div>
            {body}
            {savable && (
                <ArtifactActions
                    kind={msg.kind as 'data' | 'clienttable'}
                    dataKey={(msg as Extract<AssistantMsg, { kind: 'data' | 'clienttable' }>).dataKey}
                    onCreateSpace={onCreateSpace}
                    onCreateSkill={onCreateSkill}
                    onNavigate={onNavigate}
                />
            )}
            {showFollowUps && <FollowUps items={followUpsFor(msg)} onPick={onFollowUp} />}
        </div>
    );
}

// Friendly names, a suggested automation, and its value proposition for each data view Eva can render.
const VIEW_META: Record<string, { artifact: string; skill: string; skillDesc: string; value: string }> = {
    overdue: { artifact: 'Overdue invoices', skill: 'Watch overdue invoices', skillDesc: 'Checks for invoices passing 30 days overdue and flags them to Review.', value: 'Automated, I’d catch invoices the day they pass 30 days and have reminders drafted before you open the books — roughly 2 hours saved a month.' },
    unreconciled: { artifact: 'Unreconciled bank transactions', skill: 'Chase unreconciled transactions', skillDesc: 'Watches for bank transactions without a match and flags them to Review.', value: 'Automated, I’d match new bank transactions daily and only bring you the exceptions — no month-end pile-up.' },
    pnl: { artifact: 'P&L statement', skill: 'Refresh the P&L every month', skillDesc: 'Rebuilds this P&L at month-end and highlights notable changes.', value: 'Automated, a fresh P&L lands at every month-end with the notable changes already highlighted.' },
    cashflow: { artifact: 'Cash flow analysis', skill: 'Monitor cash flow', skillDesc: 'Tracks operating cash flow and alerts you when the trend turns negative.', value: 'Automated, I’d warn you the moment the cash trend turns negative — weeks before it becomes urgent.' },
    margins: { artifact: 'Margin analysis', skill: 'Watch gross margin', skillDesc: 'Recalculates margins and flags significant moves to Review.', value: 'Automated, margin slips get flagged the month they happen instead of at year-end.' },
    forecast: { artifact: 'Revenue forecast', skill: 'Keep the forecast fresh', skillDesc: 'Re-runs this forecast as new data lands.', value: 'Automated, the forecast refreshes as new data lands, so decisions always rest on current numbers.' },
    anomalies: { artifact: 'Anomaly report', skill: 'Flag new anomalies', skillDesc: 'Scans for unusual transactions and flags them to Review.', value: 'Automated, unusual charges get caught before they’re booked — not after the damage is done.' },
    benchmark: { artifact: 'Peer benchmark', skill: 'Track the peer benchmark', skillDesc: 'Refreshes the benchmark quarterly and highlights gaps.', value: 'Automated, you’d see each quarter where a client drifts from peers — ready-made advisory talking points.' },
    analysis: { artifact: 'Financial health summary', skill: 'Monitor financial health', skillDesc: 'Keeps this summary current and flags deteriorating metrics.', value: 'Automated, you’d get a monthly health check with deteriorating metrics flagged early.' },
    customers: { artifact: 'Customer balances', skill: 'Watch customer balances', skillDesc: 'Tracks balances and flags customers passing their credit limit.', value: 'Automated, customers passing their credit limit get flagged before the next sale goes out.' },
    suppliers: { artifact: 'Supplier directory', skill: 'Watch supplier bills', skillDesc: 'Tracks open bills and flags upcoming due dates.', value: 'Automated, upcoming due dates get flagged so you never miss a payment discount.' },
    budgets: { artifact: 'Budget overview', skill: 'Watch budget variance', skillDesc: 'Flags lines drifting from budget to Review.', value: 'Automated, budget drift is flagged in-month — while you can still do something about it.' },
    projects: { artifact: 'Project budgets', skill: 'Watch project budgets', skillDesc: 'Flags projects approaching or over budget.', value: 'Automated, over-budget projects get flagged at 80% spend, not after the overrun.' },
    subscriptions: { artifact: 'Subscription overview', skill: 'Watch MRR & churn', skillDesc: 'Tracks subscription changes and flags churn risk.', value: 'Automated, churn risk and MRR dips surface the day they start, not in the quarterly review.' },
    revenue: { artifact: 'Revenue by client', skill: 'Track revenue by client', skillDesc: 'Updates this view monthly and highlights big movers.', value: 'Automated, this ranking refreshes monthly with big movers highlighted — instant talking points per client.' },
    docs: { artifact: 'Missing documents by client', skill: 'Chase missing documents', skillDesc: 'Requests missing documents from clients automatically.', value: 'Automated, clients get chased for missing documents without you writing a single email.' },
    reconcile: { artifact: 'Reconciliation status by client', skill: 'Watch reconciliation status', skillDesc: 'Flags clients falling behind on reconciliation.', value: 'Automated, clients falling behind get flagged weekly — keeping month-end painless.' },
    runway: { artifact: 'Cash runway by client', skill: 'Watch client cash runway', skillDesc: 'Alerts you when a client’s runway drops under 2 months.', value: 'Automated, a runway warning lands in Review the moment any client drops under 2 months.' },
};

function viewMeta(kind: 'data' | 'clienttable', dataKey: string) {
    const fallbackName = dataKey.charAt(0).toUpperCase() + dataKey.slice(1);
    const base = VIEW_META[dataKey] ?? {
        artifact: `${fallbackName} view`,
        skill: `Keep “${fallbackName}” up to date`,
        skillDesc: 'Watches this view and flags notable changes to Review.',
        value: 'Automated, this view stays current and notable changes land in Review — no manual checking.',
    };
    return kind === 'clienttable' ? { ...base, artifact: `${base.artifact} — all clients` } : base;
}

// Under every data view: keep it as an artifact, and an Eva-suggested AI workflow
// that pitches the value of automating the view before setting it up as a skill.
function ArtifactActions({
    kind, dataKey, onCreateSpace, onCreateSkill, onNavigate,
}: {
    kind: 'data' | 'clienttable';
    dataKey: string;
    onCreateSpace: (title: string) => void;
    onCreateSkill: (title: string, description: string) => void;
    onNavigate: (v: ViewId) => void;
}) {
    const { t } = useLang();
    const meta = viewMeta(kind, dataKey);
    const [saved, setSaved] = useState(false);
    const [phase, setPhase] = useState<'suggest' | 'form' | 'created' | 'dismissed'>('suggest');
    const [name, setName] = useState(t(meta.skill));
    const [freq, setFreq] = useState('Weekly');

    const doneChip = (label: string, linkLabel: string, onLink: () => void) => (
        <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm" style={{ background: '#e9f7ef', color: '#15803d' }}>
            <Icon name="circle-tick" /> {label}
            <button onClick={onLink} className="font-semibold underline" style={{ color: '#15803d' }}>{linkLabel}</button>
        </span>
    );

    return (
        <div className="mt-3 anim-in">
            <div className="flex flex-wrap items-center gap-2">
                {saved ? (
                    doneChip(t('Saved as artifact'), t('Open in Artifacts'), () => onNavigate('spaces'))
                ) : (
                    <Button onClick={() => { onCreateSpace(meta.artifact); setSaved(true); }}>
                        <Icon name="layout" /> {t('Save as artifact')}
                    </Button>
                )}
                {phase === 'created' && doneChip(t('Skill created'), t('View in Skills'), () => onNavigate('skills'))}
            </div>

            {/* Eva's suggested AI workflow — leads with the value of automating this view */}
            {phase === 'suggest' && (
                <div className="rounded-xl p-4 mt-2.5 flex items-start gap-3" style={{ border: '1px solid #efddc0', background: '#fff7ed', maxWidth: 560 }}>
                    <span className="shrink-0 mt-0.5"><Orb size={18} /></span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#b9842b' }}>{t('Suggested AI workflow')}</p>
                        <p className="text-sm font-semibold mt-1" style={{ color: COLORS.text }}>{t(meta.skill)}</p>
                        <p className="text-sm mt-0.5 leading-relaxed" style={{ color: COLORS.textMuted }}>{t(meta.value)}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <Button appearance="primary" onClick={() => setPhase('form')}><Icon name="ai-stars" /> {t('Set it up')}</Button>
                            <Button onClick={() => setPhase('dismissed')}>{t('Not now')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {phase === 'form' && (
                <div className="rounded-xl p-4 mt-2.5" style={{ border: '1px solid #efddc0', background: '#fff7ed', maxWidth: 560 }}>
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Create a skill from this view')}</p>
                    <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>{t('Eva will keep this view up to date and flag notable changes to Review.')}</p>
                    <label className="block text-xs font-medium mt-3 mb-1.5" style={{ color: COLORS.textMuted }}>{t('Skill name')}</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white"
                        style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}
                    />
                    <label className="block text-xs font-medium mt-3 mb-1.5" style={{ color: COLORS.textMuted }}>{t('Run')}</label>
                    <div className="flex gap-2">
                        {['Daily', 'Weekly', 'Monthly'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFreq(f)}
                                className="rounded-lg px-3 py-1.5 text-sm"
                                style={{ border: `1px solid ${freq === f ? COLORS.text : COLORS.cardBorder}`, background: freq === f ? COLORS.text : '#fff', color: freq === f ? '#fff' : COLORS.text }}
                            >
                                {t(f)}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setPhase('suggest')}>{t('Cancel')}</Button>
                        <Button
                            appearance="primary"
                            disabled={!name.trim()}
                            onClick={() => {
                                onCreateSkill(name.trim(), `${meta.skillDesc} Runs ${freq.toLowerCase()}.`);
                                setPhase('created');
                            }}
                        >
                            <Icon name="ai-stars" /> {t('Create skill')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StepMarker({ status, index }: { status: PlanStep['status']; index: number }) {
    if (status === 'done')
        return (
            <span className="flex items-center justify-center shrink-0 rounded-full text-white" style={{ width: 20, height: 20, background: '#16a34a', fontSize: 12 }}>
                <Icon name="tick" />
            </span>
        );
    if (status === 'running')
        return <span className="shrink-0 rounded-full border-2 animate-spin" style={{ width: 20, height: 20, borderColor: '#ff7a2f', borderTopColor: 'transparent' }} />;
    return (
        <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 20, height: 20, border: '1.5px solid #cfcfd6', color: '#9b9ba4', fontSize: 11 }}>
            {index}
        </span>
    );
}

// Cross-client table: first column is the client, each row clickable to switch context.
function ClientTable({ data, onPick }: { data: ClientTableData; onPick: (id: string) => void }) {
    const { t } = useLang();
    const nameOf = (id: string) => AGREEMENTS.find((a) => a.id === id)?.name ?? id;
    return (
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f7f7f8' }}>
                        {data.head.map((h, i) => (
                            <th key={i} className="font-medium px-3 py-2" style={{ color: COLORS.textMuted, textAlign: i === 0 ? 'left' : 'right' }}>{t(h)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((r) => (
                        <tr
                            key={r.id}
                            onClick={() => onPick(r.id)}
                            style={{ borderTop: `1px solid ${COLORS.cardBorder}`, cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <td className="px-3 py-2 font-medium" style={{ color: COLORS.text }}>
                                <span className="flex items-center gap-1.5">{nameOf(r.id)} <Icon name="chevron-right" style={{ color: '#c4c4cc' }} /></span>
                            </td>
                            {r.cells.map((c, ci) => (
                                <td key={ci} className="px-3 py-2" style={{ textAlign: 'right', color: r.negative?.includes(ci) ? '#dc2626' : COLORS.text }}>{t(c)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MiniTable({ head, rows, emphasizeLast }: { head: string[]; rows: string[][]; emphasizeLast?: boolean }) {
    const { t } = useLang();
    return (
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f7f7f8' }}>
                        {head.map((h, i) => (
                            <th key={i} className="font-medium px-3 py-2" style={{ color: COLORS.textMuted, textAlign: i === head.length - 1 ? 'right' : 'left' }}>{t(h)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, ri) => (
                        <tr key={ri} style={{ borderTop: `1px solid ${COLORS.cardBorder}`, fontWeight: emphasizeLast && ri === rows.length - 1 ? 600 : 400 }}>
                            {r.map((c, ci) => (
                                <td key={ci} className="px-3 py-2" style={{ color: COLORS.text, textAlign: ci === r.length - 1 ? 'right' : 'left' }}>{t(c)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
