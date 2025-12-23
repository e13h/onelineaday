interface CatchupBadgeProps {
  count: number;
  side: 'left' | 'right';
}

export default function CatchupBadge({ count, side }: CatchupBadgeProps) {
  if (count === 0) return null;

  const sideClass = side === 'left' ? 'flex-col items-end' : 'flex-col items-start';
  const bgColor = count > 10 ? 'bg-red-50' : 'bg-amber-50';
  const textColor = count > 10 ? 'text-red-700' : 'text-amber-700';
  const borderColor = count > 10 ? 'border-red-200' : 'border-amber-200';

  return (
    <div className={`hidden sm:flex ${sideClass} justify-center w-16 px-2 py-8`}>
      <div
        className={`${bgColor} ${textColor} ${borderColor} border rounded-lg px-2 py-3 text-center min-w-10`}
      >
        <div className="text-xs font-semibold leading-tight">{count}</div>
        <div className="text-xs opacity-75 mt-1">
          {side === 'left' ? 'days ago' : 'days ahead'}
        </div>
      </div>
    </div>
  );
}
