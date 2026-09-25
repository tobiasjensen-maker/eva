import { Button, Icon } from '@economic/taco';
import { ClientAvatar, Orb, COLORS } from '../ui';
import type { DecisionItem } from '../day';

// ---- Decisions that need the accountant — one row, one review, everywhere ----------
// The same decision objects (src/day.ts) back the Portfolio overview's box and Work's
// "Ready for your review", so the wording is identical and resolving one resolves both.

export function DecisionRow({ d, t, onReview, showOwner, last }: { d: DecisionItem; t: (s: string) => string; onReview: () => void; showOwner?: boolean; last?: boolean }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3" style={last ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <ClientAvatar name={d.company} size={26} />
            <div className="min-w-0 flex-1">
                <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{d.company} · {t(d.label)}{showOwner ? ` · ${d.accountant.split(' ')[0]}` : ''}</p>
                <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
            </div>
            <Button onClick={onReview}>{t('Review')}</Button>
        </div>
    );
}

// Review a decision: what EVA did, the facts, EVA's call — then decide.
export function DecisionReview({ d, t, onClose, onResolve }: { d: DecisionItem; t: (s: string) => string; onClose: () => void; onResolve: (taken: 'confirm' | 'alt') => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden" style={{ maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={d.company} size={32} />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t(d.label)}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{d.company}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">
                    <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: '#fbf3e0', border: '1px solid #efdcb0' }}>
                        <span className="shrink-0" style={{ color: '#b9842b' }}><Icon name="circle-warning" /></span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#92710f' }}>{t('Needs your review')}</p>
                            <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.question)}</p>
                        </div>
                    </div>

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

                    <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                        <span className="shrink-0 mt-0.5"><Orb size={16} /></span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6d28d9' }}>{t('EVA’s call')}</p>
                            <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(d.recommend)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('You stand behind this — EVA logs your decision.')}</span>
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={() => onResolve('alt')}>{t(d.alt)}</Button>
                        <Button appearance="primary" onClick={() => onResolve('confirm')}><Icon name="circle-tick" /> {t(d.confirm)}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
