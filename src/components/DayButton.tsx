import React from 'react';

interface DayButtonProps {
  day: number;
  onClick: () => void;
  entryCount?: number;
}

export function DayButton({ day, onClick, entryCount }: DayButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-full aspect-square flex items-center justify-center hover:bg-indigo-50"
    >
      <span className="text-lg font-medium text-gray-800">{day}</span>
      {entryCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {entryCount}
        </span>
      )}
    </button>
  );
}