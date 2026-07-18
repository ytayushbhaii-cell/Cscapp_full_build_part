// Pure-JS age calculation — 100% offline, no external deps.

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthdayDays: number;
  dayOfWeek: string;           // day-of-week the person was born
  isLeapYear: boolean;
  zodiacSign: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function zodiacSign(day: number, month: number): string {
  // month is 1-indexed
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries ♈';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus ♉';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini ♊';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer ♋';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo ♌';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo ♍';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra ♎';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio ♏';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius ♐';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn ♑';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius ♒';
  return 'Pisces ♓';
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-indexed
  return new Date(year, month, 0).getDate();
}

/** Returns true only when day/month/year form a real calendar date. */
export function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900) return false;
  if (month < 1 || month > 12) return false;
  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) return false;
  // Strict round-trip check: JS Date must not auto-normalize to a different date
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export function calculateAge(
  dobYear: number,
  dobMonth: number,  // 1-indexed
  dobDay: number,
): AgeResult | null {
  // Strict calendar validity check (catches Feb 30, Apr 31, etc.)
  if (!isValidDate(dobYear, dobMonth, dobDay)) return null;

  const today = new Date();
  const dob = new Date(dobYear, dobMonth - 1, dobDay);

  // Validate
  if (dob > today) return null;
  if (dobYear < 1900 || dobYear > today.getFullYear()) return null;

  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1; // 1-indexed
  const todayD = today.getDate();

  let years = todayY - dobYear;
  let months = todayM - dobMonth;
  let days = todayD - dobDay;

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonthDate = new Date(todayY, today.getMonth(), 0);
    days += prevMonthDate.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Total days between dob and today
  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.floor((today.getTime() - dob.getTime()) / msPerDay);

  // Days until next birthday
  let nextBirthday = new Date(todayY, dobMonth - 1, dobDay);
  if (nextBirthday < today || (nextBirthday.getTime() === today.getTime())) {
    nextBirthday = new Date(todayY + 1, dobMonth - 1, dobDay);
  }
  // If today IS birthday, nextBirthdayDays = 0
  const isBirthdayToday = todayM === dobMonth && todayD === dobDay;
  const nextBirthdayDays = isBirthdayToday
    ? 0
    : Math.ceil((nextBirthday.getTime() - today.getTime()) / msPerDay);

  return {
    years,
    months,
    days,
    totalDays,
    nextBirthdayDays,
    dayOfWeek: DAY_NAMES[dob.getDay()],
    isLeapYear: isLeapYear(dobYear),
    zodiacSign: zodiacSign(dobDay, dobMonth),
  };
}

export function formatAgeResult(result: AgeResult): string {
  const parts: string[] = [];
  if (result.years > 0) parts.push(`${result.years} Year${result.years !== 1 ? 's' : ''}`);
  if (result.months > 0) parts.push(`${result.months} Month${result.months !== 1 ? 's' : ''}`);
  if (result.days > 0) parts.push(`${result.days} Day${result.days !== 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : '0 Days';
}

export function formatCopyText(
  dob: string,
  result: AgeResult,
): string {
  return [
    `Age Calculator — CSC Smart Toolkit`,
    `Date of Birth: ${dob}`,
    `Age: ${formatAgeResult(result)}`,
    `Total Days: ${result.totalDays.toLocaleString()}`,
    `Born on: ${result.dayOfWeek}`,
    `Zodiac Sign: ${result.zodiacSign}`,
    result.nextBirthdayDays === 0
      ? `🎂 Birthday Today!`
      : `Next Birthday: ${result.nextBirthdayDays} day${result.nextBirthdayDays !== 1 ? 's' : ''} away`,
  ].join('\n');
}
