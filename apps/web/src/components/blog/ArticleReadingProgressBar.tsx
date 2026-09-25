// ──────────────────────────────────────────────
// TradeMind — Article Reading Progress Bar (Client Component)
// Smooth progress indicator affixed to viewport top.
// ──────────────────────────────────────────────

'use client';

import React, { useState, useEffect } from 'react';

export function ArticleReadingProgressBar() {
  const [completion, setCompletion] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setCompletion(
          Number((currentProgress / scrollHeight).toFixed(2)) * 100,
        );
      }
    };

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-150"
        style={{ width: `${completion}%` }}
      />
    </div>
  );
}
