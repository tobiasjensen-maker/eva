import { useState, useEffect } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, EmojiTile, PageHeader, StickyFooter, COLORS } from '../ui';
import { ArtifactPreview } from '../SpaceArtifact';
import { TemplateGallery, type Template } from '../TemplateGallery';
import { useLang } from '../i18n';
import type { Space } from '../types';

interface Props {
    spaces: Space[];
    onCreate: (title: string, description: string) => void;
    onActiveSpaceChange?: (space: Space | null) => void;
}

const FREE_SPACE_LIMIT = 5;
const SPACE_PRICE = 49;

const SPACE_CATEGORIES = ['Dashboards', 'Reports', 'Forms', 'Lists'];

const SPACE_TEMPLATES: Template[] = [
    { id: 'tpl-revenue', title: 'Revenue Dashboard', description: 'Monthly revenue trends with a forecast.', category: 'Dashboards', emoji: '📊', badge: 'Popular', features: ['Monthly revenue bar chart', 'Period-over-period comparison', 'Forecast for the next quarter'] },
    { id: 'tpl-cashflow', title: 'Cash Flow Dashboard', description: 'Track operating cash flow across clients.', category: 'Dashboards', emoji: '💵', features: ['Inflow vs. outflow by month', 'Runway estimate', 'Alerts on negative trends'] },
    { id: 'tpl-projects', title: 'Project Budget Dashboard', description: 'Budget vs. spend for every project.', category: 'Dashboards', emoji: '📐', features: ['Budget vs. actual per project', 'Over-budget flags'] },
    { id: 'tpl-aged', title: 'Aged Receivables Report', description: 'Open receivables bucketed by age.', category: 'Reports', emoji: '📈', features: ['0–30 / 31–60 / 61–90 / 90+ buckets', 'Worst-exposure clients highlighted'] },
    { id: 'tpl-vat', title: 'VAT Summary Report', description: 'VAT payable for the period, ready to file.', category: 'Reports', emoji: '🧮', features: ['Period VAT calculation', 'Export for SKAT'] },
    { id: 'tpl-pnl', title: 'P&L Statement', description: 'Profit & loss for any period.', category: 'Reports', emoji: '📑', features: ['Revenue, COGS, opex, EBIT', 'Compare across periods'] },
    { id: 'tpl-expense', title: 'Expense Report Form', description: 'Employee expense submission & approval.', category: 'Forms', emoji: '🧾', features: ['Structured submission form', 'Approval workflow'] },
    { id: 'tpl-invoice', title: 'Invoice Template', description: 'Custom invoice layout for client billing.', category: 'Forms', emoji: '📄', features: ['Branded invoice layout', 'VAT lines & totals'] },
    { id: 'tpl-onboarding', title: 'Onboarding Checklist', description: 'Steps for onboarding a new client.', category: 'Forms', emoji: '✅', features: ['Standard onboarding steps', 'Track completion'] },
    { id: 'tpl-customers', title: 'Top Customers List', description: 'Customers ranked by outstanding balance.', category: 'Lists', emoji: '👥', features: ['Ranked by open balance', 'Overdue flags'] },
    { id: 'tpl-overdue', title: 'Overdue Invoices List', description: 'Every invoice past its due date.', category: 'Lists', emoji: '⏰', features: ['Days overdue', 'One-click reminders'] },
    { id: 'tpl-suppliers', title: 'Supplier Directory', description: 'All suppliers with open bills.', category: 'Lists', emoji: '🏢', features: ['Open bills per supplier', 'Due dates'] },
];

export default function SpacesView({ spaces, onCreate, onActiveSpaceChange }: Props) {
    const { t, lang } = useLang();
    const [gallery, setGallery] = useState(false);
    const [open, setOpen] = useState<Space | null>(null);

    // Let the shell chat panel know which Space (if any) is open, so it can be contextual.
    useEffect(() => {
        onActiveSpaceChange?.(open);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (open) return <SpaceDetail space={open} onBack={() => setOpen(null)} />;

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Artifacts')} right={<Button appearance="primary" onClick={() => setGallery(true)}><Icon name="circle-plus" /> {t('New artifact')}</Button>} />
            <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                <p className="text-sm mb-5" style={{ color: COLORS.textMuted }}>
                    {spaces.length < FREE_SPACE_LIMIT
                        ? (lang === 'da' ? `${spaces.length} af ${FREE_SPACE_LIMIT} gratis artefakter brugt` : `${spaces.length} of ${FREE_SPACE_LIMIT} free artifacts used`)
                        : (lang === 'da' ? `${FREE_SPACE_LIMIT} gratis artefakter brugt · ekstra artefakter koster ${SPACE_PRICE} kr pr. stk.` : `${FREE_SPACE_LIMIT} free artifacts used · extra artifacts are ${SPACE_PRICE} kr each`)}
                </p>

                <div className="grid grid-cols-3 gap-4 pb-10">
                    {spaces.map((s) => (
                        <Card key={s.id} className="p-5 flex flex-col" hover onClick={() => setOpen(s)} style={{ minHeight: 150 }}>
                            <div className="flex items-start gap-3">
                                <EmojiTile emoji={s.emoji} />
                                <h3 className="text-base font-semibold leading-snug flex-1" style={{ color: COLORS.text }}>
                                    {s.title}
                                </h3>
                            </div>
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: COLORS.textMuted }}>
                                {s.description}
                            </p>
                            <div className="flex items-center justify-between mt-auto pt-5">
                                <span className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.textMuted }}>
                                    <Icon name="calendar" /> {t('Updated')} {s.updated}
                                </span>
                                <span
                                    className="rounded-md px-2 py-0.5 text-xs"
                                    style={{ background: '#f1f1f3', color: COLORS.textMuted }}
                                >
                                    {s.messages} {t('messages')}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {gallery && (
                <TemplateGallery
                    kind="space"
                    templates={SPACE_TEMPLATES}
                    categories={SPACE_CATEGORIES}
                    spaceOverLimit={spaces.length >= FREE_SPACE_LIMIT}
                    spacePrice={SPACE_PRICE}
                    onClose={() => setGallery(false)}
                    onCreateSpace={(t) => onCreate(t.title, t.description)}
                />
            )}
        </div>
    );
}

function SpaceDetail({ space, onBack }: { space: Space; onBack: () => void }) {
    const { t } = useLang();
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <PageHeader title={space.title} onBack={onBack} backLabel={t('Artifacts')} />
                <div className="mx-auto px-8 pt-5 pb-7" style={{ maxWidth: 1040 }}>
                    <div className="flex items-start gap-3 mb-6">
                        <EmojiTile emoji={space.emoji} size={44} />
                        <p className="text-sm mt-1.5 flex-1" style={{ color: COLORS.textMuted }}>
                            {space.description}
                        </p>
                    </div>

                    <ArtifactPreview space={space} />
                </div>
            </div>

            <StickyFooter>
                <Button onClick={onBack}>{t('Cancel')}</Button>
                <div className="flex gap-2">
                    <Button><Icon name="export" /> {t('Export')}</Button>
                    <Button appearance="primary" onClick={onBack}>{t('Save changes')}</Button>
                </div>
            </StickyFooter>
        </div>
    );
}
