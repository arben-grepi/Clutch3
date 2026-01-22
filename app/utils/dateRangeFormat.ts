const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getDateParts = (dateIso: string) => {
  const d = new Date(dateIso);
  return {
    year: d.getFullYear(),
    month: d.getMonth(), // 0-based
    day: d.getDate(),
  };
};

/**
 * Format a date range compactly:
 * - Same year: omit year.
 * - Same month: omit month on the second date (e.g. "Jan 3–15").
 * - Different years: include year (e.g. "Dec 28, 2025 – Jan 2, 2026").
 */
export const formatCompactDateRange = (startIso: string, endIso: string): string => {
  if (!startIso || !endIso) return "";

  const start = getDateParts(startIso);
  const end = getDateParts(endIso);

  const sameYear = start.year === end.year;
  const sameMonth = sameYear && start.month === end.month;
  const sameDay = sameMonth && start.day === end.day;

  const startMonth = MONTHS_SHORT[start.month] ?? "";
  const endMonth = MONTHS_SHORT[end.month] ?? "";

  if (sameDay) {
    return sameYear
      ? `${startMonth} ${start.day}`
      : `${startMonth} ${start.day}, ${start.year}`;
  }

  if (sameMonth) {
    // Jan 3–15 (no year)
    return `${startMonth} ${start.day}–${end.day}`;
  }

  if (sameYear) {
    // Jan 28 – Feb 2 (no year)
    return `${startMonth} ${start.day} – ${endMonth} ${end.day}`;
  }

  // Dec 28, 2025 – Jan 2, 2026
  return `${startMonth} ${start.day}, ${start.year} – ${endMonth} ${end.day}, ${end.year}`;
};


