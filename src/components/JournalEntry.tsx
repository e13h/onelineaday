import React from 'react';

interface JournalEntryProps {
  year: number;
  value: string;
  onChange: (value: string) => void;
}

export function JournalEntry({ year, value, onChange }: JournalEntryProps) {
  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {year}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        placeholder={`What happened on this day in ${year}?`}
      />
    </div>
  );
}