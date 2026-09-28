import { useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { ClientAvatar, Orb, COLORS } from '../ui';
import type { DecisionItem, ResolveInfo } from '../day';
import type { Thread } from '../practice';
import { PRIO_STYLE, type Priority } from '../priority';

// EVA's priority, as one quiet line: level · why.
export function PrioLine({ p, t }: { p: Priority; t: (s: string) => string }) {
    const st = PRIO_STYLE[p.level];
    return <p className="text-[11px] mt-0.5 truncate" style={{ color: COLORS.textMuted }}><span style={{ color: st.fg, fontWeight: 600 }}>● {t(st.label)}</span> · {t(p.why)}</p>;
}
import { NotesList, ReasonPicker, useMemory } from '../memory';

// ---- Decisions that need the accountant — one row, one review, everywhere ----------
// The same decision objects (src/day.ts) back the Portfolio overview's box and Work's
// "Ready for your review", so the wording is identical and resolving one resolves both.

export function DecisionRow({ d, t, onReview, showOwner, last, prio }: { d: DecisionItem; t: (s: string) => string; onReview: () => void; showOwner?: boolean; last?: boolean; prio?: Priority }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3" style={last ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <ClientAvatar name={d.company} size={26} />
            <div className="min-w-0 flex-1">
                <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{d.company} · {t(d.label)}{showOwner ? ` · ${d.accountant.split(' ')[0]}` : ''}</p>
                <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
                {prio && <PrioLine p={prio} t={t} />}
            </div>
            <Button onClick={onReview}>{t('Review')}</Button>
        </div>
    );
}

// A client conversation waiting on you, with EVA's drafted reply — part of the same review
// queue as decisions. Reviewing it opens the thread in the Inbox.
export function ReplyRow({ th, t, onReview, last, prio }: { th: Thread; t: (s: string) => string; onReview: () => void; last?: boolean; prio?: Priority }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3" style={last ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <ClientAvatar name={th.client} size={26} />
            <div className="min-w-0 flex-1">
                <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{th.client} · {t('Reply to {name}').replace('{name}', th.contact.split(' ')[0])}</p>
                <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(th.subject)}</p>
                {prio ? <PrioLine p={prio} t={t} /> : th.suggestion && <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.textMuted }}><span style={{ color: '#6d28d9', fontWeight: 500 }}>{t('EVA drafted a reply')}</span> · {t(th.suggestion.action)}</p>}
            </div>
            <Button onClick={onReview}>{t('Review')}</Button>
        </div>
    );
}

// Review a decision: what EVA did, the facts, EVA's call — then decide.
export function DecisionReview({ d, t, onClose, onResolve }: { d: DecisionItem; t: (s: string) => string; onClose: () => void; onResolve: (taken: 'confirm' | 'alt', info?: ResolveInfo) => void }) {
    const { notesFor } = useMemory();
    const notes = notesFor(d.company);
    const [asking, setAsking] = useState(false);
    // Proposed correction, editable before it's applied.
    const [values, setValues] = useState<string[]>(() => d.correction?.fields.map((f) => f.to) ?? []);
    const overridden = !!d.correction && d.correction.fields.some((f, i) => values[i] !== f.to);
    const fixed = d.correction ? d.correction.fields.filter((f, i) => values[i] !== f.from).map((f) => `${f.label}: ${f.from} → ${values[d.correction!.fields.indexOf(f)]}`).join('; ') : undefined;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 580, maxHeight: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={d.company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t(d.label)}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{d.company}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-5 py-4 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                    {/* EVA suggests — what EVA thinks you should do, and why it's asking */}
                    <div className="rounded-lg p-3.5 flex items-start gap-2.5" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                        <span className="shrink-0 mt-0.5"><Orb size={18} /></span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6d28d9' }}>{t('EVA suggests')}</p>
                            <p className="text-sm font-medium mt-0.5" style={{ color: COLORS.text }}>{t(d.recommend)}</p>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: COLORS.textMuted }}>{t('Why you’re asked')}: {t(d.question)}</p>
                        </div>
                    </div>

                    {d.correction && (
                        // Fix it — the exact change to the posting, field by field. Nothing changes until you apply it.
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{t('Proposed correction')}</p>
                                <span className="text-xs" style={{ color: COLORS.textMuted }}>{t(d.correction.voucher)}</span>
                            </div>
                            <div className="rounded-lg overflow-hidden text-sm" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <div className="grid px-3 py-1.5 text-xs font-medium" style={{ gridTemplateColumns: '96px 1fr 1fr', background: '#fafafa', color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    <span>{t('Field')}</span><span>{t('Now')}</span><span>{t('After the fix')}</span>
                                </div>
                                {d.correction.fields.map((f, i) => {
                                    const changed = values[i] !== f.from;
                                    return (
                                        <div key={f.label} className="grid items-center gap-2 px-3 py-2" style={{ gridTemplateColumns: '96px 1fr 1fr', ...(i === 0 ? {} : { borderTop: `1px solid ${COLORS.cardBorder}` }) }}>
                                            <span style={{ color: COLORS.textMuted }}>{t(f.label)}</span>
                                            <span style={{ color: changed ? COLORS.textMuted : COLORS.text, textDecoration: changed ? 'line-through' : undefined }}>{t(f.from)}</span>
                                            {f.options ? (
                                                <select value={values[i]} onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))} className="rounded-md px-2 py-1 text-sm bg-white w-full"
                                                    style={{ border: `1px solid ${changed ? '#7c3aed66' : COLORS.cardBorder}`, color: COLORS.text, fontWeight: changed ? 500 : 400 }}>
                                                    {f.options.map((o) => <option key={o} value={o}>{t(o)}</option>)}
                                                </select>
                                            ) : (
                                                <input value={values[i]} onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))} className="rounded-md px-2 py-1 text-sm bg-white w-full"
                                                    style={{ border: `1px solid ${changed ? '#7c3aed66' : COLORS.cardBorder}`, color: COLORS.text, fontWeight: changed ? 500 : 400 }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs mt-2 flex items-start gap-1.5" style={{ color: COLORS.textMuted }}><Icon name="info" /> {t(d.correction.effect)}</p>
                            {overridden && <p className="text-xs mt-1" style={{ color: '#6d28d9' }}>{t('You changed EVA’s suggestion — EVA will apply your version and learn from it.')}</p>}
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('The facts')}</p>
                        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                            {d.evidence.map((e, i) => (
                                <div key={e.label} className="flex gap-3 px-3 py-2 text-sm" style={i === 0 ? undefined : { borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                    <span className="shrink-0" style={{ color: COLORS.textMuted, width: 128 }}>{t(e.label)}</span>
                                    <span style={{ color: COLORS.text }}>{t(e.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('What EVA did')}</p>
                        <ol className="flex flex-col gap-1.5">
                            {d.steps.map((st, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}>
                                    <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 16, height: 16, background: '#eef7ef', color: '#15803d', fontSize: 10 }}><Icon name="tick" /></span>
                                    {t(st)}
                                </li>
                            ))}
                        </ol>
                    </div>

                    {notes.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('What EVA knows about {client}').replace('{client}', d.company)}</p>
                            <NotesList company={d.company} />
                        </div>
                    )}
                </div>

                {asking ? (
                    <div className="px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                        <ReasonPicker company={d.company} topic={d.question} submitLabel={d.alt} onCancel={() => setAsking(false)} onSubmit={(reason) => onResolve('alt', { reason })} />
                    </div>
                ) : (
                <div className="flex items-center justify-between gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{d.correction ? t('Nothing changes until you apply it — EVA edits the posting in e-conomic and logs it.') : t('You stand behind this — EVA logs your decision.')}</span>
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={() => (d.altIsDismiss ? setAsking(true) : onResolve('alt'))}>{t(d.alt)}</Button>
                        <Button appearance="primary" onClick={() => onResolve('confirm', d.correction ? { fixed, overridden } : undefined)}><Icon name="circle-tick" /> {t(d.confirm)}</Button>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
