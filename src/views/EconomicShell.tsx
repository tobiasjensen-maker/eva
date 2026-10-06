import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Group, Header, Heading, Icon, IconButton, Menu, Navigation2, Table3, Tooltip, type IconName } from '@economic/taco';
import { Orb } from '../ui';
import { useLang } from '../i18n';
import agreementAvatar from '../assets/agreement-avatar.svg';

// ---- AX entry: EVA as an overlay on the e-conomic people use today ---------------------------
// Built from the prototype kit's e-conomic pieces (e-conomic/prototype-kit, web track): the AppShell's
// Header + Regnskab side nav and the Journals (Kassekladde) template's Table3 — ported to taco 6.
// A stand-in for e-conomic's Accounting › Daily journal. EVA opens from the top bar as a side
// panel docked on the right; expanding it opens the EVA universe (the AX app) in a rounded
// container over e-conomic's top menu and content — the panel itself stays where it is.

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

// ─── Kit: Journals template (adapted) ─────────────────────────────────────────────
type EntryType = 'supplierInvoice' | 'manualCustomerInvoice';
interface DraftEntry { entryId: number; entryType: EntryType; formattedDate: string; hasDoc: boolean; voucherNumber: number; text: string; amount: number; account: string; vatCode: string; contraAccount: string; flag?: string }

const dkk = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TYPE_ICON: Record<EntryType, IconName> = { supplierInvoice: 'entry-type-supplier-invoice', manualCustomerInvoice: 'entry-type-manual-customer-invoice' };
const TYPE_COLOR: Record<EntryType, string> = { supplierInvoice: 'text-yellow-500', manualCustomerInvoice: 'text-green-500' };
const TYPE_LABEL: Record<EntryType, string> = { supplierInvoice: 'Leverandørfaktura', manualCustomerInvoice: 'Kundefaktura' };

// ─── Kit: AppShell — Regnskab side nav ────────────────────────────────────────────
function RegnskabNav() {
    return (
        <Navigation2>
            <Navigation2.Section>
                <Navigation2.Group heading="Kassekladder" defaultExpanded>
                    <Navigation2.Link href="#" active>Daglig</Navigation2.Link>
                    <Navigation2.Link href="#">Indbetalinger</Navigation2.Link>
                    <Navigation2.Link href="#">Lønninger</Navigation2.Link>
                    <Navigation2.Link href="#">Personalegoder</Navigation2.Link>
                </Navigation2.Group>
                <Navigation2.Group heading="Søgning og lister" defaultExpanded>
                    <Navigation2.Link href="#">Kontoplan</Navigation2.Link>
                    <Navigation2.Link href="#">Leverandører</Navigation2.Link>
                    <Navigation2.Link href="#">Anlægskartotek</Navigation2.Link>
                    <Navigation2.Link href="#">Posteringer (find bilag)</Navigation2.Link>
                    <Navigation2.Link href="#">Periodiseringer</Navigation2.Link>
                </Navigation2.Group>
                <Navigation2.Group heading="Bilagsanmodning" defaultExpanded>
                    <Navigation2.Link href="#">Anmod om bilag</Navigation2.Link>
                    <Navigation2.Link href="#">Bilag til gennemgang</Navigation2.Link>
                </Navigation2.Group>
                <Navigation2.Group heading="Bank" defaultExpanded>
                    <Navigation2.Link href="#">Bankafstemning</Navigation2.Link>
                    <Navigation2.Link href="#">Betalinger</Navigation2.Link>
                    <Navigation2.Link href="#">Bankopsætning</Navigation2.Link>
                </Navigation2.Group>
            </Navigation2.Section>
        </Navigation2>
    );
}

// Mock agreement (fictional).
const AGREEMENT = { number: 612448, name: 'Holm Revision ApS', userId: 'THJ', isAdministrator: true, imageSrc: agreementAvatar };

export function EconomicShell({ panel, panelOpen, onTogglePanel, flagged, universe }: {
    panel: ReactNode;          // the EVA side panel (shown when open)
    panelOpen: boolean;
    onTogglePanel: () => void;
    flagged: boolean;          // EVA has checked the journal — mark what it found
    universe: boolean;         // the EVA universe is open on top — dim e-conomic under it
}) {
    const { t } = useLang();
    const [hint, setHint] = useState(true); // a one-time nudge towards the EVA button
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [agreementOpen, setAgreementOpen] = useState(false);
    // The universe container sits left of the panel — share the panel's live width (it's resizable).
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = panelRef.current;
        const root = document.documentElement;
        if (!el) { root.style.setProperty('--eco-panel-w', '0px'); return; }
        const ro = new ResizeObserver(() => root.style.setProperty('--eco-panel-w', `${el.offsetWidth}px`));
        ro.observe(el);
        return () => ro.disconnect();
    }, [panelOpen]);

    const data: DraftEntry[] = JOURNAL.map((r) => ({
        entryId: r.no, entryType: r.type === 'supplier' ? 'supplierInvoice' : 'manualCustomerInvoice', formattedDate: r.date.replace(/\./g, '-'), hasDoc: r.doc,
        voucherNumber: r.no, text: r.text, amount: r.amount, account: r.account, vatCode: r.vat, contraAccount: r.contra, flag: flagged ? JOURNAL_FLAGS[r.no] : undefined,
    }));
    const balance = JOURNAL.reduce((s, r) => s + (r.type === 'customer' ? r.amount : -r.amount), 0);

    const toolbarLeft = (
        <Group>
            <Button appearance="primary">Ny postering</Button>
            <Button>Ny postering fra Inbox</Button>
            <Button>Bogfør posteringer</Button>
            <Menu trigger={<Button>Mere <Icon name="chevron-down" /></Button>}>
                <Menu.Content>
                    <Menu.Item>Eksportér til Excel</Menu.Item>
                    <Menu.Item>Importér posteringer</Menu.Item>
                </Menu.Content>
            </Menu>
        </Group>
    );
    const toolbarRight = (
        <Group>
            <IconButton appearance="default" icon="document-create-entry" aria-label="Træk bilag fra Inbox" tooltip="Træk og slip bilag fra Inbox" />
            <IconButton appearance="default" icon="export-to-excel" aria-label="Eksportér til Excel" tooltip="Eksportér til Excel" />
        </Group>
    );

    return (
        // the kit's nav links are href="#" stand-ins — keep them from wiping the prototype's hash route
        <div className="fixed inset-0 z-[60] flex eco-enter" style={{ background: '#fff' }} onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a[href="#"]')) e.preventDefault(); }}>
            {/* e-conomic: top menu + content (the EVA universe covers this part when open) */}
            <div className="flex-1 min-w-0 flex flex-col relative">
                {universe && <div className="absolute inset-0 z-20 eco-dim" style={{ background: 'rgba(28, 27, 58, 0.45)' }} />}
                {/* Kit: AppShell header */}
                <Header>
                    <Header.MenuButton onClick={() => setSidebarOpen((v) => !v)} />
                    <Header.Logo />
                    <Header.PrimaryNavigation>
                        {['Hjem', 'Salg', 'Regnskab', 'Rapporter'].map((l) => (
                            <Header.Link key={l} href="#" aria-current={l === 'Regnskab' ? 'page' : undefined}>{l}</Header.Link>
                        ))}
                    </Header.PrimaryNavigation>
                    <Header.SecondaryNavigation>
                        {/* EVA — the way in */}
                        <span className="relative flex items-center mr-1">
                            <button onClick={() => { setHint(false); onTogglePanel(); }} className={`flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-sm font-semibold ${hint && !panelOpen ? 'eva-pulse' : ''}`}
                                style={{ background: panelOpen ? '#fff' : 'rgba(255,255,255,0.12)', color: panelOpen ? '#23233f' : '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                                <Orb size={22} /> {t('Ask EVA')}
                            </button>
                            {hint && !panelOpen && (
                                <span className="absolute right-0 top-full mt-2.5 z-30 rounded-lg px-3 py-2 text-xs whitespace-nowrap anim-in" style={{ background: '#fff', color: '#1c1b3a', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                                    {t('New: EVA can check this journal for you')}
                                </span>
                            )}
                        </span>
                        <Header.Button icon="search-bold" aria-label="Søg" />
                        <Header.Button icon="bell-solid" aria-label="Notifikationer" />
                        <Header.Button icon="market" aria-label="Apps" />
                        <Header.Button icon="inbox" aria-label="Indbakke" />
                        <Header.Button icon="question-mark-bold" aria-label="Hjælp" />
                        <Header.Button icon="settings-solid" aria-label="Indstillinger" />
                    </Header.SecondaryNavigation>
                    <Header.AgreementSelector
                        agreements={[AGREEMENT]}
                        currentAgreement={AGREEMENT}
                        fallbackImageSrc={agreementAvatar}
                        filterAgreement={(a, f) => f(a)}
                        filterClientAgreement={(a, _s, f) => f(a)}
                        onChangeAgreement={() => {}}
                        onLogout={() => {}}
                        open={agreementOpen}
                        setOpen={setAgreementOpen}
                    />
                </Header>

                <div className="flex flex-1 min-h-0 w-full">
                    {sidebarOpen && <div className="shrink-0 w-[256px] overflow-y-auto border-r border-gray-100 bg-white"><RegnskabNav /></div>}

                    {/* Kit: Journals template — balance line + Table3 */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
                        <div className="flex items-end justify-between px-4 pt-3 pb-2">
                            <Heading level={1} size="lg">Daglig</Heading>
                            <div className="flex gap-8 text-right">
                                <div><p className="text-sm text-gray-500">Saldo</p><p className="text-lg font-bold">{dkk.format(balance)}</p></div>
                                <div><p className="text-sm text-gray-500">Bankkonto</p><p className="text-lg font-bold">{dkk.format(132940)}</p></div>
                            </div>
                        </div>
                        <div id="journal__feed" className="flex-1 min-h-0 min-w-0 flex flex-col px-4 py-2 overflow-hidden">
                            <Table3<DraftEntry>
                                id="draft-entries-table"
                                data={data}
                                rowIdentityAccessor="entryId"
                                preset="complex"
                                enableSearch
                                enableFooter
                                enableRowSelection
                                enableColumnOrdering={false}
                                enableColumnHiding
                                enableFiltering={false}
                                enablePrinting
                                defaultSettings={{ rowHeight: 'short', fontSize: 'small' }}
                                toolbarLeft={toolbarLeft}
                                toolbarRight={toolbarRight}>
                                <Table3.Column<DraftEntry> accessor="entryType" header="Type" align="left" defaultWidth={56} minWidth={56}
                                    renderer={({ value }) => <Tooltip title={TYPE_LABEL[value]}><Icon name={TYPE_ICON[value]} className={TYPE_COLOR[value]} /></Tooltip>} />
                                <Table3.Column<DraftEntry> accessor="formattedDate" header="Dato" align="left" defaultWidth={96} />
                                <Table3.Column<DraftEntry> accessor="hasDoc" header="Bilag" align="left" defaultWidth={64}
                                    renderer={({ value }) => <IconButton appearance="discrete" icon={value ? 'document-preview' : 'circle-plus'} aria-label={value ? 'Vis bilag' : 'Tilføj bilag'} />} />
                                <Table3.Column<DraftEntry> accessor="voucherNumber" header="Bilagsnr." align="left" defaultWidth={80} dataType="number" />
                                <Table3.Column<DraftEntry> accessor="text" header="Tekst" align="left" defaultWidth={flagged ? 380 : 240}
                                    renderer={({ value, row }) => row.flag ? (
                                        // EVA's finding, inline — the marker also tints the whole row (index.css)
                                        <span className="eco-flag-cell flex items-center gap-2 min-w-0">
                                            <span className="truncate">{value}</span>
                                            <span className="flex items-center gap-1 shrink-0 rounded-full px-1.5 py-px text-[11px] font-medium" style={{ background: '#fdf1dc', color: '#92710f' }}><Orb size={11} /> {t(row.flag)}</span>
                                        </span>
                                    ) : <span className="truncate">{value}</span>} />
                                <Table3.Column<DraftEntry> accessor="amount" header="Beløb" dataType="amount" defaultWidth={110}
                                    renderer={({ value }) => <span className="truncate">{dkk.format(value)}</span>} />
                                <Table3.Column<DraftEntry> accessor="account" header="Konto" align="left" defaultWidth={170} />
                                <Table3.Column<DraftEntry> accessor="vatCode" header="Moms" align="left" defaultWidth={70} />
                                <Table3.Column<DraftEntry> accessor="contraAccount" header="Modkonto" align="left" defaultWidth={150} />
                            </Table3>
                        </div>
                    </div>
                </div>
            </div>

            {/* EVA, docked on the right, full height — it stays put when the universe opens */}
            {panelOpen && <div ref={panelRef} className="shrink-0 flex p-2.5 eco-panel-in" style={{ background: universe ? '#e4e4ea' : '#f4f4f6', borderLeft: universe ? 'none' : '1px solid #e9e9ec', transition: 'background .3s ease' }}>{panel}</div>}
        </div>
    );
}
