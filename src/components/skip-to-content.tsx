'use client';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
    >
      Skip to content
    </a>
  );
}
