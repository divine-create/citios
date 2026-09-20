'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw,
  Sparkles,
  Cake,
  X,
  Clock,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Common age presets for fast 1-click selection
const AGE_PRESETS = [18, 21, 25, 30, 35, 40, 50, 60];

interface DateOfBirthPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export default function DateOfBirthPicker({
  value,
  onChange,
  required = true,
  label = 'Date of Birth',
  disabled = false,
}: DateOfBirthPickerProps) {
  const currentYear = new Date().getFullYear();
  const maxAllowedYear = currentYear - 13; // Must be at least 13 years old
  const minAllowedYear = 1920;

  // Container ref for outside-click dismissal
  const containerRef = useRef<HTMLDivElement>(null);

  // Popover open state
  const [isOpen, setIsOpen] = useState(false);

  // View modes: 'calendar' | 'months' | 'years' | 'manual'
  const [viewMode, setViewMode] = useState<'calendar' | 'months' | 'years' | 'manual'>('calendar');

  // Parse current value
  const parsed = useMemo(() => {
    if (!value || !value.includes('-')) {
      return { y: null, m: null, d: null };
    }
    const [yStr, mStr, dStr] = value.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return { y: null, m: null, d: null };
    return { y, m, d };
  }, [value]);

  // Viewing navigation state (year & month currently in view)
  const [viewYear, setViewYear] = useState<number>(() => {
    return parsed.y || 2000;
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parsed.m ? parsed.m - 1 : 0; // 0-indexed month
  });

  // Selected decade for decade explorer
  const [selectedDecade, setSelectedDecade] = useState<number>(() => {
    const y = parsed.y || 2000;
    return Math.floor(y / 10) * 10;
  });

  // Keep viewing year/month in sync when external value changes
  useEffect(() => {
    if (parsed.y && parsed.m) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m - 1);
      setSelectedDecade(Math.floor(parsed.y / 10) * 10);
    }
  }, [parsed.y, parsed.m]);

  // Dismiss on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Calculate age and validity
  const age = useMemo(() => {
    if (!parsed.y || !parsed.m || !parsed.d) return null;
    const birthDate = new Date(parsed.y, parsed.m - 1, parsed.d);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge >= 0 ? calculatedAge : null;
  }, [parsed]);

  // Formatted date string for display
  const formattedDisplay = useMemo(() => {
    if (!parsed.y || !parsed.m || !parsed.d) return null;
    return `${MONTH_NAMES[parsed.m - 1]} ${parsed.d}, ${parsed.y}`;
  }, [parsed]);

  // Days in month calculation (handles leap years)
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  // Day of week offset for 1st of month (0 = Sun, 1 = Mon, ...)
  const startDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  // Available decades
  const decades = useMemo(() => {
    const list: number[] = [];
    const maxDecade = Math.floor(maxAllowedYear / 10) * 10;
    const minDecade = Math.floor(minAllowedYear / 10) * 10;
    for (let d = maxDecade; d >= minDecade; d -= 10) {
      list.push(d);
    }
    return list;
  }, [maxAllowedYear, minAllowedYear]);

  // Years in the selected decade
  const yearsInDecade = useMemo(() => {
    const list: number[] = [];
    for (let y = selectedDecade + 9; y >= selectedDecade; y--) {
      if (y <= maxAllowedYear && y >= minAllowedYear) {
        list.push(y);
      }
    }
    return list;
  }, [selectedDecade, maxAllowedYear, minAllowedYear]);

  // Navigation handlers
  const prevMonth = () => {
    if (viewMonth === 0) {
      if (viewYear > minAllowedYear) {
        setViewYear((y) => y - 1);
        setViewMonth(11);
      }
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      if (viewYear < maxAllowedYear) {
        setViewYear((y) => y + 1);
        setViewMonth(0);
      }
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const yStr = String(viewYear);
    onChange(`${yStr}-${mStr}-${dStr}`);
  };

  const applyAgePreset = (presetAge: number) => {
    const targetYear = currentYear - presetAge;
    const targetMonth = parsed.m ? parsed.m - 1 : 0;
    const targetDay = parsed.d || 1;
    setViewYear(targetYear);
    setViewMonth(targetMonth);
    setSelectedDecade(Math.floor(targetYear / 10) * 10);
    const mStr = String(targetMonth + 1).padStart(2, '0');
    const dStr = String(targetDay).padStart(2, '0');
    onChange(`${targetYear}-${mStr}-${dStr}`);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="space-y-1.5 relative select-none" ref={containerRef}>
      {/* Label and Badge Header */}
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-teal-700" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {formattedDisplay && age !== null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full shadow-xs">
            <Cake className="w-3 h-3 text-emerald-600" />
            {age} years old
          </span>
        )}
      </div>

      {/* Primary Trigger Input Box */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full p-3 sm:p-3.5 bg-white border rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs hover:border-teal-500 ${
          isOpen
            ? 'border-teal-600 ring-4 ring-teal-600/10 shadow-md'
            : formattedDisplay
            ? 'border-slate-300 bg-slate-50/50'
            : 'border-slate-200 hover:bg-slate-50/80'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              formattedDisplay
                ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/20'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            {formattedDisplay ? (
              <div className="flex flex-col">
                <span className="text-sm sm:text-[15px] font-black text-slate-900 truncate">
                  {formattedDisplay}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Click to modify date of birth
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-400">
                  Select your date of birth...
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Interactive calendar with quick year & age presets
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {formattedDisplay && (
            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Clear date"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div
            className={`p-1 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-teal-700' : ''
            }`}
          >
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Popover Modal / Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-5 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 max-w-full">
          {/* Quick Age Presets Bar */}
          <div className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Quick Age Presets
              </span>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'manual' ? 'calendar' : 'manual')}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
              >
                {viewMode === 'manual' ? '← Switch to Calendar' : 'Type DD/MM/YYYY'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AGE_PRESETS.map((preset) => {
                const targetYear = currentYear - preset;
                const isSelected = parsed.y === targetYear;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyAgePreset(preset)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800'
                    }`}
                  >
                    {preset} yrs
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIEW MODE: Manual Segmented Input Fallback */}
          {viewMode === 'manual' ? (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {/* Month Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Month</label>
                  <select
                    value={parsed.m ? String(parsed.m).padStart(2, '0') : ''}
                    onChange={(e) => {
                      const mVal = e.target.value;
                      const yVal = parsed.y || 2000;
                      const dVal = parsed.d ? String(parsed.d).padStart(2, '0') : '01';
                      onChange(`${yVal}-${mVal}-${dVal}`);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Month</option>
                    {MONTH_NAMES.map((name, i) => {
                      const val = String(i + 1).padStart(2, '0');
                      return (
                        <option key={val} value={val}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Day Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Day</label>
                  <select
                    value={parsed.d ? String(parsed.d).padStart(2, '0') : ''}
                    onChange={(e) => {
                      const dVal = e.target.value;
                      const yVal = parsed.y || 2000;
                      const mVal = parsed.m ? String(parsed.m).padStart(2, '0') : '01';
                      onChange(`${yVal}-${mVal}-${dVal}`);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const val = String(i + 1).padStart(2, '0');
                      return (
                        <option key={val} value={val}>
                          {i + 1}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Year Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Year</label>
                  <select
                    value={parsed.y ? String(parsed.y) : ''}
                    onChange={(e) => {
                      const yVal = e.target.value;
                      const mVal = parsed.m ? String(parsed.m).padStart(2, '0') : '01';
                      const dVal = parsed.d ? String(parsed.d).padStart(2, '0') : '01';
                      onChange(`${yVal}-${mVal}-${dVal}`);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Year</option>
                    {Array.from(
                      { length: maxAllowedYear - minAllowedYear + 1 },
                      (_, i) => maxAllowedYear - i
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-black shadow-xs hover:bg-teal-900 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : viewMode === 'years' ? (
            /* VIEW MODE: Fast Decade & Year Explorer */
            <div className="py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  Select Decade & Birth Year
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Back to Calendar
                </button>
              </div>

              {/* Decade Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {decades.map((dec) => (
                  <button
                    key={dec}
                    type="button"
                    onClick={() => setSelectedDecade(dec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedDecade === dec
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {dec}s
                  </button>
                ))}
              </div>

              {/* Years Grid in the active decade */}
              <div className="grid grid-cols-5 gap-2 pt-1">
                {yearsInDecade.map((yr) => {
                  const isSelected = viewYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setViewYear(yr);
                        setViewMode('calendar');
                        if (parsed.m && parsed.d) {
                          const mStr = String(parsed.m).padStart(2, '0');
                          const dStr = String(parsed.d).padStart(2, '0');
                          onChange(`${yr}-${mStr}-${dStr}`);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-600'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'months' ? (
            /* VIEW MODE: 12-Month Selector Grid */
            <div className="py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  Select Month ({viewYear})
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Back to Calendar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected = viewMonth === idx;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setViewMonth(idx);
                        setViewMode('calendar');
                        if (parsed.y && parsed.d) {
                          const mStr = String(idx + 1).padStart(2, '0');
                          const dStr = String(parsed.d).padStart(2, '0');
                          onChange(`${parsed.y}-${mStr}-${dStr}`);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VIEW MODE: Full Interactive Calendar */
            <div className="pt-3 space-y-3">
              {/* Header: Month & Year Jumper with Steppers */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('months')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-800 text-xs font-black rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {MONTH_NAMES[viewMonth]}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('years')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-800 text-xs font-black rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {viewYear}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    disabled={viewYear >= maxAllowedYear && viewMonth >= 11}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS_OF_WEEK.map((d) => (
                  <span
                    key={d}
                    className="text-[11px] font-black text-slate-400 uppercase py-1"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 sm:h-9" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected =
                    parsed.y === viewYear &&
                    parsed.m === viewMonth + 1 &&
                    parsed.d === dayNum;

                  // Age restriction guard (future date / under 13)
                  const candidateDate = new Date(viewYear, viewMonth, dayNum);
                  const isFutureOrUnder13 =
                    candidateDate.getFullYear() > maxAllowedYear ||
                    (candidateDate.getFullYear() === maxAllowedYear &&
                      candidateDate.getMonth() > new Date().getMonth());

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isFutureOrUnder13}
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 sm:h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-tr from-teal-700 to-emerald-600 text-white font-black shadow-md shadow-teal-800/30 scale-105'
                          : isFutureOrUnder13
                          ? 'text-slate-300 cursor-not-allowed opacity-40'
                          : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:scale-105'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Footer: Confirmation & Active State */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {formattedDisplay && age !== null ? (
                    <p className="text-[11px] font-bold text-slate-700 truncate">
                      ✓ {formattedDisplay} ({age} yrs)
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Tap a date on the calendar
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
