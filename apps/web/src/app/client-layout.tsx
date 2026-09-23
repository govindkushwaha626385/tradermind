// ──────────────────────────────────────────────
// TradeMind — Client-Side Layout Wrapper
//
// Wraps all pages with the ErrorBoundary so that
// rendering errors are caught gracefully.
// Also hosts the global ToastContainer so toasts
// can be shown from anywhere in the app.
// Must be a client component because ErrorBoundary
// uses componentDidCatch.
// ──────────────────────────────────────────────

'use client';

import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/Toast';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Apply saved dark-mode preference before first paint (no flash of wrong theme).
  useEffect(() => {
    const saved = localStorage.getItem('trademind_theme') ?? 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = saved === 'dark' || (saved === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', shouldDark);
  }, []);

  // Load Razorpay checkout SDK globally
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch { /* already removed */ }
    };
  }, []);

  // Register Service Worker for PWA offline support
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] Registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      {/* Dynamic Announcement Banner — controlled via admin configs in DB */}
      <AnnouncementBanner />
      {children}
      {/* Global toast notifications — rendered at root so they overlay everything */}
      <ToastContainer />
    </ErrorBoundary>
  );
}
