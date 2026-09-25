import { useMemo, useState } from 'react';
import { Button, Icon, Switch, useToast } from '@economic/taco';
import { Card, ClientAvatar, Orb, PageHeader, SegmentedTabs, COLORS } from '../ui';
import { useLang } from '../i18n';
import { CLIENTS, FIRM_CLIENTS, LEADS, ME, OPPORTUNITIES, PLAYBOOKS, REBALANCE, TARGET_RATE, TEAM, marginOf, rateOf, type Member, type Playbook } from '../practice';

// ---- Practice — running the accounting office as a business -----------------------
// The vision's "practice & growth" job: serve more clients without more headcount,
// know which clients are profitable, find what to sell next, and set new clients up
// the firm's way. Capacity · Profitability · Growth · Playbooks.

type Tab = 'capacity' | 'profit' | 'growth' | 'playbooks';
const kr = (n: number) => `${Math.round(n).toLocaleString('da-DK')} kr`;
const INDUSTRY_AVG_CLIENTS = 20; // clients per accountant before agents (illustrative)

export default function PracticeView({ initialTab = 'capacity' }: { initialTab?: Tab }) {
    const { t } = useLang();
    const [tab, setTab] = useState<Tab>(initialTab);
    const [team, setTeam] = useState<Member[]>(TEAM);

    const perAccountant = Math.round(FIRM_CLIENTS / team.length);
    const util = Math.round((team.reduce((s, m) => s + m.booked, 0) / team.reduce((s, m) => s + m.capacity, 0)) * 100);
    const avgRate = Math.round(CLIENTS.reduce((s, c) => s + c.fee, 0) / CLIENTS.reduce((s, c) => s + c.hours, 0));
    const advisoryShare = Math.round((CLIENTS.filter((c) => c.services.includes('Advisory')).reduce((s, c) => s + c.fee, 0) / CLIENTS.reduce((s, c) => s + c.fee, 0)) * 100);

    return (
        <div className="h-full overflow-y-auto">
            <PageHeader title={t('Practice')} showScope={false}
                badge={<SegmentedTabs value={tab} onChange={(v) => setTab(v as Tab)} options={[{ value: 'capacity', label: t('Capacity') }, { value: 'profit', label: t('Profitability') }, { value: 'growth', label: t('Growth') }, { value: 'playbooks', label: t('Playbooks') }]} />} />
            <div className="mx-auto px-8 pt-5 pb-10" style={{ maxWidth: 1240 }}>
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { l: 'Clients per accountant', v: String(perAccountant), s: t('{x}× the pre-agent average').replace('{x}', (perAccountant / INDUSTRY_AVG_CLIENTS).toFixed(1)), c: COLORS.text },
                        { l: 'Team utilisation', v: `${util}%`, s: t('of booked capacity this month'), c: COLORS.text },
                        { l: 'Effective rate', v: kr(avgRate), s: t('per human hour · target {n}').replace('{n}', kr(TARGET_RATE)), c: avgRate >= TARGET_RATE ? '#15803d' : '#b9842b' },
                        { l: 'Advisory revenue', v: `${advisoryShare}%`, s: t('of fees — up from 9% last year'), c: '#6d28d9' },
                    ].map((k) => (
                        <div key={k.l} className="rounded-xl p-4" style={{ background: '#fff', border: `1px solid ${COLORS.cardBorder}` }}>
                            <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(k.l)}</p>
                            <p className="text-2xl font-semibold leading-tight mt-1" style={{ color: k.c }}>{k.v}</p>
                            <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{k.s}</p>
                        </div>
                    ))}
                </div>

                {tab === 'capacity' && <Capacity team={team} setTeam={setTeam} />}
                {tab === 'profit' && <Profitability />}
                {tab === 'growth' && <Growth />}
                {tab === 'playbooks' && <Playbooks />}
            </div>
        </div>
    );
}

// ---- Capacity — who's over, who has room, and EVA's rebalancing suggestion -----------
function Capacity({ team, setTeam }: { team: Member[]; setTeam: (m: Member[]) => void }) {
    const { t } = useLang();
    const [applied, setApplied] = useState(false);
    function apply() {
        setTeam(team.map((m) => m.name === REBALANCE.from ? { ...m, booked: m.booked - REBALANCE.hours, clients: m.clients - REBALANCE.clients.length } : m.name === REBALANCE.to ? { ...m, booked: m.booked + REBALANCE.hours, clients: m.clients + REBALANCE.clients.length } : m));
        setApplied(true);
    }
    return (
        <div className="flex flex-col gap-5">
            {!applied ? (
                <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                    <span className="mt-0.5"><Orb size={20} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Rebalance the team before month-end')}</p>
                        <p className="text-sm mt-1" style={{ color: COLORS.text }}>
                            {t('{from} is at 116% while {to} has room. Move {list} ({h} h/mo) — both land between 79% and 94%.')
                                .replace('{from}', REBALANCE.from.split(' ')[0]).replace('{to}', REBALANCE.to.split(' ')[0])
                                .replace('{list}', REBALANCE.clients.join(', ')).replace('{h}', String(REBALANCE.hours))}
                        </p>
                    </div>
                    <Button appearance="primary" onClick={apply}>{t('Move 3 clients')}</Button>
                </div>
            ) : (
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#e9f7ef', border: '1px solid #bfe3cc' }}>
                    <Icon name="circle-tick" style={{ color: '#15803d' }} />
                    <p className="text-sm" style={{ color: COLORS.text }}>{t('Moved — EVA handed over the client context and told both accountants.')}</p>
                </div>
            )}

            <Card className="overflow-hidden">
                <div className="px-4 py-3 text-sm font-semibold" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{t('Team capacity this month')}</div>
                {team.map((m, i) => {
                    const pct = Math.round((m.booked / m.capacity) * 100);
                    const over = pct > 100, room = pct < 65;
                    return (
                        <div key={m.name} className="flex items-center gap-4 px-4 py-3.5" style={i === team.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <ClientAvatar name={m.name} size={30} />
                            <div className="min-w-0" style={{ width: 190 }}>
                                <p className="text-sm font-medium truncate" style={{ color: COLORS.text }}>{m.name}{m.name === ME ? ` (${t('you')})` : ''}</p>
                                <p className="text-xs" style={{ color: COLORS.textMuted }}>{t(m.role)} · {m.clients} {t('clients')}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="relative rounded-full overflow-hidden" style={{ height: 8, background: '#f1f1f3' }}>
                                    <span className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: over ? '#dc2626' : room ? '#b9842b' : '#16a34a', transition: 'width .4s' }} />
                                </div>
                                <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{m.booked} / {m.capacity} h · {t('EVA does {n}% of their work').replace('{n}', String(m.eva))}</p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-right" style={{ width: 48, color: over ? '#dc2626' : COLORS.text }}>{pct}%</span>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-center" style={{ width: 118, background: over ? '#fdecec' : room ? '#fbf3e0' : '#e9f7ef', color: over ? '#c0392b' : room ? '#92710f' : '#15803d' }}>
                                {over ? t('Over capacity') : room ? t('Room for more') : t('Balanced')}
                            </span>
                        </div>
                    );
                })}
            </Card>
        </div>
    );
}

// ---- Profitability — which clients pay for the time they take ----------------------
function Profitability() {
    const { t } = useLang();
    const [worstFirst, setWorstFirst] = useState(true);
    const [drafted, setDrafted] = useState<Set<string>>(new Set());
    const rows = useMemo(() => [...CLIENTS].sort((a, b) => (worstFirst ? rateOf(a) - rateOf(b) : rateOf(b) - rateOf(a))), [worstFirst]);
    const below = CLIENTS.filter((c) => rateOf(c) < TARGET_RATE);
    return (
        <div className="flex flex-col gap-5">
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#7c3aed0a', border: '1px solid #7c3aed26' }}>
                <span className="mt-0.5"><Orb size={20} /></span>
                <p className="text-sm flex-1" style={{ color: COLORS.text }}>
                    {t('{n} clients earn less than your {rate}/hour target. Moving them to fixed-fee packages and switching on two more routines would add about 11.000 kr a month.')
                        .replace('{n}', String(below.length)).replace('{rate}', kr(TARGET_RATE))}
                </p>
            </div>
            <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t('Client profitability')}</span>
                    <SegmentedTabs value={worstFirst ? 'worst' : 'best'} onChange={(v) => setWorstFirst(v === 'worst')} options={[{ value: 'worst', label: t('Least profitable') }, { value: 'best', label: t('Most profitable') }]} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 760 }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
                                {['Client', 'Fee / mo', 'Human hours', 'Effective rate', 'Margin / mo', ''].map((h) => <th key={h} className="text-left text-xs font-medium px-4 py-2.5" style={{ color: COLORS.textMuted }}>{t(h)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((c) => {
                                const r = rateOf(c), low = r < TARGET_RATE;
                                return (
                                    <tr key={c.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                        <td className="px-4 py-3"><span className="flex items-center gap-2"><ClientAvatar name={c.name} size={22} /><span className="font-medium" style={{ color: COLORS.text }}>{c.name}</span></span></td>
                                        <td className="px-4 py-3 text-xs" style={{ color: COLORS.text }}>{kr(c.fee)}</td>
                                        <td className="px-4 py-3 text-xs" style={{ color: COLORS.text }}>{c.hours} h</td>
                                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: low ? '#b9842b' : '#15803d' }}>{kr(r)}/h</td>
                                        <td className="px-4 py-3 text-xs" style={{ color: marginOf(c) < 0 ? '#dc2626' : COLORS.text }}>{kr(marginOf(c))}</td>
                                        <td className="px-4 py-3 text-right">
                                            {low && (drafted.has(c.id)
                                                ? <span className="text-xs" style={{ color: '#15803d' }}>✓ {t('Proposal drafted')}</span>
                                                : <button onClick={() => setDrafted((p) => new Set(p).add(c.id))} className="text-xs font-medium" style={{ color: '#4456c7' }}>{t('Draft price proposal')}</button>)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ---- Growth — services to sell, and new clients looking for an AO -------------------
function Growth() {
    const { t } = useLang();
    const [done, setDone] = useState<Set<string>>(new Set());
    const total = OPPORTUNITIES.reduce((s, o) => s + o.monthly, 0);
    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{t('Services your clients are ready for')}</h2>
                <p className="text-sm mt-0.5 mb-3" style={{ color: COLORS.textMuted }}>{t('EVA matched every client’s books against what you offer — about {n} a month in new advisory and service revenue.').replace('{n}', kr(total))}</p>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
                    {OPPORTUNITIES.map((o) => (
                        <Card key={o.id} className="p-4 flex flex-col">
                            <div className="flex items-start gap-2">
                                <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t(o.title)}</p>
                                <span className="text-sm font-semibold shrink-0" style={{ color: '#15803d' }}>+{kr(o.monthly)}</span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{t(o.why)}</p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {o.clients.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 text-xs" style={{ background: '#f1f1f3', color: '#52525b' }}><ClientAvatar name={c} size={16} />{c}</span>)}
                            </div>
                            <div className="mt-auto pt-3">
                                {done.has(o.id)
                                    ? <span className="text-sm" style={{ color: '#15803d' }}>✓ {t('Proposals drafted — in your outbox')}</span>
                                    : <Button appearance="primary" onClick={() => setDone((p) => new Set(p).add(o.id))}>{t(o.action)}</Button>}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{t('New clients looking for an accountant')}</h2>
                <p className="text-sm mt-0.5 mb-3" style={{ color: COLORS.textMuted }}>{t('Businesses on e-conomic asking for an AO that matches your specialisms.')}</p>
                <Card className="overflow-hidden">
                    {LEADS.map((l, i) => (
                        <div key={l.id} className="flex items-center gap-3 px-4 py-3.5" style={i === LEADS.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <ClientAvatar name={l.name} size={30} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium" style={{ color: COLORS.text }}>{l.name} <span className="font-normal" style={{ color: COLORS.textMuted }}>· {t(l.industry)} · {l.where} · {t(l.size)}</span></p>
                                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t(l.why)}</p>
                            </div>
                            {done.has(l.id)
                                ? <span className="text-sm shrink-0" style={{ color: '#15803d' }}>✓ {t('Intro sent')}</span>
                                : <Button onClick={() => setDone((p) => new Set(p).add(l.id))}>{t('Send an intro')}</Button>}
                        </div>
                    ))}
                </Card>
            </div>
        </div>
    );
}

// ---- Playbooks — set a new client up the firm's way, in one push ---------------------
function Playbooks() {
    const { t } = useLang();
    const toast = useToast();
    const [books, setBooks] = useState<Playbook[]>(PLAYBOOKS);
    const [openId, setOpenId] = useState<string | null>(null);
    const [applyFor, setApplyFor] = useState<Playbook | null>(null);
    const pb = books.find((b) => b.id === openId);

    if (pb) {
        const toggle = (g: number, i: number) => setBooks((all) => all.map((b) => b.id !== pb.id ? b : { ...b, parts: b.parts.map((grp, gi) => gi !== g ? grp : { ...grp, items: grp.items.map((it, ii) => ii !== i ? it : { ...it, on: !it.on }) }) }));
        return (
            <div className="flex flex-col gap-4">
                <button onClick={() => setOpenId(null)} className="text-sm font-medium self-start" style={{ color: '#4456c7' }}>← {t('All playbooks')}</button>
                <Card className="p-5 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold" style={{ color: COLORS.text }}>{t(pb.name)}</p>
                            {pb.draft && <span className="rounded px-1.5 py-0.5 text-xs font-medium" style={{ background: '#f1f1f3', color: '#52525b' }}>{t('Draft')}</span>}
                        </div>
                        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>{t(pb.desc)}</p>
                        <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>{pb.author === 'firm' ? t('Written by your firm') : t('e-conomic default')} · {pb.clients} {t('clients')} · {t('updated')} {t(pb.updated)}</p>
                    </div>
                    <Button appearance="primary" onClick={() => setApplyFor(pb)}>{t('Apply to clients')}</Button>
                </Card>
                {pb.parts.map((grp, g) => (
                    <Card key={grp.group} className="overflow-hidden">
                        <div className="px-4 py-3 text-sm font-semibold" style={{ color: COLORS.text, borderBottom: `1px solid ${COLORS.cardBorder}` }}>{t(grp.group)}</div>
                        {grp.items.map((it, i) => (
                            <div key={it.name} className="flex items-center gap-4 px-4 py-3" style={i === grp.items.length - 1 ? undefined : { borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>{t(it.name)}</p>
                                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{t(it.desc)}</p>
                                </div>
                                <Switch checked={it.on} onChange={() => toggle(g, i)} />
                            </div>
                        ))}
                    </Card>
                ))}
                {applyFor && <ApplyDrawer pb={applyFor} onClose={() => setApplyFor(null)} onApply={(n) => { setBooks((all) => all.map((b) => b.id === applyFor.id ? { ...b, clients: b.clients + n, draft: false } : b)); toast.success(t('Playbook applied to {n} clients — EVA is setting them up').replace('{n}', String(n))); setApplyFor(null); }} />}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{t('Playbooks')}</h2>
                    <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>{t('How your firm sets up a client, by industry — chart of accounts, routines, connectors and guardrails. Apply once, and EVA sets every client up the same way.')}</p>
                </div>
                <Button onClick={() => toast.information(t('EVA is drafting a playbook from Nordic Build ApS’s setup'))}><Orb size={14} /> {t('Create from a client')}</Button>
                <Button appearance="primary"><Icon name="circle-plus" /> {t('New playbook')}</Button>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
                {books.map((b) => (
                    <Card key={b.id} hover onClick={() => setOpenId(b.id)} className="p-4 flex flex-col">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold flex-1" style={{ color: COLORS.text }}>{t(b.name)}</p>
                            {b.draft && <span className="rounded px-1.5 py-0.5 text-xs font-medium" style={{ background: '#f1f1f3', color: '#52525b' }}>{t('Draft')}</span>}
                        </div>
                        <p className="text-xs mt-1 mb-3" style={{ color: COLORS.textMuted }}>{t(b.desc)}</p>
                        <div className="mt-auto pt-3 flex items-center gap-2 text-xs" style={{ borderTop: `1px solid ${COLORS.cardBorder}`, color: COLORS.textMuted }}>
                            <span className="font-medium" style={{ color: b.clients ? COLORS.text : '#4456c7' }}>{b.clients ? `${b.clients} ${t('clients')}` : t('Add clients')}</span>
                            <span>·</span>
                            <span>{b.author === 'firm' ? t('Your firm') : 'e-conomic'}</span>
                            <span className="ml-auto">{t(b.updated)}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function ApplyDrawer({ pb, onClose, onApply }: { pb: Playbook; onClose: () => void; onApply: (n: number) => void }) {
    const { t } = useLang();
    const applied = new Set(CLIENTS.filter((c) => c.playbook === pb.id).map((c) => c.id));
    const [sel, setSel] = useState<Set<string>>(new Set(applied));
    const added = [...sel].filter((id) => !applied.has(id)).length;
    return (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
            <div className="h-full bg-white flex flex-col anim-slide" style={{ width: 'min(460px, 100vw)', boxShadow: '-12px 0 40px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <p className="text-base font-semibold" style={{ color: COLORS.text }}>{t('Apply “{name}” to clients').replace('{name}', t(pb.name))}</p>
                    <button onClick={onClose} className="rounded-md p-1" style={{ color: COLORS.textMuted }}><Icon name="close" /></button>
                </div>
                <p className="px-5 pt-3 text-xs" style={{ color: COLORS.textMuted }}>{t('Clients you add get this setup; future changes to the playbook reach them too. Removing a client keeps their current setup.')}</p>
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {CLIENTS.map((c) => (
                        <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer" onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <input type="checkbox" checked={sel.has(c.id)} onChange={() => setSel((p) => { const n = new Set(p); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} />
                            <ClientAvatar name={c.name} size={22} />
                            <span className="text-sm flex-1" style={{ color: COLORS.text }}>{c.name}</span>
                            <span className="text-xs" style={{ color: COLORS.textMuted }}>{t(c.industry)}</span>
                            {applied.has(c.id) && <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: '#e9f7ef', color: '#15803d' }}>{t('Applied')}</span>}
                        </label>
                    ))}
                </div>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{t('{n} new client(s) selected').replace('{n}', String(added))}</span>
                    <div className="flex gap-2">
                        <Button onClick={onClose}>{t('Cancel')}</Button>
                        <Button appearance="primary" disabled={added === 0} onClick={() => onApply(added)}>{t('Apply updates')}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
