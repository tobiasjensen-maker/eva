import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@economic/taco';
import { PageHeader, COLORS } from '../ui';
import { useLang } from '../i18n';
import { getCustomers, getInvoices, type EcoCustomer, type EcoInvoice } from '../eco';

// Live view backed by the connected e-conomic agreement: the agreement's customers
// (debtors) and their sales invoices. Data is read through the dev proxy (see eco.ts).

function money(amount: number, currency = 'DKK') {
    try {
        return new Intl.NumberFormat('da-DK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${amount.toLocaleString('da-DK')} ${currency}`;
    }
}
function shortDate(d?: string) {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('da-DK', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Status = 'paid' | 'open' | 'overdue' | 'draft';
function invoiceStatus(inv: EcoInvoice): Status {
    if (inv.kind === 'draft') return 'draft';
    if (!inv.remainder || inv.remainder <= 0) return 'paid';
    if (inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue';
    return 'open';
}
const STATUS_STYLE: Record<Status, { label: string; bg: string; fg: string }> = {
    paid: { label: 'Paid', bg: '#ecfdf3', fg: '#15803d' },
    open: { label: 'Open', bg: '#fff7ed', fg: '#b9842b' },
    overdue: { label: 'Overdue', bg: '#fef2f2', fg: '#dc2626' },
    draft: { label: 'Draft', bg: '#f1f1f3', fg: '#52525b' },
};

export default function CustomersView() {
    const { t } = useLang();
    const [customers, setCustomers] = useState<EcoCustomer[]>([]);
    const [invoices, setInvoices] = useState<EcoInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        Promise.all([getCustomers(), getInvoices()])
            .then(([cs, is]) => {
                if (!alive) return;
                setCustomers(cs);
                setInvoices(is);
                setSelected((prev) => prev ?? cs[0]?.customerNumber ?? null);
            })
            .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [reloadKey]);

    const kpis = useMemo(() => {
        const outstanding = customers.reduce((s, c) => s + (c.balance || 0), 0);
        const booked = invoices.filter((i) => i.kind === 'booked');
        const overdue = booked.filter((i) => invoiceStatus(i) === 'overdue');
        const overdueSum = overdue.reduce((s, i) => s + (i.remainder || 0), 0);
        return { customers: customers.length, outstanding, booked: booked.length, overdue: overdue.length, overdueSum };
    }, [customers, invoices]);

    const selectedCustomer = customers.find((c) => c.customerNumber === selected) ?? null;
    const customerInvoices = useMemo(
        () => invoices.filter((i) => i.customerNumber === selected).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
        [invoices, selected],
    );

    return (
        <div className="h-full flex flex-col" style={{ background: '#fff' }}>
            <PageHeader
                title={t('Customers')}
                showScope={false}
                badge={
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: '#ecfdf3', color: '#15803d' }}>
                        <span className="rounded-full" style={{ width: 6, height: 6, background: '#22c55e' }} /> {t('Live · e-conomic')}
                    </span>
                }
                right={
                    <button
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm"
                        style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f8')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <Icon name="refresh" /> {t('Refresh')}
                    </button>
                }
            />

            <div className="flex-1 overflow-y-auto px-8 py-5" style={{ maxWidth: 1040, width: '100%', margin: '0 auto' }}>
                {loading ? (
                    <div className="flex items-center gap-2 py-16 justify-center text-sm" style={{ color: COLORS.textMuted }}>
                        <Icon name="refresh" className="animate-spin" /> {t('Loading from e-conomic…')}
                    </div>
                ) : error ? (
                    <div className="rounded-xl p-4 text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        {t('Could not load data')}: {error}
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                            <Kpi label={t('Customers')} value={String(kpis.customers)} />
                            <Kpi label={t('Outstanding')} value={money(kpis.outstanding)} />
                            <Kpi label={t('Booked invoices')} value={String(kpis.booked)} />
                            <Kpi label={t('Overdue')} value={String(kpis.overdue)} sub={kpis.overdue ? money(kpis.overdueSum) : undefined} accent={kpis.overdue ? '#dc2626' : undefined} />
                        </div>

                        {/* Two-pane: customer list + selected customer's invoices */}
                        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
                            {/* Customer list */}
                            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <div className="px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{t('Customers')}</div>
                                <div className="max-h-[520px] overflow-y-auto">
                                    {customers.map((c) => {
                                        const sel = c.customerNumber === selected;
                                        return (
                                            <button
                                                key={c.customerNumber}
                                                onClick={() => setSelected(c.customerNumber)}
                                                className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2"
                                                style={{ background: sel ? '#f5f8ff' : '#fff', borderBottom: `1px solid ${COLORS.cardBorder}`, borderLeft: `2px solid ${sel ? '#4456c7' : 'transparent'}` }}
                                                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = '#fafafa'; }}
                                                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium truncate" style={{ color: COLORS.text }}>{c.name}</span>
                                                    <span className="block text-xs" style={{ color: COLORS.textMuted }}>#{c.customerNumber}</span>
                                                </span>
                                                {c.balance > 0 && <span className="shrink-0 text-xs font-medium" style={{ color: '#b9842b' }}>{money(c.balance, c.currency)}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected customer + invoices */}
                            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                {selectedCustomer && (
                                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                        <div className="text-base font-semibold" style={{ color: COLORS.text }}>{selectedCustomer.name}</div>
                                        <div className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                                            #{selectedCustomer.customerNumber}
                                            {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}
                                            {` · ${t('Balance')}: ${money(selectedCustomer.balance, selectedCustomer.currency)}`}
                                        </div>
                                    </div>
                                )}
                                {customerInvoices.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-sm" style={{ color: COLORS.textMuted }}>{t('No invoices for this customer.')}</div>
                                ) : (
                                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ color: COLORS.textMuted }}>
                                                <th className="text-left font-medium px-4 py-2">{t('Invoice')}</th>
                                                <th className="text-left font-medium px-4 py-2">{t('Date')}</th>
                                                <th className="text-left font-medium px-4 py-2">{t('Due')}</th>
                                                <th className="text-right font-medium px-4 py-2">{t('Amount')}</th>
                                                <th className="text-right font-medium px-4 py-2">{t('Status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerInvoices.map((inv) => {
                                                const st = STATUS_STYLE[invoiceStatus(inv)];
                                                return (
                                                    <tr key={`${inv.kind}-${inv.number}`} style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                                        <td className="px-4 py-2.5" style={{ color: COLORS.text }}>{inv.kind === 'draft' ? t('Draft') : `#${inv.number}`}</td>
                                                        <td className="px-4 py-2.5" style={{ color: COLORS.textMuted }}>{shortDate(inv.date)}</td>
                                                        <td className="px-4 py-2.5" style={{ color: COLORS.textMuted }}>{shortDate(inv.dueDate)}</td>
                                                        <td className="px-4 py-2.5 text-right" style={{ color: COLORS.text }}>{money(inv.grossAmount, inv.currency)}</td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.fg }}>{t(st.label)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
        <div className="rounded-2xl p-3.5" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
            <div className="text-2xl font-semibold" style={{ color: accent ?? COLORS.text }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{label}{sub ? ` · ${sub}` : ''}</div>
        </div>
    );
}
