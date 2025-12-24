export function formatDateDisplay(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

export function getStartDate(entries: Record<string, string>): string {
  const dates = Object.keys(entries).sort();
  if (dates.length === 0) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  return dates[0];
}

export function getCatchupCounts(
  currentDate: string,
  entries: Record<string, string>,
  startDate: string
): { previousCount: number; nextCount: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
  const current = new Date(currentYear, currentMonth - 1, currentDay);
  current.setHours(0, 0, 0, 0);

  let previousCount = 0;
  let nextCount = 0;

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const startDateObj = new Date(startYear, startMonth - 1, startDay);
  startDateObj.setHours(0, 0, 0, 0);

  const checkDate = new Date(current);
  checkDate.setDate(checkDate.getDate() - 1);

  while (checkDate >= startDateObj) {
    const dateString = checkDate.toISOString().split('T')[0];
    if (!entries[dateString]) {
      previousCount++;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const nextCheckDate = new Date(current);
  nextCheckDate.setDate(nextCheckDate.getDate() + 1);

  while (nextCheckDate <= today) {
    const dateString = nextCheckDate.toISOString().split('T')[0];
    if (!entries[dateString]) {
      nextCount++;
    }
    nextCheckDate.setDate(nextCheckDate.getDate() + 1);
  }

  return { previousCount, nextCount };
}

export function getOnThisDayEntries(
  currentDate: string,
  entries: Record<string, string>
): Array<{ date: string; message: string; year: number }> {
  const [currentYear, currentMonth, currentDay] = currentDate.split("-").map(Number);
  const results: Array<{ date: string; message: string; year: number }> = [];
  for (const [date, message] of Object.entries(entries)) {
    const [year, month, day] = date.split("-").map(Number);
    if (month === currentMonth && day === currentDay && year < currentYear) {
      results.push({ date, message, year });
    }
  }

  results.sort((a, b) => b.year - a.year);
  return results;
}
