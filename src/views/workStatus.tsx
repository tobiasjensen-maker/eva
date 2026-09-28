import type { ReactNode } from 'react';
import { Card, CountBadge, COLORS } from '../ui';
import { useLang } from '../i18n';

// The three work statuses shown everywhere tasks appear: To do (sub-status Overdue),
// In progress (EVA drafts ready for your review) and Done.
export type WorkStatus = 'todo' | 'overdue' | 'inprogress' | 'done';
export const WORK_STATUS: Record<WorkStatus, { label: string; bg: string; fg: string; dot: string }> = {
    todo: { label: 'To do', bg: '#f1f1f3', fg: '#52525b', dot: '#a8a8b0' },
    overdue: { label: 'Overdue', bg: '#fdecec', fg: '#c0392b', dot: '#dc2626' },
    inprogress: { label: 'In progress', bg: '#f3f0fb', fg: '#6d28d9', dot: '#7c3aed' },
    done: { label: 'Done', bg: '#e9f7ef', fg: '#15803d', dot: '#16a34a' },
};
export function WorkTag({ s, label }: { s: WorkStatus; label?: string }) {
    const { t } = useLang();
    const m = WORK_STATUS[s];
    return <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={{ background: m.bg, color: m.fg }}><span className="rounded-full" style={{ width: 6, height: 6, background: m.dot }} />{t(label ?? m.label)}</span>;
}

// A titled card holding a list of rows — Tasks' list view and the Activity log share it.
export function SectionCard({ title, count, right, accent, children }: { title: ReactNode; count?: number; right?: ReactNode; accent?: string; children: ReactNode }) {
    return (
        <Card className="overflow-hidden" style={accent ? { borderColor: accent } : undefined}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, background: accent ? `${accent}0d` : undefined }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">{title}{count !== undefined && <CountBadge n={count} showZero />}</div>
                {right}
            </div>
            {children}
        </Card>
    );
}

