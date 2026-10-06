import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@economic/taco';
import { NodeMark, Orb, COLORS } from '../ui';
import { useLang } from '../i18n';

// ---- AX entry: EVA as an overlay on the e-conomic people use today ---------------------------
// A stand-in for e-conomic's Accounting › Daily journal. EVA opens from the top bar as a side
// panel over the journal; expanding it leaves e-conomic for the EVA universe (the AX app).

export interface JournalRow { no: number; type: 'supplier' | 'customer'; doc: boolean; date: string; text: string; amount: number; account: string; contra: string; vat: string }

export const JOURNAL: JournalRow[] = [
    { no: 1, type: 'supplier', doc: true, date: '02.09.2026', text: 'Husleje september', amount: 12500, account: '6310 Husleje', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 2, type: 'supplier', doc: true, date: '03.09.2026', text: 'Kontorartikler – Lyreco', amount: 1850, account: '6500 Kontorhold', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 3, type: 'supplier', doc: false, date: '05.09.2026', text: 'Forsikring Q4', amount: 8400, account: '6450 Forsikring', contra: '5810 Bankkonto', vat: '' },
    { no: 4, type: 'supplier', doc: true, date: '08.09.2026', text: 'Flyrejse København–Berlin', amount: 3450, account: '6210 Rejseudgifter', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 5, type: 'supplier', doc: true, date: '10.09.2026', text: 'Hotel Berlin (3 nætter)', amount: 4200, account: '6210 Rejseudgifter', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 6, type: 'supplier', doc: true, date: '12.09.2026', text: 'Frokostmøde med kunde', amount: 850, account: '6230 Repræsentation', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 7, type: 'supplier', doc: true, date: '14.09.2026', text: 'Adobe Creative Cloud', amount: 549, account: '6520 Software', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 8, type: 'supplier', doc: false, date: '16.09.2026', text: 'Bankgebyrer september', amount: 245, account: '7120 Bankgebyrer', contra: '5810 Bankkonto', vat: '' },
    { no: 9, type: 'customer', doc: true, date: '20.09.2026', text: 'Salg konsulent – Faktura 2026-31', amount: 25000, account: '1020 Konsulentsalg', contra: '5810 Bankkonto', vat: 'U25' },
    { no: 10, type: 'supplier', doc: true, date: '22.09.2026', text: 'Taxa fra lufthavn', amount: 380, account: '6210 Rejseudgifter', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 11, type: 'supplier', doc: true, date: '25.09.2026', text: 'Telefonregning september', amount: 1250, account: '6310 Husleje', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 12, type: 'supplier', doc: true, date: '27.09.2026', text: 'Kursusgebyr – Bogføring 2026', amount: 4500, account: '6610 Kurser', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 13, type: 'customer', doc: false, date: '29.09.2026', text: 'Salg konsulent – Faktura 2026-34', amount: 18750, account: '1020 Konsulentsalg', contra: '5810 Bankkonto', vat: 'U25' },
    { no: 14, type: 'supplier', doc: true, date: '30.09.2026', text: 'Webhosting september', amount: 199, account: '6520 Software', contra: '5810 Bankkonto', vat: 'I25' },
    { no: 15, type: 'supplier', doc: true, date: '30.09.2026', text: 'Strøm august', amount: 2100, account: '6320 El & varme', contra: '5810 Bankkonto', vat: 'I25' },
];

// What EVA finds when it checks the journal — shown on the rows once you ask.
export const JOURNAL_FLAGS: Record<number, string> = {
    3: 'No document — I found the policy in your inbox',
    6: 'Restaurant meal: only 25% of the VAT is deductible',
    8: 'No document — the bank statement covers it',
    11: 'Wrong account? Phone belongs on 6340 Telefon & internet',
    13: 'No document — invoice 2026-34 is in Sales',
    15: 'August cost — belongs in last period (accrual)',
};

export function journalAnswer(q: string, lang: 'en' | 'da'): string | null {
    if (!/check|journal|post|kontroll|kladde|bogfør|tjek/i.test(q)) return null;
    return lang === 'da'
        ? 'Jeg har tjekket alle 15 posteringer. 10 ser rigtige ud. 6 skal du kigge på, før du bogfører — de er markeret i kladden:\n\n• 11 Telefonregning står på 6310 Husleje — skal nok være 6340 Telefon & internet.\n• 15 Strøm august hører til august — jeg kan lave en periodisering.\n• 6 Frokostmøde: kun 25 % af momsen kan fratrækkes.\n• 3, 8 og 13 mangler bilag — jeg har fundet dem og kan vedhæfte dem.\n\nSkal jeg rette det og bogføre resten? Åbn mig i fuld skærm ⤢ for at se det samme på tværs af alle dine kunder.'
        : 'I checked all 15 entries. 10 look right. 6 need a look before you post — they’re marked in the journal:\n\n• 11 Phone bill is on 6310 Rent — it should probably be 6340 Phone & internet.\n• 15 Electricity August belongs to August — I can make an accrual.\n• 6 Lunch meeting: only 25% of the VAT is deductible.\n• 3, 8 and 13 have no document — I’ve found them and can attach them.\n\nShall I fix these and post the rest? Open me in full screen ⤢ to see the same across all your clients.';
}

const kr = (n: number) => `${n.toLocaleString('da-DK')} kr`;
const TOP_NAV = ['Home', 'Sales', 'Expenses', 'Accounting', 'Reports', 'Projects'];
const SIDE_NAV: { group: string; open: boolean; items: string[] }[] = [
    { group: 'Journals', open: true, items: ['Daily cash journal', 'Payroll journal', 'Open entries'] },
    { group: 'Bookkeeping', open: true, items: ['Accounts', 'Chart of accounts', 'Trial balance'] },
    { group: 'VAT & duties', open: true, items: ['VAT statement', 'EU sales without VAT'] },
    { group: 'Period closing', open: false, items: [] },
    { group: 'Automation', open: true, items: ['Workflows'] },
];
const NAVY = '#23233f';

export function EconomicShell({ panel, panelOpen, onTogglePanel, flagged, leaving }: {
    panel: ReactNode;          // the EVA side panel (shown when open)
    panelOpen: boolean;
    onTogglePanel: () => void;
    flagged: boolean;          // EVA has checked the journal — mark what it found
    leaving: boolean;          // expanding into the EVA universe
}) {
    const { t } = useLang();
    const [hint, setHint] = useState(true); // a one-time nudge towards the EVA button
    const cols = ['Type', 'Voucher', 'Attachment', 'Date', 'Text', 'Amount', 'Account', 'Contra account', 'VAT', 'Voucher balance', 'Currency', 'Project'];
    return (
        <div className={`fixed inset-0 z-[60] flex flex-col ${leaving ? 'eco-leave' : 'eco-enter'}`} style={{ background: '#fff', fontFamily: 'inherit' }}>
            {/* top bar */}
            <header className="flex items-center gap-1 px-4 shrink-0" style={{ height: 52, background: NAVY, color: '#fff' }}>
                <span className="mr-3"><NodeMark size={26} /></span>
                {TOP_NAV.map((n) => (
                    <span key={n} className="rounded-md px-3 py-1.5 text-sm" style={{ background: n === 'Accounting' ? 'rgba(255,255,255,0.14)' : 'transparent', fontWeight: n === 'Accounting' ? 600 : 400 }}>{t(n)}</span>
                ))}
                <div className="ml-auto flex items-center gap-3.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <Icon name="search" />
                    <Icon name="inbox" />
                    <Icon name="bell-solid" />
                    {/* EVA — the way in */}
                    <span className="relative">
                        <button onClick={() => { setHint(false); onTogglePanel(); }} className={`flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-sm font-semibold ${hint && !panelOpen ? 'eva-pulse' : ''}`}
                            style={{ background: panelOpen ? '#fff' : 'rgba(255,255,255,0.12)', color: panelOpen ? NAVY : '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                            <Orb size={22} /> EVA
                        </button>
                        {hint && !panelOpen && (
                            <span className="absolute right-0 top-full mt-2.5 rounded-lg px-3 py-2 text-xs whitespace-nowrap anim-in" style={{ background: '#fff', color: COLORS.text, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                                {t('New: EVA can check this journal for you')}
                            </span>
                        )}
                    </span>
                    <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: '#16a34a' }}><Icon name="question-mark-bold" /></span>
                    <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: '#ed9b2c' }}><Icon name="settings" /></span>
                    <span className="flex items-center gap-2 pl-3 ml-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                        <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)' }}><Icon name="person-solid" /></span>
                        <span className="leading-tight">
                            <span className="block text-xs font-medium">Tobias Holm Jensen</span>
                            <span className="block text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>Holm Revision ApS · 612448</span>
                        </span>
                        <Icon name="chevron-down" />
                    </span>
                </div>
            </header>

            <div className="flex flex-1 min-h-0">
                {/* left menu */}
                <aside className="shrink-0 overflow-y-auto py-3 px-2.5" style={{ width: 230, background: '#fafafa', borderRight: `1px solid ${COLORS.cardBorder}` }}>
                    {SIDE_NAV.map((g) => (
                        <div key={g.group} className="mb-1">
                            <p className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold" style={{ color: COLORS.text }}>
                                <span style={{ fontSize: 9, width: 10, display: 'inline-block' }}>{g.open ? '▼' : '▶'}</span>{t(g.group)}
                            </p>
                            {g.items.map((it) => (
                                <p key={it} className="rounded-md px-2 py-1.5 ml-3.5 text-sm" style={{ background: it === 'Daily cash journal' ? '#e8ecf8' : 'transparent', color: COLORS.text }}>{t(it)}</p>
                            ))}
                        </div>
                    ))}
                </aside>

                {/* the journal */}
                <main className="flex-1 min-w-0 flex flex-col px-6 pt-5 pb-4">
                    <h1 className="text-xl font-semibold mb-3" style={{ color: COLORS.text }}>{t('Daily cash journal')}</h1>
                    <div className="flex items-center gap-2 mb-3">
                        <Button appearance="primary">{t('New entry')}</Button>
                        <Button>{t('Post entries')}</Button>
                        <Button>{t('More')} <Icon name="chevron-down" /></Button>
                        <div className="ml-auto flex items-center gap-2" style={{ color: COLORS.textMuted }}>
                            <Button><Icon name="edit" /></Button>
                            <Button><Icon name="filter" /> {t('Filters')}</Button>
                            <Button><Icon name="print" /></Button>
                            <Button><Icon name="sliders" /></Button>
                            <span className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm" style={{ border: `1px solid ${COLORS.cardBorder}`, width: 180 }}><Icon name="search" /> {t('Search…')}</span>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto rounded-md" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
                        <table className="w-full text-sm" style={{ minWidth: 1080 }}>
                            <thead className="sticky top-0 bg-white z-10">
                                <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                                    {cols.map((c) => <th key={c} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${c === 'Amount' ? 'text-right' : 'text-left'}`} style={{ color: COLORS.text }}>{t(c)}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {JOURNAL.map((r) => {
                                    const flag = flagged ? JOURNAL_FLAGS[r.no] : undefined;
                                    return (
                                        <tr key={r.no} className={flag ? 'eco-flag' : ''} style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, background: flag ? '#fffaf0' : undefined, boxShadow: flag ? 'inset 3px 0 0 #ed9b2c' : undefined }}>
                                            <td className="px-3 py-3" style={{ color: r.type === 'supplier' ? '#ed9b2c' : '#4456c7' }}><Icon name={r.type === 'supplier' ? 'entry-type-supplier-invoice' : 'entry-type-customer-invoice'} /></td>
                                            <td className="px-3 py-3" style={{ color: COLORS.text }}>{r.no}</td>
                                            <td className="px-3 py-3" style={{ color: r.doc ? '#4456c7' : '#ed9b2c' }}><Icon name={r.doc ? 'document-preview' : 'circle-plus'} /></td>
                                            <td className="px-3 py-3 whitespace-nowrap" style={{ color: COLORS.text }}>{r.date}</td>
                                            <td className="px-3 py-3" style={{ color: COLORS.text, minWidth: 220 }}>
                                                {r.text}
                                                {flag && <span className="flex items-center gap-1.5 mt-1 text-xs font-medium" style={{ color: '#92710f' }}><Orb size={12} /> {t(flag)}</span>}
                                            </td>
                                            <td className="px-3 py-3 text-right whitespace-nowrap" style={{ color: COLORS.text }}>{kr(r.amount)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap" style={{ color: COLORS.text }}>{r.account}</td>
                                            <td className="px-3 py-3 whitespace-nowrap" style={{ color: COLORS.text }}>{r.contra}</td>
                                            <td className="px-3 py-3" style={{ color: COLORS.text }}>{r.vat}</td>
                                            <td className="px-3 py-3" />
                                            <td className="px-3 py-3" />
                                            <td className="px-3 py-3" />
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm font-semibold pt-2.5" style={{ color: COLORS.text }}>{t('Records')}: {JOURNAL.length}</p>
                </main>

                {/* EVA, docked on the right — over today's e-conomic */}
                {panelOpen && <div className="shrink-0 flex p-2 eco-panel-in" style={{ background: '#f4f4f6', borderLeft: `1px solid ${COLORS.cardBorder}` }}>{panel}</div>}
            </div>
        </div>
    );
}
