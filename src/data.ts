import type { Skill, AgentMeta, Space } from './types';

export const AGENTS: Record<string, AgentMeta> = {
    accounting: { key: 'accounting', label: 'Accounting agent', color: '#6366f1' },
    insights: { key: 'insights', label: 'Financial Insights agent', color: '#14b8a6' },
    invoicing: { key: 'invoicing', label: 'Invoicing agent', color: '#f43f5e' },
    documents: { key: 'documents', label: 'Document Collection agent', color: '#d946ef' },
};

export const INITIAL_SKILLS: Skill[] = [
    {
        id: 'reconciliation',
        emoji: '🏦',
        title: 'Finalise bank reconciliation and book automatically',
        description:
            'Automatically matches payments to invoices and creates accounting entries based on bank transactions.',
        color: '#7c6cf6',
        state: 'active',
        stat: '2,847 entries this month',
    },
    {
        id: 'monitor',
        emoji: '🔎',
        title: "Monitor my clients' financials and provide me with suggestions for actions",
        description:
            "Analyzes your clients' financial data to identify trends, risks, and opportunities for proactive advice.",
        color: '#15c39a',
        state: 'active',
        stat: '156 insights generated',
    },
    {
        id: 'reminders',
        emoji: '🔔',
        title: 'Send reminders on missing payments',
        description: 'Automatically sends payment reminders to clients with overdue invoices.',
        color: '#fb6f6f',
        state: 'active',
        stat: '432 reminders sent',
    },
    {
        id: 'documents',
        emoji: '📎',
        title: 'Collect missing documents from my clients',
        description:
            'Proactively requests and collects missing receipts, invoices, and other documents from clients.',
        color: '#e057c4',
        state: 'idle',
        stat: '89 documents collected',
    },
    {
        id: 'close-books',
        emoji: '📚',
        title: 'Close the books',
        description: 'Automates month-end and period-end closing workflows.',
        color: '#8ea2f0',
        state: 'locked',
        price: 1800,
    },
    {
        id: 'regulations',
        emoji: '⚖️',
        title: 'Keep updated on the latest regulations and law',
        description: 'Monitors regulatory changes and ensures compliance.',
        color: '#f5c451',
        state: 'locked',
        price: 900,
    },
    {
        id: 'annual-reports',
        emoji: '📑',
        title: 'Prepare annual reports',
        description: 'Automates annual report preparation and formatting.',
        color: '#3ed6a6',
        state: 'locked',
        price: 1500,
    },
    {
        id: 'payroll',
        emoji: '💸',
        title: 'Run payroll every month',
        description: 'Automates monthly payroll processing and reporting.',
        color: '#fb7185',
        state: 'locked',
        price: 1200,
    },
    {
        id: 'anomalies',
        emoji: '🔬',
        title: 'Advice about anomalies',
        description: 'Identifies unusual patterns and provides actionable insights.',
        color: '#a78bfa',
        state: 'locked',
        price: 1400,
    },
];

export const INITIAL_SPACES: Space[] = [
    {
        id: 'revenue',
        title: 'Revenue Dashboard',
        description: 'Monthly revenue trends and forecasting analysis',
        updated: 'Jan 20, 2025',
        messages: 12,
        emoji: '📊',
    },
    {
        id: 'expense',
        title: 'Expense Report Form',
        description: 'Employee expense submission and approval workflow',
        updated: 'Jan 18, 2025',
        messages: 8,
        emoji: '🧾',
    },
    {
        id: 'invoice',
        title: 'Invoice Template',
        description: 'Custom invoice template for client billing',
        updated: 'Jan 15, 2025',
        messages: 15,
        emoji: '📄',
    },
];

// Client agreements in the accounting office's portfolio
export const AGREEMENTS: { id: string; name: string }[] = [
    { id: 'dmp', name: 'Digital Marketing Pro' },
    { id: 'nordic', name: 'Nordic Build ApS' },
    { id: 'cafe', name: 'Café Solsikke' },
    { id: 'tech', name: 'Tech Equipment AS' },
    { id: 'office', name: 'Office Supplies Co' },
    { id: 'cloud', name: 'Cloud Hosting Ltd' },
    { id: 'bryg', name: 'Bryg & Co ApS' },
    { id: 'lys', name: 'Lys Design' },
];

export const CHAT_SUGGESTIONS = [
    'Which invoices are overdue by more than 30 days?',
    'Show my chart of accounts',
    'List my customers and their balances',
    'Summarise my project budgets',
    'Show the quote-to-cash pipeline',
    'Generate an aged receivables report for all clients',
];
