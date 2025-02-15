import React from 'react';

interface DayButtonProps {
  day: number;
  onClick: () => void;
}

export function DayButton({ day, onClick }: DayButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-16 h-16 flex items-center justify-center hover:bg-indigo-50"
    >
      <span className="text-lg font-medium text-gray-800">{day}</span>
    </button>
  );
}