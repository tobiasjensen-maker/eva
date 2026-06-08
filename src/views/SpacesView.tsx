import { useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, EmojiTile, Orb, MicIcon, COLORS } from '../ui';
import { ArtifactPreview } from '../SpaceArtifact';
import { TemplateGallery, type Template } from '../TemplateGallery';
import type { Space } from '../types';

interface Props {
    spaces: Space[];
    onCreate: (title: string, description: string) => void;
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

export default function SpacesView({ spaces, onCreate }: Props) {
    const [gallery, setGallery] = useState(false);
    const [open, setOpen] = useState<Space | null>(null);

    if (open) return <SpaceDetail space={open} onBack={() => setOpen(null)} />;

    return (
        <div className="h-full overflow-y-auto px-8 py-7">
            <div className="mx-auto" style={{ maxWidth: 1040 }}>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold" style={{ color: COLORS.text }}>
                            Spaces
                        </h1>
                        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                            {spaces.length < FREE_SPACE_LIMIT
                                ? `${spaces.length} of ${FREE_SPACE_LIMIT} free Spaces used`
                                : `${FREE_SPACE_LIMIT} free Spaces used · extra Spaces are ${SPACE_PRICE} kr each`}
                        </p>
                    </div>
                    <Button appearance="primary" onClick={() => setGallery(true)}>
                        <Icon name="circle-plus" /> New Space
                    </Button>
                </div>

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
                                    <Icon name="calendar" /> Updated {s.updated}
                                </span>
                                <span
                                    className="rounded-md px-2 py-0.5 text-xs"
                                    style={{ background: '#f1f1f3', color: COLORS.textMuted }}
                                >
                                    {s.messages} messages
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
    return (
        <div className="flex h-full">
            <div className="flex-1 min-w-0 overflow-y-auto px-8 py-7">
                <div className="mx-auto" style={{ maxWidth: 860 }}>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm mb-4"
                        style={{ color: COLORS.textMuted }}
                    >
                        <Icon name="arrow-left" /> Spaces
                    </button>
                    <div className="flex items-start gap-3 mb-6">
                        <EmojiTile emoji={space.emoji} size={44} />
                        <div>
                            <h1 className="text-2xl font-semibold" style={{ color: COLORS.text }}>
                                {space.title}
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>
                                {space.description}
                            </p>
                        </div>
                    </div>

                    <ArtifactPreview space={space} />
                </div>
            </div>

            <SpaceChat space={space} />
        </div>
    );
}

interface SpaceMsg {
    role: 'user' | 'assistant';
    text: string;
}

function SpaceChat({ space }: { space: Space }) {
    const [msgs, setMsgs] = useState<SpaceMsg[]>([
        { role: 'assistant', text: `I'm Eva. Ask me to refine “${space.title}” — add a forecast, filter it, or export it.` },
    ]);
    const [input, setInput] = useState('');
    const chips = ['Add a forecast', 'Filter to last quarter', 'Export as PDF'];
    const canSend = input.trim().length > 0;

    function send(text: string) {
        const t = text.trim();
        if (!t) return;
        setMsgs((m) => [...m, { role: 'user', text: t }, { role: 'assistant', text: `On it — I'll ${t.toLowerCase()} for this Space and update it live.` }]);
        setInput('');
    }

    return (
        <aside className="shrink-0 bg-white flex flex-col h-full" style={{ width: 360, borderLeft: `1px solid ${COLORS.cardBorder}` }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <Orb size={20} />
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>Eva</span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>· about this Space</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {msgs.map((m, i) =>
                    m.role === 'user' ? (
                        <div key={i} className="flex justify-end">
                            <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: '#f1f1f3', color: COLORS.text, maxWidth: '88%' }}>{m.text}</div>
                        </div>
                    ) : (
                        <div key={i} className="flex gap-2">
                            <div className="shrink-0 mt-0.5"><Orb size={20} /></div>
                            <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{m.text}</p>
                        </div>
                    )
                )}
            </div>

            <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {chips.map((c) => (
                        <button
                            key={c}
                            onClick={() => send(c)}
                            className="rounded-full px-2.5 py-1 text-xs"
                            style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text, background: '#fff' }}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <div className="relative rounded-xl" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
                        placeholder="Ask Eva about this Space"
                        className="w-full bg-transparent text-sm outline-none"
                        style={{ color: COLORS.text, padding: '10px 76px 10px 12px' }}
                    />
                    <div className="absolute flex items-center gap-2" style={{ right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                        <button style={{ color: COLORS.textMuted }} title="Voice input"><MicIcon /></button>
                        <button
                            onClick={() => send(input)}
                            disabled={!canSend}
                            className="flex items-center justify-center rounded-lg"
                            style={{
                                width: 28,
                                height: 28,
                                background: canSend ? '#4c6ef5' : '#e4e4e7',
                                color: canSend ? '#fff' : '#b0b0b8',
                                cursor: canSend ? 'pointer' : 'not-allowed',
                            }}
                        >
                            <Icon name="arrow-up" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
