'use client';

import { useEffect, useRef } from 'react';

interface AriaLiveRegionProps {
  message: string | null;
  politeness?: 'polite' | 'assertive';
  clearDelay?: number;
}

export function AriaLiveRegion({ message, politeness = 'polite', clearDelay = 5000 }: AriaLiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const el = regionRef.current;
    if (el && message) {
      el.textContent = message;

      if (clearDelay > 0) {
        timerRef.current = setTimeout(() => {
          if (el) el.textContent = '';
        }, clearDelay);
      }
    } else if (el && !message) {
      el.textContent = '';
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [message, clearDelay]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
