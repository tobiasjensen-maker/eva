import { useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { COLORS, EmojiTile } from './ui';
import { ArtifactPreview } from './SpaceArtifact';
import type { Space } from './types';

export interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
    emoji?: string; // spaces
    color?: string; // skills
    price?: number; // skills (monthly DKK)
    badge?: string; // e.g. 'Popular'
    longDescription?: string;
    features?: string[];
}

interface Props {
    kind: 'space' | 'skill';
    templates: Template[];
    categories: string[];
    onClose: () => void;
    onCreateSpace?: (t: Template) => void;
    onEnableSkill?: (t: Template) => void;
    spaceOverLimit?: boolean;
    spacePrice?: number;
}

export function TemplateGallery({ kind, templates, categories, onClose, onCreateSpace, onEnableSkill, spaceOverLimit, spacePrice = 49 }: Props) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [selected, setSelected] = useState<Template | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    const cats = ['All', ...categories];
    const q = query.trim().toLowerCase();
    const filtered = templates.filter(
        (t) => (category === 'All' || t.category === category) && (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    );
    const countFor = (c: string) => (c === 'All' ? templates.length : templates.filter((t) => t.category === c).length);

    const titleText = kind === 'space' ? 'Space templates' : 'Skill library';

    function back() {
        setSelected(null);
        setPurchasing(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div
                className="bg-white rounded-2xl flex flex-col overflow-hidden anim-in"
                style={{ width: 'min(1060px, 94vw)', height: 'min(700px, 90vh)', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <h2 className="text-base font-semibold" style={{ color: COLORS.text }}>{titleText}</h2>
                    <button onClick={onClose} style={{ color: COLORS.textMuted }} className="rounded-md p-1 hover:bg-black/5"><Icon name="close" /></button>
                </header>

                <div className="flex flex-1 min-h-0">
                    {/* sidenav */}
                    <aside className="shrink-0 flex flex-col p-3" style={{ width: 212, borderRight: `1px solid ${COLORS.cardBorder}` }}>
                        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-3" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                            <Icon name="search" style={{ color: COLORS.textMuted }} />
                            <input
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                                placeholder="Search"
                                className="flex-1 bg-transparent text-sm outline-none min-w-0"
                                style={{ color: COLORS.text }}
                            />
                        </div>
                        <nav className="flex flex-col gap-0.5">
                            {cats.map((c) => {
                                const active = category === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => { setCategory(c); setSelected(null); }}
                                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left"
                                        style={{ background: active ? '#ececed' : 'transparent', color: active ? COLORS.text : '#5b5b66', fontWeight: active ? 600 : 500 }}
                                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f4f4f5'; }}
                                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span>{c}</span>
                                        <span className="text-xs" style={{ color: COLORS.textMuted }}>{countFor(c)}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* content */}
                    <div className="flex-1 min-w-0 overflow-y-auto">
                        {selected ? (
                            <TemplateDetail
                                kind={kind}
                                template={selected}
                                purchasing={purchasing}
                                spaceOverLimit={!!spaceOverLimit}
                                spacePrice={spacePrice}
                                onBack={back}
                                onStartPurchase={() => setPurchasing(true)}
                                onCreate={() => { onCreateSpace?.(selected); onClose(); }}
                                onConfirmEnable={() => { onEnableSkill?.(selected); onClose(); }}
                            />
                        ) : (
                            <div className="p-5">
                                <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                                    {filtered.map((t) => (
                                        <TemplateCard key={t.id} kind={kind} template={t} onClick={() => setSelected(t)} />
                                    ))}
                                </div>
                                {filtered.length === 0 && (
                                    <p className="text-sm py-10 text-center" style={{ color: COLORS.textMuted }}>No templates match your search.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TemplateCard({ kind, template, onClick }: { kind: 'space' | 'skill'; template: Template; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="text-left rounded-xl bg-white p-4 flex flex-col"
            style={{ border: `1px solid ${COLORS.cardBorder}`, minHeight: 150, transition: 'box-shadow .15s, border-color .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#d6d6db'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = COLORS.cardBorder; }}
        >
            <div className="flex items-start gap-3">
                {template.emoji ? (
                    <EmojiTile emoji={template.emoji} />
                ) : (
                    <span className="shrink-0 rounded-full" style={{ width: 30, height: 30, background: template.color }} />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug" style={{ color: COLORS.text }}>{template.title}</p>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{template.category}</span>
                </div>
                {template.badge && (
                    <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f3f0fb', color: '#8b46d6' }}>{template.badge}</span>
                )}
            </div>
            <p className="text-sm mt-3 leading-relaxed flex-1" style={{ color: COLORS.textMuted }}>{template.description}</p>
            <div className="pt-3 text-sm font-medium" style={{ color: COLORS.text }}>
                {kind === 'space' ? <span className="flex items-center gap-1">Preview <Icon name="chevron-right" /></span> : `From ${template.price} DKK/month`}
            </div>
        </button>
    );
}

function TemplateDetail({
    kind, template, purchasing, spaceOverLimit, spacePrice, onBack, onStartPurchase, onCreate, onConfirmEnable,
}: {
    kind: 'space' | 'skill';
    template: Template;
    purchasing: boolean;
    spaceOverLimit: boolean;
    spacePrice: number;
    onBack: () => void;
    onStartPurchase: () => void;
    onCreate: () => void;
    onConfirmEnable: () => void;
}) {
    const space: Space = { id: template.id, title: template.title, description: template.description, updated: '', messages: 0, emoji: template.emoji ?? '🗂️' };
    const spacePaid = kind === 'space' && spaceOverLimit;

    return (
        <div className="p-5">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: COLORS.textMuted }}>
                <Icon name="arrow-left" /> All templates
            </button>

            <div className="flex items-start gap-3 mb-5">
                {template.emoji ? (
                    <EmojiTile emoji={template.emoji} size={44} />
                ) : (
                    <span className="shrink-0 rounded-xl" style={{ width: 44, height: 44, background: template.color }} />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold" style={{ color: COLORS.text }}>{template.title}</h1>
                        <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: '#f1f1f3', color: COLORS.textMuted }}>{template.category}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>{template.longDescription ?? template.description}</p>
                </div>
            </div>

            {/* preview */}
            <p className="text-xs font-medium mb-2" style={{ color: COLORS.textMuted }}>Preview</p>
            {kind === 'space' ? (
                <ArtifactPreview space={space} compact />
            ) : (
                <div className="rounded-xl p-5" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: COLORS.text }}>What this skill does</p>
                    <div className="flex flex-col gap-2.5">
                        {(template.features ?? []).map((f) => (
                            <div key={f} className="flex items-start gap-2.5">
                                <Icon name="circle-tick" style={{ color: '#16a34a', marginTop: 1 }} />
                                <span className="text-sm" style={{ color: COLORS.text }}>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {kind === 'space' && template.features && (
                <div className="mt-4 flex flex-col gap-2">
                    {template.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                            <Icon name="circle-tick" style={{ color: '#16a34a', marginTop: 1 }} />
                            <span className="text-sm" style={{ color: COLORS.text }}>{f}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* over-limit notice for paid spaces */}
            {spacePaid && !purchasing && (
                <div className="mt-5 rounded-xl p-3 flex items-center gap-2.5" style={{ border: '1px solid #f3e6c0', background: '#fdf8ec' }}>
                    <Icon name="circle-information" style={{ color: '#92710f' }} />
                    <p className="text-sm" style={{ color: '#7a5b13' }}>
                        You've used your 5 free Spaces. Additional Spaces are <b>{spacePrice} kr each</b>.
                    </p>
                </div>
            )}

            {/* purchase flow (skills + paid spaces) */}
            {purchasing && (kind === 'skill' || spacePaid) && (
                <div className="mt-5 rounded-xl p-4" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: COLORS.text }}>Order summary</p>
                    <div className="flex items-center justify-between text-sm py-1.5">
                        <span style={{ color: COLORS.textMuted }}>{kind === 'skill' ? template.title : `Extra Space — ${template.title}`}</span>
                        <span style={{ color: COLORS.text }}>{kind === 'skill' ? `${template.price} DKK/month` : `${spacePrice} kr`}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1.5" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                        <span style={{ color: COLORS.textMuted }}>Billing</span>
                        <span style={{ color: COLORS.text }}>{kind === 'skill' ? 'Monthly · cancel anytime' : 'One-time charge'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1.5" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                        <span style={{ color: COLORS.textMuted }}>Payment method</span>
                        <span className="flex items-center gap-1.5" style={{ color: COLORS.text }}><Icon name="wallet" /> Visa •••• 4242</span>
                    </div>
                </div>
            )}

            {/* actions */}
            <div className="flex justify-end gap-2 mt-6">
                {kind === 'space' && !spacePaid && (
                    <Button appearance="primary" onClick={onCreate}>Add to my Spaces</Button>
                )}
                {kind === 'space' && spacePaid && !purchasing && (
                    <Button appearance="primary" onClick={onStartPurchase}>{`Add for ${spacePrice} kr`}</Button>
                )}
                {kind === 'space' && spacePaid && purchasing && (
                    <>
                        <Button onClick={onBack}>Cancel</Button>
                        <Button appearance="primary" onClick={onCreate}>{`Pay ${spacePrice} kr & create`}</Button>
                    </>
                )}
                {kind === 'skill' && !purchasing && (
                    <Button appearance="primary" onClick={onStartPurchase}>{`Enable for ${template.price} DKK/month`}</Button>
                )}
                {kind === 'skill' && purchasing && (
                    <>
                        <Button onClick={onBack}>Cancel</Button>
                        <Button appearance="primary" onClick={onConfirmEnable}>{`Confirm & pay ${template.price} DKK/month`}</Button>
                    </>
                )}
            </div>
        </div>
    );
}
