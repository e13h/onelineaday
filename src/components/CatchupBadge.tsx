interface CatchupBadgeProps {
  count: number;
  side: 'left' | 'right';
}

export default function CatchupBadge({ count, side }: CatchupBadgeProps) {
  if (count === 0) return null;

  const positionClass = side === 'left' ? '-top-2 -left-2' : '-top-2 -right-2';
  const bgColor = count > 10 ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className={`absolute ${positionClass} pointer-events-none`}>
      <div
        className={`${bgColor} text-white text-xs font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5`}
      >
        {count > 99 ? '99+' : count}
      </div>
    </div>
  );
}
