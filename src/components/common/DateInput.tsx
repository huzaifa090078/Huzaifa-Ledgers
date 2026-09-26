import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateDisplay, parseToYYYYMMDD, getTodayDateString } from '../../services/accounting';

export interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  min?: string;
  max?: string;
  align?: 'left' | 'right' | 'auto';
}

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

const DAYS_HEADER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  label,
  required,
  disabled,
  placeholder = 'DD-MM-YYYY',
  className = '',
  inputClassName = '',
  align = 'auto',
}) => {
  // Normalize incoming value to YYYY-MM-DD
  const normalizedValue = useMemo(() => {
    return parseToYYYYMMDD(value) || '';
  }, [value]);

  // Display text strictly in DD-MM-YYYY format
  const [displayText, setDisplayText] = useState(() => {
    return formatDateDisplay(normalizedValue);
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [calendarAlign, setCalendarAlign] = useState<'left' | 'right'>(align === 'right' ? 'right' : 'left');
  const [openUpward, setOpenUpward] = useState(false);

  // Calendar navigation state (year and month 0-11)
  const [viewYear, setViewYear] = useState(() => {
    if (normalizedValue) {
      const parts = normalizedValue.split('-');
      if (parts.length === 3) return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (normalizedValue) {
      const parts = normalizedValue.split('-');
      if (parts.length === 3) return parseInt(parts[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  // Calculate smart horizontal and vertical placement when calendar opens
  useEffect(() => {
    if (align && align !== 'auto') {
      setCalendarAlign(align);
    }
  }, [align]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const parentModal = containerRef.current.closest('form, .max-w-md, .max-w-lg, .max-w-sm');
      const parentRect = parentModal ? parentModal.getBoundingClientRect() : null;

      // Smart Horizontal Alignment: if on right half of parent container/screen, anchor right-0
      if (align === 'auto' || !align) {
        if (parentRect) {
          const isRightHalf = (rect.left - parentRect.left) > (parentRect.width / 2) - 40;
          const spaceOnRight = parentRect.right - rect.left;
          if (isRightHalf || spaceOnRight < 275) {
            setCalendarAlign('right');
          } else {
            setCalendarAlign('left');
          }
        } else {
          if (window.innerWidth - rect.left < 280 || rect.left > window.innerWidth / 2) {
            setCalendarAlign('right');
          } else {
            setCalendarAlign('left');
          }
        }
      }

      // Smart Vertical Alignment: relative to parent modal bounds and viewport
      const modalBottom = parentRect ? Math.min(parentRect.bottom, window.innerHeight) : window.innerHeight;
      const modalTop = parentRect ? Math.max(parentRect.top, 0) : 0;
      const spaceBelow = modalBottom - rect.bottom;
      const spaceAbove = rect.top - modalTop;

      // Calendar height is ~235px. If space below is tight and space above has room, pop upward
      if (spaceBelow < 240 && spaceAbove > 210) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, align]);

  // Sync display text when value prop changes externally
  useEffect(() => {
    const formatted = formatDateDisplay(normalizedValue);
    setDisplayText(formatted);
    if (normalizedValue) {
      const parts = normalizedValue.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [normalizedValue]);

  // Close calendar on click outside or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Whenever calendar opens or value changes, synchronize viewYear and viewMonth to selected date or current date
  useEffect(() => {
    if (isOpen) {
      if (normalizedValue) {
        const parts = normalizedValue.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
            setViewYear(y);
            setViewMonth(m);
            return;
          }
        }
      }
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  }, [isOpen, normalizedValue]);

  // Dynamic list of selectable years
  const yearOptions = useMemo(() => {
    const start = 2015;
    const end = 2035;
    const years: number[] = [];
    for (let yr = start; yr <= end; yr++) {
      years.push(yr);
    }
    if (viewYear < start) years.unshift(viewYear);
    if (viewYear > end) years.push(viewYear);
    return years;
  }, [viewYear]);

  // Select date from calendar picker
  const handleSelectDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const ymd = `${yStr}-${mStr}-${dStr}`;
    const dmy = `${dStr}-${mStr}-${yStr}`;

    setDisplayText(dmy);
    onChange(ymd);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const todayYMD = getTodayDateString();
    const todayDMY = formatDateDisplay(todayYMD);
    setDisplayText(todayDMY);
    onChange(todayYMD);
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    // Adjust so Monday is 0, Sunday is 6
    const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingOffset; i++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDaysInMonth; day++) {
      days.push(day);
    }
    return days;
  }, [viewYear, viewMonth]);

  const selectedDay = useMemo(() => {
    if (!normalizedValue) return null;
    const parts = normalizedValue.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (y === viewYear && m === viewMonth) {
        return d;
      }
    }
    return null;
  }, [normalizedValue, viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Date Field Container - Tapping anywhere triggers calendar, blocks keyboard */}
      <div
        className={`relative flex items-center rounded-lg ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        {/* Calendar Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <CalendarIcon className="w-4 h-4" />
        </div>

        {/* Formatted Date Field (Read-only, software keyboard strictly blocked) */}
        <input
          type="text"
          readOnly
          inputMode="none"
          tabIndex={-1}
          value={displayText}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={(e) => {
            // Immediate blur guarantees mobile OS software keyboard NEVER appears
            e.currentTarget.blur();
          }}
          className={`w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-medium tracking-wide text-slate-800 cursor-pointer select-none focus:outline-hidden hover:border-sky-400 focus:border-sky-500 transition-colors ${inputClassName}`}
        />

        {/* Clear date button */}
        {displayText && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisplayText('');
              onChange('');
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-300 hover:text-slate-600 focus:outline-hidden cursor-pointer"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Interactive Calendar Dropdown Popup */}
      {isOpen && (
        <div
          className={`absolute z-[70] ${
            calendarAlign === 'right' ? 'right-0' : 'left-0'
          } ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-[260px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 rounded-md cursor-pointer hover:bg-slate-100 p-1 focus:ring-0 focus:outline-hidden"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 rounded-md cursor-pointer hover:bg-slate-100 p-1 focus:ring-0 focus:outline-hidden font-mono"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {DAYS_HEADER.map((d) => (
              <div key={d} className="text-[9px] font-bold text-slate-400 py-0.5 font-mono">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-1" />;
              }
              const isSelected = day === selectedDay;
              const isToday =
                day === new Date().getDate() &&
                viewMonth === new Date().getMonth() &&
                viewYear === new Date().getFullYear();

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-1 text-xs font-mono rounded-md transition ${
                    isSelected
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-sky-50 text-sky-700 font-bold border border-sky-300 hover:bg-sky-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today and Close Buttons */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[10px] font-semibold text-sky-600 hover:text-sky-700 active:underline"
            >
              Today ({formatDateDisplay(getTodayDateString())})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
