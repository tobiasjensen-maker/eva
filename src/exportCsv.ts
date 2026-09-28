// Export a table as a CSV that opens straight in Excel (semicolon-separated with a BOM,
// which Danish Excel expects). Used by the budget, the month-end report and chat answers.
export function downloadCsv(filename: string, rows: (string | number)[][]) {
    const cell = (v: string | number) => {
        const s = typeof v === 'number' ? String(Math.round(v)) : v;
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
