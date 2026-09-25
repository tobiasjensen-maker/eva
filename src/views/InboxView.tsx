import { useEffect, useState } from 'react';
import { Button, Icon, Switch } from '@economic/taco';
import { ClientAvatar, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { ME, type Thread, type ThreadStatus } from '../practice';

// ---- Inbox — every client conversation in one place --------------------------------
// Questions, documents and follow-ups with clients, tied to the transaction they're
// about. EVA asks clients for missing details on its own, chases when they go quiet,
// and proposes the next step when a reply comes in — the AO approves and sends.

const TAB: { key: ThreadStatus | 'all'; label: string }[] = [
    { key: 'needs', label: 'Needs action' },
    { key: 'waiting', label: 'Waiting on client' },
    { key: 'all', label: 'All' },
];

export default function InboxView({ threads, setThreads, focusClient }: { threads: Thread[]; setThreads: (f: (t: Thread[]) => Thread[]) => void; focusClient?: string | null }) {
    const { t } = useLang();
    const [tab, setTab] = useState<ThreadStatus | 'all'>('needs');
    const [selId, setSelId] = useState<string>(() => threads.find((x) => x.status === 'needs')?.id ?? threads[0].id);
    const [draft, setDraft] = useState('');
    const [settings, setSettings] = useState(false);

    // Arriving from a client profile: open that client's thread.
    useEffect(() => {
        if (!focusClient) return;
        const th = threads.find((x) => x.client === focusClient);
        if (th) { setSelId(th.id); setTab(th.status === 'done' ? 'all' : th.status); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusClient]);

    const list = threads.filter((x) => tab === 'all' || x.status === tab);
    const sel = threads.find((x) => x.id === selId) ?? list[0];
    const count = (k: ThreadStatus) => threads.filter((x) => x.status === k).length;

    function send(text: string, extra?: { result?: string; status?: ThreadStatus }) {
        if (!sel || !text.trim()) return;
        setThreads((all) => all.map((x) => x.id !== sel.id ? x : {
            ...x,
            status: extra?.status ?? 'waiting',
            suggestion: extra?.result ? undefined : x.suggestion,
            messages: [
                ...x.messages,
                { from: 'firm', who: ME, at: 'Now', text },
                ...(extra?.result ? [{ from: 'eva' as const, who: 'EVA', at: 'Now', text: extra.result }] : []),
            ],
        }));
        setDraft('');
    }

    return (
        <div className="h-full flex flex-col">
            <PageHeader title={t('Inbox')} showScope={false} maxWidth={1240}
                right={<Button onClick={() => setSettings(true)}><Icon name="settings" /> {t('Client settings')}</Button>} />
            <div className="flex-1 min-h-0 mx-auto w-full px-8 pb-6" style={{ maxWidth: 1240 }}>
                <div className="h-full flex rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                    {/* thread list */}
                    <div className="flex flex-col shrink-0" style={{ width: 340, borderRight: `1px solid ${COLORS.cardBorder}` }}>
                        <div className="p-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <SegmentedTabs value={tab} onChange={(v) => setTab(v as ThreadStatus | 'all')} options={TAB.map((x) => ({ value: x.key, label: x.key === 'all' ? t(x.label) : `${t(x.label)} · ${count(x.key as ThreadStatus)}` }))} />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {list.map((x) => {
                                const on = sel?.id === x.id;
                                const last = x.messages[x.messages.length - 1];
                                return (
                                    <button key={x.id} onClick={() => setSelId(x.id)} className="w-full text-left flex items-start gap-2.5 px-3.5 py-3" style={{ background: on ? '#f4f4f6' : 'transparent', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                        <ClientAvatar name={x.contact} size={30} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm truncate flex-1 ${x.status === 'needs' ? 'font-semibold' : 'font-medium'}`} style={{ color: COLORS.text }}>{x.contact}</p>
                                                <span className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>{t(x.at)}</span>
                                            </div>
                                            <p className="text-sm truncate" style={{ color: COLORS.text }}>{t(x.subject)}</p>
                                            <p className="text-xs truncate mt-0.5" style={{ color: COLORS.textMuted }}>{last.from === 'eva' ? '✦ ' : ''}{t(last.text)}</p>
                                            <span className="inline-block mt-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: '#eef4fb', color: '#2f6fb0' }}>{x.client}</span>
                                        </div>
                                    </button>
                                );
                            })}
                            {list.length === 0 && <p className="text-sm text-center py-10" style={{ color: COLORS.textMuted }}>{t('Nothing here — you’re all caught up.')}</p>}
                        </div>
                    </div>

                    {/* conversation */}
                    {sel && (
                        <div className="flex-1 min-w-0 flex flex-col">
                            <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold truncate" style={{ color: COLORS.text }}>{t(sel.subject)}</p>
                                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{sel.client} · {sel.contact}</p>
                                </div>
                                {sel.status !== 'done' && <Button onClick={() => setThreads((all) => all.map((x) => x.id === sel.id ? { ...x, status: 'done' } : x))}><Icon name="circle-tick" /> {t('Mark done')}</Button>}
                            </div>

                            {sel.txn && (
                                <div className="mx-5 mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: `1px solid ${COLORS.cardBorder}`, maxWidth: 420 }}>
                                    <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 30, height: 30, background: '#f1f1f3', color: COLORS.textMuted }}><Icon name="wallet" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium" style={{ color: COLORS.text }}>{sel.txn.label}</p>
                                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{sel.txn.account} · {sel.txn.date}</p>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{sel.txn.amount}</span>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                                {sel.messages.map((m, i) => {
                                    const mine = m.from !== 'client';
                                    return (
                                        <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                            <div className="rounded-xl px-3.5 py-2.5" style={{ maxWidth: '76%', background: m.from === 'eva' ? '#7c3aed0d' : mine ? '#f1f1f3' : '#fff', border: `1px solid ${m.from === 'eva' ? '#7c3aed26' : COLORS.cardBorder}` }}>
                                                <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
                                                    {m.from === 'eva' && <Orb size={12} />}<span className="font-medium" style={{ color: COLORS.text }}>{t(m.who)}</span> · {t(m.at)}
                                                </p>
                                                <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{t(m.text)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {sel.status === 'waiting' && (
                                    <p className="text-xs text-center mt-1 flex items-center justify-center gap-1.5" style={{ color: COLORS.textMuted }}><Orb size={12} /> {t('EVA will follow up automatically if there’s no reply in 3 days.')}</p>
                                )}
                            </div>

                            {sel.suggestion && sel.status === 'needs' && (
                                <div className="mx-5 mb-3 rounded-xl p-3.5 flex items-start gap-3" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                                    <span className="mt-0.5"><Orb size={18} /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6d28d9' }}>{t('EVA suggests')}</p>
                                        <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>{t(sel.suggestion.action)}</p>
                                        <p className="text-xs mt-1 italic" style={{ color: COLORS.textMuted }}>“{t(sel.suggestion.reply)}”</p>
                                    </div>
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <Button appearance="primary" onClick={() => send(t(sel.suggestion!.reply), { result: t(sel.suggestion!.result), status: 'done' })}>{t('Approve & send')}</Button>
                                        <Button onClick={() => setDraft(t(sel.suggestion!.reply))}>{t('Edit first')}</Button>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="mx-5 mb-5 flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Write to {name}…').replace('{name}', sel.contact.split(' ')[0])} className="flex-1 min-w-0 bg-transparent outline-none text-sm" style={{ color: COLORS.text }} />
                                <button type="submit" disabled={!draft.trim()} className="rounded-lg px-3.5 py-1.5 text-sm font-medium" style={{ background: draft.trim() ? '#1c1b3a' : '#ececf0', color: draft.trim() ? '#fff' : '#b0b0b8' }}>{t('Send')}</button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {settings && <InboxSettings onClose={() => setSettings(false)} />}
        </div>
    );
}

function InboxSettings({ onClose }: { onClose: () => void }) {
    const { t } = useLang();
    const [s, setS] = useState({ follow: true, me: true, client: true, digest: false });
    const rows: { k: keyof typeof s; title: string; desc: string }[] = [
        { k: 'follow', title: 'AI follow-up', desc: 'EVA asks clients for missing details when a reply is incomplete, and chases after 3 days of silence.' },
        { k: 'me', title: 'Notify me of client replies', desc: 'Get a notification when a client answers — the reply lands in Needs action.' },
        { k: 'client', title: 'Client reminders', desc: 'Clients get a gentle reminder about open questions every Monday at 09:00.' },
        { k: 'digest', title: 'Weekly digest to the partner', desc: 'A summary of open client questions across the office, every Friday.' },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full anim-in" style={{ maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Client settings')}</p>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>
                <div>
                    {rows.map((r, i) => (
                        <div key={r.k} className="flex items-start gap-4 px-5 py-4" style={i === rows.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t(r.title)}</p>
                                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t(r.desc)}</p>
                            </div>
                            <Switch checked={s[r.k]} onChange={(v: boolean) => setS((p) => ({ ...p, [r.k]: v }))} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                    <Button appearance="primary" onClick={onClose}>{t('Save')}</Button>
                </div>
            </div>
        </div>
    );
}
