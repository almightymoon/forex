'use client';

import { useEffect, useMemo } from 'react';
import {
  UTC_MONTHS,
  buildUtcYearOptions,
  lastUtcDayOfMonthIso
} from './imposeMonthlyFeeDateUtils';

type Props = {
  feeYear: string;
  feeMonth: string;
  feeDueBy: string;
  onFeeYearChange: (year: string) => void;
  onFeeMonthChange: (month: string) => void;
  onFeeDueByChange: (dueBy: string) => void;
  disabled?: boolean;
};

export default function ImposeMonthlyFeeDateFields({
  feeYear,
  feeMonth,
  feeDueBy,
  onFeeYearChange,
  onFeeMonthChange,
  onFeeDueByChange,
  disabled
}: Props) {
  const yearOptions = useMemo(() => buildUtcYearOptions(), []);

  useEffect(() => {
    if (!feeYear || !feeMonth) return;
    const last = lastUtcDayOfMonthIso(feeYear, feeMonth);
    if (!last) return;
    if (!feeDueBy || feeDueBy < `${feeYear}-${feeMonth}-01` || !feeDueBy.startsWith(`${feeYear}-${feeMonth}`)) {
      onFeeDueByChange(last);
    }
  }, [feeYear, feeMonth, feeDueBy, onFeeDueByChange]);

  const periodMinDate = feeYear && feeMonth ? `${feeYear}-${feeMonth}-01` : undefined;
  const periodMaxDate =
    feeYear && feeMonth ? lastUtcDayOfMonthIso(feeYear, feeMonth) : undefined;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fee period (UTC)</p>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={feeMonth}
            onChange={(e) => onFeeMonthChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            aria-label="Fee month"
          >
            <option value="">Month</option>
            {UTC_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={feeYear}
            onChange={(e) => onFeeYearChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            aria-label="Fee year"
          >
            <option value="">Year</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Calendar month this charge applies to (history and reports).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Pay by / last date (UTC)
        </label>
        <input
          type="date"
          value={feeDueBy}
          onChange={(e) => onFeeDueByChange(e.target.value)}
          min={periodMinDate}
          max={periodMaxDate}
          disabled={disabled || !feeYear || !feeMonth}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Defaults to the last day of the selected month. You can pick an earlier date within that month.
        </p>
      </div>
    </div>
  );
}
