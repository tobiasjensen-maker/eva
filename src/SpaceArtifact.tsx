import { Button, BarChart } from '@economic/taco';
import { Card, COLORS } from './ui';
import type { Space } from './types';

export function ArtifactPreview({ space, compact }: { space: Space; compact?: boolean }) {
    if (space.id === 'revenue' || /dashboard|revenue/i.test(space.title)) {
        const data = [
            { month: 'Aug', revenue: 620 },
            { month: 'Sep', revenue: 710 },
            { month: 'Oct', revenue: 580 },
            { month: 'Nov', revenue: 830 },
            { month: 'Dec', revenue: 960 },
            { month: 'Jan', revenue: 880 },
        ];
        return (
            <Card className={compact ? 'p-4' : 'p-6'}>
                <p className="text-sm font-semibold mb-1" style={{ color: COLORS.text }}>
                    Monthly revenue (DKK, thousands)
                </p>
                <p className="text-xs mb-4" style={{ color: COLORS.textMuted }}>
                    Last 6 months · +14% vs prior period
                </p>
                <div className="va-chart" style={{ width: '100%', maxWidth: compact ? 460 : 620 }}>
                    <BarChart
                        data={data}
                        dataKey="month"
                        showYAxis
                        yAxisTickFormatter={(v) => `${(v as number) / 1000}M`}
                        tooltipTitle="Revenue"
                    >
                        <BarChart.Bar dataKey="revenue" label="Revenue" color="orange" formatter={(v) => `${v}k DKK`} />
                    </BarChart>
                </div>
            </Card>
        );
    }
    if (/form|expense/i.test(space.title)) {
        const fields = ['Employee', 'Date', 'Category', 'Amount (DKK)', 'Receipt', 'Notes'];
        return (
            <Card className={compact ? 'p-4' : 'p-6'}>
                <p className="text-sm font-semibold mb-4" style={{ color: COLORS.text }}>
                    Expense submission form
                </p>
                <div className="grid grid-cols-2 gap-4">
                    {fields.map((f) => (
                        <div key={f}>
                            <label className="text-xs" style={{ color: COLORS.textMuted }}>
                                {f}
                            </label>
                            <div
                                className="mt-1 rounded-lg px-3 py-2 text-sm"
                                style={{ border: `1px solid ${COLORS.cardBorder}`, color: '#b8b8bf' }}
                            >
                                {f === 'Category' ? 'Select…' : ''}
                            </div>
                        </div>
                    ))}
                </div>
                {!compact && (
                    <div className="mt-5">
                        <Button appearance="primary">Submit for approval</Button>
                    </div>
                )}
            </Card>
        );
    }
    if (/receivable|aged/i.test(space.title)) {
        const rows = [
            ['Nordic Build ApS', '0', '34.200', '0', '0'],
            ['Digital Marketing Pro', '12.500', '0', '0', '18.400'],
            ['Café Solsikke', '0', '4.850', '0', '9.200'],
            ['Tech Equipment AS', '22.650', '0', '14.100', '0'],
        ];
        return (
            <Card className={compact ? 'p-4' : 'p-6'}>
                <p className="text-sm font-semibold mb-4" style={{ color: COLORS.text }}>
                    Aged receivables (DKK)
                </p>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ color: COLORS.textMuted }}>
                            {['Client', '0–30', '31–60', '61–90', '90+'].map((h, i) => (
                                <th key={h} className="text-left font-medium pb-2" style={{ textAlign: i === 0 ? 'left' : 'right' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r[0]} style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                {r.map((c, ci) => (
                                    <td
                                        key={ci}
                                        className="py-2"
                                        style={{
                                            textAlign: ci === 0 ? 'left' : 'right',
                                            color: ci === 4 && c !== '0' ? '#dc2626' : COLORS.text,
                                        }}
                                    >
                                        {ci === 0 ? c : `${c}`}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        );
    }
    // template / generic
    return (
        <Card className={compact ? 'p-4' : 'p-6'}>
            <p className="text-sm font-semibold mb-4" style={{ color: COLORS.text }}>
                Invoice template preview
            </p>
            <div className="space-y-3 text-sm" style={{ color: COLORS.text }}>
                <div className="flex justify-between">
                    <span className="font-semibold">e-conomic Topco</span>
                    <span style={{ color: COLORS.textMuted }}>Invoice #2025-001</span>
                </div>
                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                {[
                    ['Consulting services', '24.000,00'],
                    ['Software licence', '6.000,00'],
                    ['VAT (25%)', '7.500,00'],
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                        <span style={{ color: COLORS.textMuted }}>{l}</span>
                        <span>{v} DKK</span>
                    </div>
                ))}
                <div style={{ borderTop: `1px solid ${COLORS.cardBorder}` }} />
                <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>37.500,00 DKK</span>
                </div>
            </div>
        </Card>
    );
}
