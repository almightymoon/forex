export const UTC_MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
] as const;

export function defaultFeePeriod(): { year: string; month: string; dueBy: string } {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const year = String(prev.getUTCFullYear());
  const month = String(prev.getUTCMonth() + 1).padStart(2, '0');
  return { year, month, dueBy: lastUtcDayOfMonthIso(year, month) };
}

export function parseFeeMonth(ym: string): { year: string; month: string } {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(ym.trim());
  if (!m) return { year: '', month: '' };
  return { year: m[1], month: m[2] };
}

export function feeMonthString(year: string, month: string): string {
  return year && month ? `${year}-${month}` : '';
}

/** Last calendar day of the UTC month (YYYY-MM-DD for &lt;input type="date"&gt;). */
export function lastUtcDayOfMonthIso(year: string, month: string): string {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return '';
  const last = new Date(Date.UTC(y, m, 0));
  const yy = last.getUTCFullYear();
  const mm = String(last.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(last.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function buildUtcYearOptions(): number[] {
  const current = new Date().getUTCFullYear();
  const years: number[] = [];
  for (let y = 2000; y <= current + 2; y += 1) years.push(y);
  return years;
}
