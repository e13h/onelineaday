export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00Z');
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
  const todayString = today.toISOString().split('T')[0];

  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  let previousCount = 0;
  let nextCount = 0;

  const startDateObj = new Date(startDate);
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
  const currentMonth = currentDate.substring(5, 10);
  const currentYear = parseInt(currentDate.substring(0, 4));

  const results: Array<{ date: string; message: string; year: number }> = [];

  for (const [date, message] of Object.entries(entries)) {
    const month = date.substring(5, 10);
    const year = parseInt(date.substring(0, 4));

    if (month === currentMonth && year < currentYear) {
      results.push({ date, message, year });
    }
  }

  results.sort((a, b) => b.year - a.year);

  return results;
}
