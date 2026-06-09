import { useState } from 'react';
import { Button, Icon, BarChart } from '@economic/taco';
import { Card, COLORS } from '../ui';

export const INSIGHTS_PRICE = 149; // kr / month

interface Props {
    scope?: string;
    scopeName?: string;
    pro: boolean;
    onUpgrade: () => void;
}

// ---- per-agreement financial profiles ----
// monthly revenue (k DKK) runs Jul → Jun so we can slice windows for each period.
const MONTHS12 = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

interface Profile {
    monthly: number[];
    margin: number;
    net: number;
    marginDelta: string;
    cash: string;
    runway: string;
    overdue: string;
    overdueCount: string;
    yoy: string;
    largestOutflow: string;
    forecastEnd: string;
    expenses: [string, number][];
    anomalies: [string, string][];
    benchmark: [string, string, string][];
}

const HIGH = '#dc2626';
const MED = '#92710f';

const PROFILES: Record<string, Profile> = {
    portfolio: {
        monthly: [620, 640, 710, 580, 830, 960, 720, 690, 810, 760, 940, 880],
        margin: 54.8, net: 18.9, marginDelta: '+1,2 pp', cash: '1,24 mio. kr', runway: '4,2 mo.',
        overdue: '74.200 kr', overdueCount: '4 invoices', yoy: '+9%', largestOutflow: 'Payroll · 312.000 kr', forecastEnd: '1,46 mio. kr',
        expenses: [['Payroll', 46], ['Rent & utilities', 18], ['Software', 12], ['Marketing', 9]],
        anomalies: [['Supplier charge 3× the average', HIGH], ['Receivables aging vs. Q3', MED], ['VAT due in 6 days', MED]],
        benchmark: [['Gross margin', '54,8%', 'Peers 49%'], ['DSO (days to pay)', '38 days', 'Peers 31'], ['Revenue growth', '+14%', 'Peers +6%']],
    },
    dmp: {
        monthly: [180, 210, 240, 200, 260, 290, 250, 230, 270, 300, 320, 310],
        margin: 62.0, net: 24.0, marginDelta: '+2,0 pp', cash: '420.000 kr', runway: '3,1 mo.',
        overdue: '12.500 kr', overdueCount: '1 invoice', yoy: '+22%', largestOutflow: 'Freelancers · 96.000 kr', forecastEnd: '520.000 kr',
        expenses: [['Salaries', 52], ['Freelancers', 20], ['Ad spend', 14], ['Software', 8]],
        anomalies: [['One client = 41% of revenue', HIGH], ['Ad spend up 38% MoM', MED], ['Invoice #DMK-014 42 days overdue', MED]],
        benchmark: [['Gross margin', '62,0%', 'Peers 55%'], ['DSO (days to pay)', '40 days', 'Peers 33'], ['Revenue growth', '+22%', 'Peers +9%']],
    },
    nordic: {
        monthly: [900, 1100, 1300, 1250, 1400, 1600, 1500, 1350, 1700, 1800, 2000, 1900],
        margin: 31.5, net: 9.0, marginDelta: '+0,4 pp', cash: '2,80 mio. kr', runway: '5,0 mo.',
        overdue: '34.200 kr', overdueCount: '1 invoice', yoy: '+12%', largestOutflow: 'Subcontractors · 740.000 kr', forecastEnd: '3,10 mio. kr',
        expenses: [['Subcontractors', 44], ['Materials', 28], ['Payroll', 16], ['Equipment', 7]],
        anomalies: [['ERP rollout project over budget', HIGH], ['Material cost +14% vs Q3', MED], ['Retainage 90+ days', MED]],
        benchmark: [['Gross margin', '31,5%', 'Peers 28%'], ['DSO (days to pay)', '45 days', 'Peers 38'], ['Revenue growth', '+12%', 'Peers +5%']],
    },
    cafe: {
        monthly: [95, 110, 120, 90, 130, 150, 140, 120, 135, 150, 160, 155],
        margin: 22.0, net: 5.0, marginDelta: '-0,6 pp', cash: '85.000 kr', runway: '1,4 mo.',
        overdue: '4.850 kr', overdueCount: '1 invoice', yoy: '+6%', largestOutflow: 'Rent · 38.000 kr', forecastEnd: '92.000 kr',
        expenses: [['Cost of goods', 58], ['Staff', 22], ['Rent', 12], ['Other', 8]],
        anomalies: [['Runway under 2 months', HIGH], ['Card fees +20% MoM', MED], ['Weekday footfall down', MED]],
        benchmark: [['Gross margin', '22,0%', 'Peers 26%'], ['DSO (days to pay)', '12 days', 'Peers 9'], ['Revenue growth', '+6%', 'Peers +4%']],
    },
    tech: {
        monthly: [500, 520, 610, 580, 700, 820, 760, 690, 800, 760, 900, 880],
        margin: 18.0, net: 5.5, marginDelta: '+0,3 pp', cash: '640.000 kr', runway: '2,2 mo.',
        overdue: '22.650 kr', overdueCount: '1 invoice', yoy: '+8%', largestOutflow: 'Inventory · 410.000 kr', forecastEnd: '710.000 kr',
        expenses: [['Inventory', 62], ['Logistics', 16], ['Payroll', 14], ['Software', 5]],
        anomalies: [['One supplier 3× average charge', HIGH], ['Inventory turnover slowing', MED], ['Bill #TE-188 33 days overdue', MED]],
        benchmark: [['Gross margin', '18,0%', 'Peers 21%'], ['DSO (days to pay)', '35 days', 'Peers 30'], ['Revenue growth', '+8%', 'Peers +6%']],
    },
    office: {
        monthly: [220, 210, 240, 230, 260, 280, 250, 240, 260, 270, 300, 290],
        margin: 34.0, net: 11.0, marginDelta: '+0,8 pp', cash: '310.000 kr', runway: '2,8 mo.',
        overdue: '14.900 kr', overdueCount: '1 invoice', yoy: '+5%', largestOutflow: 'Stock purchase · 120.000 kr', forecastEnd: '330.000 kr',
        expenses: [['Stock', 48], ['Payroll', 24], ['Warehouse', 16], ['Software', 7]],
        anomalies: [['Supplier charge 3× the average', HIGH], ['Returns rate up MoM', MED], ['Slow-moving SKUs rising', MED]],
        benchmark: [['Gross margin', '34,0%', 'Peers 31%'], ['DSO (days to pay)', '33 days', 'Peers 29'], ['Revenue growth', '+5%', 'Peers +6%']],
    },
    cloud: {
        monthly: [300, 320, 360, 400, 440, 480, 520, 560, 600, 650, 700, 760],
        margin: 78.0, net: 28.0, marginDelta: '+1,5 pp', cash: '1,90 mio. kr', runway: '8,0 mo.',
        overdue: '3.400 kr', overdueCount: '1 invoice', yoy: '+34%', largestOutflow: 'Infrastructure · 88.000 kr', forecastEnd: '2,20 mio. kr',
        expenses: [['Payroll', 38], ['Infrastructure', 34], ['Sales & marketing', 18], ['Support', 6]],
        anomalies: [['Annual renewals strong', MED], ['Infra cost +12% MoM', MED], ['Churn ticked up to 2,1%', MED]],
        benchmark: [['Gross margin', '78,0%', 'Peers 72%'], ['DSO (days to pay)', '22 days', 'Peers 28'], ['Net revenue retention', '+34%', 'Peers +18%']],
    },
    bryg: {
        monthly: [260, 300, 340, 310, 380, 460, 420, 390, 450, 500, 540, 520],
        margin: 42.0, net: 12.0, marginDelta: '+0,9 pp', cash: '540.000 kr', runway: '3,3 mo.',
        overdue: '0 kr', overdueCount: 'No overdue', yoy: '+15%', largestOutflow: 'Ingredients · 150.000 kr', forecastEnd: '600.000 kr',
        expenses: [['Ingredients', 38], ['Production', 26], ['Distribution', 20], ['Payroll', 12]],
        anomalies: [['Seasonal demand peak', MED], ['Excise duty timing', MED], ['No overdue invoices', MED]],
        benchmark: [['Gross margin', '42,0%', 'Peers 38%'], ['DSO (days to pay)', '28 days', 'Peers 31'], ['Revenue growth', '+15%', 'Peers +7%']],
    },
    lys: {
        monthly: [150, 170, 190, 160, 210, 240, 220, 200, 230, 260, 280, 270],
        margin: 58.0, net: 19.0, marginDelta: '+1,1 pp', cash: '380.000 kr', runway: '4,1 mo.',
        overdue: '6.200 kr', overdueCount: '1 invoice', yoy: '+18%', largestOutflow: 'Contractors · 64.000 kr', forecastEnd: '300.000 kr',
        expenses: [['Salaries', 50], ['Contractors', 18], ['Studio rent', 16], ['Software', 10]],
        anomalies: [['Q1 campaign project over budget', MED], ['Utilisation above target', MED], ['Invoice 30 days overdue', MED]],
        benchmark: [['Gross margin', '58,0%', 'Peers 52%'], ['DSO (days to pay)', '37 days', 'Peers 33'], ['Revenue growth', '+18%', 'Peers +8%']],
    },
};

const PERIODS = [
    { key: '30d', label: 'Last 30 days' },
    { key: 'q', label: 'This quarter' },
    { key: '6m', label: 'Last 6 months' },
    { key: '12m', label: 'Last 12 months' },
];

const KPI_META = [
    { label: 'Revenue', icon: 'chart-bar' },
    { label: 'Gross margin', icon: 'chart-pie' },
    { label: 'Cash on hand', icon: 'wallet' },
    { label: 'Overdue receivables', icon: 'circle-warning' },
];

// ---- helpers ----
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
function fmtKr(k: number): string {
    const kr = Math.round(k) * 1000;
    if (kr >= 1_000_000) return (kr / 1_000_000).toFixed(2).replace('.', ',') + ' mio. kr';
    return String(kr).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
}
const mpct = (n: number) => String(n).replace('.', ',') + '%';
const pct = (n: number) => (n >= 0 ? '+' : '') + n + '%';
const deltaPct = (curr: number, prev: number) => Math.round(((curr - prev) / prev) * 100);

interface PeriodData {
    kpis: { value: string; delta: string; positive: boolean }[];
    chartSub: string;
    chart: { month: string; revenue: number }[];
}

function getPeriodData(profile: Profile, periodKey: string): PeriodData {
    const m = profile.monthly;
    let revenue: number;
    let revDelta: string;
    let chart: { month: string; revenue: number }[];

    if (periodKey === '30d') {
        revenue = m[11];
        revDelta = pct(deltaPct(m[11], m[10]));
        const base = m[11] / 4;
        chart = [0.92, 1.08, 0.96, 1.04].map((f, i) => ({ month: `W${i + 1}`, revenue: Math.round(base * f) }));
    } else if (periodKey === 'q') {
        const w = m.slice(9, 12);
        revenue = sum(w);
        revDelta = pct(deltaPct(revenue, sum(m.slice(6, 9))));
        chart = w.map((v, i) => ({ month: MONTHS12[9 + i], revenue: v }));
    } else if (periodKey === '6m') {
        const w = m.slice(6, 12);
        revenue = sum(w);
        revDelta = pct(deltaPct(revenue, sum(m.slice(0, 6))));
        chart = w.map((v, i) => ({ month: MONTHS12[6 + i], revenue: v }));
    } else {
        revenue = sum(m);
        revDelta = profile.yoy;
        chart = m.map((v, i) => ({ month: MONTHS12[i], revenue: v }));
    }

    const periodLabel = PERIODS.find((p) => p.key === periodKey)!.label;
    return {
        kpis: [
            { value: fmtKr(revenue), delta: revDelta, positive: !revDelta.startsWith('-') },
            { value: mpct(profile.margin), delta: profile.marginDelta, positive: !profile.marginDelta.startsWith('-') },
            { value: profile.cash, delta: `${profile.runway} runway`, positive: true },
            { value: profile.overdue, delta: profile.overdueCount, positive: false },
        ],
        chartSub: `${periodLabel} (DKK, thousands) · ${revDelta} vs prior period`,
        chart,
    };
}

function BarsRow({ values, color = '#ed9b2c' }: { values: number[]; color?: string }) {
    const max = Math.max(...values);
    return (
        <div className="flex items-end gap-1.5" style={{ height: 56 }}>
            {values.map((v, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.35 + 0.65 * (v / max) }} />
            ))}
        </div>
    );
}

function StatLine({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="flex items-center justify-between text-sm py-1">
            <span style={{ color: COLORS.textMuted }}>{label}</span>
            <span className="font-medium" style={{ color: accent ?? COLORS.text }}>{value}</span>
        </div>
    );
}

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center rounded-lg p-0.5" style={{ background: '#f1f1f3' }}>
            {PERIODS.map((p) => {
                const active = value === p.key;
                return (
                    <button
                        key={p.key}
                        onClick={() => onChange(p.key)}
                        className="rounded-md text-xs font-medium whitespace-nowrap"
                        style={{
                            padding: '5px 10px',
                            background: active ? '#fff' : 'transparent',
                            color: active ? COLORS.text : COLORS.textMuted,
                            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                        }}
                    >
                        {p.label}
                    </button>
                );
            })}
        </div>
    );
}

// ---- premium (locked) analyses, rendered from the active profile ----
const PREMIUM_META = [
    { key: 'cashflow', title: 'Cash flow analysis', icon: 'transfer', desc: 'Operating inflow vs. outflow and net position over time.' },
    { key: 'margins', title: 'Profitability & margins', icon: 'chart-pie', desc: 'Gross and net margin trend with the main drivers.' },
    { key: 'expenses', title: 'Expense breakdown', icon: 'list', desc: 'Where the money goes, by category, with month-over-month change.' },
    { key: 'anomalies', title: 'Anomaly & risk detection', icon: 'experiment', desc: 'Unusual transactions and emerging risks flagged automatically.' },
    { key: 'forecast', title: 'Cash flow forecast', icon: 'chart-line', desc: 'Projected cash position for the next three months.' },
    { key: 'benchmark', title: 'Peer benchmarking', icon: 'contacts', desc: 'How this client compares to similar businesses in your portfolio.' },
];

function renderPremium(key: string, p: Profile): JSX.Element {
    if (key === 'cashflow') {
        const net6 = p.monthly.slice(6).map((v) => Math.round((v * p.net) / 100));
        return (
            <div>
                <BarsRow values={net6} color="#2f7d54" />
                <div className="mt-3">
                    <StatLine label="Net operating cash flow" value={`+${fmtKr(sum(net6))}`} accent="#2f7d54" />
                    <StatLine label="Largest outflow" value={p.largestOutflow} />
                </div>
            </div>
        );
    }
    if (key === 'margins') {
        const bars = [p.margin - 4, p.margin - 3, p.margin - 2, p.margin - 1, p.margin].map((v) => Math.max(1, Math.round(v)));
        return (
            <div>
                <BarsRow values={bars} color="#6366f1" />
                <div className="mt-3">
                    <StatLine label="Gross margin" value={`${mpct(p.margin)} ▲`} accent="#6366f1" />
                    <StatLine label="Net margin" value={mpct(p.net)} />
                </div>
            </div>
        );
    }
    if (key === 'expenses') {
        return (
            <div className="flex flex-col gap-2">
                {p.expenses.map(([l, v]) => (
                    <div key={l}>
                        <div className="flex justify-between text-xs mb-1" style={{ color: COLORS.textMuted }}><span>{l}</span><span>{v}%</span></div>
                        <div className="rounded-full" style={{ height: 6, background: '#eee' }}>
                            <div className="rounded-full" style={{ height: 6, width: `${v}%`, background: '#ed9b2c' }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    if (key === 'anomalies') {
        return (
            <div className="flex flex-col gap-2">
                {p.anomalies.map(([t, c]) => (
                    <div key={t} className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                        <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: c }} /> {t}
                    </div>
                ))}
            </div>
        );
    }
    if (key === 'forecast') {
        const last = p.monthly[11];
        const bars = [last, Math.round(last * 1.06), Math.round(last * 1.12)];
        return (
            <div>
                <BarsRow values={bars} color="#14b8a6" />
                <div className="mt-3">
                    <StatLine label="Projected end of next quarter" value={p.forecastEnd} accent="#14b8a6" />
                    <StatLine label="Confidence" value="High (±6%)" />
                </div>
            </div>
        );
    }
    // benchmark
    return (
        <div>
            {p.benchmark.map(([l, a, b]) => (
                <StatLine key={l} label={l} value={`${a}  ·  ${b}`} />
            ))}
        </div>
    );
}

export default function InsightsView({ scope = 'portfolio', scopeName = 'All agreements', pro, onUpgrade }: Props) {
    const subjectLabel = scope === 'portfolio' ? 'your portfolio' : scopeName;
    const profile = PROFILES[scope] ?? PROFILES.portfolio;
    const [period, setPeriod] = useState('6m');
    const pd = getPeriodData(profile, period);

    return (
        <div className="h-full overflow-y-auto px-8 py-7">
                <div className="mx-auto" style={{ maxWidth: 880 }}>
                    {/* header */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <h1 className="text-2xl font-semibold" style={{ color: COLORS.text }}>Insights</h1>
                            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>
                                <Icon name={scope === 'portfolio' ? 'contacts' : 'person'} /> {scope === 'portfolio' ? `Portfolio · all agreements` : scopeName}
                            </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <PeriodSelector value={period} onChange={setPeriod} />
                        </div>
                    </div>

                    {/* upgrade banner */}
                    {!pro && (
                        <div className="rounded-2xl p-5 mb-6 flex items-center gap-4" style={{ background: 'linear-gradient(110deg, #2b283e 0%, #4a3d6b 100%)' }}>
                            <span className="flex items-center justify-center shrink-0 rounded-xl" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.12)', color: '#ed9b2c' }}>
                                <Icon name="ai-stars" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">Unlock full Financial Insights</p>
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Deep cash-flow, margin, anomaly and forecast analysis for {subjectLabel} — plus Eva can answer analysis questions right in chat.
                                </p>
                            </div>
                            <Button appearance="primary" onClick={onUpgrade}>Upgrade · {INSIGHTS_PRICE} kr/mo</Button>
                        </div>
                    )}

                    {/* basic insights — always visible (free preview) */}
                    <p className="text-xs font-medium uppercase tracking-wide mb-2.5" style={{ color: COLORS.textMuted }}>Overview</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {KPI_META.map((k, i) => {
                            const data = pd.kpis[i];
                            return (
                                <Card key={k.label} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 34, height: 34, background: '#f1f1f3', color: '#52525b' }}>
                                            <Icon name={k.icon as never} />
                                        </span>
                                        <span className="text-xs font-medium" style={{ color: data.positive ? '#2f7d54' : '#b9842b' }}>{data.delta}</span>
                                    </div>
                                    <p className="text-xl font-semibold mt-2.5" style={{ color: COLORS.text }}>{data.value}</p>
                                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{k.label}</p>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="p-5 mb-7">
                        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.text }}>Revenue trend</p>
                        <p className="text-xs mb-4" style={{ color: COLORS.textMuted }}>{pd.chartSub}</p>
                        <div className="va-chart" style={{ width: '100%', maxWidth: 760 }}>
                            <BarChart data={pd.chart} dataKey="month" showYAxis yAxisTickFormatter={(v) => `${(v as number) / 1000}M`} tooltipTitle="Revenue">
                                <BarChart.Bar dataKey="revenue" label="Revenue" color="orange" formatter={(v) => `${v}k DKK`} />
                            </BarChart>
                        </div>
                    </Card>

                    {/* premium insights */}
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.textMuted }}>Deep analysis</p>
                        {!pro && (
                            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#92710f' }}>
                                <Icon name="lock" /> Insights Pro
                            </span>
                        )}
                    </div>

                    <div className="relative pb-10">
                        <div
                            className="grid grid-cols-2 gap-4"
                            style={!pro ? { filter: 'blur(3.5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.65 } : undefined}
                            aria-hidden={!pro}
                        >
                            {PREMIUM_META.map((p) => (
                                <Card key={p.key} className="p-5">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: '#f1f1f3', color: '#52525b' }}>
                                            <Icon name={p.icon as never} />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold leading-tight" style={{ color: COLORS.text }}>{p.title}</p>
                                            <p className="text-xs leading-tight" style={{ color: COLORS.textMuted }}>{p.desc}</p>
                                        </div>
                                    </div>
                                    {renderPremium(p.key, profile)}
                                </Card>
                            ))}
                        </div>

                        {!pro && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="rounded-2xl bg-white text-center px-7 py-6 anim-in" style={{ maxWidth: 380, border: `1px solid ${COLORS.cardBorder}`, boxShadow: '0 16px 40px rgba(0,0,0,0.16)' }}>
                                    <span className="flex items-center justify-center mx-auto rounded-xl" style={{ width: 46, height: 46, background: '#fbf3e0', color: '#b9842b' }}>
                                        <Icon name="lock" />
                                    </span>
                                    <p className="text-base font-semibold mt-3" style={{ color: COLORS.text }}>Unlock 6 deeper analyses</p>
                                    <p className="text-sm mt-1.5" style={{ color: COLORS.textMuted }}>
                                        Cash flow, margins, expense breakdown, anomaly detection, forecasting and peer benchmarking — kept up to date automatically.
                                    </p>
                                    <Button appearance="primary" className="mt-4" onClick={onUpgrade}>Upgrade for {INSIGHTS_PRICE} kr/mo</Button>
                                    <p className="text-xs mt-2.5" style={{ color: COLORS.textMuted }}>Cancel anytime · also unlocks analysis in chat</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
        </div>
    );
}

// ---- Eva insights-analyst answers (consumed by the shell chat panel) ----
export function insightsIntro(pro: boolean, subjectLabel: string): string {
    return pro
        ? `I've got full access to the numbers for ${subjectLabel}. Ask me to analyze a trend, explain a change, or forecast.`
        : `I can show you the basics for ${subjectLabel}. Unlock Insights and I'll analyze cash flow, margins, anomalies and forecasts in depth.`;
}
export function insightsChips(pro: boolean): string[] {
    return pro
        ? ['Analyze cash flow', 'Why did margin change?', 'Forecast next quarter', 'Any anomalies?']
        : ['Analyze cash flow', 'Forecast next quarter', 'What does Insights include?'];
}
export function insightsAnswer(scope: string, pro: boolean, subjectLabel: string, q: string): string {
    if (!pro) return `That's a deep-analysis question. With Insights Pro I'd break this down for ${subjectLabel} — unlock it on this page to have me answer it here.`;
    const profile = PROFILES[scope] ?? PROFILES.portfolio;
    return proAnswer(profile, subjectLabel, q);
}

function proAnswer(profile: Profile, subjectLabel: string, q: string): string {
    const t = q.toLowerCase();
    const net6 = profile.monthly.slice(6).reduce((a, v) => a + (v * profile.net) / 100, 0);
    if (/cash ?flow|liquidity|runway/.test(t))
        return `Net operating cash flow is about +${fmtKr(net6)} over the last 6 months for ${subjectLabel}. The biggest outflow is ${profile.largestOutflow}. At the current burn, runway is ~${profile.runway}`;
    if (/margin|profit/.test(t))
        return `Gross margin is ${mpct(profile.margin)} (${profile.marginDelta}); net margin sits at ${mpct(profile.net)}.`;
    if (/expense|cost|spend/.test(t)) {
        const e = profile.expenses;
        return `Spend is led by ${e[0][0].toLowerCase()} (${e[0][1]}%), then ${e[1][0].toLowerCase()} (${e[1][1]}%) and ${e[2][0].toLowerCase()} (${e[2][1]}%).`;
    }
    if (/forecast|predict|next|project/.test(t))
        return `Projecting cash at ~${profile.forecastEnd} by end of next quarter (±6%) for ${subjectLabel}, assuming current collection speed.`;
    if (/anomal|unusual|risk|flag/.test(t))
        return `I flagged: ${profile.anomalies.map((a) => a[0]).join('; ')}. Want me to open any in Review?`;
    if (/benchmark|peer|compare/.test(t))
        return `Versus similar businesses: ${profile.benchmark.map((b) => `${b[0].toLowerCase()} ${b[1]} vs ${b[2].replace('Peers ', 'peers ')}`).join('; ')}.`;
    return `Looking at ${subjectLabel}: revenue is trending ${profile.yoy} year-on-year, gross margin ${mpct(profile.margin)}, with ~${profile.runway} of runway. Ask me about cash flow, margins, expenses, anomalies or the forecast.`;
}

