import { getOnThisDayEntries } from '../utils/dateUtils';

interface OnThisDayListProps {
  currentDate: string;
  entries: Record<string, string>;
}

export default function OnThisDayList({ currentDate, entries }: OnThisDayListProps) {
  const onThisDayEntries = getOnThisDayEntries(currentDate, entries);

  if (onThisDayEntries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <p className="text-sm">No entries from previous years on this day</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onThisDayEntries.map((entry) => (
        <div key={entry.date} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {entry.year}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{entry.date}</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{entry.message}</p>
        </div>
      ))}
    </div>
  );
}
