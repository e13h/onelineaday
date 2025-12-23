import { useRef, useCallback } from 'react';

const MIN_SWIPE_DISTANCE = 50;
const SCROLL_SENSITIVITY = 30;

export function useGestures(onDateChange: (offset: number) => void) {
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isVerticalScrollRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isVerticalScrollRef.current = false;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const distanceX = touchStartXRef.current - touchEndX;
      const distanceY = touchStartYRef.current - touchEndY;

      if (Math.abs(distanceY) > Math.abs(distanceX)) {
        isVerticalScrollRef.current = true;
        return;
      }

      if (Math.abs(distanceX) >= MIN_SWIPE_DISTANCE) {
        const direction = distanceX > 0 ? -1 : 1;
        onDateChange(direction);
      }
    },
    [onDateChange]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      e.preventDefault();

      if (Math.abs(deltaX) >= SCROLL_SENSITIVITY) {
        const direction = deltaX > 0 ? -1 : 1;
        onDateChange(direction);
      }
    },
    [onDateChange]
  );

  return { handleWheel, handleTouchStart, handleTouchEnd };
}
