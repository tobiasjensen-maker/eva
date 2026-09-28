import { useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, Orb, COLORS } from '../ui';
import { useLang } from '../i18n';
import { MY_PORTFOLIO } from '../practice';
import { downloadCsv } from '../exportCsv';
import type { DecisionItem } from '../day';

// ---- Month-end, as one flow ----------------------------------------------------------------
// Operations first: the bookkeeping EVA runs across your clients every month, end to end —
// bank → documents → missing documents → drafts → controlling → close → report.

// Per-client month-end numbers (deterministic mock, consistent with the Books donut).
const MISSING: Record<string, number> = {};
const SPREAD = [14, 11, 8, 7, 6, 5, 4, 2, 1]; // 58 documents across 9 clients
MY_PORTFOLIO.filter((c) => c.books !== 'closed').concat(MY_PORTFOLIO.filter((c) => c.books === 'closed').slice(0, 2))
    .forEach((c, i) => { MISSING[c.name] = SPREAD[i] ?? 0; });
const rowsFor = () => MY_PORTFOLIO.map((c, i) => {
    const lines = 18 + ((i * 13) % 40);
    const missing = MISSING[c.name] ?? 0;
    return { c, lines, matched: lines - missing, missing, status: c.books };
});

export function MonthEndCard({ decisions, onReview }: { decisions: DecisionItem[]; onReview: (d: DecisionItem) => void }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const [report, setReport] = useState(false);
    const rows = rowsFor();
    const total = rows.length, closed = rows.filter((r) => r.status === 'closed').length;
    const lines = rows.reduce((a, r) => a + r.lines, 0), missing = rows.reduce((a, r) => a + r.missing, 0);
    const chasing = rows.filter((r) => r.missing > 0).length;
    const flags = decisions.filter((d) => !d.done && d.correction);
    const steps: { title: string; stat: string; state: 'done' | 'running' | 'you'; action?: { label: string; run: () => void } }[] = [
        { title: 'Bank transactions', stat: `${total}/${total} ${t('clients')} · ${lines.toLocaleString('da-DK')} ${t('lines')}`, state: 'done' },
        { title: 'Matched to documents', stat: `${(lines - missing).toLocaleString('da-DK')} ${t('of')} ${lines.toLocaleString('da-DK')}`, state: 'done' },
        { title: 'Missing documents', stat: `${missing} ${t('requested from')} ${chasing} ${t('clients')} · ${t('EVA chases every 3 days')}`, state: 'running' },
        { title: 'Inbox documents', stat: `212 ${t('read')} · 204 ${t('matched')}`, state: 'done' },
        { title: 'Draft postings', stat: `96 ${t('drafted, ready to post')}`, state: 'running' },
        { title: 'Controlling', stat: flags.length ? `${lines.toLocaleString('da-DK')} ${t('postings checked')} · ${flags.length} ${t(flags.length === 1 ? 'flag for you' : 'flags for you')}` : `${lines.toLocaleString('da-DK')} ${t('postings checked')} · ${t('all clear')}`, state: flags.length ? 'you' : 'done', action: flags.length ? { label: 'Review', run: () => onReview(flags[0]) } : undefined },
        { title: 'Final posting & close', stat: `${closed} ${t('of')} ${total} ${t('clients closed')}`, state: 'running' },
        { title: 'Month-end report', stat: t('Draft ready · final on 1 Oct'), state: 'running', action: { label: 'View', run: () => setReport(true) } },
    ];
    const dot = { done: '#16a34a', running: '#7c3aed', you: '#dc2626' };

    return (
        <Card className="overflow-hidden">
            <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <Orb size={18} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Month-end · September')}</p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                        {closed} {t('of')} {total} {t('clients closed')} · {missing} {t('documents missing')}{flags.length ? <> · <span style={{ color: '#c0392b', fontWeight: 500 }}>{flags.length} {t(flags.length === 1 ? 'controlling flag' : 'controlling flags')}</span></> : null}
                    </p>
                </div>
                <div className="hidden md:block rounded-full overflow-hidden" style={{ width: 180, height: 6, background: '#f1f1f3' }}><div style={{ width: `${(closed / total) * 100}%`, height: 6, background: '#16a34a' }} /></div>
                <span onClick={(e) => { e.stopPropagation(); setReport(true); }} className="text-xs font-medium shrink-0" style={{ color: '#4456c7' }}>{t('Month-end report')} →</span>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} style={{ color: '#b0b0b8' }} />
            </button>
            {open && (
                <div className="grid gap-px anim-in" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', background: COLORS.cardBorder, borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    {steps.map((s, i) => (
                        <div key={s.title} className="bg-white p-3 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold" style={{ color: COLORS.textMuted }}>{i + 1}</span>
                                <span className="rounded-full" style={{ width: 7, height: 7, background: dot[s.state] }} />
                                <span className="text-sm font-medium flex-1 truncate" style={{ color: COLORS.text }}>{t(s.title)}</span>
                                {s.action && <button onClick={s.action.run} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t(s.action.label)} →</button>}
                            </div>
                            <p className="text-xs leading-snug" style={{ color: s.state === 'you' ? '#c0392b' : COLORS.textMuted }}>{s.stat}</p>
                        </div>
                    ))}
                </div>
            )}
            {report && <MonthEndReport onClose={() => setReport(false)} flags={flags.length} />}
        </Card>
    );
}

function MonthEndReport({ onClose, flags }: { onClose: () => void; flags: number }) {
    const { t } = useLang();
    const rows = rowsFor().sort((a, b) => (a.status === b.status ? b.missing - a.missing : a.status === 'blocked' ? -1 : b.status === 'blocked' ? 1 : a.status === 'todo' ? -1 : 1));
    const label = { closed: 'Closed', todo: 'To do', blocked: 'Blocked' } as const;
    const tone = { closed: ['#e9f7ef', '#15803d'], todo: ['#f1f1f3', '#52525b'], blocked: ['#fdecec', '#c0392b'] } as const;
    const exportIt = () => downloadCsv('Month-end September 2026.csv', [
        [t('Client'), t('Bank lines'), t('Matched'), t('Missing documents'), t('Status')],
        ...rows.map((r) => [r.c.name, r.lines, r.matched, r.missing, t(label[r.status])]),
    ]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in overflow-hidden flex flex-col" style={{ maxWidth: 760, maxHeight: 'calc(100vh - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Month-end report · September 2026')}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{t('Your {n} clients · draft — final on 1 October').replace('{n}', String(rows.length))}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>
                <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3">
                    <div className="rounded-lg p-3 text-sm flex items-start gap-2.5" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26', color: COLORS.text }}>
                        <Orb size={16} />
                        <span>{t('{c} of {n} clients are closed. The rest are waiting on {m} documents from clients — EVA keeps chasing them.').replace('{c}', String(rows.filter((r) => r.status === 'closed').length)).replace('{n}', String(rows.length)).replace('{m}', String(rows.reduce((a, r) => a + r.missing, 0)))} {flags ? t('{f} controlling flag(s) still need your review.').replace('{f}', String(flags)) : t('Controlling found nothing else.')}</span>
                    </div>
                    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                        <div className="grid px-3 py-2 text-xs font-medium" style={{ gridTemplateColumns: '1fr 90px 90px 110px 90px', background: '#fafafa', color: COLORS.textMuted }}>
                            <span>{t('Client')}</span><span className="text-right">{t('Bank lines')}</span><span className="text-right">{t('Matched')}</span><span className="text-right">{t('Missing docs')}</span><span className="text-right">{t('Status')}</span>
                        </div>
                        {rows.map((r) => (
                            <div key={r.c.id} className="grid items-center px-3 py-2 text-sm" style={{ gridTemplateColumns: '1fr 90px 90px 110px 90px', borderTop: `1px solid ${COLORS.cardBorder}` }}>
                                <span className="flex items-center gap-2 min-w-0"><ClientAvatar name={r.c.name} size={20} /><span className="truncate" style={{ color: COLORS.text }}>{r.c.name}</span></span>
                                <span className="text-right" style={{ color: COLORS.textMuted }}>{r.lines}</span>
                                <span className="text-right" style={{ color: COLORS.textMuted }}>{r.matched}</span>
                                <span className="text-right" style={{ color: r.missing ? '#b9842b' : COLORS.textMuted, fontWeight: r.missing ? 500 : 400 }}>{r.missing || '—'}</span>
                                <span className="text-right"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tone[r.status][0], color: tone[r.status][1] }}>{t(label[r.status])}</span></span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={exportIt}><Icon name="download" /> {t('Export to Excel')}</Button>
                    <Button appearance="primary" onClick={onClose}>{t('Done')}</Button>
                </div>
            </div>
        </div>
    );
}
