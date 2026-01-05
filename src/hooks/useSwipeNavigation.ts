'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SWIPE_NAV_ORDER } from '@/components/layout/MobileBottomNav';

// ============================================
// Types
// ============================================
interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isSwiping: boolean;
}

interface UseSwipeNavigationOptions {
  threshold?: number; // Minimum distance to trigger navigation
  maxVerticalDistance?: number; // Max vertical movement allowed
  enabled?: boolean;
}

interface UseSwipeNavigationReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  swipeOffset: number;
  isSwiping: boolean;
  currentIndex: number;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
}

// ============================================
// Hook: useSwipeNavigation
// ============================================
export function useSwipeNavigation(
  options: UseSwipeNavigationOptions = {}
): UseSwipeNavigationReturn {
  const {
    threshold = 80,
    maxVerticalDistance = 100,
    enabled = true,
  } = options;

  const router = useRouter();
  const pathname = usePathname();

  const swipeRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isSwiping: false,
  });

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Get current index in navigation order
  const currentIndex = SWIPE_NAV_ORDER.findIndex(
    (path) => pathname === path || pathname?.startsWith(path + '/')
  );

  const canSwipeLeft = currentIndex > 0;
  const canSwipeRight = currentIndex < SWIPE_NAV_ORDER.length - 1 && currentIndex >= 0;

  // Navigate to a specific index
  const navigateToIndex = useCallback((index: number) => {
    if (index >= 0 && index < SWIPE_NAV_ORDER.length) {
      router.push(SWIPE_NAV_ORDER[index]);
    }
  }, [router]);

  // Check if element or its parents have horizontal scroll
  const isInsideHorizontalScroll = useCallback((element: HTMLElement | null): boolean => {
    while (element) {
      const style = window.getComputedStyle(element);
      const overflowX = style.getPropertyValue('overflow-x');
      const isScrollable = overflowX === 'auto' || overflowX === 'scroll';
      const hasHorizontalScroll = element.scrollWidth > element.clientWidth;

      if (isScrollable && hasHorizontalScroll) {
        return true;
      }

      // Also check for snap scroll containers (carousels)
      const scrollSnapType = style.getPropertyValue('scroll-snap-type');
      if (scrollSnapType && scrollSnapType !== 'none') {
        return true;
      }

      element = element.parentElement;
    }
    return false;
  }, []);

  // Touch start handler
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    // Check if touch started inside a horizontally scrollable element
    const target = e.target as HTMLElement;
    if (isInsideHorizontalScroll(target)) {
      swipeRef.current = {
        startX: 0,
        startY: 0,
        currentX: 0,
        isSwiping: false,
      };
      return;
    }

    const touch = e.touches[0];
    swipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isSwiping: false,
    };
  }, [enabled, isInsideHorizontalScroll]);

  // Touch move handler
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeRef.current.startX;
    const deltaY = Math.abs(touch.clientY - swipeRef.current.startY);

    // If vertical movement is too large, don't consider it a horizontal swipe
    if (deltaY > maxVerticalDistance) {
      swipeRef.current.isSwiping = false;
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }

    // Check if we should start swiping
    if (Math.abs(deltaX) > 10 && !swipeRef.current.isSwiping) {
      swipeRef.current.isSwiping = true;
      setIsSwiping(true);
    }

    if (swipeRef.current.isSwiping) {
      swipeRef.current.currentX = touch.clientX;

      // Limit swipe offset based on direction and ability to swipe
      let offset = deltaX;
      if (deltaX > 0 && !canSwipeLeft) {
        offset = deltaX * 0.2; // Resistance when can't swipe left
      } else if (deltaX < 0 && !canSwipeRight) {
        offset = deltaX * 0.2; // Resistance when can't swipe right
      }

      setSwipeOffset(offset);
    }
  }, [enabled, maxVerticalDistance, canSwipeLeft, canSwipeRight]);

  // Touch end handler
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !swipeRef.current.isSwiping) {
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;

    // Check if swipe distance exceeds threshold
    if (Math.abs(deltaX) >= threshold) {
      if (deltaX > 0 && canSwipeLeft) {
        // Swipe right -> go to previous screen
        navigateToIndex(currentIndex - 1);
      } else if (deltaX < 0 && canSwipeRight) {
        // Swipe left -> go to next screen
        navigateToIndex(currentIndex + 1);
      }
    }

    // Reset state
    swipeRef.current.isSwiping = false;
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [enabled, threshold, canSwipeLeft, canSwipeRight, currentIndex, navigateToIndex]);

  // Reset swipe state on route change
  useEffect(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
    swipeRef.current.isSwiping = false;
  }, [pathname]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    swipeOffset,
    isSwiping,
    currentIndex,
    canSwipeLeft,
    canSwipeRight,
  };
}

export default useSwipeNavigation;
