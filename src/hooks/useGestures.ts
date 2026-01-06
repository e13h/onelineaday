import { useRef, useCallback } from 'react';

const MIN_SWIPE_DISTANCE = 50;

export function useGestures(
  onDateChange: (offset: number) => void, 
  shouldExcludeTouch?: (element: Element) => boolean
) {
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isVerticalScrollRef = useRef(false);
  const shouldExcludeTouchRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;

    // Check if we should exclude this touch based on the target element
    const target = e.target as Element;
    shouldExcludeTouchRef.current = shouldExcludeTouch ? shouldExcludeTouch(target) : false;

    if (shouldExcludeTouchRef.current) {
      return;
    }

    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isVerticalScrollRef.current = false;
  }, [shouldExcludeTouch]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.changedTouches.length === 0 || shouldExcludeTouchRef.current) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const distanceX = touchStartXRef.current - touchEndX;
      const distanceY = touchStartYRef.current - touchEndY;

      if (Math.abs(distanceY) > Math.abs(distanceX)) {
        isVerticalScrollRef.current = true;
        return;
      }

      if (Math.abs(distanceX) >= MIN_SWIPE_DISTANCE) {
        // Swipe left goes to next day, swipe right goes to previous day
        const direction = distanceX > 0 ? 1 : -1;
        onDateChange(direction);
      }
    },
    [onDateChange]
  );

  return { handleTouchStart, handleTouchEnd };
}
