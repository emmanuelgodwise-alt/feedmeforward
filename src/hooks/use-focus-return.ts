'use client';

import { useEffect, useRef } from 'react';

export function useFocusReturn(isActive: boolean = true) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (isActive && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isActive]);

  return previouslyFocusedRef;
}
