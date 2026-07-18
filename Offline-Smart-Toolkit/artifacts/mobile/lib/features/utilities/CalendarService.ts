// Pure-JS calendar utilities — 100% offline, no external deps.

export interface CalendarDay {
  date: number;       // day of month (1-31)
  month: number;      // 0-indexed month
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export interface MonthData {
  year: number;
  month: number;      // 0-indexed
  label: string;      // e.g. "July 2026"
  days: CalendarDay[];
  totalDays: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getMonthData(year: number, month: number): MonthData {
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  // First day of month (0 = Sunday)
  const firstDay = new Date(year, month, 1).getDay();
  // Total days in this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Fill leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    days.push({
      date: d,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: false,
    });
  }

  // Fill current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    days.push({
      date: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: d === todayD && month === todayM && year === todayY,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Fill trailing days from next month
  const remaining = 42 - days.length; // always 6 rows × 7 cols
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: d,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: false,
    });
  }

  return {
    year,
    month,
    label: `${MONTH_NAMES[month]} ${year}`,
    days,
    totalDays: daysInMonth,
  };
}

export interface YearMonth {
  month: number;
  label: string;
  shortLabel: string;
  totalDays: number;
  isCurrentMonth: boolean;
}

export function getYearData(year: number): YearMonth[] {
  const today = new Date();
  return Array.from({ length: 12 }, (_, m) => ({
    month: m,
    label: MONTH_NAMES[m],
    shortLabel: SHORT_MONTH_NAMES[m],
    totalDays: new Date(year, m + 1, 0).getDate(),
    isCurrentMonth: today.getFullYear() === year && today.getMonth() === m,
  }));
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) return { year: year + 1, month: 0 };
  return { year, month: month + 1 };
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month];
}

export function getShortMonthName(month: number): string {
  return SHORT_MONTH_NAMES[month];
}

export function today(): { year: number; month: number; date: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() };
}
