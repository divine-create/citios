'use client';

import React, { useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const MONTHS = [
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
  { value: '12', label: 'December' },
];

interface DateOfBirthPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
}

export default function DateOfBirthPicker({
  value,
  onChange,
  required = true,
  label = 'Date of Birth',
}: DateOfBirthPickerProps) {
  // Parse incoming value "YYYY-MM-DD"
  const { year, month, day } = useMemo(() => {
    if (!value || !value.includes('-')) {
      return { year: '', month: '', day: '' };
    }
    const [y, m, d] = value.split('-');
    return { year: y || '', month: m || '', day: d || '' };
  }, [value]);

  // Generate Year options (from currentYear - 13 down to 1920)
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 13; y >= 1920; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Days in month calculation (accounting for leap years)
  const maxDays = useMemo(() => {
    if (!month) return 31;
    const m = parseInt(month, 10);
    if ([4, 6, 9, 11].includes(m)) return 30;
    if (m === 2) {
      const y = parseInt(year, 10);
      if (y && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) {
        return 29;
      }
      return 28;
    }
    return 31;
  }, [month, year]);

  const days = useMemo(() => {
    return Array.from({ length: maxDays }, (_, i) => {
      const d = i + 1;
      return d < 10 ? `0${d}` : `${d}`;
    });
  }, [maxDays]);

  const update = (newY: string, newM: string, newD: string) => {
    if (newY && newM && newD) {
      // Clamp day if needed
      let clampedDay = newD;
      const m = parseInt(newM, 10);
      const y = parseInt(newY, 10);
      let limit = 31;
      if ([4, 6, 9, 11].includes(m)) limit = 30;
      else if (m === 2) {
        limit = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
      }
      if (parseInt(clampedDay, 10) > limit) {
        clampedDay = limit < 10 ? `0${limit}` : `${limit}`;
      }
      onChange(`${newY}-${newM}-${clampedDay}`);
    } else if (!newY && !newM && !newD) {
      onChange('');
    } else {
      // Partial selection keeps the existing string format or pending state
      onChange(`${newY || '2000'}-${newM || '01'}-${newD || '01'}`);
    }
  };

  // Calculated Age
  const age = useMemo(() => {
    if (!year || !month || !day) return null;
    const birthDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge >= 0 ? calculatedAge : null;
  }, [year, month, day]);

  const formattedDate = useMemo(() => {
    if (!year || !month || !day) return null;
    const mLabel = MONTHS.find((m) => m.value === month)?.label || month;
    return `${mLabel} ${parseInt(day, 10)}, ${year}`;
  }, [year, month, day]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-teal-700" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {formattedDate && age !== null && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {formattedDate} ({age} years old)
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Month Selector */}
        <div className="relative">
          <select
            value={month}
            onChange={(e) => update(year, e.target.value, day)}
            className="w-full appearance-none pl-3 pr-7 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Day Selector */}
        <div className="relative">
          <select
            value={day}
            onChange={(e) => update(year, month, e.target.value)}
            className="w-full appearance-none pl-3 pr-7 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Year Selector */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => update(e.target.value, month, day)}
            className="w-full appearance-none pl-3 pr-7 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
