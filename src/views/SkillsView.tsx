import { useState, useMemo, type ReactNode } from 'react';
import { Button, Icon, Switch } from '@economic/taco';
import { Card, Dot, EmojiTile, PageHeader, StickyFooter, asset, COLORS } from '../ui';
import { TemplateGallery, type Template } from '../TemplateGallery';
import { ReviewItemCard, type ReviewCardData } from '../ReviewItemCard';
import { AGREEMENTS } from '../data';
import { useLang } from '../i18n';
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

const AUTO_TABS = [
    { k: 'performance', label: 'Performance' },
    { k: 'flows', label: 'Flows' },
    { k: 'capabilities', label: 'Capabilities' },
] as const;
type AutoTab = (typeof AUTO_TABS)[number]['k'];

export default function AutomationsView({ skills, onEnable }: Props) {
    const { t } = useLang();
    const [tab, setTab] = useState<AutoTab>('performance');
    const [openId, setOpenId] = useState<string | null>(null);
    const [gallery, setGallery] = useState(false);
    // Installed partner capabilities (e-conomic native is always present).
    const [installedCaps, setInstalledCaps] = useState<Set<string>>(new Set());
    const [capGallery, setCapGallery] = useState(false);
    const [openCapId, setOpenCapId] = useState<string | null>(null);

    const flowTemplates: Template[] = skills
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

    const openFlow = openId ? skills.find((s) => s.id === openId) ?? null : null;
    if (openFlow) {
        return <FlowDetail skill={openFlow} onBack={() => setOpenId(null)} onEnable={() => onEnable(openFlow.id)} />;
    }

    const openCap = openCapId ? CAPABILITIES.find((c) => c.id === openCapId) ?? null : null;
    if (openCap) {
        return <CapabilityDetail cap={openCap} onBack={() => setOpenCapId(null)} />;
    }

    const enabled = skills.filter((s) => s.state !== 'locked');

    return (
        <div className="h-full overflow-y-auto">
            {/* Automations are set up for the practice, not per client — no scope pill here. */}
            <PageHeader
                title={t('Automations')}
                showScope={false}
                right={
                    tab === 'flows' ? <Button appearance="primary" onClick={() => setGallery(true)}><Icon name="circle-plus" /> {t('New flow')}</Button>
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
                        <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>{t('A flow is a job Eva runs for you — when to act, how autonomously, and which skills it uses.')}</p>
                        {enabled.length === 0 ? (
                            <Card className="p-10 text-center">
                                <p className="text-sm" style={{ color: COLORS.textMuted }}>{t('No flows set up yet. Start one from a template.')}</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-3 gap-4 pb-10">
                                {enabled.map((s) => (
                                    <FlowCard key={s.id} skill={s} onOpen={() => setOpenId(s.id)} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {tab === 'performance' && <PerformanceView onSetUpFlow={() => setTab('flows')} onAddCapability={() => { setTab('capabilities'); setCapGallery(true); }} />}
                {tab === 'capabilities' && <CapabilitiesMarket installed={installedCaps} onAdd={() => setCapGallery(true)} onOpen={(id) => setOpenCapId(id)} />}
            </div>

            {gallery && (
                <TemplateGallery
                    kind="skill"
                    templates={flowTemplates}
                    categories={SKILL_CATEGORIES}
                    onClose={() => setGallery(false)}
                    onEnableSkill={(tpl) => onEnable(tpl.id)}
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
    const native = CAPABILITIES.filter((c) => c.native);
    const partners = CAPABILITIES.filter((c) => !c.native && installed.has(c.id));
    return (
        <div className="pb-10">
            <p className="text-sm mb-5" style={{ color: COLORS.textMuted }}>{t('Everything Eva can do — built in with e-conomic, plus skills you install from partners. Your flows draw on whatever is installed here.')}</p>

            <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>{t('Built in')}</p>
            <div className="grid grid-cols-2 gap-4 mb-7">
                {native.map((c) => <CapabilityCard key={c.id} cap={c} installed onInstall={() => {}} onOpen={() => onOpen(c.id)} />)}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>{t('From e-conomic partners')}</p>
            {partners.length === 0 ? (
                <button
                    onClick={onAdd}
                    className="w-full rounded-xl p-6 flex flex-col items-center gap-1.5 text-center"
                    style={{ border: `1.5px dashed ${COLORS.cardBorder}`, background: '#fafafa' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c4c4cc')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.cardBorder)}
                >
                    <Icon name="circle-plus" style={{ color: COLORS.textMuted }} />
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t('Add a capability')}</p>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('Install skills from e-conomic partners to extend what Eva can do.')}</p>
                </button>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {partners.map((c) => <CapabilityCard key={c.id} cap={c} installed onInstall={() => {}} onOpen={() => onOpen(c.id)} />)}
                </div>
            )}
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

// ---- Performance tab ----
function PerformanceView({ onSetUpFlow, onAddCapability }: { onSetUpFlow: () => void; onAddCapability: () => void }) {
    const { t, lang } = useLang();
    const nf = (n: number) => n.toLocaleString(lang === 'da' ? 'da-DK' : 'en-US');
    const kpis = [
        { value: `${PERF.automatedPct}%`, label: t('Automated'), sub: t('of all actions handled without you'), accent: '#16a34a' },
        { value: `${PERF.hoursSaved} ${t('hrs')}`, label: t('Time saved'), sub: t('this quarter · ≈ 4 working weeks'), accent: '#6366f1' },
        { value: nf(PERF.actions), label: t('Actions taken'), sub: t('across 8 clients'), accent: COLORS.text },
        { value: `${PERF.reviewRate}%`, label: t('Flagged for review'), sub: t('needed your input'), accent: '#b9842b' },
    ];
    return (
        <div className="pb-10">
            <p className="text-sm mb-5" style={{ color: COLORS.textMuted }}>{t('How much Eva is handling for you — this quarter, across every flow.')}</p>

            {/* headline KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-7">
                {kpis.map((k) => (
                    <Card key={k.label} className="p-4">
                        <p className="text-2xl font-semibold leading-none" style={{ color: k.accent }}>{k.value}</p>
                        <p className="text-sm font-medium mt-2" style={{ color: COLORS.text }}>{k.label}</p>
                        <p className="text-xs mt-0.5 leading-snug" style={{ color: COLORS.textMuted }}>{k.sub}</p>
                    </Card>
                ))}
            </div>

            {/* breakdown by core job to be done */}
            <h2 className="text-base font-semibold mb-1" style={{ color: COLORS.text }}>{t('By job to be done')}</h2>
            <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>{t('Where Eva is saving the most time, and how much runs hands-off.')}</p>
            <Card className="overflow-hidden mb-7">
                {PERF.jobs.map((j, i) => (
                    <div key={j.name} className="flex items-center gap-4 px-4 py-3.5" style={{ borderTop: i ? `1px solid ${COLORS.cardBorder}` : 'none' }}>
                        <div style={{ width: 190 }}>
                            <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{t(j.name)}</p>
                            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{nf(j.actions)} {t('actions')} · {j.hours} {t('hrs')}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="rounded-full" style={{ height: 8, background: '#f1f1f3' }}>
                                <div className="rounded-full" style={{ height: 8, width: `${j.pct}%`, background: j.pct >= 80 ? '#16a34a' : j.pct >= 60 ? '#6366f1' : '#b9842b' }} />
                            </div>
                        </div>
                        <span className="text-sm font-medium shrink-0" style={{ width: 92, textAlign: 'right', color: COLORS.text }}>{j.pct}% {t('automated')}</span>
                    </div>
                ))}
            </Card>

            {/* other stats */}
            <div className="grid grid-cols-4 gap-3 mb-7">
                {PERF.extra.map((s) => (
                    <Card key={s.label} className="p-4">
                        <p className="text-lg font-semibold leading-none" style={{ color: COLORS.text }}>{s.value}</p>
                        <p className="text-xs mt-1.5" style={{ color: COLORS.textMuted }}>{t(s.label)}</p>
                    </Card>
                ))}
            </div>

            {/* what's still on the table — drive automation adoption */}
            <h2 className="text-base font-semibold mb-1" style={{ color: COLORS.text }}>{t('Ready to automate')}</h2>
            <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>
                {lang === 'da'
                    ? `Cirka ${PERF.untappedHours} timer om måneden gøres stadig manuelt — det kan Eva tage over.`
                    : `Around ${PERF.untappedHours} hours a month are still done by hand — Eva could take these over.`}
            </p>
            <div className="flex flex-col gap-2">
                {PERF.opportunities.map((o) => (
                    <Card key={o.name} className="p-4 flex items-center gap-3" style={{ borderLeft: '3px solid #b9842b' }}>
                        <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 34, height: 34, background: '#fbf3e0', color: '#b9842b' }}>
                            <Icon name="ai-stars" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t(o.name)}</p>
                            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t(o.note)}</p>
                        </div>
                        <span className="text-sm font-semibold shrink-0" style={{ color: '#15803d' }}>{t(o.saving)}</span>
                        <Button onClick={o.kind === 'capability' ? onAddCapability : onSetUpFlow}>
                            {o.kind === 'capability' ? t('Add capability') : t('Set it up')}
                        </Button>
                    </Card>
                ))}
            </div>
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
        <Card className="p-5 flex flex-col" hover={clickable} onClick={clickable ? onOpen : undefined} style={{ minHeight: 236 }}>
            <div className="flex items-start gap-3">
                <CapabilityLogo cap={cap} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{cap.name}</p>
                        <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>{t(cap.category)}</span>
                    </div>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: COLORS.textMuted }}>{t(cap.desc)}</p>
                </div>
            </div>
            <div className="mt-3.5">
                <p className="text-xs font-medium mb-1.5" style={{ color: COLORS.textMuted }}>{cap.native ? t('Includes') : t('Adds these skills')}</p>
                <div className="flex flex-col gap-1.5">
                    {cap.skills.map((sk) => (
                        <div key={sk} className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                            <Icon name="circle-tick" style={{ color: '#16a34a' }} /> {t(sk)}
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-auto pt-4 flex items-center justify-between">
                {cap.native ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.textMuted }}>
                        <Icon name="lock" /> {t('Built in · always on')}
                    </span>
                ) : installed ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#15803d' }}>
                        <Icon name="circle-tick" /> {t('Installed')}
                    </span>
                ) : (
                    <Button appearance="primary" onClick={(e) => { e.stopPropagation(); onInstall(); }}>
                        <Icon name="circle-plus" /> {t('Install')}
                    </Button>
                )}
                {clickable && <span className="flex items-center gap-1 text-sm font-medium" style={{ color: COLORS.text }}>{t('Configure')} <Icon name="chevron-right" /></span>}
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

function FlowCard({ skill, onOpen }: { skill: Skill; onOpen: () => void }) {
    const { t } = useLang();
    const locked = skill.state === 'locked';
    return (
        <Card className="p-5 flex flex-col" hover onClick={onOpen} style={{ minHeight: 168 }}>
            <div className="flex items-start gap-3">
                <EmojiTile emoji={skill.emoji} size={30} />
                <p className="text-sm font-semibold leading-snug flex-1" style={{ color: COLORS.text }}>{t(skill.title)}</p>
                {locked && <Icon name="lock" style={{ color: '#a8a8b0' }} />}
            </div>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: COLORS.textMuted }}>{t(skill.description)}</p>
            <div className="flex items-center justify-between mt-auto pt-4">
                {locked ? (
                    <>
                        <span className="text-sm" style={{ color: COLORS.textMuted }}>{`${t('From')} ${skill.price} DKK/${t('month')}`}</span>
                        <span className="flex items-center gap-1 text-sm font-medium" style={{ color: COLORS.text }}>{t('Set up')} <Icon name="chevron-right" /></span>
                    </>
                ) : (
                    <>
                        <span className="text-sm" style={{ color: COLORS.textMuted }}>{t(skill.stat ?? '')}</span>
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: COLORS.text }}>
                            <Dot color={skill.state === 'active' ? '#16a34a' : '#a8a8b0'} />
                            {skill.state === 'active' ? t('Active') : t('Idle')}
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

// Day-count → friendly date label ('Today'/'Yesterday' translated by the caller via t()).
function dayLabel(daysAgo: number, locale = 'en-GB'): string {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function FlowDetail({ skill, onBack, onEnable }: { skill: Skill; onBack: () => void; onEnable: () => void }) {
    const { t, lang } = useLang();
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
    // Each step is a block that can be toggled out of the flow.
    const [blocksOff, setBlocksOff] = useState<Set<number>>(new Set());
    // The flow is set up once for the practice; it can run on all clients or a subset.
    const [clientMode, setClientMode] = useState<'all' | 'selected'>('all');
    const [clientSel, setClientSel] = useState<Set<string>>(() => new Set(AGREEMENTS.slice(0, 3).map((a) => a.id)));
    const [testOpen, setTestOpen] = useState(false);

    function toggleBlock(i: number) {
        setBlocksOff((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    }

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
                {/* Blocks — the skills this flow strings together; toggle any off to skip it */}
                {actions.length > 0 && (
                    <Section title={t('Blocks')} sub={t('The skills this flow runs in order. Turn a block off to skip it.')}>
                        <div className="flex flex-col gap-2">
                            {actions.map((a, i) => {
                                const on = !blocksOff.has(i);
                                return (
                                    <div
                                        key={a}
                                        className="flex items-center gap-3 rounded-xl p-3"
                                        style={{ border: `1px solid ${COLORS.cardBorder}`, background: on ? '#fff' : '#fafafa' }}
                                    >
                                        <span className="flex items-center justify-center shrink-0 rounded-full text-xs font-semibold" style={{ width: 22, height: 22, background: on ? '#ececed' : '#f1f1f3', color: on ? COLORS.text : '#a8a8b0' }}>{i + 1}</span>
                                        <span className="flex-1 text-sm" style={{ color: on ? COLORS.text : '#a8a8b0', textDecoration: on ? 'none' : 'line-through' }}>{t(a)}</span>
                                        <Switch checked={on} onChange={() => toggleBlock(i)} />
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}

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

                {/* Trigger */}
                <Section title={t('Trigger')} sub={t('Decide what kicks this flow off.')}>
                    <div className="grid grid-cols-2 gap-3">
                        {TRIGGERS.map((tr) => (
                            <OptionCard key={tr.key} selected={trigger === tr.key} icon={tr.icon} title={t(tr.title)} desc={t(tr.desc)} onClick={() => setTrigger(tr.key)} />
                        ))}
                    </div>

                    {trigger === 'event' && (
                        <Field label={t('Run when…')}>
                            <select value={event} onChange={(e) => setEvent(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                                {EVENTS.map((ev) => <option key={ev} value={ev}>{t(ev)}</option>)}
                            </select>
                        </Field>
                    )}

                    {trigger === 'schedule' && (
                        <div className="flex flex-wrap items-end gap-4">
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
