import { useMemo, useState } from 'react';
import { Button, Icon } from '@economic/taco';
import { Card, ClientAvatar, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { CLIENTS, FIRM_CLIENTS, ME, PLAYBOOKS, THREADS, benchmarks, talkingPoints, whyOf, type Books, type Client } from '../practice';

// ---- Clients — the whole portfolio in one place ---------------------------------
// One list of every client the office serves, with the firm's own client number,
// who's responsible, what services they buy and how the books stand. Open a client
// to get oriented fast: talking points for the next conversation, how they compare
// with peers, and why EVA flagged them.

const SIGNAL: Record<string, { bg: string; fg: string }> = {
    'Cash flow': { bg: '#fbf3e0', fg: '#92710f' },
    'Risk': { bg: '#fdecec', fg: '#c0392b' },
    'Growth': { bg: '#e9f7ef', fg: '#15803d' },
    'Compliance': { bg: '#eef4fb', fg: '#2f6fb0' },
};
const BOOKS: Record<Books, { label: string; bg: string; fg: string }> = {
    current: { label: 'Books current', bg: '#e9f7ef', fg: '#15803d' },
    closing: { label: 'Closing', bg: '#eef4fb', fg: '#2f6fb0' },
    behind: { label: 'Behind', bg: '#fbf3e0', fg: '#92710f' },
};
const kr = (n: number) => `${n.toLocaleString('da-DK')} kr`;
const first = (n: string) => (n === ME ? 'You' : n.split(' ')[0]);

// Cross-client "who needs your expertise" — self-contained so Advisory can reuse it.
export function ExpertiseCard({ onOpen }: { onOpen?: (c: Client) => void }) {
    const { t } = useLang();
    const [open, setOpen] = useState<string | null>(null);
    const flagged = CLIENTS.filter((c) => c.signal);
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, background: '#7c3aed0d' }}>
                <Orb size={18} />
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Clients who need your expertise')}</span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>· {flagged.length}</span>
                <span className="ml-auto text-xs" style={{ color: COLORS.textMuted }}>{t('EVA watched {n} clients’ books overnight').replace('{n}', String(FIRM_CLIENTS))}</span>
            </div>
            {flagged.map((c, i) => {
                const s = SIGNAL[c.signal!.kind];
                const isOpen = open === c.id;
                return (
                    <div key={c.id} style={i === flagged.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <ClientAvatar name={c.name} size={28} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{c.name}</p>
                                <p className="text-xs truncate mt-0.5" style={{ color: COLORS.textMuted }}>{t(c.signal!.text)}</p>
                            </div>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: s.bg, color: s.fg }}>{t(c.signal!.kind)}</span>
                            <button onClick={() => setOpen(isOpen ? null : c.id)} className="shrink-0 text-xs font-medium flex items-center gap-1" style={{ color: '#4456c7' }}>
                                <Icon name="ai-stars" /> {isOpen ? t('Hide') : t('See why')}
                            </button>
                        </div>
                        {isOpen && (
                            <div className="px-4 pb-4 pl-[56px] grid gap-4 anim-in" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('How EVA got there')}</p>
                                    <ol className="flex flex-col gap-1.5">
                                        {whyOf(c).map((w, k) => (
                                            <li key={k} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}>
                                                <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 16, height: 16, background: '#eef7ef', color: '#15803d', fontSize: 10 }}><Icon name="tick" /></span>
                                                {t(w)}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.textMuted }}>{t('Talking points')}</p>
                                    <ul className="flex flex-col gap-1.5">
                                        {talkingPoints(c).map((p, k) => <li key={k} className="text-sm" style={{ color: COLORS.text }}>• {t(p)}</li>)}
                                    </ul>
                                    {onOpen && <button onClick={() => onOpen(c)} className="text-xs font-medium mt-2.5" style={{ color: '#4456c7' }}>{t('Open client')} →</button>}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </Card>
    );
}

export default function ClientsView({ onOpenBooks, onMessage }: { onOpenBooks: (name: string) => void; onMessage: (client: string) => void }) {
    const { t } = useLang();
    const [scope, setScope] = useState<'mine' | 'all'>('all');
    const [q, setQ] = useState('');
    const [books, setBooks] = useState<Books | 'any'>('any');
    const [sel, setSel] = useState<Client | null>(null);

    const rows = useMemo(() => {
        const ql = q.trim().toLowerCase();
        return CLIENTS.filter((c) => (scope === 'all' || c.accountant === ME) && (books === 'any' || c.books === books) && (!ql || c.name.toLowerCase().includes(ql) || c.no.toLowerCase().includes(ql) || c.industry.toLowerCase().includes(ql)));
    }, [scope, q, books]);

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Clients')} showScope={false} right={<Button appearance="primary"><Icon name="circle-plus" /> {t('Add client')}</Button>} />
            <div className="mx-auto px-8 pt-5 pb-10" style={{ maxWidth: 1040 }}>
                <div className="mb-6"><ExpertiseCard onOpen={setSel} /></div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <SegmentedTabs value={scope} onChange={(v) => setScope(v as 'mine' | 'all')} options={[{ value: 'all', label: t('All clients') }, { value: 'mine', label: t('My clients') }]} />
                    <div className="relative flex-1" style={{ minWidth: 220 }}>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textMuted }}><Icon name="search" /></span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by name, client number or industry…')} className="w-full rounded-lg pl-9 pr-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                    </div>
                    <SegmentedTabs value={books} onChange={(v) => setBooks(v as Books | 'any')} options={[{ value: 'any', label: t('Any status') }, { value: 'behind', label: t('Behind') }, { value: 'closing', label: t('Closing') }, { value: 'current', label: t('Current') }]} />
                </div>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" style={{ minWidth: 820 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                                    {['No.', 'Client', 'Responsible', 'Services', 'Books', 'EVA', 'Needs you', 'Fee / mo'].map((h) => (
                                        <th key={h} className="text-left text-xs font-medium px-4 py-2.5 whitespace-nowrap" style={{ color: COLORS.textMuted }}>{t(h)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((c) => {
                                    const b = BOOKS[c.books];
                                    return (
                                        <tr key={c.id} onClick={() => setSel(c)} className="cursor-pointer" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                            <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: COLORS.textMuted }}>{c.no}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <ClientAvatar name={c.name} size={26} />
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate" style={{ color: COLORS.text }}>{c.name}</p>
                                                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(c.industry)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><ClientAvatar name={c.accountant} size={18} /><span className="text-xs" style={{ color: COLORS.text }}>{t(first(c.accountant))}</span></span></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 whitespace-nowrap" title={c.services.map((s) => t(s)).join(', ')}>
                                                    {c.services.slice(0, 2).map((s) => <span key={s} className="rounded px-1.5 py-0.5 text-xs" style={{ background: '#f1f1f3', color: '#52525b' }}>{t(s)}</span>)}
                                                    {c.services.length > 2 && <span className="text-xs" style={{ color: COLORS.textMuted }}>+{c.services.length - 2}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={{ background: b.bg, color: b.fg }}>{t(b.label)}</span></td>
                                            <td className="px-4 py-3 text-xs font-medium" style={{ color: '#15803d' }}>{c.eva}%</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: c.open ? '#b9842b' : COLORS.textMuted, fontWeight: c.open ? 600 : 400 }}>{c.open || '—'}</td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: COLORS.text }}>{kr(c.fee)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ color: COLORS.textMuted }}>
                        <span>{t('Showing {n} of {total} clients').replace('{n}', String(rows.length)).replace('{total}', String(FIRM_CLIENTS))}</span>
                        <span>{t('One sign-in for every client file')}</span>
                    </div>
                </Card>
            </div>

            {sel && <ClientDrawer c={sel} onClose={() => setSel(null)} onOpenBooks={onOpenBooks} onMessage={onMessage} />}
        </div>
    );
}

function ClientDrawer({ c, onClose, onOpenBooks, onMessage }: { c: Client; onClose: () => void; onOpenBooks: (name: string) => void; onMessage: (client: string) => void }) {
    const { t } = useLang();
    const [noted, setNoted] = useState(false);
    const pb = PLAYBOOKS.find((p) => p.id === c.playbook);
    const threads = THREADS.filter((x) => x.client === c.name && x.status !== 'done');
    const b = BOOKS[c.books];
    return (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
            <div className="h-full bg-white overflow-y-auto anim-slide" style={{ width: 'min(520px, 100vw)', boxShadow: '-12px 0 40px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 px-6 py-5" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <ClientAvatar name={c.name} size={40} />
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold" style={{ color: COLORS.text }}>{c.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{c.no} · {t(c.industry)} · {t('Responsible')}: {c.accountant}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: b.bg, color: b.fg }}>{t(b.label)}</span>
                            {pb && <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: '#f1f1f3', color: '#52525b' }}>{t('Playbook')}: {t(pb.name)}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-6">
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { l: 'Fee / mo', v: kr(c.fee) },
                            { l: 'Revenue', v: `${c.trend > 0 ? '+' : ''}${c.trend}%` },
                            { l: 'EVA does', v: `${c.eva}%` },
                            { l: 'Needs you', v: String(c.open) },
                        ].map((k) => (
                            <div key={k.l} className="rounded-lg p-2.5" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(k.l)}</p>
                                <p className="text-sm font-semibold mt-0.5" style={{ color: COLORS.text }}>{k.v}</p>
                            </div>
                        ))}
                    </div>

                    {/* talking points — the vision's "speaking notes" for the AO's client conversations */}
                    <div className="rounded-xl p-4" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                        <div className="flex items-center gap-2 mb-2.5">
                            <Orb size={16} />
                            <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Talking points for your next conversation')}</p>
                        </div>
                        <ul className="flex flex-col gap-2">
                            {talkingPoints(c).map((p, i) => <li key={i} className="text-sm leading-relaxed" style={{ color: COLORS.text }}>• {t(p)}</li>)}
                        </ul>
                        <div className="flex items-center gap-2 mt-3">
                            <Button onClick={() => setNoted(true)}>{noted ? `✓ ${t('Added to meeting notes')}` : t('Add to meeting notes')}</Button>
                            <Button appearance="primary" onClick={() => onMessage(c.name)}>{t('Message client')}</Button>
                        </div>
                    </div>

                    {/* peer benchmarks */}
                    <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.text }}>{t('How they compare')}</p>
                        <p className="text-xs mb-3" style={{ color: COLORS.textMuted }}>{t('Against similar {industry} businesses on e-conomic').replace('{industry}', t(c.industry).toLowerCase())}</p>
                        <div className="flex flex-col gap-3">
                            {benchmarks(c).map((m) => {
                                const good = m.better === 'higher' ? m.you >= m.peers : m.you <= m.peers;
                                // Bars run from zero; a negative value (e.g. shrinking revenue) shows as an empty bar.
                                const max = Math.max(m.you, m.peers, 1) * 1.2;
                                return (
                                    <div key={m.label}>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span style={{ color: COLORS.text }}>{t(m.label)}</span>
                                            <span style={{ color: good ? '#15803d' : '#b9842b', fontWeight: 600 }}>{m.you}{t(m.unit)} <span style={{ color: COLORS.textMuted, fontWeight: 400 }}>· {t('peers')} {m.peers}{t(m.unit)}</span></span>
                                        </div>
                                        <div className="relative rounded-full" style={{ height: 6, background: '#f1f1f3' }}>
                                            <span className="absolute left-0 top-0 rounded-full" style={{ height: 6, width: `${m.you <= 0 ? 0 : Math.max(4, (m.you / max) * 100)}%`, background: good ? '#16a34a' : '#b9842b' }} />
                                            <span className="absolute top-[-3px]" style={{ left: `${(m.peers / max) * 100}%`, width: 2, height: 12, background: '#1c1b3a' }} title={t('Peer median')} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {c.signal && (
                        <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>{t('Why EVA flagged this')}</p>
                            <ol className="flex flex-col gap-1.5">
                                {whyOf(c).map((w, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.text }}>
                                        <span className="flex items-center justify-center shrink-0 rounded-full mt-0.5" style={{ width: 16, height: 16, background: '#eef7ef', color: '#15803d', fontSize: 10 }}><Icon name="tick" /></span>
                                        {t(w)}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>{t('Services')}</p>
                        <div className="flex flex-wrap gap-1.5">{c.services.map((s) => <span key={s} className="rounded-full px-2.5 py-1 text-xs" style={{ background: '#f1f1f3', color: '#52525b' }}>{t(s)}</span>)}</div>
                    </div>

                    {threads.length > 0 && (
                        <button onClick={() => onMessage(c.name)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }}>
                            <Icon name="chat" style={{ color: COLORS.textMuted }} />
                            <span className="flex-1">{t('{n} open conversation(s) in the inbox').replace('{n}', String(threads.length))}</span>
                            <span style={{ color: '#4456c7' }}>→</span>
                        </button>
                    )}

                    <Button onClick={() => onOpenBooks(c.name)}><Icon name="accounting" /> {t('Open their books')}</Button>
                </div>
            </div>
        </div>
    );
}
