import { useState, useMemo, type ReactNode } from 'react';
import { Button, Icon, Switch } from '@economic/taco';
import { Card, Dot, EmojiTile, PageHeader, StickyFooter, asset, COLORS } from '../ui';
import { ReviewItemCard, type ReviewCardData } from '../ReviewItemCard';
import { AGREEMENTS } from '../data';
import { useLang } from '../i18n';
import type { Skill } from '../types';

interface Props {
    skills: Skill[];
    onEnable: (id: string) => void;
}

const SKILL_META: Record<string, { category: string; features: string[] }> = {
    reconciliation: { category: 'Accounting', features: ['Matches each bank payment to its open invoice', 'Creates the accounting entry on the right account', 'Books matched transactions automatically', 'Flags anything it can’t match for your review'] },
    monitor: { category: 'Insights', features: ['Analyses each client’s financials daily', 'Identifies trends, risks and opportunities', 'Posts actionable suggestions to your Review feed'] },
    reminders: { category: 'Invoicing', features: ['Finds invoices overdue by 30+ days', 'Drafts a tailored reminder per customer', 'Sends it and logs a note on the invoice', 'Follows up automatically if still unpaid'] },
    documents: { category: 'Accounting', features: ['Detects missing receipts and documents', 'Requests them from the client', 'Files each document against the right entry'] },
    'close-books': { category: 'Accounting', features: ['Runs month-end and year-end close', 'Reconciles control accounts', 'Generates a closing report for review'] },
    regulations: { category: 'Compliance', features: ['Monitors Danish & EU regulation changes', 'Flags what affects your clients', 'Summarises the required actions'] },
    'annual-reports': { category: 'Accounting', features: ['Drafts the annual report', 'Formats to the statutory layout', 'Prepares it for your approval'] },
    payroll: { category: 'Payroll', features: ['Runs monthly payroll', 'Files to your payroll provider', 'Books the salary journals'] },
    anomalies: { category: 'Insights', features: ['Detects unusual transactions', 'Explains why they stand out', 'Suggests how to handle them'] },
};

// ---- Capabilities: what Eva can do — e-conomic native (built in) + 3rd-party partner skills ----
interface Capability {
    id: string;
    name: string;
    logo: string; // public asset path
    bg: string; // tile background behind the logo
    category: string;
    native: boolean; // e-conomic native → installed by default, can't be removed
    desc: string;
    skills: string[];
}

const CAPABILITIES: Capability[] = [
    // e-conomic native — the foundation, presented as already installed
    { id: 'economic', name: 'e-conomic', logo: 'econ-logo.png', bg: '#fff7ed', category: 'Core', native: true,
        desc: 'Native access to your e-conomic ledger — the foundation Eva builds every flow on.',
        skills: ['Bookkeeping & bank reconciliation', 'Invoicing, customers & reminders', 'Suppliers, bills & payments', 'Documents, receipts & OCR', 'Reporting, VAT & period close'] },
    // 3rd-party partners — installable from the e-conomic marketplace
    { id: 'likvido', name: 'Likvido', logo: 'partners/likvido.svg', bg: '#eef0f7', category: 'Receivables', native: false,
        desc: 'Automated debtor management, reminders and debt collection.',
        skills: ['Escalate overdue invoices to collection', 'Offer invoice financing', 'Reconcile Likvido payouts'] },
    { id: 'budget123', name: 'Budget123', logo: 'partners/budget123.svg', bg: '#eef6fc', category: 'Planning', native: false,
        desc: 'Budgeting, forecasting and liquidity planning on top of your books.',
        skills: ['Build budgets & forecasts', 'Project liquidity', 'Track budget variance'] },
    { id: 'creditro', name: 'Creditro', logo: 'partners/creditro.svg', bg: '#eaf2f6', category: 'Compliance', native: false,
        desc: 'Automated KYC, AML and credit checks for client onboarding.',
        skills: ['Run KYC & AML checks', 'Monitor credit ratings', 'Flag compliance risks'] },
    { id: 'rackbeat', name: 'RackBeat', logo: 'partners/rackbeat.svg', bg: '#f0eef7', category: 'Inventory', native: false,
        desc: 'Inventory and warehouse management synced with your ledger.',
        skills: ['Sync inventory & stock levels', 'Create purchase orders', 'Book cost of goods sold'] },
];

// ---- Performance tab — how much Eva is automating, time saved, breakdown by job ----
const PERF = {
    automatedPct: 82,
    hoursSaved: 148,
    actions: 1240,
    reviewRate: 8,
    // Core jobs to be done — actions handled, hours saved, share fully automated.
    jobs: [
        { name: 'Bank reconciliation', actions: 612, hours: 71, pct: 94 },
        { name: 'Payment reminders', actions: 318, hours: 22, pct: 99 },
        { name: 'Document collection', actions: 142, hours: 18, pct: 78 },
        { name: 'Client monitoring', actions: 96, hours: 24, pct: 61 },
        { name: 'Anomaly detection', actions: 48, hours: 9, pct: 42 },
        { name: 'Period close', actions: 24, hours: 4, pct: 70 },
    ],
    extra: [
        { label: 'Avg. confidence', value: '91%' },
        { label: 'Auto-resolved', value: '1,032' },
        { label: 'Active flows', value: '4' },
        { label: 'Clients covered', value: '8' },
    ],
    // What Eva could take over but isn't yet — surfaced to drive adoption.
    untappedHours: 18,
    opportunities: [
        { name: 'Match supplier payments', saving: '~6 hrs / mo', note: 'Still matched by hand across 5 clients.', kind: 'flow' as const },
        { name: 'Prepare VAT settlements', saving: '~4 hrs / quarter', note: 'Eva can draft and pre-check before you file.', kind: 'flow' as const },
        { name: 'Chase missing documents', saving: '~3 hrs / mo', note: 'Only partly automated for 3 clients.', kind: 'flow' as const },
        { name: 'Forecast client liquidity', saving: '~5 hrs / mo', note: 'Needs the Budget123 capability installed.', kind: 'capability' as const },
    ],
};

// ---- Flow templates shown in the "Create New Flow" modal ----
interface FlowTemplate {
    id: string;
    title: string;
    emoji: string;
    category: string;
    capId?: string; // partner capability required (upsell)
    price: number; // kr / month after the trial
    trialDays: number;
    desc: string;
    starter: string; // FLOW_STARTERS id
    conditions?: string[]; // gates that must be true to continue
    steps: FlowStep[]; // actions
}

// Common gating conditions offered when building a flow.
const CONDITION_LIBRARY = [
    'Confidence is 95% or higher',
    'Amount is below the auto-booking threshold',
    'No duplicate is found',
    'Supplier is already known',
    'Within the expense policy',
    'VAT zone is domestic',
    'Document type is a supplier invoice',
    'Receipt is still missing after 3 days',
];

// Step factory — picks an icon from the approach (rule / eva / review). LLM steps are Eva's.
let stSeq = 0;
function st(label: string, approach: StepApproach, capId?: string): FlowStep {
    const icon = capId ? 'connection-enable' : approach === 'eva' ? 'ai-stars' : approach === 'review' ? 'person' : 'settings';
    return { id: `st-${stSeq++}`, icon, label, approach, capId };
}

const FLOW_TEMPLATES: FlowTemplate[] = [
    // ---- Accounting & bookkeeping ----
    { id: 't-voucher', title: 'Smart voucher creation', emoji: '🧾', category: 'Bookkeeping', price: 399, trialDays: 30,
        desc: 'Turn scanned and electronic documents into booked vouchers automatically.',
        conditions: ['Confidence is 95% or higher', 'Amount is below the auto-booking threshold'],
        starter: 'document', steps: [
            st('Receive document in Smart Inbox', 'rule'),
            st('Classify document type', 'eva'),
            st('Extract key data', 'eva'),
            st('Determine correct accounts', 'eva'),
            st('Apply VAT codes', 'eva'),
            st('Determine contra account', 'rule'),
            st('Create draft voucher', 'rule'),
            st('Auto-book or route for review', 'review'),
        ] },
    { id: 't-bulk', title: 'Bulk import & booking', emoji: '📚', category: 'Bookkeeping', price: 349, trialDays: 30,
        desc: 'Clear large batches of Inbox items at period-end, hands-off where confident.',
        starter: 'schedule', steps: [
            st('Identify batch need', 'rule'),
            st('Prioritise by urgency', 'eva'),
            st('Process each via Smart voucher creation', 'rule'),
            st('Batch review summary', 'eva'),
            st('Present review queue', 'review'),
        ] },
    { id: 't-recon', title: 'AI bank reconciliation', emoji: '🏦', category: 'Bookkeeping', price: 399, trialDays: 30,
        desc: 'Match bank transactions to entries — exact, fuzzy, and missing entries handled.',
        starter: 'bank', steps: [
            st('Import bank statement', 'rule'),
            st('Exact-match on amount, date & reference', 'rule'),
            st('Fuzzy-match ambiguous transactions', 'eva'),
            st('Create missing entries', 'eva'),
            st('Handle partial matches', 'eva'),
            st('Review and confirm', 'review'),
        ] },
    { id: 't-supplier', title: 'Supplier invoice processor', emoji: '📨', category: 'Suppliers', price: 349, trialDays: 30,
        desc: 'Read, validate and book supplier invoices, with duplicate detection.',
        conditions: ['No duplicate is found'],
        starter: 'document', steps: [
            st('Receive supplier invoice', 'rule'),
            st('Identify & validate supplier', 'eva'),
            st('Extract & validate amounts', 'eva'),
            st('Determine booking accounts', 'eva'),
            st('Check for duplicates', 'rule'),
            st('Create voucher', 'rule'),
            st('Route for approval', 'review'),
        ] },
    { id: 't-payrun', title: 'Payment run optimiser', emoji: '💸', category: 'Suppliers', price: 299, trialDays: 30,
        desc: 'Select, time and export supplier payments to capture early-payment discounts.',
        starter: 'schedule', steps: [
            st('Gather open creditor entries', 'rule'),
            st('Optimise payment timing', 'eva'),
            st('Group by bank & method', 'rule'),
            st('Generate payment file', 'rule'),
            st('Book payment entries', 'rule'),
        ] },
    { id: 't-close', title: 'Period close checklist', emoji: '✅', category: 'Period close', price: 399, trialDays: 30,
        desc: 'Track period-end tasks, surface risks, and auto-resolve what it can.',
        starter: 'monthend', steps: [
            st('Determine period-end date', 'rule'),
            st('Run completeness checks', 'rule'),
            st('Identify risk areas', 'eva'),
            st('Generate checklist', 'eva'),
            st('Auto-resolve where possible', 'rule'),
            st('Route remaining items', 'review'),
        ] },
    { id: 't-yearend', title: 'Year-end automation', emoji: '📆', category: 'Period close', price: 499, trialDays: 30,
        desc: 'Run the årsafslutning — closing entries, primo, lock and validation.',
        conditions: ['Confidence is 95% or higher'],
        starter: 'monthend', steps: [
            st('Verify year-end readiness', 'rule'),
            st('Generate closing entries', 'eva'),
            st('Create primo entries', 'rule'),
            st('Lock completed year', 'rule'),
            st('Validate transition', 'eva'),
            st('Final review', 'review'),
        ] },
    // ---- Expense management ----
    { id: 't-firmakort', title: 'Firmakort auto-booking', emoji: '💳', category: 'Expenses', price: 349, trialDays: 30,
        desc: 'Match Firmakort transactions to receipts, classify and book them.',
        conditions: ['Within the expense policy'],
        starter: 'bank', steps: [
            st('Import Firmakort transaction', 'rule'),
            st('Request receipt if missing', 'rule'),
            st('Match receipt to transaction', 'eva'),
            st('Classify expense', 'eva'),
            st('Policy check', 'eva'),
            st('Create & book entry', 'rule'),
            st('Route violations', 'review'),
        ] },
    { id: 't-receipts', title: 'Missing receipt chaser', emoji: '📎', category: 'Expenses', price: 149, trialDays: 30,
        desc: 'Chase cardholders for missing receipts and escalate when ignored.',
        conditions: ['Receipt is still missing after 3 days'],
        starter: 'schedule', steps: [
            st('Detect unmatched transactions', 'rule'),
            st('Send first reminder', 'rule'),
            st('Follow up', 'eva'),
            st('Escalate to manager', 'rule'),
            st('Auto-categorise without receipt', 'eva'),
        ] },
    // ---- VAT & tax ----
    { id: 't-vatfile', title: 'VAT return auto-filing', emoji: '🧮', category: 'VAT & Tax', price: 449, trialDays: 30,
        desc: 'Calculate, reconcile, validate and file the VAT return to SKAT.',
        conditions: ['VAT zone is domestic'],
        starter: 'schedule', steps: [
            st('Calculate VAT return', 'rule'),
            st('Perform momsafstemning', 'eva'),
            st('Validate before filing', 'eva'),
            st('Mark as indberettet', 'rule'),
            st('File to SKAT', 'rule'),
            st('Book VAT payment / repayment', 'rule'),
        ] },
    { id: 't-vatrecon', title: 'VAT reconciliation', emoji: '🔍', category: 'VAT & Tax', price: 299, trialDays: 30,
        desc: 'Reconcile VAT account balances against the calculation before filing.',
        starter: 'schedule', steps: [
            st('Pull VAT account balances', 'rule'),
            st('Pull VAT calculation', 'rule'),
            st('Compare per VAT code', 'rule'),
            st('Investigate discrepancies', 'eva'),
            st('Suggest corrections', 'eva'),
            st('Present report', 'review'),
        ] },
    // ---- Partner-capability flows (upsell) ----
    { id: 't-likvido', title: 'Automated debt collection', emoji: '💸', category: 'Receivables', capId: 'likvido', price: 299, trialDays: 30,
        desc: 'Escalate overdue invoices to Likvido collection and reconcile the payouts automatically.',
        conditions: ['Amount is below the auto-booking threshold'],
        starter: 'overdue', steps: [
            st('Find invoices past the dunning limit', 'rule'),
            st('Escalate to collection', 'rule', 'likvido'),
            st('Reconcile Likvido payouts', 'rule', 'likvido'),
        ] },
    { id: 't-budget123', title: 'Liquidity forecast & alerts', emoji: '📈', category: 'Planning', capId: 'budget123', price: 249, trialDays: 30,
        desc: 'Project client liquidity with Budget123 and alert you when runway drops.',
        starter: 'schedule', steps: [
            st('Pull the latest actuals', 'rule'),
            st('Build a liquidity forecast', 'eva', 'budget123'),
            st('Alert when runway is under 2 months', 'eva'),
        ] },
    { id: 't-creditro', title: 'Client KYC & onboarding', emoji: '🛡️', category: 'Compliance', capId: 'creditro', price: 349, trialDays: 30,
        desc: 'Run KYC and AML checks with Creditro when onboarding a new client.',
        starter: 'chat', steps: [
            st('Run KYC & AML checks', 'rule', 'creditro'),
            st('Check the credit rating', 'rule', 'creditro'),
            st('Flag compliance risks for review', 'review'),
        ] },
    { id: 't-rackbeat', title: 'Stock-aware reordering', emoji: '📦', category: 'Inventory', capId: 'rackbeat', price: 279, trialDays: 30,
        desc: 'Keep stock in sync with RackBeat and raise purchase orders before you run out.',
        conditions: ['No duplicate is found'],
        starter: 'schedule', steps: [
            st('Sync stock levels', 'rule', 'rackbeat'),
            st('Create a purchase order', 'rule', 'rackbeat'),
            st('Book cost of goods', 'rule'),
        ] },
];

interface LocalFlow { skill: Skill; seed: { starter: string; conditions: string[]; steps: FlowStep[] } }
let flowSeq = 100;

const AUTO_TABS = [
    { k: 'flows', label: 'Flows' },
    { k: 'capabilities', label: 'Capabilities' },
] as const;
type AutoTab = (typeof AUTO_TABS)[number]['k'];

export default function AutomationsView({ skills, onEnable }: Props) {
    const { t } = useLang();
    const [tab, setTab] = useState<AutoTab>('flows');
    const [openId, setOpenId] = useState<string | null>(null);
    const [newFlow, setNewFlow] = useState(false);
    // Installed partner capabilities (e-conomic native is always present).
    const [installedCaps, setInstalledCaps] = useState<Set<string>>(new Set());
    const [capGallery, setCapGallery] = useState(false);
    const [openCapId, setOpenCapId] = useState<string | null>(null);
    // Flows created in this session (from scratch or a template), plus which are on trial.
    const [localFlows, setLocalFlows] = useState<LocalFlow[]>([]);
    const [trials, setTrials] = useState<Set<string>>(new Set());

    const enabled = skills.filter((s) => s.state !== 'locked');
    const allFlows = [...enabled, ...localFlows.map((f) => f.skill)];

    function createScratch() {
        const id = `flow-${flowSeq++}`;
        const skill: Skill = { id, title: 'Untitled flow', description: 'A custom flow you built from scratch.', emoji: '🛠️', color: '#7c6cf6', state: 'active', stat: 'Just created' };
        setLocalFlows((prev) => [{ skill, seed: { starter: 'schedule', conditions: [], steps: [] } }, ...prev]);
        setNewFlow(false);
        setOpenId(id);
    }
    function startTrial(tpl: FlowTemplate) {
        const id = `flow-${flowSeq++}`;
        const skill: Skill = { id, title: tpl.title, description: tpl.desc, emoji: tpl.emoji, color: '#7c6cf6', state: 'active', stat: 'Trial' };
        setLocalFlows((prev) => [{ skill, seed: { starter: tpl.starter, conditions: tpl.conditions ?? [], steps: tpl.steps } }, ...prev]);
        setTrials((prev) => new Set(prev).add(id));
        if (tpl.capId) setInstalledCaps((prev) => new Set(prev).add(tpl.capId!)); // the trial includes the partner capability
        setNewFlow(false);
        setOpenId(id);
    }
    function upgradeFlow(id: string) {
        setTrials((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }

    const openFlow = openId ? allFlows.find((s) => s.id === openId) ?? null : null;
    if (openFlow) {
        const seed = localFlows.find((f) => f.skill.id === openFlow.id)?.seed;
        return (
            <FlowDetail
                skill={openFlow}
                seed={seed}
                trial={trials.has(openFlow.id)}
                onUpgrade={() => upgradeFlow(openFlow.id)}
                onBack={() => setOpenId(null)}
                onEnable={() => onEnable(openFlow.id)}
                installed={installedCaps}
            />
        );
    }

    const openCap = openCapId ? CAPABILITIES.find((c) => c.id === openCapId) ?? null : null;
    if (openCap) {
        return <CapabilityDetail cap={openCap} onBack={() => setOpenCapId(null)} />;
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Automations are set up for the practice, not per client — no scope pill here. */}
            <PageHeader
                title={t('Automations')}
                showScope={false}
                right={
                    tab === 'flows' ? <Button appearance="primary" onClick={() => setNewFlow(true)}><Icon name="circle-plus" /> {t('New flow')}</Button>
                    : tab === 'capabilities' ? <Button appearance="primary" onClick={() => setCapGallery(true)}><Icon name="circle-plus" /> {t('New capability')}</Button>
                    : undefined
                }
            />
            <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                {/* top-level tabs */}
                <div className="flex items-center gap-7 mb-6" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    {AUTO_TABS.map((tb) => {
                        const on = tab === tb.k;
                        return (
                            <button
                                key={tb.k}
                                onClick={() => setTab(tb.k)}
                                className="relative"
                                style={{ padding: '10px 2px', fontSize: 15, fontWeight: 600, color: on ? COLORS.text : COLORS.textMuted }}
                            >
                                {t(tb.label)}
                                {on && <span className="absolute left-0 right-0" style={{ bottom: -1, height: 2, background: COLORS.text, borderRadius: 2 }} />}
                            </button>
                        );
                    })}
                </div>

                {tab === 'flows' && (
                    <>
                        <div className="mb-6"><PerfKpis /></div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>{t('Your flows')}</p>
                        {allFlows.length === 0 ? (
                            <Card className="p-10 text-center">
                                <p className="text-sm" style={{ color: COLORS.textMuted }}>{t('No flows set up yet. Start one from a template.')}</p>
                            </Card>
                        ) : (
                            <div className="flex flex-col gap-3 pb-10">
                                {allFlows.map((s) => (
                                    <FlowRow key={s.id} skill={s} trial={trials.has(s.id)} onOpen={() => setOpenId(s.id)} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {tab === 'capabilities' && <CapabilitiesMarket installed={installedCaps} onAdd={() => setCapGallery(true)} onOpen={(id) => setOpenCapId(id)} />}
            </div>

            {newFlow && (
                <NewFlowModal
                    installed={installedCaps}
                    onScratch={createScratch}
                    onStartTrial={startTrial}
                    onClose={() => setNewFlow(false)}
                />
            )}

            {capGallery && (
                <CapabilityGallery
                    installed={installedCaps}
                    onInstall={(id) => setInstalledCaps((prev) => new Set(prev).add(id))}
                    onClose={() => setCapGallery(false)}
                />
            )}
        </div>
    );
}

// ---- Capabilities tab — installed capabilities (e-conomic native + any installed partners) ----
function CapabilitiesMarket({ installed, onAdd, onOpen }: { installed: Set<string>; onAdd: () => void; onOpen: (id: string) => void }) {
    const { t } = useLang();
    // One merged grid: e-conomic native + any installed partners, no section split.
    const installedCaps = CAPABILITIES.filter((c) => c.native || installed.has(c.id));
    return (
        <div className="pb-10">
            <div className="grid grid-cols-3 gap-3.5">
                {installedCaps.map((c) => <CapabilityCard key={c.id} cap={c} installed onInstall={() => {}} onOpen={() => onOpen(c.id)} />)}
                <button
                    onClick={onAdd}
                    className="rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center"
                    style={{ border: `1.5px dashed ${COLORS.cardBorder}`, background: '#fafafa', minHeight: 150 }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c4c4cc')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.cardBorder)}
                >
                    <Icon name="circle-plus" style={{ color: COLORS.textMuted }} />
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t('Add a capability')}</p>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('Install skills from e-conomic partners.')}</p>
                </button>
            </div>
        </div>
    );
}

// ---- "New capability" marketplace gallery (install partner capabilities) ----
function CapabilityGallery({ installed, onInstall, onClose }: { installed: Set<string>; onInstall: (id: string) => void; onClose: () => void }) {
    const { t } = useLang();
    const partners = CAPABILITIES.filter((c) => !c.native);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div
                className="bg-white rounded-2xl flex flex-col overflow-hidden anim-in"
                style={{ width: 'min(840px, 94vw)', maxHeight: '88vh', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Add a capability')}</h2>
                        <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t('Install skills from the e-conomic partner marketplace.')}</p>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </header>
                <div className="overflow-y-auto p-5">
                    <div className="grid grid-cols-2 gap-4">
                        {partners.map((c) => <CapabilityCard key={c.id} cap={c} installed={installed.has(c.id)} onInstall={() => onInstall(c.id)} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Per-flow performance (keyed by skill id) — ties each flow to its own automation stats.
const FLOW_PERF: Record<string, { actions: number; hours: number; pct: number }> = {
    reconciliation: { actions: 612, hours: 71, pct: 94 },
    reminders: { actions: 318, hours: 22, pct: 99 },
    documents: { actions: 142, hours: 18, pct: 78 },
    monitor: { actions: 96, hours: 24, pct: 61 },
    'close-books': { actions: 24, hours: 4, pct: 70 },
    anomalies: { actions: 48, hours: 9, pct: 42 },
};

// Headline KPI cards, shared by the Performance tab and the top of Flows.
function PerfKpis() {
    const { t, lang } = useLang();
    const nf = (n: number) => n.toLocaleString(lang === 'da' ? 'da-DK' : 'en-US');
    const kpis = [
        { value: `${PERF.automatedPct}%`, label: t('Automated'), sub: t('of all actions handled without you'), accent: '#16a34a' },
        { value: `${PERF.hoursSaved} ${t('hrs')}`, label: t('Time saved'), sub: t('this quarter · ≈ 4 working weeks'), accent: '#6366f1' },
        { value: nf(PERF.actions), label: t('Actions taken'), sub: t('across 8 clients'), accent: COLORS.text },
        { value: `${PERF.reviewRate}%`, label: t('Flagged for review'), sub: t('needed your input'), accent: '#b9842b' },
    ];
    return (
        <div className="grid grid-cols-4 gap-3">
            {kpis.map((k) => (
                <Card key={k.label} className="p-4">
                    <p className="text-2xl font-semibold leading-none" style={{ color: k.accent }}>{k.value}</p>
                    <p className="text-sm font-medium mt-2" style={{ color: COLORS.text }}>{k.label}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: COLORS.textMuted }}>{k.sub}</p>
                </Card>
            ))}
        </div>
    );
}

function CapabilityLogo({ cap, size = 40 }: { cap: Capability; size?: number }) {
    return (
        <span className="flex items-center justify-center shrink-0 rounded-xl overflow-hidden" style={{ width: size, height: size, background: cap.bg, border: `1px solid ${COLORS.cardBorder}` }}>
            <img src={asset(cap.logo)} alt={cap.name} style={{ maxWidth: '74%', maxHeight: '58%', width: 'auto', height: 'auto', display: 'block' }} />
        </span>
    );
}

function CapabilityCard({ cap, installed, onInstall, onOpen }: { cap: Capability; installed: boolean; onInstall: () => void; onOpen?: () => void }) {
    const { t } = useLang();
    const clickable = !!onOpen && installed;
    return (
        <Card className="p-4 flex flex-col" hover={clickable} onClick={clickable ? onOpen : undefined} style={{ minHeight: 150 }}>
            <div className="flex items-start gap-2.5">
                <CapabilityLogo cap={cap} size={32} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: COLORS.text }}>{cap.name}</p>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t(cap.category)} · {cap.skills.length} {t('skills')}</span>
                </div>
            </div>
            <p className="text-xs mt-2 leading-snug" style={{ color: COLORS.textMuted }}>{t(cap.desc)}</p>
            <div className="mt-auto pt-3 flex items-center justify-between">
                {cap.native ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.textMuted }}>
                        <Icon name="lock" /> {t('Built in')}
                    </span>
                ) : installed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: '#15803d' }}>
                        <Icon name="circle-tick" /> {t('Installed')}
                    </span>
                ) : (
                    <Button appearance="primary" onClick={(e) => { e.stopPropagation(); onInstall(); }}>
                        <Icon name="circle-plus" /> {t('Install')}
                    </Button>
                )}
                {clickable && <Icon name="chevron-right" style={{ color: '#c4c4cc' }} />}
            </div>
        </Card>
    );
}

// ---- Capability detail — granular config for an installed capability ----
function CapabilityDetail({ cap, onBack }: { cap: Capability; onBack: () => void }) {
    const { t } = useLang();
    const [off, setOff] = useState<Set<string>>(new Set());
    const [clientMode, setClientMode] = useState<'all' | 'selected'>('all');
    const [clientSel, setClientSel] = useState<Set<string>>(() => new Set(AGREEMENTS.slice(0, 3).map((a) => a.id)));
    const toggleSkill = (s: string) =>
        setOff((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            return next;
        });
    const toggleClient = (id: string) =>
        setClientSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <PageHeader title={cap.name} onBack={onBack} backLabel={t('Capabilities')} showScope={false} />
                <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                    {/* intro */}
                    <div className="flex items-start gap-3 mb-6">
                        <CapabilityLogo cap={cap} size={44} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>{t(cap.category)}</span>
                                <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: cap.native ? COLORS.textMuted : '#15803d' }}>
                                    <Icon name={cap.native ? 'lock' : 'circle-tick'} /> {cap.native ? t('Built in · always on') : t('Installed')}
                                </span>
                            </div>
                            <p className="text-sm mt-1.5" style={{ color: COLORS.textMuted }}>{t(cap.desc)}</p>
                        </div>
                    </div>

                    {/* granular per-skill control */}
                    <Section title={t('Skills')} sub={cap.native ? t('Turn individual e-conomic skills off to put them out of Eva’s reach.') : t('Choose which of this partner’s skills Eva may use.')}>
                        <div className="flex flex-col gap-2">
                            {cap.skills.map((s) => {
                                const on = !off.has(s);
                                return (
                                    <div key={s} className="flex items-center gap-3 rounded-xl p-3" style={{ border: `1px solid ${COLORS.cardBorder}`, background: on ? '#fff' : '#fafafa' }}>
                                        <Icon name="circle-tick" style={{ color: on ? '#16a34a' : '#c4c4cc' }} />
                                        <span className="flex-1 text-sm" style={{ color: on ? COLORS.text : '#a8a8b0', textDecoration: on ? 'none' : 'line-through' }}>{t(s)}</span>
                                        <Switch checked={on} onChange={() => toggleSkill(s)} />
                                    </div>
                                );
                            })}
                        </div>
                    </Section>

                    {/* where it may act */}
                    <Section title={t('Applies to')} sub={t('Choose which clients this capability may act on.')}>
                        <div className="grid grid-cols-2 gap-3">
                            <OptionCard selected={clientMode === 'all'} icon="contacts" title={t('All clients')} desc={t('Runs across every client agreement, including new ones.')} onClick={() => setClientMode('all')} />
                            <OptionCard selected={clientMode === 'selected'} icon="person" title={t('Selected clients')} desc={t('Pick the agreements this capability may use.')} onClick={() => setClientMode('selected')} />
                        </div>
                        {clientMode === 'selected' && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {AGREEMENTS.map((a) => {
                                    const on = clientSel.has(a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => toggleClient(a.id)}
                                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                                            style={{ border: `1px solid ${on ? COLORS.text : COLORS.cardBorder}`, background: on ? COLORS.text : '#fff', color: on ? '#fff' : COLORS.text }}
                                        >
                                            {on && <Icon name="tick" />}
                                            {a.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            </div>

            <StickyFooter>
                {cap.native ? <span /> : (
                    <Button onClick={onBack}><Icon name="delete" /> {t('Uninstall')}</Button>
                )}
                <Button appearance="primary" onClick={onBack}>{t('Save changes')}</Button>
            </StickyFooter>
        </div>
    );
}

// Full-width flow row: icon, title, its own automation stat, status, open.
function FlowRow({ skill, trial, onOpen }: { skill: Skill; trial?: boolean; onOpen: () => void }) {
    const { t, lang } = useLang();
    const nf = (n: number) => n.toLocaleString(lang === 'da' ? 'da-DK' : 'en-US');
    const active = skill.state === 'active';
    const p = FLOW_PERF[skill.id];
    const perfLine = p
        ? `${p.pct}% ${t('automated')} · ${nf(p.actions)} ${t('actions')} · ${p.hours} ${t('hrs')} ${t('saved')}`
        : t('No runs yet');
    return (
        <Card className="px-4 py-3.5 flex items-center gap-4" hover onClick={onOpen}>
            <EmojiTile emoji={skill.emoji} size={36} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{t(skill.title)}</p>
                <div className="flex items-center gap-2.5 mt-1">
                    {p && (
                        <span className="rounded-full" style={{ width: 64, height: 6, background: '#f1f1f3', display: 'inline-block', position: 'relative' }}>
                            <span className="rounded-full" style={{ position: 'absolute', left: 0, top: 0, height: 6, width: `${p.pct}%`, background: p.pct >= 80 ? '#16a34a' : p.pct >= 60 ? '#6366f1' : '#b9842b' }} />
                        </span>
                    )}
                    <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{perfLine}</p>
                </div>
            </div>
            {trial ? (
                <span className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: '#fbf3e0', color: '#b9842b' }}>{t('Trial')}</span>
            ) : (
                <span className="flex items-center gap-1.5 text-sm shrink-0" style={{ color: active ? COLORS.text : COLORS.textMuted }}>
                    <Dot color={active ? '#16a34a' : '#a8a8b0'} />
                    {active ? t('Active') : t('Idle')}
                </span>
            )}
            <Icon name="chevron-right" style={{ color: '#c4c4cc' }} />
        </Card>
    );
}

// ---- Flow builder / configuration page ----

const AUTONOMY = [
    { key: 'suggest', icon: 'lightbulb', title: 'Suggest only', desc: 'Drafts proposals and leaves them for you in Review.' },
    { key: 'approval', icon: 'document-approve', title: 'Act with my approval', desc: 'Proposes a plan and acts once you approve it.' },
    { key: 'auto', icon: 'play', title: 'Fully autonomous', desc: 'Acts on its own and logs everything to Review.' },
];

// Flow builder primitives — a starter (trigger) and a library of steps.
// approach: how the step runs — a deterministic rule, Eva (the AI), or human-in-the-loop review.
type StepApproach = 'rule' | 'eva' | 'review';
interface FlowStep { id: string; icon: string; label: string; capId?: string; approach?: StepApproach }

const FLOW_STARTERS = [
    { id: 'schedule', icon: 'time', label: 'On a schedule' },
    { id: 'bank', icon: 'transfer', label: 'When a bank transaction arrives' },
    { id: 'overdue', icon: 'document', label: 'When an invoice becomes overdue' },
    { id: 'document', icon: 'attach', label: 'When a document is received' },
    { id: 'monthend', icon: 'calendar', label: 'When the month closes' },
    { id: 'chat', icon: 'chat', label: 'When I ask in chat' },
];

// e-conomic-native steps (always available)
const ECONOMIC_STEPS: FlowStep[] = [
    { id: 'read-invoices', icon: 'document', label: 'Read open invoices' },
    { id: 'match-bank', icon: 'transfer', label: 'Match a bank transaction' },
    { id: 'create-entry', icon: 'plus-minus', label: 'Create a journal entry' },
    { id: 'draft-reminder', icon: 'envelope', label: 'Draft a payment reminder' },
    { id: 'send-reminder', icon: 'envelope', label: 'Send a reminder & log a note' },
    { id: 'request-doc', icon: 'attach', label: 'Request a document from the client' },
    { id: 'generate-report', icon: 'chart-bar', label: 'Generate a report' },
    { id: 'flag-review', icon: 'circle-warning', label: 'Flag for review' },
];
// Eva AI reasoning steps (always available)
const AI_STEPS: FlowStep[] = [
    { id: 'ai-decide', icon: 'ai-stars', label: 'Ask Eva to decide' },
    { id: 'ai-summarize', icon: 'ai-stars', label: 'Summarize' },
    { id: 'ai-extract', icon: 'ai-stars', label: 'Extract data' },
];

interface SkillConfig {
    trigger: string;
    event?: string;
    frequency?: string;
    time?: string;
    autonomy: string;
    guardrail: boolean;
    threshold?: string;
    notify: boolean;
}

// Sensible, job-appropriate defaults for each skill's automation
const SKILL_CONFIG: Record<string, SkillConfig> = {
    // Books bank transactions automatically → fire on each transaction, act on its own but stop for big entries
    reconciliation: { trigger: 'event', event: 'A new bank transaction arrives', autonomy: 'auto', guardrail: true, threshold: '25.000', notify: true },
    // Continuously watches client financials and only ever suggests
    monitor: { trigger: 'continuous', autonomy: 'suggest', guardrail: false, notify: true },
    // Reacts the moment an invoice goes overdue and sends on its own (no monetary risk)
    reminders: { trigger: 'event', event: 'An invoice becomes overdue', autonomy: 'auto', guardrail: false, notify: true },
    // Proactively chases documents on a weekly cadence
    documents: { trigger: 'schedule', frequency: 'Weekly', time: '09:00', autonomy: 'auto', guardrail: false, notify: true },
    // Closing the books is significant → run at month-end, propose a plan and wait for approval
    'close-books': { trigger: 'event', event: 'Month-end is reached', autonomy: 'approval', guardrail: true, threshold: '50.000', notify: true },
    // Always-on regulation watch, suggestions only
    regulations: { trigger: 'continuous', autonomy: 'suggest', guardrail: false, notify: true },
    // Annual report is on-demand and always reviewed before filing
    'annual-reports': { trigger: 'manual', autonomy: 'approval', guardrail: false, notify: true },
    // Payroll is sensitive → monthly, approval required, with a high-value guardrail
    payroll: { trigger: 'schedule', frequency: 'Monthly', time: '06:00', autonomy: 'approval', guardrail: true, threshold: '50.000', notify: true },
    // Anomaly detection runs continuously and only advises
    anomalies: { trigger: 'continuous', autonomy: 'suggest', guardrail: false, notify: true },
};

const DEFAULT_CONFIG: SkillConfig = { trigger: 'event', autonomy: 'approval', guardrail: true, notify: true };

// A representative item the skill would create — shown as a real Review card in the test result
const SKILL_REVIEW: Record<string, ReviewCardData> = {
    reconciliation: { confidence: 'medium', tag: '1 invoice', icon: 'transfer', title: 'Overførsel', sub: 'Customer: Digital Marketing Pro', amount: '6.750,00 DKK', date: '19. jan. 2025', matched: [{ label: 'Digital Marketing Pro', sub: 'Invoice #DMK-001 · 15. jan. 2025', amount: '6.570,00 DKK' }], callout: 'The invoice and payment match, but the customer paid 180 DKK too much — how should I handle the difference?' },
    monitor: { confidence: 'high', tag: 'Cash flow', icon: 'chart-line', title: 'Operating cash flow down 12% vs Q3', sub: 'Across your 14 active clients', amount: '−312.000 DKK', amountNegative: true, date: '31. jan. 2025', body: 'The dip is concentrated in 3 clients with slower receivable collection.' },
    reminders: { confidence: 'high', tag: '3 invoices', icon: 'envelope', title: '3 payment reminders drafted', sub: 'Overdue 30+ days · 74.200 DKK total', amount: '74.200 DKK', date: '30. jan. 2025', body: 'Drafts ready for Digital Marketing Pro, Nordic Build ApS and Café Solsikke.' },
    documents: { confidence: 'medium', tag: 'Missing', icon: 'attach', title: '23 documents requested', sub: 'Across 9 clients', date: '28. jan. 2025', body: '17 receipts and 6 supplier invoices requested from clients.' },
    'close-books': { confidence: 'high', tag: 'Period close', icon: 'reconciled', title: 'Period ready to close', sub: '6 control accounts reconciled', date: '31. jan. 2025', body: '2 adjustments proposed before closing — review them first.' },
    regulations: { confidence: 'medium', tag: 'Compliance', icon: 'circle-warning', title: 'VAT rule update affects 3 clients', sub: 'New SKAT guidance', date: '26. jan. 2025', body: 'Summary and the required actions are prepared for you.' },
    'annual-reports': { confidence: 'medium', tag: 'Report', icon: 'report', title: 'Annual report drafted', sub: 'Statutory layout · ready for review', date: '20. jan. 2025', body: '2 notes need your input before it can be filed.' },
    payroll: { confidence: 'high', tag: 'Payroll', icon: 'wallet', title: 'Payroll prepared for 12 employees', sub: 'Monthly run', amount: '480.000 DKK', date: '28. jan. 2025', body: 'All tax calculations validated · 0 discrepancies found.' },
    anomalies: { confidence: 'low', tag: 'Anomaly', icon: 'experiment', title: 'Unusual supplier charge detected', sub: 'Office Supplies Co · 3× the monthly average', amount: '14.900 DKK', date: '26. jan. 2025', body: 'Well above the historical pattern — worth a check before it gets booked.' },
};

// What a dry-run over the last 30 days would produce, per skill
const SKILL_TEST: Record<string, { summary: string; rows: string[] }> = {
    reconciliation: { summary: 'Matched and booked 142 of 150 bank transactions', rows: ['142 transactions matched to open invoices', '8 flagged for your review (ambiguous match)', '0 posting errors'] },
    monitor: { summary: 'Generated 12 insights across 14 clients', rows: ['3 clients flagged as at-risk', '5 cost-saving opportunities surfaced', '4 positive trends highlighted'] },
    reminders: { summary: 'Would send 8 reminders to 6 customers', rows: ['74.200 DKK of overdue invoices covered', 'Oldest overdue invoice: 42 days', '8 reminder drafts prepared'] },
    documents: { summary: 'Would request 23 missing documents', rows: ['17 receipts', '6 supplier invoices', 'Across 9 clients'] },
    'close-books': { summary: 'Closed the period in a dry run', rows: ['6 control accounts reconciled', '2 adjustments proposed', 'Closing report generated'] },
    regulations: { summary: 'Found 4 relevant regulation changes', rows: ['1 VAT rule update', '2 reporting-deadline changes', '1 change affecting 3 clients'] },
    'annual-reports': { summary: 'Drafted 1 annual report', rows: ['All statutory sections populated', '2 notes need your input', 'Ready for your review'] },
    payroll: { summary: 'Processed payroll for 12 employees (dry run)', rows: ['Total gross: 480.000 DKK', 'All tax calculations validated', '0 discrepancies found'] },
    anomalies: { summary: 'Detected 3 anomalies', rows: ['1 duplicate payment', '1 unusual supplier charge (3× average)', '1 out-of-pattern expense'] },
};

// What this skill has actually done — shown in the Activity tab of the detail page.
interface SkillEvent { daysAgo: number; time: string; client: string; desc: string; status: 'done' | 'flagged'; }

// Curated recent entries per skill (the most recent, true-to-life actions).
const SKILL_ACTIVITY: Record<string, SkillEvent[]> = {
    reconciliation: [
        { daysAgo: 0, time: '09:12', client: 'Nordic Build ApS', desc: 'Booked transaction #4521 to Account 2100 — Creditors', status: 'done' },
        { daysAgo: 0, time: '10:21', client: 'Café Solsikke', desc: 'Matched a MobilePay batch (42 transactions) to open invoices', status: 'done' },
        { daysAgo: 1, time: '16:30', client: 'Bryg & Co', desc: 'Booked transaction #4498 to Account 1000 — Sales', status: 'done' },
        { daysAgo: 1, time: '08:30', client: 'Lys Design', desc: 'Couldn’t match transaction #4502 — flagged for manual matching', status: 'flagged' },
        { daysAgo: 3, time: '09:50', client: 'Cloud SaaS', desc: 'Booked 6 subscription payments to Account 1000 — Sales', status: 'done' },
        { daysAgo: 14, time: '16:00', client: 'Tech Equipment AS', desc: 'Booked 12 transactions in bulk to Account 5000 — Cost of goods', status: 'done' },
    ],
    reminders: [
        { daysAgo: 0, time: '09:48', client: 'Digital Marketing Pro', desc: 'Sent reminder for #DMK-014 (12.500 DKK, 42 days overdue)', status: 'done' },
        { daysAgo: 1, time: '15:02', client: 'Nordic Build ApS', desc: 'Sent reminder for #NB-228 (34.200 DKK)', status: 'done' },
        { daysAgo: 3, time: '14:40', client: 'Office Supplies Co', desc: 'Sent a 2nd reminder for #OS-077 (24.900 DKK)', status: 'done' },
        { daysAgo: 18, time: '10:05', client: 'Café Solsikke', desc: 'Sent reminder for #CS-119 (4.300 DKK)', status: 'done' },
    ],
    documents: [
        { daysAgo: 0, time: '11:40', client: 'Tech Equipment AS', desc: 'Requested 5 missing receipts from the client', status: 'done' },
        { daysAgo: 1, time: '11:23', client: 'Café Solsikke', desc: 'Collected a receipt for entry #8821 and attached it', status: 'done' },
        { daysAgo: 5, time: '09:22', client: 'Bryg & Co', desc: 'Requested VAT documentation for the Q4 settlement', status: 'done' },
    ],
    monitor: [
        { daysAgo: 0, time: '12:15', client: 'Portfolio-wide', desc: 'Flagged operating cash flow down 12% vs Q3 across 3 clients', status: 'flagged' },
        { daysAgo: 3, time: '10:15', client: 'Digital Marketing Pro', desc: 'Raised revenue concentration risk — one client = 41%', status: 'flagged' },
        { daysAgo: 20, time: '08:40', client: 'Cloud SaaS', desc: 'Highlighted improving gross margin (+3.1 pp)', status: 'done' },
    ],
    anomalies: [
        { daysAgo: 0, time: '11:05', client: 'Office Supplies Co', desc: 'Flagged a 14.900 DKK supplier charge — 3× the monthly average', status: 'flagged' },
        { daysAgo: 1, time: '14:18', client: 'Tech Equipment AS', desc: 'Flagged a possible duplicate bill #TE-189', status: 'flagged' },
        { daysAgo: 16, time: '11:11', client: 'Café Solsikke', desc: 'Flagged cash runway under 2 months', status: 'flagged' },
    ],
    'close-books': [
        { daysAgo: 4, time: '13:05', client: 'Nordic Build ApS', desc: 'Prepared the month-end close checklist (18 items)', status: 'done' },
        { daysAgo: 42, time: '17:20', client: 'Bryg & Co', desc: 'Closed April — 6 control accounts reconciled', status: 'done' },
    ],
};

const ACTIVITY_CLIENTS = ['Nordic Build ApS', 'Café Solsikke', 'Bryg & Co', 'Lys Design', 'Cloud SaaS', 'Tech Equipment AS', 'Digital Marketing Pro', 'Office Supplies Co'];
const STAT_NOUN: Record<string, string> = {
    reconciliation: 'entries booked', monitor: 'insights generated', reminders: 'reminders sent',
    documents: 'documents collected', 'close-books': 'periods closed', anomalies: 'anomalies flagged',
};

// The headline number from the skill card (e.g. "432 reminders sent" → 432).
function statCount(skill: Skill): number {
    const m = (skill.stat ?? '').replace(/[.,]/g, '').match(/\d+/);
    return m ? parseInt(m[0], 10) : (SKILL_ACTIVITY[skill.id]?.length ?? 0);
}

// Templated description for a generated (older) action, varied by index.
function genDesc(skillId: string, i: number, flagged: boolean): string {
    const n = 4500 - i;
    switch (skillId) {
        case 'reconciliation':
            return flagged ? `Couldn’t match transaction #${n} — flagged for manual matching`
                : `Booked transaction #${n} to ${['Account 2100 — Creditors', 'Account 1000 — Sales', 'Account 5000 — Cost of goods', 'Account 6900 — Bank fees'][i % 4]}`;
        case 'reminders':
            return flagged ? `Reminder for #INV-${n} bounced — email undeliverable`
                : `Sent ${['a 1st', 'a 2nd', 'a final'][i % 3]} payment reminder for invoice #INV-${n}`;
        case 'documents':
            return flagged ? `Document request for entry #${n} still outstanding after 2 follow-ups`
                : `${i % 2 ? 'Collected and filed a receipt' : 'Requested a missing document'} for entry #${n}`;
        case 'monitor':
            return flagged ? `Flagged a margin dip for ${ACTIVITY_CLIENTS[i % ACTIVITY_CLIENTS.length]}`
                : `Posted an insight on ${['cash flow', 'receivables', 'spend', 'margin'][i % 4]} for ${ACTIVITY_CLIENTS[i % ACTIVITY_CLIENTS.length]}`;
        case 'anomalies':
            return `Flagged ${['an unusual charge', 'a possible duplicate', 'an out-of-pattern expense', 'a price spike'][i % 4]} for review`;
        case 'close-books':
            return `Closed the period for ${ACTIVITY_CLIENTS[i % ACTIVITY_CLIENTS.length]} — control accounts reconciled`;
        default:
            return `Ran for ${ACTIVITY_CLIENTS[i % ACTIVITY_CLIENTS.length]}`;
    }
}

// Build the full action history for a skill, padded out to its headline count so
// the totals match the skill card and every action is findable via the filters.
function buildEvents(skill: Skill): SkillEvent[] {
    const recent = SKILL_ACTIVITY[skill.id] ?? [];
    const total = Math.max(statCount(skill), recent.length);
    const events = [...recent];
    for (let i = recent.length; i < total; i++) {
        const flagged = i % 19 === 0;
        const daysAgo = 2 + Math.floor((i / Math.max(total, 1)) * 178); // spread older items across ~6 months
        events.push({
            daysAgo,
            time: `${String(7 + (i % 11)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
            client: ACTIVITY_CLIENTS[i % ACTIVITY_CLIENTS.length],
            desc: genDesc(skill.id, i, flagged),
            status: flagged ? 'flagged' : 'done',
        });
    }
    return events;
}

// Day-count → friendly date label ('Today'/'Yesterday' translated by the caller via t()).
function dayLabel(daysAgo: number, locale = 'en-GB'): string {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// Small tag showing how a step runs — Eva (AI), a deterministic rule, or human review.
function ApproachTag({ approach }: { approach?: StepApproach }) {
    const { t } = useLang();
    if (!approach) return null;
    const s = approach === 'eva'
        ? { label: 'Eva', bg: '#f3f0fb', fg: '#7c3aed' }
        : approach === 'review'
            ? { label: 'Review', bg: '#fbf3e0', fg: '#b9842b' }
            : { label: 'Rule', bg: '#f1f1f3', fg: '#6b6b76' };
    return <span className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: s.bg, color: s.fg }}>{t(s.label)}</span>;
}

function seedStarter(cfg: SkillConfig): string {
    if (cfg.trigger === 'schedule' || cfg.trigger === 'continuous') return 'schedule';
    if (cfg.trigger === 'manual') return 'chat';
    if (cfg.event === 'An invoice becomes overdue') return 'overdue';
    if (cfg.event === 'A new document is received') return 'document';
    return 'bank';
}

function SectionLabel({ children }: { children: ReactNode }) {
    return <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{children}</p>;
}
function FlowConnector() {
    return <div className="flex justify-center py-1.5"><span style={{ width: 2, height: 14, background: COLORS.cardBorder, borderRadius: 2 }} /></div>;
}

// Reusable flow component: Trigger → Conditions → Actions. Read-only by default;
// pass the on* callbacks to make a section editable (used by the flow builder).
function FlowDiagram({
    starterId, conditions, actions, triggerDetail,
    onEditTrigger, onAddCondition, onRemoveCondition, onAddAction, onRemoveAction, onEditAction,
}: {
    starterId: string;
    conditions: string[];
    actions: FlowStep[];
    triggerDetail?: ReactNode;
    onEditTrigger?: () => void;
    onAddCondition?: () => void;
    onRemoveCondition?: (i: number) => void;
    onAddAction?: () => void;
    onRemoveAction?: (i: number) => void;
    onEditAction?: (i: number, step: FlowStep) => void;
}) {
    const { t } = useLang();
    const starterDef = FLOW_STARTERS.find((s) => s.id === starterId);
    const addBtn = (label: string, onClick: () => void) => (
        <button onClick={onClick} className="w-full flex items-center gap-2 rounded-xl p-3 text-sm font-medium" style={{ border: `1.5px dashed ${COLORS.cardBorder}`, color: '#4456c7' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#a9b6cf')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.cardBorder)}>
            <Icon name="circle-plus" /> {label}
        </button>
    );
    const tile = (icon: string, tint: string, color: string, size = 30) => (
        <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: size, height: size, background: tint, color }}><Icon name={icon as never} /></span>
    );

    return (
        <div>
            {/* Trigger */}
            <SectionLabel>{t('Trigger')}</SectionLabel>
            <button
                onClick={onEditTrigger}
                disabled={!onEditTrigger}
                className="w-full flex items-center gap-3 rounded-xl p-3.5 text-left"
                style={{ border: `1px solid ${starterDef ? COLORS.cardBorder : '#bcd0f7'}`, background: starterDef ? '#fff' : '#f5f8ff', cursor: onEditTrigger ? 'pointer' : 'default' }}
            >
                {tile(starterDef?.icon ?? 'time', '#f1f1f3', '#52525b')}
                <span className="flex-1 text-sm font-medium" style={{ color: starterDef ? COLORS.text : '#4456c7' }}>{starterDef ? t(starterDef.label) : t('Choose a trigger')}</span>
                {onEditTrigger && <Icon name="edit" style={{ color: COLORS.textMuted }} />}
            </button>
            {triggerDetail}

            <FlowConnector />

            {/* Conditions */}
            <SectionLabel>{t('Conditions')}</SectionLabel>
            <div className="flex flex-col gap-2">
                {conditions.length === 0 && !onAddCondition && (
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>{t('Runs every time — no conditions.')}</p>
                )}
                {conditions.map((c, i) => (
                    <div key={`${c}-${i}`} className="flex items-center gap-3 rounded-xl p-3" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                        {tile('filter', '#eef2ff', '#4456c7')}
                        <span className="flex-1 text-sm" style={{ color: COLORS.text }}>{t(c)}</span>
                        {onRemoveCondition && (
                            <button onClick={() => onRemoveCondition(i)} title={t('Remove')} className="shrink-0 rounded-md p-1" style={{ color: COLORS.textMuted }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                <Icon name="close" />
                            </button>
                        )}
                    </div>
                ))}
                {onAddCondition && addBtn(t('Add condition'), onAddCondition)}
            </div>

            <FlowConnector />

            {/* Actions */}
            <SectionLabel>{t('Actions')}</SectionLabel>
            <div className="flex flex-col gap-2">
                {actions.map((s, i) => {
                    const clickable = !!onEditAction;
                    return (
                        <div
                            key={s.id}
                            onClick={clickable ? () => onEditAction!(i, s) : undefined}
                            className={`flex items-center gap-3 rounded-xl p-3 ${clickable ? 'cursor-pointer' : ''}`}
                            style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fff' }}
                            onMouseEnter={clickable ? (e) => (e.currentTarget.style.background = '#fafafa') : undefined}
                            onMouseLeave={clickable ? (e) => (e.currentTarget.style.background = '#fff') : undefined}
                        >
                            {tile(s.icon, s.capId ? '#f3f0fb' : '#f1f1f3', s.capId ? '#7c3aed' : '#52525b')}
                            <span className="flex-1 text-sm" style={{ color: COLORS.text }}>{t(s.label)}</span>
                            {s.capId && <span className="rounded-full px-2 py-0.5 text-xs shrink-0" style={{ background: '#f3f0fb', color: '#7c3aed' }}>{CAPABILITIES.find((c) => c.id === s.capId)?.name}</span>}
                            <ApproachTag approach={s.approach} />
                            {clickable && <Icon name="settings" style={{ color: '#c4c4cc' }} />}
                            {onRemoveAction && (
                                <button onClick={(e) => { e.stopPropagation(); onRemoveAction(i); }} title={t('Remove step')} className="shrink-0 rounded-md p-1" style={{ color: COLORS.textMuted }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                    <Icon name="close" />
                                </button>
                            )}
                        </div>
                    );
                })}
                {onAddAction && addBtn(t('Add step'), onAddAction)}
            </div>
        </div>
    );
}

function FlowDetail({ skill, onBack, onEnable, installed, seed, trial, onUpgrade }: { skill: Skill; onBack: () => void; onEnable: () => void; installed: Set<string>; seed?: { starter: string; conditions: string[]; steps: FlowStep[] }; trial?: boolean; onUpgrade?: () => void }) {
    const { t, lang } = useLang();
    const locked = skill.state === 'locked';
    const cfg = SKILL_CONFIG[skill.id] ?? DEFAULT_CONFIG;
    const [tab, setTab] = useState<'config' | 'activity'>('config');
    const [active, setActive] = useState(skill.state === 'active');
    const [frequency, setFrequency] = useState(cfg.frequency ?? 'Daily');
    const [time, setTime] = useState(cfg.time ?? '08:00');
    const [autonomy, setAutonomy] = useState(cfg.autonomy);
    const [notify, setNotify] = useState(cfg.notify);
    const [guardrail, setGuardrail] = useState(cfg.guardrail);
    const [threshold, setThreshold] = useState(cfg.threshold ?? '10.000');
    // Flow builder: a trigger + conditions + actions. Seeded from a template when
    // one was used, otherwise from the skill's default steps.
    const [starter, setStarter] = useState<string>(() => (seed ? seed.starter : seedStarter(cfg)));
    const [conditions, setConditions] = useState<string[]>(() => seed?.conditions ?? []);
    const [steps, setSteps] = useState<FlowStep[]>(() =>
        seed
            ? seed.steps.map((s, i) => ({ ...s, id: `${s.id}-${i}` }))
            : (SKILL_META[skill.id]?.features ?? []).map((f, i) => ({ id: `${skill.id}-${i}`, icon: 'workflow', label: f })),
    );
    const [picker, setPicker] = useState<'starter' | 'step' | 'condition' | null>(null);
    const [settingStep, setSettingStep] = useState<{ index: number; step: FlowStep } | null>(null);
    // The flow is set up once for the practice; it can run on all clients or a subset.
    const [clientMode, setClientMode] = useState<'all' | 'selected'>('all');
    const [clientSel, setClientSel] = useState<Set<string>>(() => new Set(AGREEMENTS.slice(0, 3).map((a) => a.id)));
    const [testOpen, setTestOpen] = useState(false);

    const addStep = (s: FlowStep) => setSteps((prev) => [...prev, { ...s, id: `${s.id}-${prev.length}-${s.label.length}` }]);
    const removeStep = (i: number) => setSteps((prev) => prev.filter((_, x) => x !== i));
    const addCondition = (c: string) => setConditions((prev) => [...prev, c]);
    const removeCondition = (i: number) => setConditions((prev) => prev.filter((_, x) => x !== i));

    function toggleClient(id: string) {
        setClientSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            <PageHeader
                title={t(skill.title)}
                onBack={onBack}
                backLabel={t('Flows')}
                showScope={false}
                right={!locked ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: COLORS.textMuted }}>{active ? t('Active') : t('Paused')}</span>
                        <Switch checked={active} onChange={setActive} />
                    </div>
                ) : undefined}
            />
            <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                {/* intro */}
                <div className="flex items-start gap-3 mb-6">
                    <EmojiTile emoji={skill.emoji} size={44} />
                    <p className="text-sm mt-1.5 flex-1" style={{ color: COLORS.textMuted }}>{t(skill.description)}</p>
                </div>

                {locked && (
                    <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ border: '1px solid #e6dcfb', background: '#faf6ff' }}>
                        <Icon name="lock" style={{ color: '#8b46d6' }} />
                        <p className="text-sm flex-1" style={{ color: COLORS.text }}>
                            {lang === 'da'
                                ? <>Dette flow er ikke sat op endnu. Konfigurér det nedenfor, og aktivér det for hele din praksis for <b>{skill.price} DKK/md.</b></>
                                : <>This flow isn’t set up yet. Configure it below, then enable it for your whole practice for <b>{skill.price} DKK/month</b>.</>}
                        </p>
                    </div>
                )}

                {/* Trial banner — test for 30 days, then upgrade to the paid version */}
                {trial && (
                    <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ border: '1px solid #efddc0', background: '#fff7ed' }}>
                        <Icon name="time" style={{ color: '#b9842b' }} />
                        <p className="text-sm flex-1" style={{ color: COLORS.text }}>
                            {lang === 'da'
                                ? <>Gratis prøveperiode · 30 dage tilbage. Opgradér for at beholde dette flow, når prøveperioden slutter.</>
                                : <>Free trial · 30 days left. Upgrade to keep this flow running after the trial.</>}
                        </p>
                        <Button appearance="primary" onClick={onUpgrade}>{lang === 'da' ? 'Opgradér' : 'Upgrade'}</Button>
                    </div>
                )}

                {/* Configuration / Activity tabs */}
                <div className="flex items-center gap-7 mb-6" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    {([
                        { k: 'config', label: 'Configuration', count: undefined as number | undefined },
                        { k: 'activity', label: 'Activity', count: locked ? undefined : statCount(skill) },
                    ] as const).map((tb) => {
                        const on = tab === tb.k;
                        return (
                            <button
                                key={tb.k}
                                onClick={() => setTab(tb.k)}
                                className="relative flex items-center gap-2"
                                style={{ padding: '10px 2px', fontSize: 15, fontWeight: 600, color: on ? COLORS.text : COLORS.textMuted }}
                            >
                                {t(tb.label)}
                                {tb.count !== undefined && (
                                    <span className="rounded-full px-1.5 text-xs font-semibold" style={{ background: on ? '#ececed' : '#f4f4f5', color: COLORS.textMuted, lineHeight: '18px' }}>
                                        {tb.count.toLocaleString(lang === 'da' ? 'da-DK' : 'en-US')}
                                    </span>
                                )}
                                {on && <span className="absolute left-0 right-0" style={{ bottom: -1, height: 2, background: COLORS.text, borderRadius: 2 }} />}
                            </button>
                        );
                    })}
                </div>

                {tab === 'activity' ? (
                    <ActivityTab skill={skill} locked={locked} />
                ) : (
                <>
                {/* Flow builder — reusable Trigger / Conditions / Actions component */}
                <Section title={t('Flow')}>
                    <FlowDiagram
                        starterId={starter}
                        conditions={conditions}
                        actions={steps}
                        triggerDetail={starter === 'schedule' ? (
                            <div className="flex flex-wrap items-end gap-4 mt-3 pl-1">
                                <Field label={t('Frequency')}>
                                    <div className="flex gap-2">
                                        {['Daily', 'Weekly', 'Monthly'].map((f) => (
                                            <button key={f} onClick={() => setFrequency(f)} className="rounded-lg px-3 py-1.5 text-sm" style={{ border: `1px solid ${frequency === f ? COLORS.text : COLORS.cardBorder}`, background: frequency === f ? COLORS.text : '#fff', color: frequency === f ? '#fff' : COLORS.text }}>{t(f)}</button>
                                        ))}
                                    </div>
                                </Field>
                                <Field label={t('At')}>
                                    <input value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, width: 100 }} />
                                </Field>
                            </div>
                        ) : undefined}
                        onEditTrigger={() => setPicker('starter')}
                        onAddCondition={() => setPicker('condition')}
                        onRemoveCondition={removeCondition}
                        onAddAction={() => setPicker('step')}
                        onRemoveAction={removeStep}
                        onEditAction={(i, step) => setSettingStep({ index: i, step })}
                    />
                </Section>

                {/* Applies to — the skill is practice-level; choose where it runs */}
                <Section title={t('Applies to')} sub={t('This flow runs across your whole practice — choose which clients it acts on.')}>
                    <div className="grid grid-cols-2 gap-3">
                        <OptionCard selected={clientMode === 'all'} icon="contacts" title={t('All clients')} desc={t('Runs across every client agreement, including new ones.')} onClick={() => setClientMode('all')} />
                        <OptionCard selected={clientMode === 'selected'} icon="person" title={t('Selected clients')} desc={t('Pick the agreements this flow should work on.')} onClick={() => setClientMode('selected')} />
                    </div>
                    {clientMode === 'selected' && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {AGREEMENTS.map((a) => {
                                const on = clientSel.has(a.id);
                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => toggleClient(a.id)}
                                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                                        style={{
                                            border: `1px solid ${on ? COLORS.text : COLORS.cardBorder}`,
                                            background: on ? COLORS.text : '#fff',
                                            color: on ? '#fff' : COLORS.text,
                                        }}
                                    >
                                        {on && <Icon name="tick" />}
                                        {a.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Section>

                {/* Autonomy */}
                <Section title={t('Level of autonomy')} sub={t('Decide how much the flow can do on its own.')}>
                    <div className="flex flex-col gap-3">
                        {AUTONOMY.map((a) => (
                            <OptionCard key={a.key} selected={autonomy === a.key} icon={a.icon} title={t(a.title)} desc={t(a.desc)} onClick={() => setAutonomy(a.key)} wide />
                        ))}
                    </div>
                </Section>

                {/* Guardrails */}
                <Section title={t('Guardrails & notifications')} sub={t('Keep control over the riskier actions.')}>
                    <div className="flex flex-col gap-3">
                        <ToggleRow
                            checked={guardrail}
                            onChange={setGuardrail}
                            title={t('Require my approval above an amount')}
                            desc={t('Anything below the threshold can be handled automatically.')}
                        >
                            {guardrail && (
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-sm" style={{ color: COLORS.textMuted }}>{t('Threshold')}</span>
                                    <input value={threshold} onChange={(e) => setThreshold(e.target.value)} className="rounded-lg px-3 py-1.5 text-sm bg-white text-right" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, width: 110 }} />
                                    <span className="text-sm" style={{ color: COLORS.textMuted }}>DKK</span>
                                </div>
                            )}
                        </ToggleRow>
                        <ToggleRow checked={notify} onChange={setNotify} title={t('Notify me when this flow acts')} desc={t('Get a notification and a Review entry each time it runs.')} />
                    </div>
                </Section>

                </>
                )}
            </div>
            </div>

            {tab === 'config' && (
                <StickyFooter>
                    <div className="flex gap-2">
                        <Button onClick={onBack}>{t('Cancel')}</Button>
                        <Button onClick={() => setTestOpen(true)}><Icon name="play" /> {t('Test run')}</Button>
                    </div>
                    {locked ? (
                        <Button appearance="primary" onClick={onEnable}>{lang === 'da' ? `Aktivér for ${skill.price} DKK/md.` : `Enable for ${skill.price} DKK/month`}</Button>
                    ) : (
                        <Button appearance="primary" onClick={onBack}>{t('Save changes')}</Button>
                    )}
                </StickyFooter>
            )}

            {testOpen && <TestRunModal skill={skill} onClose={() => setTestOpen(false)} />}
            {picker && (
                <StepPicker
                    mode={picker}
                    installed={installed}
                    onPickStarter={(id) => { setStarter(id); setPicker(null); }}
                    onPickStep={(s) => { addStep(s); setPicker(null); }}
                    onPickCondition={(c) => { addCondition(c); setPicker(null); }}
                    onClose={() => setPicker(null)}
                />
            )}
            {settingStep && <StepSettings step={settingStep.step} onClose={() => setSettingStep(null)} />}
        </div>
    );
}

// ---- "Create New Flow" modal: start from scratch or from a template (with step preview + trial) ----
function NewFlowModal({ installed, onScratch, onStartTrial, onClose }: { installed: Set<string>; onScratch: () => void; onStartTrial: (tpl: FlowTemplate) => void; onClose: () => void }) {
    const { t, lang } = useLang();
    const [sel, setSel] = useState<FlowTemplate | null>(null);
    const partnerOf = (id?: string) => (id ? CAPABILITIES.find((c) => c.id === id) : undefined);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl flex flex-col overflow-hidden anim-in" style={{ width: 'min(840px, 94vw)', maxHeight: '88vh', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }} onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center gap-2 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    {sel && (
                        <button onClick={() => setSel(null)} className="rounded-md p-1 -ml-1" style={{ color: COLORS.textMuted }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <Icon name="arrow-left" />
                        </button>
                    )}
                    <h2 className="text-base font-semibold flex-1" style={{ color: COLORS.text }}>{t('Create New Flow')}</h2>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </header>

                {sel ? (
                    // ---- template preview ----
                    (() => {
                        const partner = partnerOf(sel.capId);
                        const needsInstall = partner && !installed.has(partner.id);
                        return (
                            <>
                                <div className="overflow-y-auto p-5">
                                    <div className="flex items-start gap-3 mb-5">
                                        <span className="flex items-center justify-center shrink-0 rounded-xl" style={{ width: 44, height: 44, background: '#f1f1f3', fontSize: 22 }}>{sel.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold" style={{ color: COLORS.text }}>{t(sel.title)}</h3>
                                                <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>{t(sel.category)}</span>
                                                {partner && <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f3f0fb', color: '#7c3aed' }}>{partner.name}</span>}
                                            </div>
                                            <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>{t(sel.desc)}</p>
                                        </div>
                                    </div>

                                    {/* same reusable component, read-only */}
                                    <FlowDiagram starterId={sel.starter} conditions={sel.conditions ?? []} actions={sel.steps} />

                                    {needsInstall && (
                                        <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#7c3aed' }}>
                                            <Icon name="connection-enable" /> {(lang === 'da' ? 'Inkluderer en prøveperiode af {p}-kapabiliteten.' : 'Includes a free trial of the {p} capability.').replace('{p}', partner!.name)}
                                        </p>
                                    )}
                                </div>
                                <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                    <span className="text-sm" style={{ color: COLORS.textMuted }}>{lang === 'da' ? `Derefter ${sel.price} kr/md.` : `Then ${sel.price} kr/month`}</span>
                                    <Button appearance="primary" onClick={() => onStartTrial(sel)}>{lang === 'da' ? 'Start 30-dages gratis prøve' : 'Start 30-day free trial'}</Button>
                                </div>
                            </>
                        );
                    })()
                ) : (
                    // ---- list: from scratch + templates ----
                    <div className="overflow-y-auto p-5">
                        <button
                            onClick={onScratch}
                            className="w-full flex items-center gap-3 rounded-xl p-4 mb-5 text-left"
                            style={{ border: `1.5px dashed ${COLORS.cardBorder}`, background: '#fafafa' }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#a9b6cf')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.cardBorder)}
                        >
                            <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 36, height: 36, background: '#eef2ff', color: '#4456c7' }}><Icon name="circle-plus" /></span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Start from scratch')}</p>
                                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t('Build your own flow step by step.')}</p>
                            </div>
                            <Icon name="chevron-right" style={{ color: '#c4c4cc' }} />
                        </button>

                        <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>{t('Start from a template')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            {FLOW_TEMPLATES.map((tpl) => {
                                const partner = partnerOf(tpl.capId);
                                return (
                                    <button key={tpl.id} onClick={() => setSel(tpl)} className="flex flex-col text-left rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}`, minHeight: 132 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d6d6db'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = COLORS.cardBorder; }}>
                                        <div className="flex items-start gap-2.5">
                                            <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: '#f1f1f3', fontSize: 17 }}>{tpl.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold leading-tight" style={{ color: COLORS.text }}>{t(tpl.title)}</p>
                                                <span className="text-xs" style={{ color: COLORS.textMuted }}>{t(tpl.category)}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs mt-2 leading-snug flex-1" style={{ color: COLORS.textMuted }}>{t(tpl.desc)}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs font-medium" style={{ color: COLORS.text }}>{lang === 'da' ? `${tpl.price} kr/md.` : `${tpl.price} kr/mo`}</span>
                                            {partner && <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f3f0fb', color: '#7c3aed' }}>{partner.name}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---- Per-step settings (opened by clicking a step in the builder) ----
function StepSettings({ step, onClose }: { step: FlowStep; onClose: () => void }) {
    const { t } = useLang();
    const [name, setName] = useState(t(step.label));
    const [onFail, setOnFail] = useState('flag');
    const [notify, setNotify] = useState(false);
    const FAIL_OPTS = [
        { v: 'stop', label: t('Stop the flow') },
        { v: 'skip', label: t('Skip & continue') },
        { v: 'flag', label: t('Flag for review') },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in" style={{ maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: step.capId ? '#f3f0fb' : '#f1f1f3', color: step.capId ? '#7c3aed' : '#52525b' }}>
                            <Icon name={step.icon as never} />
                        </span>
                        <h2 className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Step settings')}</h2>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>
                <div className="px-5 py-4">
                    <Field label={t('Step name')}>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                    </Field>
                    <Field label={t('If this step fails')}>
                        <div className="flex gap-2">
                            {FAIL_OPTS.map((o) => (
                                <button key={o.v} onClick={() => setOnFail(o.v)} className="rounded-lg px-3 py-1.5 text-sm" style={{ border: `1px solid ${onFail === o.v ? COLORS.text : COLORS.cardBorder}`, background: onFail === o.v ? COLORS.text : '#fff', color: onFail === o.v ? '#fff' : COLORS.text }}>{o.label}</button>
                            ))}
                        </div>
                    </Field>
                    <div className="mt-4">
                        <ToggleRow checked={notify} onChange={setNotify} title={t('Notify me when this step runs')} desc={t('Get a notification each time Eva completes this step.')} />
                    </div>
                </div>
                <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                    <Button appearance="primary" onClick={onClose}>{t('Save changes')}</Button>
                </div>
            </div>
        </div>
    );
}

// ---- Step / starter picker (the right-hand "Add step" panel, as a modal) ----
function StepPicker({ mode, installed, onPickStarter, onPickStep, onPickCondition, onClose }: {
    mode: 'starter' | 'step' | 'condition';
    installed: Set<string>;
    onPickStarter: (id: string) => void;
    onPickStep: (s: FlowStep) => void;
    onPickCondition: (c: string) => void;
    onClose: () => void;
}) {
    const { t } = useLang();
    const tile = (icon: string, tint: string, color: string) => (
        <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: tint, color }}>
            <Icon name={icon as never} />
        </span>
    );
    const partners = CAPABILITIES.filter((c) => !c.native);
    const heading = mode === 'starter' ? t('Choose a trigger') : mode === 'condition' ? t('Add a condition') : t('Add a step');
    const sub = mode === 'starter' ? t('This event or schedule launches your flow.') : mode === 'condition' ? t('A check that must be true to continue.') : t('e-conomic and partner steps Eva can run.');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl flex flex-col overflow-hidden anim-in" style={{ width: 'min(620px, 94vw)', maxHeight: '86vh', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }} onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>{heading}</h2>
                        <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{sub}</p>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </header>

                <div className="overflow-y-auto p-5 flex flex-col gap-5">
                    {mode === 'condition' ? (
                        <div className="grid grid-cols-1 gap-2.5">
                            {CONDITION_LIBRARY.map((c) => (
                                <button key={c} onClick={() => onPickCondition(c)} className="flex items-center gap-3 rounded-xl p-3 text-left" style={{ border: `1px solid ${COLORS.cardBorder}` }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d6d6db'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = COLORS.cardBorder; }}>
                                    {tile('filter', '#eef2ff', '#4456c7')}
                                    <span className="text-sm font-medium" style={{ color: COLORS.text }}>{t(c)}</span>
                                </button>
                            ))}
                        </div>
                    ) : mode === 'starter' ? (
                        <div className="grid grid-cols-2 gap-2.5">
                            {FLOW_STARTERS.map((s) => (
                                <button key={s.id} onClick={() => onPickStarter(s.id)} className="flex items-center gap-3 rounded-xl p-3 text-left" style={{ border: `1px solid ${COLORS.cardBorder}` }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d6d6db'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = COLORS.cardBorder; }}>
                                    {tile(s.icon, '#f1f1f3', '#52525b')}
                                    <span className="text-sm font-medium" style={{ color: COLORS.text }}>{t(s.label)}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <>
                            <StepGroup label={t('e-conomic')}>
                                {ECONOMIC_STEPS.map((s) => (
                                    <StepOption key={s.id} step={s} icon={tile(s.icon, '#fff7ed', '#b9842b')} onClick={() => onPickStep(s)} />
                                ))}
                            </StepGroup>
                            <StepGroup label={t('Eva AI')}>
                                {AI_STEPS.map((s) => (
                                    <StepOption key={s.id} step={s} icon={tile(s.icon, '#eef2ff', '#4456c7')} onClick={() => onPickStep(s)} />
                                ))}
                            </StepGroup>
                            {partners.map((c) => {
                                const has = installed.has(c.id);
                                return (
                                    <StepGroup key={c.id} label={c.name} locked={!has} lockedNote={t('Add the {p} capability to use these steps.').replace('{p}', c.name)}>
                                        {c.skills.map((sk, i) => (
                                            <StepOption
                                                key={i}
                                                step={{ id: `${c.id}-${i}`, icon: 'connection-enable', label: sk, capId: c.id }}
                                                icon={tile('connection-enable', '#f3f0fb', '#7c3aed')}
                                                locked={!has}
                                                onClick={() => has && onPickStep({ id: `${c.id}-${i}`, icon: 'connection-enable', label: sk, capId: c.id })}
                                            />
                                        ))}
                                    </StepGroup>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function StepGroup({ label, locked, lockedNote, children }: { label: string; locked?: boolean; lockedNote?: string; children: ReactNode }) {
    const { t } = useLang();
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{label}</p>
                {locked && <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#a8a8b0' }}><Icon name="lock" /> {t('Not installed')}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">{children}</div>
            {locked && lockedNote && <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>{lockedNote}</p>}
        </div>
    );
}

function StepOption({ step, icon, locked, onClick }: { step: FlowStep; icon: ReactNode; locked?: boolean; onClick: () => void }) {
    const { t } = useLang();
    return (
        <button
            onClick={onClick}
            disabled={locked}
            className="flex items-center gap-3 rounded-xl p-3 text-left"
            style={{ border: `1px solid ${COLORS.cardBorder}`, opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => { if (!locked) { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d6d6db'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = COLORS.cardBorder; }}
        >
            {icon}
            <span className="flex-1 text-sm" style={{ color: COLORS.text }}>{t(step.label)}</span>
            {locked && <Icon name="lock" style={{ color: '#c4c4cc' }} />}
        </button>
    );
}

function TestRunModal({ skill, onClose }: { skill: Skill; onClose: () => void }) {
    const test = SKILL_TEST[skill.id] ?? { summary: 'Completed a dry run', rows: ['No issues found'] };
    const reviewItem = SKILL_REVIEW[skill.id];
    const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');

    function run() {
        setPhase('running');
        setTimeout(() => setPhase('done'), 1700);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full p-6 anim-in" style={{ maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                    <span className="shrink-0 rounded-xl flex items-center justify-center" style={{ width: 38, height: 38, background: '#f1f1f3', color: '#52525b' }}>
                        <Icon name="experiment" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>Test run</h2>
                        <p className="text-sm" style={{ color: COLORS.textMuted }}>{skill.title}</p>
                    </div>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </div>

                {phase === 'intro' && (
                    <>
                        <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.text }}>
                            This will run the flow against your data from the <b>past 30 days</b>. It's a dry run — nothing is booked, sent or changed. You'll see exactly what the flow would do, so you can be sure it works as intended.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button onClick={onClose}>Cancel</Button>
                            <Button appearance="primary" onClick={run}>Run test</Button>
                        </div>
                    </>
                )}

                {phase === 'running' && (
                    <div className="py-6 flex flex-col items-center text-center">
                        <span className="rounded-full border-2 animate-spin mb-3" style={{ width: 26, height: 26, borderColor: '#ff7a2f', borderTopColor: 'transparent' }} />
                        <p className="text-sm" style={{ color: COLORS.textMuted }}>Running on the last 30 days…</p>
                    </div>
                )}

                {phase === 'done' && (
                    <>
                        <div className="rounded-lg px-3 py-2.5 text-sm flex items-start gap-2 mb-4" style={{ background: '#ecfdf5', color: '#065f46' }}>
                            <Icon name="circle-tick" /> <span>{test.summary} — works as intended.</span>
                        </div>
                        {reviewItem && (
                            <>
                                <p className="text-xs font-medium mb-2" style={{ color: COLORS.textMuted }}>Example of what it would put in your Review:</p>
                                <ReviewItemCard item={reviewItem} />
                            </>
                        )}
                        <p className="text-xs mt-4 mb-4" style={{ color: COLORS.textMuted }}>This was a dry run on the last 30 days — no changes were made.</p>
                        <div className="flex justify-end">
                            <Button appearance="primary" onClick={onClose}>Close</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const ACTIVITY_RANGES = [
    { value: 'all', label: 'All time' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
];
const RENDER_LIMIT = 50;

function ActivityTab({ skill, locked }: { skill: Skill; locked: boolean }) {
    const { t, lang } = useLang();
    const all = useMemo(() => (locked ? [] : buildEvents(skill)), [skill, locked]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'flagged'>('all');
    const [clientFilter, setClientFilter] = useState('all');
    const [range, setRange] = useState('all');

    if (locked || all.length === 0) {
        return (
            <Card className="p-10 text-center mb-10">
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {locked ? t('No activity yet — enable this flow to let Eva start working.') : t('No activity recorded for this flow yet.')}
                </p>
            </Card>
        );
    }

    const clients = Array.from(new Set(all.map((e) => e.client))).sort();
    const totalFlagged = all.filter((e) => e.status === 'flagged').length;
    const q = query.trim().toLowerCase();
    const filtered = all.filter((e) => {
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (clientFilter !== 'all' && e.client !== clientFilter) return false;
        if (range !== 'all' && e.daysAgo > parseInt(range, 10)) return false;
        if (q && !e.desc.toLowerCase().includes(q) && !e.client.toLowerCase().includes(q)) return false;
        return true;
    });
    const shown = filtered.slice(0, RENDER_LIMIT);
    const noun = t(STAT_NOUN[skill.id] ?? 'actions taken');
    const filtersActive = q !== '' || statusFilter !== 'all' || clientFilter !== 'all' || range !== 'all';
    const selStyle = { border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text } as const;
    const locale = lang === 'da' ? 'da-DK' : 'en-US';

    return (
        <div className="mb-10">
            {/* headline — matches the number on the skill card */}
            <div className="flex items-baseline gap-2.5 mb-4">
                <span className="text-3xl font-semibold leading-none" style={{ color: COLORS.text }}>{all.length.toLocaleString(locale)}</span>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>{noun}{totalFlagged > 0 ? ` · ${totalFlagged.toLocaleString(locale)} ${t('flagged for review')}` : ''}</span>
            </div>

            {/* advanced filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1" style={{ minWidth: 220 }}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('Search actions or clients…')}
                        className="w-full rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
                        style={selStyle}
                    />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'done' | 'flagged')} className="rounded-lg px-3 py-2 text-sm bg-white" style={selStyle}>
                    <option value="all">{t('All statuses')}</option>
                    <option value="done">{t('Completed')}</option>
                    <option value="flagged">{t('Flagged for review')}</option>
                </select>
                <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded-lg px-3 py-2 text-sm bg-white" style={selStyle}>
                    <option value="all">{t('All clients')}</option>
                    {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg px-3 py-2 text-sm bg-white" style={selStyle}>
                    {ACTIVITY_RANGES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
                </select>
                {filtersActive && (
                    <button onClick={() => { setQuery(''); setStatusFilter('all'); setClientFilter('all'); setRange('all'); }} className="text-sm font-medium px-2 py-2" style={{ color: '#4456c7' }}>
                        {t('Clear')}
                    </button>
                )}
            </div>

            <p className="text-xs mb-3" style={{ color: COLORS.textMuted }}>
                {filtered.length === all.length
                    ? (lang === 'da' ? `Viser alle ${all.length.toLocaleString(locale)} handlinger` : `Showing all ${all.length.toLocaleString(locale)} actions`)
                    : (lang === 'da' ? `${filtered.length.toLocaleString(locale)} af ${all.length.toLocaleString(locale)} handlinger matcher` : `${filtered.length.toLocaleString(locale)} of ${all.length.toLocaleString(locale)} actions match`)}
                {filtered.length > RENDER_LIMIT ? (lang === 'da' ? ` · viser de første ${RENDER_LIMIT}` : ` · showing the first ${RENDER_LIMIT}`) : ''}
            </p>

            {filtered.length === 0 ? (
                <Card className="p-10 text-center">
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>{t('No actions match these filters.')}</p>
                </Card>
            ) : (
                <div className="flex flex-col gap-2">
                    {shown.map((e, i) => {
                        const done = e.status === 'done';
                        const fg = done ? '#15803d' : '#92710f';
                        return (
                            <Card key={i} className="p-4 flex items-center gap-3">
                                <span
                                    title={done ? t('Completed') : t('Flagged for review')}
                                    className="flex items-center justify-center shrink-0 rounded-lg"
                                    style={{ width: 34, height: 34, background: `${fg}1a`, color: fg }}
                                >
                                    <Icon name={done ? 'circle-tick' : 'circle-warning'} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t(e.desc)}</p>
                                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{e.client} · {t(dayLabel(e.daysAgo, locale))} · {e.time}</p>
                                </div>
                                {!done && (
                                    <span className="rounded-md px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: '#fbf3e0', color: '#92710f' }}>
                                        {t('Needs review')}
                                    </span>
                                )}
                            </Card>
                        );
                    })}
                    {filtered.length > RENDER_LIMIT && (
                        <p className="text-xs text-center mt-2" style={{ color: COLORS.textMuted }}>
                            {lang === 'da'
                                ? `+ ${(filtered.length - RENDER_LIMIT).toLocaleString(locale)} flere — indsnævr filtrene for at finde en bestemt handling.`
                                : `+ ${(filtered.length - RENDER_LIMIT).toLocaleString(locale)} more — narrow the filters to find a specific action.`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
    return (
        <div className="mb-7">
            <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>{title}</h2>
            {sub ? <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>{sub}</p> : <div className="mb-3" />}
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="mt-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.textMuted }}>{label}</label>
            {children}
        </div>
    );
}

function OptionCard({ selected, icon, title, desc, onClick, wide }: { selected: boolean; icon: string; title: string; desc: string; onClick: () => void; wide?: boolean }) {
    return (
        <button
            onClick={onClick}
            className="text-left rounded-xl p-3.5 flex items-start gap-3"
            style={{
                border: `1px solid ${selected ? COLORS.text : COLORS.cardBorder}`,
                boxShadow: selected ? `0 0 0 1px ${COLORS.text}` : 'none',
                background: selected ? '#fafafa' : '#fff',
            }}
        >
            <span className="flex items-center justify-center shrink-0 rounded-lg mt-0.5" style={{ width: wide ? 32 : 30, height: wide ? 32 : 30, background: selected ? COLORS.text : '#f1f1f3', color: selected ? '#fff' : '#52525b' }}>
                <Icon name={icon as never} />
            </span>
            <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: COLORS.text }}>{title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.textMuted }}>{desc}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full mt-1" style={{ width: 16, height: 16, border: `${selected ? 5 : 1.5}px solid ${selected ? COLORS.text : '#cfcfd6'}`, background: '#fff', transition: 'border-width .1s' }} />
        </button>
    );
}

function ToggleRow({ checked, onChange, title, desc, children }: { checked: boolean; onChange: (v: boolean) => void; title: string; desc: string; children?: ReactNode }) {
    return (
        <div className="rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{desc}</p>
                </div>
                <Switch checked={checked} onChange={onChange} />
            </div>
            {children}
        </div>
    );
}
