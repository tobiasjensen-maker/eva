import { useState, useMemo, type ReactNode } from 'react';
import { Button, Icon, Switch } from '@economic/taco';
import { Card, Dot, EmojiTile, PageHeader, COLORS } from '../ui';
import { TemplateGallery, type Template } from '../TemplateGallery';
import { ReviewItemCard, type ReviewCardData } from '../ReviewItemCard';
import type { Skill } from '../types';

interface Props {
    skills: Skill[];
    onEnable: (id: string) => void;
}

const SKILL_CATEGORIES = ['Accounting', 'Invoicing', 'Insights', 'Compliance', 'Payroll'];

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

export default function SkillsView({ skills, onEnable }: Props) {
    const [openId, setOpenId] = useState<string | null>(null);
    const [gallery, setGallery] = useState(false);

    const skillTemplates: Template[] = skills
        .filter((s) => s.state === 'locked')
        .map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            category: SKILL_META[s.id]?.category ?? 'Insights',
            color: s.color,
            emoji: s.emoji,
            price: s.price,
            features: SKILL_META[s.id]?.features ?? [],
        }));

    const openSkill = openId ? skills.find((s) => s.id === openId) ?? null : null;
    if (openSkill) {
        return <SkillDetail skill={openSkill} onBack={() => setOpenId(null)} onEnable={() => onEnable(openSkill.id)} />;
    }

    const enabled = skills.filter((s) => s.state !== 'locked');

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title="Skills" right={<Button appearance="primary" onClick={() => setGallery(true)}><Icon name="circle-plus" /> Add new skill</Button>} />
            <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                {enabled.length === 0 ? (
                    <Card className="p-10 text-center">
                        <p className="text-sm" style={{ color: COLORS.textMuted }}>
                            No skills enabled yet. Browse the library to add one.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-3 gap-4 pb-10">
                        {enabled.map((s) => (
                            <SkillCard key={s.id} skill={s} onOpen={() => setOpenId(s.id)} />
                        ))}
                    </div>
                )}
            </div>

            {gallery && (
                <TemplateGallery
                    kind="skill"
                    templates={skillTemplates}
                    categories={SKILL_CATEGORIES}
                    onClose={() => setGallery(false)}
                    onEnableSkill={(t) => onEnable(t.id)}
                />
            )}
        </div>
    );
}

function SkillCard({ skill, onOpen }: { skill: Skill; onOpen: () => void }) {
    const locked = skill.state === 'locked';
    return (
        <Card className="p-5 flex flex-col" hover onClick={onOpen} style={{ minHeight: 168 }}>
            <div className="flex items-start gap-3">
                <EmojiTile emoji={skill.emoji} size={30} />
                <p className="text-sm font-semibold leading-snug flex-1" style={{ color: COLORS.text }}>{skill.title}</p>
                {locked && <Icon name="lock" style={{ color: '#a8a8b0' }} />}
            </div>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: COLORS.textMuted }}>{skill.description}</p>
            <div className="flex items-center justify-between mt-auto pt-4">
                {locked ? (
                    <>
                        <span className="text-sm" style={{ color: COLORS.textMuted }}>{`From ${skill.price} DKK/month`}</span>
                        <span className="flex items-center gap-1 text-sm font-medium" style={{ color: COLORS.text }}>Set up <Icon name="chevron-right" /></span>
                    </>
                ) : (
                    <>
                        <span className="text-sm" style={{ color: COLORS.textMuted }}>{skill.stat}</span>
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: COLORS.text }}>
                            <Dot color={skill.state === 'active' ? '#16a34a' : '#a8a8b0'} />
                            {skill.state === 'active' ? 'Active' : 'Idle'}
                        </span>
                    </>
                )}
            </div>
        </Card>
    );
}

// ---- Skill detail / configuration page ----

const TRIGGERS = [
    { key: 'event', icon: 'workflow', title: 'When something happens', desc: 'React to events like a new bank transaction or an overdue invoice.' },
    { key: 'schedule', icon: 'time', title: 'On a schedule', desc: 'Run automatically at set intervals.' },
    { key: 'continuous', icon: 'refresh', title: 'Continuously', desc: 'Monitor and act in the background as data changes.' },
    { key: 'manual', icon: 'chat', title: 'Only when I ask', desc: 'Run on demand from the chat.' },
];

const AUTONOMY = [
    { key: 'suggest', icon: 'lightbulb', title: 'Suggest only', desc: 'Drafts proposals and leaves them for you in Review.' },
    { key: 'approval', icon: 'document-approve', title: 'Act with my approval', desc: 'Proposes a plan and acts once you approve it.' },
    { key: 'auto', icon: 'play', title: 'Fully autonomous', desc: 'Acts on its own and logs everything to Review.' },
];

const EVENTS = ['A new bank transaction arrives', 'An invoice becomes overdue', 'A new document is received', 'Month-end is reached', 'A client sends a message'];

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

// Day-count → friendly date label.
function dayLabel(daysAgo: number): string {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function SkillDetail({ skill, onBack, onEnable }: { skill: Skill; onBack: () => void; onEnable: () => void }) {
    const locked = skill.state === 'locked';
    const actions = SKILL_META[skill.id]?.features ?? [];
    const cfg = SKILL_CONFIG[skill.id] ?? DEFAULT_CONFIG;
    const [tab, setTab] = useState<'config' | 'activity'>('config');
    const [active, setActive] = useState(skill.state === 'active');
    const [trigger, setTrigger] = useState(cfg.trigger);
    const [event, setEvent] = useState(cfg.event ?? EVENTS[0]);
    const [frequency, setFrequency] = useState(cfg.frequency ?? 'Daily');
    const [time, setTime] = useState(cfg.time ?? '08:00');
    const [autonomy, setAutonomy] = useState(cfg.autonomy);
    const [notify, setNotify] = useState(cfg.notify);
    const [guardrail, setGuardrail] = useState(cfg.guardrail);
    const [threshold, setThreshold] = useState(cfg.threshold ?? '10.000');
    const [testOpen, setTestOpen] = useState(false);

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader
                title={skill.title}
                onBack={onBack}
                backLabel="Skills"
                right={!locked ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: COLORS.textMuted }}>{active ? 'Active' : 'Paused'}</span>
                        <Switch checked={active} onChange={setActive} />
                    </div>
                ) : undefined}
            />
            <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                {/* intro */}
                <div className="flex items-start gap-3 mb-6">
                    <EmojiTile emoji={skill.emoji} size={44} />
                    <p className="text-sm mt-1.5 flex-1" style={{ color: COLORS.textMuted }}>{skill.description}</p>
                </div>

                {locked && (
                    <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ border: '1px solid #e6dcfb', background: '#faf6ff' }}>
                        <Icon name="lock" style={{ color: '#8b46d6' }} />
                        <p className="text-sm flex-1" style={{ color: COLORS.text }}>
                            This skill isn’t enabled yet. Configure it below, then enable it for <b>{skill.price} DKK/month</b>.
                        </p>
                    </div>
                )}

                {/* Configuration / Activity tabs */}
                <div className="flex items-center gap-7 mb-6" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    {([
                        { k: 'config', label: 'Configuration', count: undefined as number | undefined },
                        { k: 'activity', label: 'Activity', count: locked ? undefined : statCount(skill) },
                    ] as const).map((t) => {
                        const on = tab === t.k;
                        return (
                            <button
                                key={t.k}
                                onClick={() => setTab(t.k)}
                                className="relative flex items-center gap-2"
                                style={{ padding: '10px 2px', fontSize: 15, fontWeight: 600, color: on ? COLORS.text : COLORS.textMuted }}
                            >
                                {t.label}
                                {t.count !== undefined && (
                                    <span className="rounded-full px-1.5 text-xs font-semibold" style={{ background: on ? '#ececed' : '#f4f4f5', color: COLORS.textMuted, lineHeight: '18px' }}>
                                        {t.count.toLocaleString('en-US')}
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
                {/* What's done with this skill */}
                {actions.length > 0 && (
                    <Section title="What's done with this skill" sub="These steps run automatically each time the skill takes effect.">
                        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                            {actions.map((a, i) => (
                                <div key={a} className="flex items-start gap-3">
                                    <span className="flex items-center justify-center shrink-0 rounded-full text-xs font-semibold" style={{ width: 22, height: 22, background: '#ececed', color: COLORS.text }}>{i + 1}</span>
                                    <span className="text-sm" style={{ color: COLORS.text }}>{a}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Trigger */}
                <Section title="Trigger" sub="Decide what kicks this skill off.">
                    <div className="grid grid-cols-2 gap-3">
                        {TRIGGERS.map((t) => (
                            <OptionCard key={t.key} selected={trigger === t.key} icon={t.icon} title={t.title} desc={t.desc} onClick={() => setTrigger(t.key)} />
                        ))}
                    </div>

                    {trigger === 'event' && (
                        <Field label="Run when…">
                            <select value={event} onChange={(e) => setEvent(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                                {EVENTS.map((ev) => <option key={ev}>{ev}</option>)}
                            </select>
                        </Field>
                    )}

                    {trigger === 'schedule' && (
                        <div className="flex flex-wrap items-end gap-4">
                            <Field label="Frequency">
                                <div className="flex gap-2">
                                    {['Daily', 'Weekly', 'Monthly'].map((f) => (
                                        <button key={f} onClick={() => setFrequency(f)} className="rounded-lg px-3 py-1.5 text-sm" style={{ border: `1px solid ${frequency === f ? COLORS.text : COLORS.cardBorder}`, background: frequency === f ? COLORS.text : '#fff', color: frequency === f ? '#fff' : COLORS.text }}>{f}</button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="At">
                                <input value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, width: 100 }} />
                            </Field>
                        </div>
                    )}
                </Section>

                {/* Autonomy */}
                <Section title="Level of autonomy" sub="Decide how much the skill can do on its own.">
                    <div className="flex flex-col gap-3">
                        {AUTONOMY.map((a) => (
                            <OptionCard key={a.key} selected={autonomy === a.key} icon={a.icon} title={a.title} desc={a.desc} onClick={() => setAutonomy(a.key)} wide />
                        ))}
                    </div>
                </Section>

                {/* Guardrails */}
                <Section title="Guardrails & notifications" sub="Keep control over the riskier actions.">
                    <div className="flex flex-col gap-3">
                        <ToggleRow
                            checked={guardrail}
                            onChange={setGuardrail}
                            title="Require my approval above an amount"
                            desc="Anything below the threshold can be handled automatically."
                        >
                            {guardrail && (
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-sm" style={{ color: COLORS.textMuted }}>Threshold</span>
                                    <input value={threshold} onChange={(e) => setThreshold(e.target.value)} className="rounded-lg px-3 py-1.5 text-sm bg-white text-right" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, width: 110 }} />
                                    <span className="text-sm" style={{ color: COLORS.textMuted }}>DKK</span>
                                </div>
                            )}
                        </ToggleRow>
                        <ToggleRow checked={notify} onChange={setNotify} title="Notify me when this skill acts" desc="Get a notification and a Review entry each time it runs." />
                    </div>
                </Section>

                {/* footer actions */}
                <div className="flex items-center justify-between mt-8 pb-10">
                    <div className="flex gap-2">
                        <Button onClick={onBack}>Cancel</Button>
                        <Button onClick={() => setTestOpen(true)}><Icon name="play" /> Test run</Button>
                    </div>
                    {locked ? (
                        <Button appearance="primary" onClick={onEnable}>{`Enable for ${skill.price} DKK/month`}</Button>
                    ) : (
                        <Button appearance="primary" onClick={onBack}>Save changes</Button>
                    )}
                </div>
                </>
                )}
            </div>

            {testOpen && <TestRunModal skill={skill} onClose={() => setTestOpen(false)} />}
        </div>
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
                            This will run the skill against your data from the <b>past 30 days</b>. It's a dry run — nothing is booked, sent or changed. You'll see exactly what the skill would do, so you can be sure it works as intended.
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
    const all = useMemo(() => (locked ? [] : buildEvents(skill)), [skill, locked]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'flagged'>('all');
    const [clientFilter, setClientFilter] = useState('all');
    const [range, setRange] = useState('all');

    if (locked || all.length === 0) {
        return (
            <Card className="p-10 text-center mb-10">
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {locked ? 'No activity yet — enable this skill to let Eva start working.' : 'No activity recorded for this skill yet.'}
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
    const noun = STAT_NOUN[skill.id] ?? 'actions taken';
    const filtersActive = q !== '' || statusFilter !== 'all' || clientFilter !== 'all' || range !== 'all';
    const selStyle = { border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text } as const;

    return (
        <div className="mb-10">
            {/* headline — matches the number on the skill card */}
            <div className="flex items-baseline gap-2.5 mb-4">
                <span className="text-3xl font-semibold leading-none" style={{ color: COLORS.text }}>{all.length.toLocaleString('en-US')}</span>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>{noun}{totalFlagged > 0 ? ` · ${totalFlagged.toLocaleString('en-US')} flagged for review` : ''}</span>
            </div>

            {/* advanced filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1" style={{ minWidth: 220 }}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search actions or clients…"
                        className="w-full rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
                        style={selStyle}
                    />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'done' | 'flagged')} className="rounded-lg px-3 py-2 text-sm bg-white" style={selStyle}>
                    <option value="all">All statuses</option>
                    <option value="done">Completed</option>
                    <option value="flagged">Flagged for review</option>
                </select>
                <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded-lg px-3 py-2 text-sm bg-white" style={selStyle}>
                    <option value="all">All clients</option>
                    {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg px-3 py-2 text-sm bg-white" style={selStyle}>
                    {ACTIVITY_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {filtersActive && (
                    <button onClick={() => { setQuery(''); setStatusFilter('all'); setClientFilter('all'); setRange('all'); }} className="text-sm font-medium px-2 py-2" style={{ color: '#4456c7' }}>
                        Clear
                    </button>
                )}
            </div>

            <p className="text-xs mb-3" style={{ color: COLORS.textMuted }}>
                {filtered.length === all.length ? `Showing all ${all.length.toLocaleString('en-US')} actions` : `${filtered.length.toLocaleString('en-US')} of ${all.length.toLocaleString('en-US')} actions match`}
                {filtered.length > RENDER_LIMIT ? ` · showing the first ${RENDER_LIMIT}` : ''}
            </p>

            {filtered.length === 0 ? (
                <Card className="p-10 text-center">
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>No actions match these filters.</p>
                </Card>
            ) : (
                <div className="flex flex-col gap-2">
                    {shown.map((e, i) => {
                        const done = e.status === 'done';
                        const fg = done ? '#15803d' : '#92710f';
                        return (
                            <Card key={i} className="p-4 flex items-center gap-3">
                                <span
                                    title={done ? 'Completed' : 'Flagged for review'}
                                    className="flex items-center justify-center shrink-0 rounded-lg"
                                    style={{ width: 34, height: 34, background: `${fg}1a`, color: fg }}
                                >
                                    <Icon name={done ? 'circle-tick' : 'circle-warning'} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{e.desc}</p>
                                    <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}>{e.client} · {dayLabel(e.daysAgo)} · {e.time}</p>
                                </div>
                                {!done && (
                                    <span className="rounded-md px-2 py-0.5 text-xs font-medium shrink-0" style={{ background: '#fbf3e0', color: '#92710f' }}>
                                        Needs review
                                    </span>
                                )}
                            </Card>
                        );
                    })}
                    {filtered.length > RENDER_LIMIT && (
                        <p className="text-xs text-center mt-2" style={{ color: COLORS.textMuted }}>
                            + {(filtered.length - RENDER_LIMIT).toLocaleString('en-US')} more — narrow the filters to find a specific action.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
    return (
        <div className="mb-7">
            <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>{title}</h2>
            <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>{sub}</p>
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
