import { createContext, useContext, useState, type ReactNode } from 'react';
import { Button } from '@economic/taco';
import { COLORS } from './ui';
import { useLang } from './i18n';

// ---- What EVA knows about each client ---------------------------------------------------
// Company-specific context (Komma's biggest lesson): notes you add, and what EVA learns when
// you tell it a flag was wrong. Reviews, controlling and forecasts read it; the client drawer
// shows it and lets you correct it.

export type Note = { id: string; company: string; text: string; source: 'you' | 'dismissed'; date: string };

const SEED_NOTES: Note[] = [
    { id: 'n1', company: 'Café Solsikke', text: 'Summer revenue runs about 40% above winter — the autumn dip is seasonal.', source: 'you', date: '12 Aug' },
    { id: 'n2', company: 'Café Solsikke', text: 'Ida wants to open a second location in 2027.', source: 'you', date: '3 Sep' },
    { id: 'n3', company: 'Nordic Build ApS', text: 'Buys materials from German suppliers most quarters.', source: 'dismissed', date: '2 Jul' },
    { id: 'n4', company: 'Digital Marketing Pro', text: 'AdTech Nordic is on a yearly contract — the rate changes every March.', source: 'you', date: '14 Mar' },
    { id: 'n5', company: 'Tech Equipment AS', text: 'Year-end stock count is done by the owner on 31 December.', source: 'you', date: '9 Jan' },
];

type MemoryApi = { notes: Note[]; notesFor: (company: string) => Note[]; add: (company: string, text: string, source: Note['source']) => void; remove: (id: string) => void };
const MemoryCtx = createContext<MemoryApi>({ notes: SEED_NOTES, notesFor: (c) => SEED_NOTES.filter((n) => n.company === c), add: () => {}, remove: () => {} });

let nid = 100;
export function MemoryProvider({ children }: { children: ReactNode }) {
    const [notes, setNotes] = useState<Note[]>(SEED_NOTES);
    const api: MemoryApi = {
        notes,
        notesFor: (company) => notes.filter((n) => n.company === company),
        add: (company, text, source) => setNotes((prev) => [{ id: `n${nid++}`, company, text, source, date: 'Today' }, ...prev]),
        remove: (id) => setNotes((prev) => prev.filter((n) => n.id !== id)),
    };
    return <MemoryCtx.Provider value={api}>{children}</MemoryCtx.Provider>;
}
export const useMemory = () => useContext(MemoryCtx);

// ---- "Why isn't this right?" --------------------------------------------------------------
// Dismissing a flag asks why, so EVA can learn — and, if you want, remember it for the client.
const REASONS = [
    { key: 'practice', label: 'This is how {client} does it', remember: true },
    { key: 'handled', label: 'Already handled', remember: false },
    { key: 'facts', label: 'EVA got the facts wrong', remember: false },
    { key: 'other', label: 'Something else', remember: false },
] as const;

export function ReasonPicker({ company, topic, onCancel, onSubmit, submitLabel = 'Dismiss' }: {
    company: string;
    topic: string; // what was flagged — used to phrase the note EVA remembers
    onCancel: () => void;
    onSubmit: (reason: string) => void;
    submitLabel?: string;
}) {
    const { t } = useLang();
    const { add } = useMemory();
    const [key, setKey] = useState<(typeof REASONS)[number]['key']>('practice');
    const [detail, setDetail] = useState('');
    const [remember, setRemember] = useState(true);
    const pick = (k: typeof key) => { setKey(k); setRemember(REASONS.find((r) => r.key === k)!.remember); };
    const label = t(REASONS.find((r) => r.key === key)!.label).replace('{client}', company);
    const submit = () => {
        const reason = detail.trim() ? `${label} — ${detail.trim()}` : label;
        if (remember) add(company, detail.trim() || `${t(topic)}: ${t('normal for this client — don’t flag it again.')}`, 'dismissed');
        onSubmit(reason);
    };
    return (
        <div className="rounded-xl p-3.5 flex flex-col gap-3" style={{ border: `1px solid ${COLORS.cardBorder}`, background: '#fafafa' }}>
            <p className="text-sm font-semibold" style={{ color: COLORS.text }}>{t('Why isn’t this right?')} <span className="font-normal" style={{ color: COLORS.textMuted }}>{t('EVA learns from your answer.')}</span></p>
            <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => {
                    const on = r.key === key;
                    return (
                        <button key={r.key} onClick={() => pick(r.key)} className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{ border: `1px solid ${on ? '#7c3aed' : COLORS.cardBorder}`, background: on ? '#f3f0fb' : '#fff', color: on ? '#6d28d9' : COLORS.textMuted }}>
                            {t(r.label).replace('{client}', company)}
                        </button>
                    );
                })}
            </div>
            <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={t('Tell EVA more (optional) — e.g. “rent here has never had VAT”')}
                className="w-full rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: COLORS.text }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                {t('Remember this for {client}').replace('{client}', company)}
            </label>
            <div className="flex justify-end gap-2">
                <Button onClick={onCancel}>{t('Cancel')}</Button>
                <Button appearance="primary" onClick={submit}>{t(submitLabel)}</Button>
            </div>
        </div>
    );
}

// Small list of notes, used in reviews ("EVA took this into account") and the client drawer.
export function NotesList({ company, editable = false }: { company: string; editable?: boolean }) {
    const { t } = useLang();
    const { notesFor, add, remove } = useMemory();
    const [draft, setDraft] = useState('');
    const list = notesFor(company);
    return (
        <div className="flex flex-col gap-1.5">
            {list.map((n) => (
                <div key={n.id} className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: '#fafafa', border: `1px solid ${COLORS.cardBorder}` }}>
                    <span className="flex-1" style={{ color: COLORS.text }}>{t(n.text)}</span>
                    <span className="text-xs shrink-0" style={{ color: COLORS.textMuted }}>{t(n.source === 'dismissed' ? 'Learned from a dismissed flag' : 'Added by you')} · {t(n.date)}</span>
                    {editable && <button onClick={() => remove(n.id)} className="text-xs shrink-0" style={{ color: COLORS.textMuted }} title={t('Forget this')}>✕</button>}
                </div>
            ))}
            {list.length === 0 && !editable && null}
            {editable && (
                <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { add(company, draft.trim(), 'you'); setDraft(''); } }} className="flex gap-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Add something EVA should know…')}
                        className="flex-1 rounded-lg px-3 py-2 text-sm bg-white" style={{ border: `1px solid ${COLORS.cardBorder}`, color: COLORS.text }} />
                    <Button type="submit" disabled={!draft.trim()}>{t('Add')}</Button>
                </form>
            )}
        </div>
    );
}
