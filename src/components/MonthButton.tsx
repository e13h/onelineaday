import React from 'react';
import { Calendar } from 'lucide-react';

interface MonthButtonProps {
  month: string;
  onClick: () => void;
}

export function MonthButton({ month, onClick }: MonthButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-48 group"
    >
      <Calendar className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform duration-200" />
      <span className="text-lg font-medium text-gray-800">{month}</span>
    </button>
  );
}